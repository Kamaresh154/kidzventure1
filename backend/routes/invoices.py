from datetime import datetime, date
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt
from utils.helpers import admin_required, employee_or_admin, serialize_doc, serialize_list
from utils.pdf_utils import generate_document_pdf, format_currency
from bson.objectid import ObjectId
import io
import openpyxl


def generate_invoice_no(db):
    today = date.today().strftime('%Y%m%d')
    last = db.invoices.find_one(
        {'invoice_no': {'$regex': f'^INV-{today}'}},
        sort=[('invoice_no', -1)]
    )
    if last:
        last_num = int(last['invoice_no'].split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    return f'INV-{today}-{new_num:04d}'


invoices_bp = Blueprint('invoices', __name__)


@invoices_bp.route('', methods=['GET'])
@jwt_required()
def get_invoices():
    current_user = get_jwt()
    db = current_app.config['db']

    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    search = request.args.get('search', '')
    status = request.args.get('status', '')

    query = {}
    if current_user['role'] == 'employee':
        query['created_by'] = current_user['full_name']
    if search:
        query['$or'] = [
            {'invoice_no': {'$regex': search, '$options': 'i'}},
            {'customer_name': {'$regex': search, '$options': 'i'}},
        ]
    if status:
        query['payment_status'] = status

    total = db.invoices.count_documents(query)
    invoices = list(db.invoices.find(query)
                    .sort('created_at', -1)
                    .skip((page - 1) * limit)
                    .limit(limit))

    return jsonify({
        'invoices': serialize_list(invoices),
        'total': total,
        'page': page,
        'pages': (total + limit - 1) // limit,
    })


@invoices_bp.route('', methods=['POST'])
@employee_or_admin
def create_invoice():
    current_user = get_jwt()
    data = request.get_json()
    db = current_app.config['db']

    items = data.get('items', [])
    subtotal = sum(float(item.get('qty', 1)) * float(item.get('price', 0)) for item in items)
    discount = float(data.get('discount', 0))
    tax = float(data.get('tax', 0))
    grand_total = subtotal - discount + tax
    amount_paid = float(data.get('amount_paid', 0))
    balance = grand_total - amount_paid

    invoice = {
        'invoice_no': generate_invoice_no(db),
        'customer_name': data.get('customer_name', ''),
        'customer_phone': data.get('customer_phone', ''),
        'customer_email': data.get('customer_email', ''),
        'customer_address': data.get('customer_address', ''),
        'items': items,
        'subtotal': subtotal,
        'discount': discount,
        'tax': tax,
        'grand_total': grand_total,
        'amount_paid': amount_paid,
        'balance': balance,
        'payment_status': 'Paid' if balance <= 0 else ('Partial' if amount_paid > 0 else 'Unpaid'),
        'payment_method': data.get('payment_method', 'Cash'),
        'due_date': data.get('due_date', ''),
        'notes': data.get('notes', ''),
        'status': 'Active',
        'created_by': current_user['full_name'],
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }

    result = db.invoices.insert_one(invoice)
    invoice['_id'] = str(result.inserted_id)

    return jsonify({'message': 'Invoice created', 'invoice': invoice}), 201


@invoices_bp.route('/<invoice_id>', methods=['GET'])
@jwt_required()
def get_invoice(invoice_id):
    db = current_app.config['db']
    invoice = db.invoices.find_one({'_id': ObjectId(invoice_id)})
    if not invoice:
        return jsonify({'error': 'Invoice not found'}), 404
    return jsonify({'invoice': serialize_doc(invoice)})


@invoices_bp.route('/<invoice_id>', methods=['PUT'])
@jwt_required()
def update_invoice(invoice_id):
    current_user = get_jwt()
    data = request.get_json()
    db = current_app.config['db']

    invoice = db.invoices.find_one({'_id': ObjectId(invoice_id)})
    if not invoice:
        return jsonify({'error': 'Invoice not found'}), 404

    if current_user['role'] == 'employee' and invoice.get('created_by') != current_user['full_name']:
        return jsonify({'error': 'Not authorized'}), 403

    update = {}
    for field in ['customer_name', 'customer_phone', 'customer_email', 'customer_address',
                  'payment_method', 'due_date', 'notes', 'status']:
        if field in data:
            update[field] = data[field]

    if 'items' in data:
        items = data['items']
        subtotal = sum(float(item.get('qty', 1)) * float(item.get('price', 0)) for item in items)
        discount = float(data.get('discount', invoice.get('discount', 0)))
        tax = float(data.get('tax', invoice.get('tax', 0)))
        grand_total = subtotal - discount + tax
        amount_paid = float(data.get('amount_paid', invoice.get('amount_paid', 0)))
        balance = grand_total - amount_paid
        update['items'] = items
        update['subtotal'] = subtotal
        update['discount'] = discount
        update['tax'] = tax
        update['grand_total'] = grand_total
        update['amount_paid'] = amount_paid
        update['balance'] = balance
        update['payment_status'] = 'Paid' if balance <= 0 else ('Partial' if amount_paid > 0 else 'Unpaid')
    elif 'amount_paid' in data:
        amount_paid = float(data['amount_paid'])
        grand_total = invoice.get('grand_total', 0)
        balance = grand_total - amount_paid
        update['amount_paid'] = amount_paid
        update['balance'] = balance
        update['payment_status'] = 'Paid' if balance <= 0 else ('Partial' if amount_paid > 0 else 'Unpaid')

    update['updated_at'] = datetime.utcnow()
    db.invoices.update_one({'_id': ObjectId(invoice_id)}, {'$set': update})
    invoice = db.invoices.find_one({'_id': ObjectId(invoice_id)})

    return jsonify({'message': 'Invoice updated', 'invoice': serialize_doc(invoice)})


@invoices_bp.route('/<invoice_id>', methods=['DELETE'])
@admin_required
def delete_invoice(invoice_id):
    db = current_app.config['db']
    db.invoices.delete_one({'_id': ObjectId(invoice_id)})
    return jsonify({'message': 'Invoice deleted'})


@invoices_bp.route('/<invoice_id>/pdf', methods=['GET'])
@jwt_required()
def invoice_pdf(invoice_id):
    db = current_app.config['db']
    inv = db.invoices.find_one({'_id': ObjectId(invoice_id)})
    if not inv:
        return jsonify({'error': 'Invoice not found'}), 404

    customer_lines = [inv.get('customer_name', ''), inv.get('customer_phone', ''), inv.get('customer_email', '')]
    if inv.get('customer_address'):
        customer_lines.append(inv['customer_address'])

    extra_lines = ['Status: ' + (inv.get('payment_status') or '')]
    if inv.get('due_date'):
        extra_lines.append('Due: ' + str(inv['due_date']))
    extra_lines += [
        'Payment: ' + (inv.get('payment_method') or ''),
        'Paid: ' + format_currency(inv.get('amount_paid', 0)),
        'Balance: ' + format_currency(inv.get('balance', 0)),
    ]

    totals = {
        'subtotal': inv.get('subtotal', 0),
        'discount': inv.get('discount', 0),
        'tax': inv.get('tax', 0),
        'grand_total': inv.get('grand_total', 0),
    }

    buf = generate_document_pdf(
        'INVOICE',
        inv.get('invoice_no', ''),
        str(inv.get('created_at', '') or '')[:10],
        customer_lines,
        inv.get('items', []),
        totals,
        extra_lines,
    )

    return send_file(
        buf,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=(inv.get('invoice_no', 'invoice') + '.pdf'),
    )


@invoices_bp.route('/export', methods=['GET'])
@admin_required
def export_invoices():
    db = current_app.config['db']
    invoices = list(db.invoices.find().sort('created_at', -1))

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Invoices'
    ws.append(['Invoice No', 'Customer', 'Phone', 'Amount', 'Paid', 'Balance', 'Status', 'Payment', 'Date'])

    for inv in invoices:
        ws.append([
            inv.get('invoice_no', ''),
            inv.get('customer_name', ''),
            inv.get('customer_phone', ''),
            inv.get('grand_total', 0),
            inv.get('amount_paid', 0),
            inv.get('balance', 0),
            inv.get('payment_status', ''),
            inv.get('payment_method', ''),
            str(inv.get('created_at', '') or ''),
        ])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='invoices.xlsx'
    )
