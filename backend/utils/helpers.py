from datetime import datetime, date
from functools import wraps
from flask import jsonify, g
from flask_jwt_extended import get_jwt, verify_jwt_in_request


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def employee_or_admin(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get('role') not in ('admin', 'employee'):
            return jsonify({'error': 'Access denied'}), 403
        return fn(*args, **kwargs)
    return wrapper


def generate_quotation_no(db):
    today = date.today().strftime('%Y%m%d')
    last = db.quotations.find_one(
        {'quotation_no': {'$regex': f'^QTN-{today}'}},
        sort=[('quotation_no', -1)]
    )
    if last:
        last_num = int(last['quotation_no'].split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    return f'QTN-{today}-{new_num:04d}'


def serialize_doc(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc


def serialize_list(docs):
    return [serialize_doc(doc) for doc in docs]
