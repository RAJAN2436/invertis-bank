from flask import Blueprint, request, jsonify
from database import customers_col, accounts_col, loans_col
from auth_utils import token_required
from datetime import datetime
from bson import ObjectId

customers_bp = Blueprint('customers', __name__)

@customers_bp.route('/', methods=['GET'])
@token_required
def get_customers():
    query = {}
    search = request.args.get('search', '')
    kyc = request.args.get('kyc', '')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))

    if search:
        query['$or'] = [
            {'full_name': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}},
            {'phone': {'$regex': search, '$options': 'i'}},
            {'customer_id': {'$regex': search, '$options': 'i'}}
        ]
    if kyc:
        query['kyc_status'] = kyc

    total = customers_col.count_documents(query)
    customers = list(customers_col.find(query).skip((page-1)*limit).limit(limit).sort('created_at', -1))

    for c in customers:
        c['_id'] = str(c['_id'])
        if c.get('created_at'):
            c['created_at'] = c['created_at'].isoformat()
        # Attach accounts
        accs = list(accounts_col.find({'customer_id': c['customer_id']}, {'_id': 0, 'account_number': 1, 'account_type': 1, 'balance': 1, 'status': 1}))
        c['accounts'] = accs

    return jsonify({'customers': customers, 'total': total, 'page': page})

@customers_bp.route('/<customer_id>', methods=['GET'])
@token_required
def get_customer(customer_id):
    cust = customers_col.find_one({'customer_id': customer_id})
    if not cust:
        try:
            cust = customers_col.find_one({'_id': ObjectId(customer_id)})
        except:
            pass
    if not cust:
        return jsonify({'error': 'Customer not found'}), 404

    cust['_id'] = str(cust['_id'])
    if cust.get('created_at'):
        cust['created_at'] = cust['created_at'].isoformat()

    accounts = list(accounts_col.find({'customer_id': cust['customer_id']}))
    for a in accounts:
        a['_id'] = str(a['_id'])
        if a.get('created_at'):
            a['created_at'] = a['created_at'].isoformat()

    loans = list(loans_col.find({'account_number': {'$in': [a['account_number'] for a in accounts]}}))
    for l in loans:
        l['_id'] = str(l['_id'])
        if l.get('applied_at'):
            l['applied_at'] = l['applied_at'].isoformat()

    return jsonify({'customer': cust, 'accounts': accounts, 'loans': loans})

@customers_bp.route('/<customer_id>/kyc', methods=['PUT'])
@token_required
def update_kyc(customer_id):
    data = request.json
    status = data.get('kyc_status')
    if status not in ['pending', 'verified', 'rejected']:
        return jsonify({'error': 'Invalid KYC status'}), 400
    customers_col.update_one(
        {'customer_id': customer_id},
        {'$set': {'kyc_status': status, 'kyc_updated_by': request.user['username'], 'kyc_updated_at': datetime.utcnow()}}
    )
    return jsonify({'message': f'KYC status updated to {status}'})

@customers_bp.route('/stats', methods=['GET'])
@token_required
def customer_stats():
    total = customers_col.count_documents({})
    verified = customers_col.count_documents({'kyc_status': 'verified'})
    pending = customers_col.count_documents({'kyc_status': 'pending'})
    return jsonify({'total': total, 'kyc_verified': verified, 'kyc_pending': pending})
