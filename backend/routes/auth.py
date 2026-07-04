from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt
import bcrypt

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400

        db = current_app.config['db']
        user = db.users.find_one({'email': email})

        if not user or not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
            return jsonify({'error': 'Invalid credentials'}), 401

        if not user.get('is_active', True):
            return jsonify({'error': 'Account is disabled'}), 403

        token = create_access_token(
            identity=str(user['_id']),
            additional_claims={
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user['role'],
            }
        )

        return jsonify({
            'token': token,
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user['role'],
                'phone': user.get('phone', ''),
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    claims = get_jwt()
    return jsonify({'user': {
        'id': claims.get('sub', ''),
        'email': claims.get('email', ''),
        'full_name': claims.get('full_name', ''),
        'role': claims.get('role', ''),
    }})


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    claims = get_jwt()
    data = request.get_json()
    old_pw = data.get('old_password', '')
    new_pw = data.get('new_password', '')

    if not old_pw or not new_pw:
        return jsonify({'error': 'Old and new password required'}), 400

    if len(new_pw) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    db = current_app.config['db']
    user = db.users.find_one({'email': claims.get('email', '')})

    if not bcrypt.checkpw(old_pw.encode(), user['password_hash'].encode()):
        return jsonify({'error': 'Current password is incorrect'}), 401

    hashed = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()
    db.users.update_one(
        {'_id': user['_id']},
        {'$set': {'password_hash': hashed, 'updated_at': datetime.utcnow()}}
    )

    return jsonify({'message': 'Password changed successfully'})
