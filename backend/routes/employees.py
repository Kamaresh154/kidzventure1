from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt
from utils.helpers import admin_required
from bson.objectid import ObjectId
import bcrypt

employees_bp = Blueprint('employees', __name__)


@employees_bp.route('', methods=['GET'])
@jwt_required()
def get_employees():
    current_user = get_jwt()
    db = current_app.config['db']

    if current_user['role'] == 'admin':
        employees = list(db.users.find({'role': 'employee'}, {'password_hash': 0}))
    else:
        employees = list(db.users.find(
            {'role': 'employee', '_id': current_user['sub']},
            {'password_hash': 0}
        ))

    result = []
    for emp in employees:
        emp['_id'] = str(emp['_id'])
        result.append(emp)

    return jsonify({'employees': result})


@employees_bp.route('', methods=['POST'])
@admin_required
def create_employee():
    data = request.get_json()
    db = current_app.config['db']

    email = data.get('email', '').strip().lower()
    if db.users.find_one({'email': email}):
        return jsonify({'error': 'Email already exists'}), 400

    password = data.get('password', 'employee123')
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    emp = {
        'email': email,
        'password_hash': hashed,
        'full_name': data.get('full_name', ''),
        'phone': data.get('phone', ''),
        'role': 'employee',
        'is_active': True,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }

    result = db.users.insert_one(emp)
    emp['_id'] = str(result.inserted_id)
    del emp['password_hash']

    return jsonify({'message': 'Employee created', 'employee': emp}), 201


@employees_bp.route('/<employee_id>', methods=['PUT'])
@admin_required
def update_employee(employee_id):
    data = request.get_json()
    db = current_app.config['db']

    update = {}
    if 'full_name' in data:
        update['full_name'] = data['full_name']
    if 'phone' in data:
        update['phone'] = data['phone']
    if 'is_active' in data:
        update['is_active'] = data['is_active']
    if 'password' in data and data['password']:
        update['password_hash'] = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()

    update['updated_at'] = datetime.utcnow()

    db.users.update_one({'_id': ObjectId(employee_id)}, {'$set': update})
    return jsonify({'message': 'Employee updated'})


@employees_bp.route('/<employee_id>', methods=['DELETE'])
@admin_required
def delete_employee(employee_id):
    db = current_app.config['db']
    db.users.delete_one({'_id': ObjectId(employee_id)})
    return jsonify({'message': 'Employee deleted'})
