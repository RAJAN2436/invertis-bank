from flask import Blueprint, request, jsonify
from database import accounts_col, transactions_col, loans_col, customers_col, audit_col
from auth_utils import token_required
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/summary', methods=['GET'])
@token_required
def summary():
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_accounts = accounts_col.count_documents({})
    active_accounts = accounts_col.count_documents({'status': 'active'})
    total_customers = customers_col.count_documents({})
    total_loans = loans_col.count_documents({})
    pending_loans = loans_col.count_documents({'status': 'pending'})

    bal_pipeline = [{'$match': {'status': 'active'}}, {'$group': {'_id': None, 'total': {'$sum': '$balance'}}}]
    bal_result = list(accounts_col.aggregate(bal_pipeline))
    total_deposits = bal_result[0]['total'] if bal_result else 0

    dep_today = list(transactions_col.aggregate([
        {'$match': {'type': 'credit', 'category': {'$in': ['deposit', 'initial_deposit']}, 'timestamp': {'$gte': today}}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount'}, 'count': {'$sum': 1}}}
    ]))
    with_today = list(transactions_col.aggregate([
        {'$match': {'type': 'debit', 'category': 'withdrawal', 'timestamp': {'$gte': today}}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount'}, 'count': {'$sum': 1}}}
    ]))

    loan_pipeline = [{'$group': {'_id': None, 'total': {'$sum': '$amount'}}}]
    loan_result = list(loans_col.aggregate(loan_pipeline))
    total_loan_amount = loan_result[0]['total'] if loan_result else 0

    return jsonify({
        'total_accounts': total_accounts,
        'active_accounts': active_accounts,
        'total_customers': total_customers,
        'total_deposits': total_deposits,
        'total_loans': total_loans,
        'pending_loans': pending_loans,
        'total_loan_amount': total_loan_amount,
        'deposits_today': dep_today[0] if dep_today else {'total': 0, 'count': 0},
        'withdrawals_today': with_today[0] if with_today else {'total': 0, 'count': 0}
    })

@dashboard_bp.route('/chart-data', methods=['GET'])
@token_required
def chart_data():
    days = 7
    data = []
    for i in range(days - 1, -1, -1):
        day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        label = day_start.strftime('%d %b')

        deps = list(transactions_col.aggregate([
            {'$match': {'type': 'credit', 'timestamp': {'$gte': day_start, '$lt': day_end}}},
            {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
        ]))
        withs = list(transactions_col.aggregate([
            {'$match': {'type': 'debit', 'timestamp': {'$gte': day_start, '$lt': day_end}}},
            {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
        ]))

        data.append({
            'date': label,
            'deposits': deps[0]['total'] if deps else 0,
            'withdrawals': withs[0]['total'] if withs else 0
        })

    return jsonify(data)

@dashboard_bp.route('/recent-activity', methods=['GET'])
@token_required
def recent_activity():
    txns = list(transactions_col.find({}).sort('timestamp', -1).limit(8))
    for t in txns:
        t['_id'] = str(t['_id'])
        if t.get('timestamp'):
            t['timestamp'] = t['timestamp'].isoformat()

    loans = list(loans_col.find({}).sort('applied_at', -1).limit(5))
    for l in loans:
        l['_id'] = str(l['_id'])
        if l.get('applied_at'):
            l['applied_at'] = l['applied_at'].isoformat()

    return jsonify({'recent_transactions': txns, 'recent_loans': loans})

@dashboard_bp.route('/audit-log', methods=['GET'])
@token_required
def audit_log():
    limit = int(request.args.get('limit', 20))
    logs = list(audit_col.find({}).sort('timestamp', -1).limit(limit))
    for l in logs:
        l['_id'] = str(l['_id'])
        if l.get('timestamp'):
            l['timestamp'] = l['timestamp'].isoformat()
    return jsonify(logs)
