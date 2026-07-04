from datetime import datetime, date
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt
from utils.helpers import admin_required, employee_or_admin, serialize_doc, serialize_list
from bson.objectid import ObjectId

attendance_bp = Blueprint('attendance', __name__)


@attendance_bp.route('', methods=['GET'])
@jwt_required()
def get_attendance():
    current_user = get_jwt()
    db = current_app.config['db']

    query = {}
    if current_user['role'] == 'employee':
        query['user_id'] = current_user['sub']

    date_from = request.args.get('from', '')
    date_to = request.args.get('to', '')
    if date_from:
        query['date'] = {'$gte': date_from}
    if date_to:
        query.setdefault('date', {})
        query['date']['$lte'] = date_to

    records = list(db.attendance.find(query).sort('date', -1).limit(100))

    return jsonify({'records': serialize_list(records)})


@attendance_bp.route('/check-in', methods=['POST'])
@employee_or_admin
def check_in():
    current_user = get_jwt()
    db = current_app.config['db']
    today = date.today().isoformat()

    existing = db.attendance.find_one({
        'user_id': current_user['sub'],
        'date': today,
    })

    if existing and existing.get('check_in'):
        return jsonify({'error': 'Already checked in today', 'record': serialize_doc(existing)}), 400

    now = datetime.utcnow().strftime('%H:%M:%S')
    record = {
        'user_id': current_user['sub'],
        'user_name': current_user['full_name'],
        'date': today,
        'check_in': now,
        'check_out': '',
        'status': 'present',
        'notes': request.get_json().get('notes', '') if request.get_json() else '',
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }

    if existing:
        db.attendance.update_one({'_id': existing['_id']}, {'$set': {'check_in': now, 'updated_at': datetime.utcnow()}})
        record['_id'] = str(existing['_id'])
    else:
        result = db.attendance.insert_one(record)
        record['_id'] = str(result.inserted_id)

    return jsonify({'message': 'Checked in successfully', 'record': record})


@attendance_bp.route('/check-out', methods=['POST'])
@employee_or_admin
def check_out():
    current_user = get_jwt()
    db = current_app.config['db']
    today = date.today().isoformat()

    existing = db.attendance.find_one({
        'user_id': current_user['sub'],
        'date': today,
    })

    if not existing:
        return jsonify({'error': 'No check-in record found for today'}), 400
    if existing.get('check_out'):
        return jsonify({'error': 'Already checked out today'}), 400

    now = datetime.utcnow().strftime('%H:%M:%S')
    db.attendance.update_one(
        {'_id': existing['_id']},
        {'$set': {'check_out': now, 'updated_at': datetime.utcnow()}}
    )

    existing['check_out'] = now
    return jsonify({'message': 'Checked out successfully', 'record': serialize_doc(existing)})


@attendance_bp.route('/today', methods=['GET'])
@jwt_required()
def get_today_status():
    current_user = get_jwt()
    db = current_app.config['db']
    today = date.today().isoformat()

    record = db.attendance.find_one({
        'user_id': current_user['sub'],
        'date': today,
    })

    return jsonify({
        'record': serialize_doc(record) if record else None,
        'checked_in': bool(record and record.get('check_in')),
        'checked_out': bool(record and record.get('check_out')),
    })
