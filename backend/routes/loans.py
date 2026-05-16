from flask import Blueprint, request, jsonify
from database import loans_col, accounts_col, transactions_col, audit_col
from auth_utils import token_required
from datetime import datetime, timedelta
from bson import ObjectId
import random

loans_bp = Blueprint('loans', __name__)

def calculate_emi(principal, rate_annual, tenure_months):
    r = rate_annual / (12 * 100)
    if r == 0:
        return principal / tenure_months
    emi = principal * r * ((1 + r) ** tenure_months) / (((1 + r) ** tenure_months) - 1)
    return round(emi, 2)

@loans_bp.route('/', methods=['GET'])
@token_required
def get_loans():
    query = {}
    status = request.args.get('status', '')
    search = request.args.get('search', '')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))

    if status:
        query['status'] = status
    if search:
        query['$or'] = [
            {'customer_name': {'$regex': search, '$options': 'i'}},
            {'account_number': {'$regex': search, '$options': 'i'}},
            {'loan_id': {'$regex': search, '$options': 'i'}}
        ]

    total = loans_col.count_documents(query)
    loans = list(loans_col.find(query).skip((page-1)*limit).limit(limit).sort('applied_at', -1))

    for l in loans:
        l['_id'] = str(l['_id'])
        if l.get('applied_at'):
            l['applied_at'] = l['applied_at'].isoformat()
        if l.get('approved_at'):
            l['approved_at'] = l['approved_at'].isoformat()
        if l.get('disbursed_at'):
            l['disbursed_at'] = l['disbursed_at'].isoformat()

    return jsonify({'loans': loans, 'total': total, 'page': page})

@loans_bp.route('/apply', methods=['POST'])
@token_required
def apply_loan():
    data = request.json
    required = ['account_number', 'loan_type', 'amount', 'tenure_months', 'purpose']
    for f in required:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400

    acc = accounts_col.find_one({'account_number': data['account_number']})
    if not acc:
        return jsonify({'error': 'Account not found'}), 404

    amount = float(data['amount'])
    tenure = int(data['tenure_months'])

    loan_rates = {
        'personal': 12.5,
        'home': 8.5,
        'car': 9.5,
        'education': 10.0,
        'business': 14.0,
        'gold': 7.5
    }
    rate = loan_rates.get(data['loan_type'], 12.0)
    emi = calculate_emi(amount, rate, tenure)
    total_payment = round(emi * tenure, 2)
    interest = round(total_payment - amount, 2)

    loan_id = 'LOAN' + ''.join([str(random.randint(0,9)) for _ in range(8)])

    loan = {
        'loan_id': loan_id,
        'account_number': data['account_number'],
        'customer_name': acc['customer_name'],
        'customer_id': acc.get('customer_id', ''),
        'loan_type': data['loan_type'],
        'amount': amount,
        'tenure_months': tenure,
        'interest_rate': rate,
        'emi_amount': emi,
        'total_interest': interest,
        'total_payable': total_payment,
        'purpose': data['purpose'],
        'collateral': data.get('collateral', ''),
        'status': 'pending',
        'applied_at': datetime.utcnow(),
        'applied_by': request.user['username'],
        'outstanding_amount': amount,
        'paid_emis': 0,
        'next_emi_date': None
    }

    loans_col.insert_one(loan)

    return jsonify({
        'message': 'Loan application submitted',
        'loan_id': loan_id,
        'emi_amount': emi,
        'interest_rate': rate,
        'total_payable': total_payment
    }), 201

@loans_bp.route('/<loan_id>/approve', methods=['PUT'])
@token_required
def approve_loan(loan_id):
    loan = loans_col.find_one({'loan_id': loan_id})
    if not loan:
        return jsonify({'error': 'Loan not found'}), 404
    if loan['status'] != 'pending':
        return jsonify({'error': f'Loan is already {loan["status"]}'}), 400

    data = request.json
    action = data.get('action', 'approve')

    if action == 'approve':
        next_emi = datetime.utcnow() + timedelta(days=30)
        loans_col.update_one(
            {'loan_id': loan_id},
            {'$set': {
                'status': 'approved',
                'approved_at': datetime.utcnow(),
                'approved_by': request.user['username'],
                'next_emi_date': next_emi
            }}
        )
        return jsonify({'message': 'Loan approved successfully'})
    else:
        loans_col.update_one(
            {'loan_id': loan_id},
            {'$set': {
                'status': 'rejected',
                'rejected_at': datetime.utcnow(),
                'rejected_by': request.user['username'],
                'rejection_reason': data.get('reason', '')
            }}
        )
        return jsonify({'message': 'Loan rejected'})

@loans_bp.route('/<loan_id>/disburse', methods=['PUT'])
@token_required
def disburse_loan(loan_id):
    loan = loans_col.find_one({'loan_id': loan_id})
    if not loan:
        return jsonify({'error': 'Loan not found'}), 404
    if loan['status'] != 'approved':
        return jsonify({'error': 'Loan must be approved before disbursement'}), 400

    acc = accounts_col.find_one({'account_number': loan['account_number']})
    if not acc:
        return jsonify({'error': 'Account not found'}), 404

    new_balance = acc['balance'] + loan['amount']
    accounts_col.update_one(
        {'account_number': loan['account_number']},
        {'$set': {'balance': new_balance, 'updated_at': datetime.utcnow()}}
    )

    txn_id = 'TXN' + datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:17]
    transactions_col.insert_one({
        'txn_id': txn_id,
        'account_number': loan['account_number'],
        'customer_name': loan['customer_name'],
        'type': 'credit',
        'category': 'loan_disbursement',
        'amount': loan['amount'],
        'balance_after': new_balance,
        'description': f'Loan disbursement - {loan["loan_id"]}',
        'status': 'completed',
        'timestamp': datetime.utcnow(),
        'performed_by': request.user['username']
    })

    loans_col.update_one(
        {'loan_id': loan_id},
        {'$set': {'status': 'disbursed', 'disbursed_at': datetime.utcnow(), 'disbursed_by': request.user['username']}}
    )

    return jsonify({'message': 'Loan disbursed successfully', 'amount_credited': loan['amount']})

@loans_bp.route('/<loan_id>/repay', methods=['POST'])
@token_required
def repay_emi(loan_id):
    loan = loans_col.find_one({'loan_id': loan_id})
    if not loan:
        return jsonify({'error': 'Loan not found'}), 404
    if loan['status'] not in ['disbursed', 'active']:
        return jsonify({'error': 'Loan is not active'}), 400

    acc = accounts_col.find_one({'account_number': loan['account_number']})
    emi = loan['emi_amount']

    if acc['balance'] < emi:
        return jsonify({'error': 'Insufficient balance for EMI payment'}), 400

    new_balance = acc['balance'] - emi
    outstanding = max(0, loan.get('outstanding_amount', loan['amount']) - emi)
    paid_emis = loan.get('paid_emis', 0) + 1

    accounts_col.update_one({'account_number': loan['account_number']}, {'$set': {'balance': new_balance}})

    new_status = 'closed' if outstanding <= 0 or paid_emis >= loan['tenure_months'] else 'disbursed'
    loans_col.update_one(
        {'loan_id': loan_id},
        {'$set': {
            'outstanding_amount': outstanding,
            'paid_emis': paid_emis,
            'status': new_status,
            'next_emi_date': datetime.utcnow() + timedelta(days=30)
        }}
    )

    txn_id = 'TXN' + datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:17]
    transactions_col.insert_one({
        'txn_id': txn_id,
        'account_number': loan['account_number'],
        'customer_name': loan['customer_name'],
        'type': 'debit',
        'category': 'loan_repayment',
        'amount': emi,
        'balance_after': new_balance,
        'description': f'EMI payment - {loan_id} (#{paid_emis})',
        'status': 'completed',
        'timestamp': datetime.utcnow(),
        'performed_by': request.user['username']
    })

    return jsonify({
        'message': 'EMI paid successfully',
        'emi_paid': emi,
        'outstanding_amount': outstanding,
        'paid_emis': paid_emis,
        'loan_status': new_status
    })

@loans_bp.route('/stats', methods=['GET'])
@token_required
def loan_stats():
    total = loans_col.count_documents({})
    pending = loans_col.count_documents({'status': 'pending'})
    approved = loans_col.count_documents({'status': 'approved'})
    disbursed = loans_col.count_documents({'status': 'disbursed'})
    closed = loans_col.count_documents({'status': 'closed'})

    pipeline = [{'$group': {'_id': None, 'total_amount': {'$sum': '$amount'}, 'outstanding': {'$sum': '$outstanding_amount'}}}]
    result = list(loans_col.aggregate(pipeline))

    return jsonify({
        'total': total,
        'pending': pending,
        'approved': approved,
        'disbursed': disbursed,
        'closed': closed,
        'total_loan_amount': result[0]['total_amount'] if result else 0,
        'total_outstanding': result[0]['outstanding'] if result else 0
    })
