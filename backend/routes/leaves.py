from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt
from utils.helpers import admin_required, employee_or_admin, serialize_doc, serialize_list
from bson.objectid import ObjectId

leaves_bp = Blueprint('leaves', __name__)


@leaves_bp.route('', methods=['GET'])
@jwt_required()
def get_leave_requests():
    current_user = get_jwt()
    db = current_app.config['db']

    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))

    query = {}
    if current_user['role'] == 'employee':
        query['user_id'] = current_user['sub']

    status_filter = request.args.get('status', '')
    if status_filter:
        query['status'] = status_filter

    total = db.leave_requests.count_documents(query)
    leaves = list(db.leave_requests.find(query)
                  .sort('created_at', -1)
                  .skip((page - 1) * limit)
                  .limit(limit))

    return jsonify({
        'leaves': serialize_list(leaves),
        'total': total,
        'page': page,
        'pages': (total + limit - 1) // limit,
    })


@leaves_bp.route('', methods=['POST'])
@employee_or_admin
def apply_leave():
    current_user = get_jwt()
    data = request.get_json()
    db = current_app.config['db']

    leave = {
        'user_id': current_user['sub'],
        'user_name': current_user['full_name'],
        'leave_type': data.get('leave_type', 'Casual'),
        'from_date': data.get('from_date', ''),
        'to_date': data.get('to_date', ''),
        'reason': data.get('reason', ''),
        'status': 'Pending',
        'approved_by': '',
        'approved_at': None,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }

    result = db.leave_requests.insert_one(leave)
    leave['_id'] = str(result.inserted_id)

    return jsonify({'message': 'Leave applied', 'leave': leave}), 201


@leaves_bp.route('/<leave_id>/approve', methods=['POST'])
@admin_required
def approve_leave(leave_id):
    current_user = get_jwt()
    db = current_app.config['db']

    db.leave_requests.update_one(
        {'_id': ObjectId(leave_id)},
        {'$set': {
            'status': 'Approved',
            'approved_by': current_user['full_name'],
            'approved_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }}
    )

    return jsonify({'message': 'Leave approved'})


@leaves_bp.route('/<leave_id>/reject', methods=['POST'])
@admin_required
def reject_leave(leave_id):
    current_user = get_jwt()
    db = current_app.config['db']

    db.leave_requests.update_one(
        {'_id': ObjectId(leave_id)},
        {'$set': {
            'status': 'Rejected',
            'approved_by': current_user['full_name'],
            'approved_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }}
    )

    return jsonify({'message': 'Leave rejected'})


@leaves_bp.route('/<leave_id>', methods=['DELETE'])
@jwt_required()
def delete_leave(leave_id):
    current_user = get_jwt()
    db = current_app.config['db']

    leave = db.leave_requests.find_one({'_id': ObjectId(leave_id)})
    if not leave:
        return jsonify({'error': 'Leave not found'}), 404
    if current_user['role'] == 'employee' and leave.get('user_id') != current_user['sub']:
        return jsonify({'error': 'Not authorized'}), 403

    db.leave_requests.delete_one({'_id': ObjectId(leave_id)})
    return jsonify({'message': 'Leave deleted'})
