from flask import Blueprint, request, jsonify
from database import accounts_col, customers_col, transactions_col, audit_col
from auth_utils import token_required
from datetime import datetime
from bson import ObjectId
import random
import string

accounts_bp = Blueprint('accounts', __name__)

def generate_account_number():
    while True:
        acc_num = ''.join([str(random.randint(0, 9)) for _ in range(12)])
        if not accounts_col.find_one({'account_number': acc_num}):
            return acc_num

def generate_ifsc():
    return 'INVB' + ''.join(random.choices(string.digits, k=7))

@accounts_bp.route('/', methods=['GET'])
@token_required
def get_accounts():
    query = {}
    search = request.args.get('search', '')
    account_type = request.args.get('type', '')
    status = request.args.get('status', '')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))

    if search:
        query['$or'] = [
            {'account_number': {'$regex': search, '$options': 'i'}},
            {'customer_name': {'$regex': search, '$options': 'i'}},
            {'customer_id': {'$regex': search, '$options': 'i'}}
        ]
    if account_type:
        query['account_type'] = account_type
    if status:
        query['status'] = status

    total = accounts_col.count_documents(query)
    accounts = list(accounts_col.find(query).skip((page-1)*limit).limit(limit).sort('created_at', -1))

    for a in accounts:
        a['_id'] = str(a['_id'])
        if a.get('created_at'):
            a['created_at'] = a['created_at'].isoformat()
        if a.get('updated_at'):
            a['updated_at'] = a['updated_at'].isoformat()

    return jsonify({'accounts': accounts, 'total': total, 'page': page, 'limit': limit})

@accounts_bp.route('/<account_id>', methods=['GET'])
@token_required
def get_account(account_id):
    try:
        acc = accounts_col.find_one({'_id': ObjectId(account_id)})
        if not acc:
            acc = accounts_col.find_one({'account_number': account_id})
        if not acc:
            return jsonify({'error': 'Account not found'}), 404
        acc['_id'] = str(acc['_id'])
        if acc.get('created_at'):
            acc['created_at'] = acc['created_at'].isoformat()
        return jsonify(acc)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@accounts_bp.route('/', methods=['POST'])
@token_required
def create_account():
    data = request.json
    required = ['customer_name', 'account_type', 'email', 'phone', 'address', 'dob', 'id_proof_type', 'id_proof_number']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    acc_num = generate_account_number()
    ifsc = 'INVB0001234'

    # Create/find customer
    customer = customers_col.find_one({'phone': data['phone']})
    if not customer:
        cust_id = 'CUST' + ''.join([str(random.randint(0,9)) for _ in range(6)])
        cust_data = {
            'customer_id': cust_id,
            'full_name': data['customer_name'],
            'email': data['email'],
            'phone': data['phone'],
            'address': data['address'],
            'dob': data['dob'],
            'id_proof_type': data['id_proof_type'],
            'id_proof_number': data['id_proof_number'],
            'kyc_status': 'pending',
            'created_at': datetime.utcnow(),
            'created_by': request.user['username']
        }
        customers_col.insert_one(cust_data)
        cust_id_str = cust_id
    else:
        cust_id_str = customer['customer_id']

    account = {
        'account_number': acc_num,
        'customer_id': cust_id_str,
        'customer_name': data['customer_name'],
        'email': data['email'],
        'phone': data['phone'],
        'account_type': data['account_type'],
        'balance': float(data.get('initial_deposit', 0)),
        'currency': 'INR',
        'ifsc_code': ifsc,
        'branch': 'Main Branch - Lucknow',
        'status': 'active',
        'nominee': data.get('nominee', ''),
        'created_at': datetime.utcnow(),
        'created_by': request.user['username'],
        'updated_at': datetime.utcnow()
    }
    accounts_col.insert_one(account)

    # Record initial deposit as transaction
    if float(data.get('initial_deposit', 0)) > 0:
        transactions_col.insert_one({
            'account_number': acc_num,
            'type': 'credit',
            'category': 'initial_deposit',
            'amount': float(data['initial_deposit']),
            'balance_after': float(data['initial_deposit']),
            'description': 'Account opening deposit',
            'status': 'completed',
            'timestamp': datetime.utcnow(),
            'performed_by': request.user['username']
        })

    audit_col.insert_one({
        'action': 'ACCOUNT_CREATED',
        'account_number': acc_num,
        'performed_by': request.user['username'],
        'timestamp': datetime.utcnow()
    })

    return jsonify({
        'message': 'Account created successfully',
        'account_number': acc_num,
        'customer_id': cust_id_str,
        'ifsc_code': ifsc
    }), 201

@accounts_bp.route('/<account_id>/status', methods=['PUT'])
@token_required
def update_status(account_id):
    data = request.json
    status = data.get('status')
    if status not in ['active', 'frozen', 'closed']:
        return jsonify({'error': 'Invalid status'}), 400
    try:
        accounts_col.update_one(
            {'_id': ObjectId(account_id)},
            {'$set': {'status': status, 'updated_at': datetime.utcnow()}}
        )
        return jsonify({'message': f'Account {status} successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@accounts_bp.route('/balance/<account_number>', methods=['GET'])
@token_required
def check_balance(account_number):
    acc = accounts_col.find_one({'account_number': account_number})
    if not acc:
        return jsonify({'error': 'Account not found'}), 404
    return jsonify({
        'account_number': acc['account_number'],
        'customer_name': acc['customer_name'],
        'balance': acc['balance'],
        'account_type': acc['account_type'],
        'status': acc['status'],
        'currency': acc.get('currency', 'INR')
    })

@accounts_bp.route('/stats', methods=['GET'])
@token_required
def account_stats():
    total = accounts_col.count_documents({})
    active = accounts_col.count_documents({'status': 'active'})
    frozen = accounts_col.count_documents({'status': 'frozen'})
    closed = accounts_col.count_documents({'status': 'closed'})
    savings = accounts_col.count_documents({'account_type': 'savings'})
    current = accounts_col.count_documents({'account_type': 'current'})
    fd = accounts_col.count_documents({'account_type': 'fixed_deposit'})

    pipeline = [{'$group': {'_id': None, 'total': {'$sum': '$balance'}}}]
    result = list(accounts_col.aggregate(pipeline))
    total_deposits = result[0]['total'] if result else 0

    return jsonify({
        'total_accounts': total,
        'active': active,
        'frozen': frozen,
        'closed': closed,
        'savings': savings,
        'current': current,
        'fixed_deposit': fd,
        'total_deposits': total_deposits
    })
