from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt
from utils.helpers import admin_required, employee_or_admin, generate_quotation_no, serialize_doc, serialize_list
from bson.objectid import ObjectId
import io
import openpyxl

quotations_bp = Blueprint('quotations', __name__)


@quotations_bp.route('', methods=['GET'])
@jwt_required()
def get_quotations():
    current_user = get_jwt()
    db = current_app.config['db']

    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    search = request.args.get('search', '')

    query = {}
    if current_user['role'] == 'employee':
        query['created_by'] = current_user['full_name']
    if search:
        query['$or'] = [
            {'quotation_no': {'$regex': search, '$options': 'i'}},
            {'customer_name': {'$regex': search, '$options': 'i'}},
        ]

    total = db.quotations.count_documents(query)
    quotations = list(db.quotations.find(query)
                      .sort('created_at', -1)
                      .skip((page - 1) * limit)
                      .limit(limit))

    return jsonify({
        'quotations': serialize_list(quotations),
        'total': total,
        'page': page,
        'pages': (total + limit - 1) // limit,
    })


@quotations_bp.route('', methods=['POST'])
@employee_or_admin
def create_quotation():
    current_user = get_jwt()
    data = request.get_json()
    db = current_app.config['db']

    items = data.get('items', [])
    subtotal = sum(float(item.get('qty', 1)) * float(item.get('price', 0)) for item in items)
    discount = float(data.get('discount', 0))
    tax = float(data.get('tax', 0))
    grand_total = subtotal - discount + tax

    quotation = {
        'quotation_no': generate_quotation_no(db),
        'customer_name': data.get('customer_name', ''),
        'customer_phone': data.get('customer_phone', ''),
        'customer_email': data.get('customer_email', ''),
        'items': items,
        'subtotal': subtotal,
        'discount': discount,
        'tax': tax,
        'grand_total': grand_total,
        'status': 'Draft',
        'created_by': current_user['full_name'],
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }

    result = db.quotations.insert_one(quotation)
    quotation['_id'] = str(result.inserted_id)

    return jsonify({'message': 'Quotation created', 'quotation': quotation}), 201


@quotations_bp.route('/<quotation_id>', methods=['GET'])
@jwt_required()
def get_quotation(quotation_id):
    db = current_app.config['db']
    quotation = db.quotations.find_one({'_id': ObjectId(quotation_id)})
    if not quotation:
        return jsonify({'error': 'Quotation not found'}), 404
    return jsonify({'quotation': serialize_doc(quotation)})


@quotations_bp.route('/<quotation_id>', methods=['PUT'])
@jwt_required()
def update_quotation(quotation_id):
    current_user = get_jwt()
    data = request.get_json()
    db = current_app.config['db']

    quotation = db.quotations.find_one({'_id': ObjectId(quotation_id)})
    if not quotation:
        return jsonify({'error': 'Quotation not found'}), 404

    if current_user['role'] == 'employee' and quotation.get('created_by') != current_user['full_name']:
        return jsonify({'error': 'Not authorized'}), 403

    update = {}
    for field in ['customer_name', 'customer_phone', 'customer_email', 'status']:
        if field in data:
            update[field] = data[field]

    if 'items' in data:
        items = data['items']
        subtotal = sum(float(item.get('qty', 1)) * float(item.get('price', 0)) for item in items)
        discount = float(data.get('discount', quotation.get('discount', 0)))
        tax = float(data.get('tax', quotation.get('tax', 0)))
        grand_total = subtotal - discount + tax
        update['items'] = items
        update['subtotal'] = subtotal
        update['discount'] = discount
        update['tax'] = tax
        update['grand_total'] = grand_total
    elif 'discount' in data or 'tax' in data:
        discount = float(data.get('discount', quotation.get('discount', 0)))
        tax = float(data.get('tax', quotation.get('tax', 0)))
        subtotal = quotation.get('subtotal', 0)
        update['discount'] = discount
        update['tax'] = tax
        update['grand_total'] = subtotal - discount + tax

    update['updated_at'] = datetime.utcnow()
    db.quotations.update_one({'_id': ObjectId(quotation_id)}, {'$set': update})
    quotation = db.quotations.find_one({'_id': ObjectId(quotation_id)})

    return jsonify({'message': 'Quotation updated', 'quotation': serialize_doc(quotation)})


@quotations_bp.route('/<quotation_id>', methods=['DELETE'])
@admin_required
def delete_quotation(quotation_id):
    db = current_app.config['db']
    db.quotations.delete_one({'_id': ObjectId(quotation_id)})
    return jsonify({'message': 'Quotation deleted'})


@quotations_bp.route('/export', methods=['GET'])
@admin_required
def export_quotations():
    db = current_app.config['db']
    quotations = list(db.quotations.find().sort('created_at', -1))

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Quotations'
    ws.append(['Quotation No', 'Customer', 'Phone', 'Email', 'Items Count', 'Subtotal', 'Discount', 'Tax', 'Grand Total', 'Status', 'Created By', 'Date'])

    for q in quotations:
        ws.append([
            q.get('quotation_no', ''),
            q.get('customer_name', ''),
            q.get('customer_phone', ''),
            q.get('customer_email', ''),
            len(q.get('items', [])),
            q.get('subtotal', 0),
            q.get('discount', 0),
            q.get('tax', 0),
            q.get('grand_total', 0),
            q.get('status', ''),
            q.get('created_by', ''),
            str(q.get('created_at', '') or ''),
        ])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='quotations.xlsx'
    )
