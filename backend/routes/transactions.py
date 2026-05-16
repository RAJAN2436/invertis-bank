from flask import Blueprint, request, jsonify
from database import accounts_col, transactions_col, audit_col
from auth_utils import token_required
from datetime import datetime
from bson import ObjectId

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('/', methods=['GET'])
@token_required
def get_transactions():
    query = {}
    account_number = request.args.get('account_number', '')
    txn_type = request.args.get('type', '')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))

    if account_number:
        query['account_number'] = account_number
    if txn_type:
        query['type'] = txn_type

    total = transactions_col.count_documents(query)
    txns = list(transactions_col.find(query).skip((page-1)*limit).limit(limit).sort('timestamp', -1))

    for t in txns:
        t['_id'] = str(t['_id'])
        if t.get('timestamp'):
            t['timestamp'] = t['timestamp'].isoformat()

    return jsonify({'transactions': txns, 'total': total, 'page': page})

@transactions_bp.route('/deposit', methods=['POST'])
@token_required
def deposit():
    data = request.json
    account_number = data.get('account_number', '').strip()
    amount = float(data.get('amount', 0))
    description = data.get('description', 'Cash Deposit')

    if not account_number or amount <= 0:
        return jsonify({'error': 'Valid account number and amount required'}), 400

    acc = accounts_col.find_one({'account_number': account_number})
    if not acc:
        return jsonify({'error': 'Account not found'}), 404
    if acc['status'] != 'active':
        return jsonify({'error': f'Account is {acc["status"]}. Cannot deposit'}), 400

    new_balance = acc['balance'] + amount
    accounts_col.update_one(
        {'account_number': account_number},
        {'$set': {'balance': new_balance, 'updated_at': datetime.utcnow()}}
    )

    txn_id = 'TXN' + datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:17]
    transactions_col.insert_one({
        'txn_id': txn_id,
        'account_number': account_number,
        'customer_name': acc['customer_name'],
        'type': 'credit',
        'category': 'deposit',
        'amount': amount,
        'balance_after': new_balance,
        'description': description,
        'status': 'completed',
        'timestamp': datetime.utcnow(),
        'performed_by': request.user['username']
    })

    audit_col.insert_one({
        'action': 'DEPOSIT',
        'account_number': account_number,
        'amount': amount,
        'performed_by': request.user['username'],
        'timestamp': datetime.utcnow()
    })

    return jsonify({
        'message': f'₹{amount:,.2f} deposited successfully',
        'txn_id': txn_id,
        'new_balance': new_balance,
        'account_number': account_number,
        'customer_name': acc['customer_name']
    })

@transactions_bp.route('/withdraw', methods=['POST'])
@token_required
def withdraw():
    data = request.json
    account_number = data.get('account_number', '').strip()
    amount = float(data.get('amount', 0))
    description = data.get('description', 'Cash Withdrawal')

    if not account_number or amount <= 0:
        return jsonify({'error': 'Valid account number and amount required'}), 400

    acc = accounts_col.find_one({'account_number': account_number})
    if not acc:
        return jsonify({'error': 'Account not found'}), 404
    if acc['status'] != 'active':
        return jsonify({'error': f'Account is {acc["status"]}'}), 400

    min_balance = 500 if acc['account_type'] == 'savings' else 1000
    if acc['balance'] - amount < min_balance:
        return jsonify({'error': f'Insufficient balance. Minimum balance of ₹{min_balance} required'}), 400

    new_balance = acc['balance'] - amount
    accounts_col.update_one(
        {'account_number': account_number},
        {'$set': {'balance': new_balance, 'updated_at': datetime.utcnow()}}
    )

    txn_id = 'TXN' + datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:17]
    transactions_col.insert_one({
        'txn_id': txn_id,
        'account_number': account_number,
        'customer_name': acc['customer_name'],
        'type': 'debit',
        'category': 'withdrawal',
        'amount': amount,
        'balance_after': new_balance,
        'description': description,
        'status': 'completed',
        'timestamp': datetime.utcnow(),
        'performed_by': request.user['username']
    })

    return jsonify({
        'message': f'₹{amount:,.2f} withdrawn successfully',
        'txn_id': txn_id,
        'new_balance': new_balance,
        'account_number': account_number,
        'customer_name': acc['customer_name']
    })

@transactions_bp.route('/transfer', methods=['POST'])
@token_required
def transfer():
    data = request.json
    from_acc = data.get('from_account', '').strip()
    to_acc = data.get('to_account', '').strip()
    amount = float(data.get('amount', 0))
    description = data.get('description', 'Fund Transfer')

    if not from_acc or not to_acc or amount <= 0:
        return jsonify({'error': 'All fields required'}), 400
    if from_acc == to_acc:
        return jsonify({'error': 'Cannot transfer to same account'}), 400

    sender = accounts_col.find_one({'account_number': from_acc})
    receiver = accounts_col.find_one({'account_number': to_acc})

    if not sender:
        return jsonify({'error': 'Source account not found'}), 404
    if not receiver:
        return jsonify({'error': 'Destination account not found'}), 404
    if sender['status'] != 'active':
        return jsonify({'error': 'Source account is not active'}), 400
    if receiver['status'] != 'active':
        return jsonify({'error': 'Destination account is not active'}), 400
    if sender['balance'] < amount + 500:
        return jsonify({'error': 'Insufficient balance'}), 400

    sender_new = sender['balance'] - amount
    receiver_new = receiver['balance'] + amount

    accounts_col.update_one({'account_number': from_acc}, {'$set': {'balance': sender_new, 'updated_at': datetime.utcnow()}})
    accounts_col.update_one({'account_number': to_acc}, {'$set': {'balance': receiver_new, 'updated_at': datetime.utcnow()}})

    txn_id = 'TXN' + datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:17]

    transactions_col.insert_one({
        'txn_id': txn_id + 'D',
        'account_number': from_acc,
        'customer_name': sender['customer_name'],
        'type': 'debit',
        'category': 'transfer',
        'amount': amount,
        'balance_after': sender_new,
        'description': f'{description} → {to_acc}',
        'counterpart_account': to_acc,
        'status': 'completed',
        'timestamp': datetime.utcnow(),
        'performed_by': request.user['username']
    })

    transactions_col.insert_one({
        'txn_id': txn_id + 'C',
        'account_number': to_acc,
        'customer_name': receiver['customer_name'],
        'type': 'credit',
        'category': 'transfer',
        'amount': amount,
        'balance_after': receiver_new,
        'description': f'{description} ← {from_acc}',
        'counterpart_account': from_acc,
        'status': 'completed',
        'timestamp': datetime.utcnow(),
        'performed_by': request.user['username']
    })

    return jsonify({
        'message': f'₹{amount:,.2f} transferred successfully',
        'txn_id': txn_id,
        'from_account': from_acc,
        'to_account': to_acc,
        'from_new_balance': sender_new,
        'to_new_balance': receiver_new
    })

@transactions_bp.route('/statement/<account_number>', methods=['GET'])
@token_required
def statement(account_number):
    acc = accounts_col.find_one({'account_number': account_number})
    if not acc:
        return jsonify({'error': 'Account not found'}), 404

    limit = int(request.args.get('limit', 50))
    txns = list(transactions_col.find({'account_number': account_number}).sort('timestamp', -1).limit(limit))

    for t in txns:
        t['_id'] = str(t['_id'])
        if t.get('timestamp'):
            t['timestamp'] = t['timestamp'].isoformat()

    acc['_id'] = str(acc['_id'])
    if acc.get('created_at'):
        acc['created_at'] = acc['created_at'].isoformat()

    return jsonify({'account': acc, 'transactions': txns})

@transactions_bp.route('/stats', methods=['GET'])
@token_required
def txn_stats():
    from datetime import timedelta
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    deposits_today = list(transactions_col.aggregate([
        {'$match': {'type': 'credit', 'timestamp': {'$gte': today}}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount'}, 'count': {'$sum': 1}}}
    ]))
    withdrawals_today = list(transactions_col.aggregate([
        {'$match': {'type': 'debit', 'timestamp': {'$gte': today}}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount'}, 'count': {'$sum': 1}}}
    ]))
    total_txns = transactions_col.count_documents({})

    return jsonify({
        'deposits_today': deposits_today[0] if deposits_today else {'total': 0, 'count': 0},
        'withdrawals_today': withdrawals_today[0] if withdrawals_today else {'total': 0, 'count': 0},
        'total_transactions': total_txns
    })

@transactions_bp.route('/recent', methods=['GET'])
@token_required
def recent_transactions():
    limit = int(request.args.get('limit', 10))
    txns = list(transactions_col.find({}).sort('timestamp', -1).limit(limit))
    for t in txns:
        t['_id'] = str(t['_id'])
        if t.get('timestamp'):
            t['timestamp'] = t['timestamp'].isoformat()
    return jsonify(txns)
