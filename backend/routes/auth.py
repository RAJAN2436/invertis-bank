from flask import Blueprint, request, jsonify
from database import users_col, audit_col
from auth_utils import hash_password, verify_password, generate_token, token_required
from datetime import datetime
import re

auth_bp = Blueprint('auth', __name__)

def seed_admin():
    """Create default admin if not exists"""
    if not users_col.find_one({'username': 'admin'}):
        users_col.insert_one({
            'username': 'admin',
            'email': 'admin@invertisbank.com',
            'password': hash_password('Admin@123'),
            'role': 'admin',
            'full_name': 'System Administrator',
            'phone': '9999999999',
            'created_at': datetime.utcnow(),
            'is_active': True,
            'employee_id': 'EMP001'
        })
        print("[OK] Default admin created: admin / Admin@123")

    if not users_col.find_one({'username': 'manager'}):
        users_col.insert_one({
            'username': 'manager',
            'email': 'manager@invertisbank.com',
            'password': hash_password('Manager@123'),
            'role': 'manager',
            'full_name': 'Branch Manager',
            'phone': '9888888888',
            'created_at': datetime.utcnow(),
            'is_active': True,
            'employee_id': 'EMP002'
        })

    if not users_col.find_one({'username': 'teller'}):
        users_col.insert_one({
            'username': 'teller',
            'email': 'teller@invertisbank.com',
            'password': hash_password('Teller@123'),
            'role': 'teller',
            'full_name': 'Bank Teller',
            'phone': '9777777777',
            'created_at': datetime.utcnow(),
            'is_active': True,
            'employee_id': 'EMP003'
        })

seed_admin()

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    user = users_col.find_one({'$or': [{'username': username}, {'email': username}], 'is_active': True})
    if not user or not verify_password(password, user['password']):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = generate_token({
        'user_id': str(user['_id']),
        'username': user['username'],
        'role': user['role'],
        'full_name': user.get('full_name', ''),
        'employee_id': user.get('employee_id', '')
    })

    audit_col.insert_one({
        'user_id': str(user['_id']),
        'username': user['username'],
        'action': 'LOGIN',
        'timestamp': datetime.utcnow(),
        'ip': request.remote_addr
    })

    return jsonify({
        'token': token,
        'user': {
            'id': str(user['_id']),
            'username': user['username'],
            'email': user['email'],
            'role': user['role'],
            'full_name': user.get('full_name', ''),
            'employee_id': user.get('employee_id', '')
        }
    })

@auth_bp.route('/profile', methods=['GET'])
@token_required
def profile():
    from bson import ObjectId
    user = users_col.find_one({'_id': ObjectId(request.user['user_id'])})
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'id': str(user['_id']),
        'username': user['username'],
        'email': user['email'],
        'role': user['role'],
        'full_name': user.get('full_name', ''),
        'phone': user.get('phone', ''),
        'employee_id': user.get('employee_id', ''),
        'created_at': user.get('created_at', '').isoformat() if user.get('created_at') else ''
    })

@auth_bp.route('/staff', methods=['GET'])
@token_required
def get_staff():
    staff = list(users_col.find({'is_active': True}, {'password': 0}))
    for s in staff:
        s['_id'] = str(s['_id'])
        if s.get('created_at'):
            s['created_at'] = s['created_at'].isoformat()
    return jsonify(staff)

@auth_bp.route('/staff', methods=['POST'])
@token_required
def create_staff():
    data = request.json
    required = ['username', 'email', 'password', 'role', 'full_name']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    if users_col.find_one({'$or': [{'username': data['username']}, {'email': data['email']}]}):
        return jsonify({'error': 'Username or email already exists'}), 409

    import random
    emp_id = f"EMP{random.randint(100, 999)}"
    users_col.insert_one({
        'username': data['username'],
        'email': data['email'],
        'password': hash_password(data['password']),
        'role': data['role'],
        'full_name': data['full_name'],
        'phone': data.get('phone', ''),
        'employee_id': emp_id,
        'created_at': datetime.utcnow(),
        'is_active': True
    })
    return jsonify({'message': 'Staff created successfully', 'employee_id': emp_id}), 201

@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password():
    from bson import ObjectId
    data = request.json
    user = users_col.find_one({'_id': ObjectId(request.user['user_id'])})
    if not verify_password(data.get('current_password', ''), user['password']):
        return jsonify({'error': 'Current password incorrect'}), 400
    users_col.update_one(
        {'_id': ObjectId(request.user['user_id'])},
        {'$set': {'password': hash_password(data['new_password'])}}
    )
    return jsonify({'message': 'Password changed successfully'})

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    audit_col.insert_one({
        'user_id': request.user['user_id'],
        'username': request.user['username'],
        'action': 'LOGOUT',
        'timestamp': datetime.utcnow(),
        'ip': request.remote_addr
    })
    return jsonify({'message': 'Logged out successfully'})
