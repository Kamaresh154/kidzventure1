from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
import bcrypt

setup_bp = Blueprint('setup', __name__)


@setup_bp.route('/init', methods=['POST'])
def initialize():
    db = current_app.config['db']

    # Check if admin exists
    if db.users.find_one({'role': 'admin'}):
        return jsonify({'error': 'System already initialized'}), 400

    data = request.get_json() or {}

    # Create admin user
    admin_email = data.get('email', 'admin@kidzventure.com')
    admin_password = data.get('password', 'admin123')
    admin_name = data.get('name', 'Administrator')

    hashed = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt()).decode()
    admin = {
        'email': admin_email,
        'password_hash': hashed,
        'full_name': admin_name,
        'phone': data.get('phone', ''),
        'role': 'admin',
        'is_active': True,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }
    db.users.insert_one(admin)

    return jsonify({
        'message': 'System initialized successfully',
        'admin': {
            'email': admin_email,
            'name': admin_name,
        }
    }), 201


@setup_bp.route('/status', methods=['GET'])
def setup_status():
    db = current_app.config['db']
    admin_exists = db.users.count_documents({'role': 'admin'}) > 0
    return jsonify({
        'initialized': admin_exists,
        'products_count': db.products.count_documents({}),
        'leads_count': db.leads.count_documents({}),
    })
