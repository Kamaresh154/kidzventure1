from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.helpers import admin_required, employee_or_admin, serialize_doc, serialize_list
from bson.objectid import ObjectId
import io
import openpyxl

leads_bp = Blueprint('leads', __name__)


@leads_bp.route('', methods=['GET'])
@jwt_required()
def get_leads():
    current_user = get_jwt_identity()
    db = current_app.config['db']

    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    search = request.args.get('search', '')
    status_filter = request.args.get('status', '')

    query = {}
    if current_user['role'] == 'employee':
        query['assigned_to'] = current_user['full_name']
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'phone': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}},
        ]
    if status_filter:
        query['status'] = status_filter

    total = db.leads.count_documents(query)
    leads = list(db.leads.find(query)
                 .sort('created_at', -1)
                 .skip((page - 1) * limit)
                 .limit(limit))

    employees = None
    if current_user['role'] == 'admin':
        employees = list(db.users.find(
            {'role': 'employee', 'is_active': True},
            {'full_name': 1}
        ))

    return jsonify({
        'leads': serialize_list(leads),
        'total': total,
        'page': page,
        'pages': (total + limit - 1) // limit,
        'employees': employees,
    })


@leads_bp.route('', methods=['POST'])
@employee_or_admin
def create_lead():
    current_user = get_jwt_identity()
    data = request.get_json()
    db = current_app.config['db']

    lead = {
        'name': data.get('name', ''),
        'email': data.get('email', ''),
        'phone': data.get('phone', ''),
        'whatsapp': data.get('whatsapp', data.get('phone', '')),
        'address': data.get('address', ''),
        'status': data.get('status', 'New'),
        'assigned_to': data.get('assigned_to', current_user['full_name']),
        'notes': data.get('notes', ''),
        'contacted_count': 0,
        'last_contacted': None,
        'created_by': current_user['full_name'],
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }

    result = db.leads.insert_one(lead)
    lead['_id'] = str(result.inserted_id)

    return jsonify({'message': 'Lead created', 'lead': lead}), 201


@leads_bp.route('/<lead_id>', methods=['GET'])
@jwt_required()
def get_lead(lead_id):
    db = current_app.config['db']
    lead = db.leads.find_one({'_id': ObjectId(lead_id)})
    if not lead:
        return jsonify({'error': 'Lead not found'}), 404
    return jsonify({'lead': serialize_doc(lead)})


@leads_bp.route('/<lead_id>', methods=['PUT'])
@jwt_required()
def update_lead(lead_id):
    current_user = get_jwt_identity()
    data = request.get_json()
    db = current_app.config['db']

    lead = db.leads.find_one({'_id': ObjectId(lead_id)})
    if not lead:
        return jsonify({'error': 'Lead not found'}), 404

    if current_user['role'] == 'employee' and lead.get('assigned_to') != current_user['full_name']:
        return jsonify({'error': 'Not authorized to update this lead'}), 403

    update = {}
    for field in ['name', 'email', 'phone', 'whatsapp', 'address', 'status', 'assigned_to', 'notes']:
        if field in data:
            update[field] = data[field]

    if 'contacted' in data and data['contacted']:
        update['contacted_count'] = (lead.get('contacted_count', 0) + 1)
        update['last_contacted'] = datetime.utcnow()

    update['updated_at'] = datetime.utcnow()

    db.leads.update_one({'_id': ObjectId(lead_id)}, {'$set': update})
    lead = db.leads.find_one({'_id': ObjectId(lead_id)})

    return jsonify({'message': 'Lead updated', 'lead': serialize_doc(lead)})


@leads_bp.route('/<lead_id>', methods=['DELETE'])
@admin_required
def delete_lead(lead_id):
    db = current_app.config['db']
    db.leads.delete_one({'_id': ObjectId(lead_id)})
    return jsonify({'message': 'Lead deleted'})


@leads_bp.route('/import', methods=['POST'])
@admin_required
def import_leads():
    db = current_app.config['db']
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    wb = openpyxl.load_workbook(io.BytesIO(file.read()))
    ws = wb.active

    imported = 0
    duplicates = 0
    skipped = 0
    errors = []

    # Detect header row
    first_row = next(ws.iter_rows(min_row=1, max_row=1, values_only=True), None)
    has_header = first_row and any(str(h).strip().lower() in ('name', 'lead', 'customer', 'contact') for h in first_row if h)

    for i, row in enumerate(ws.iter_rows(min_row=2 if has_header else 1, values_only=True), start=2 if has_header else 1):
        try:
            cells = [c for c in row if c is not None]
            if not cells:
                skipped += 1
                continue

            name = str(cells[0]).strip() if len(cells) > 0 else ''
            phone = str(cells[1]).strip() if len(cells) > 1 else ''
            email = str(cells[2]).strip().lower() if len(cells) > 2 else ''
            whatsapp = str(cells[3]).strip() if len(cells) > 3 else phone
            address = str(cells[4]).strip() if len(cells) > 4 else ''
            status = str(cells[5]).strip() if len(cells) > 5 else 'New'
            assigned_to = str(cells[6]).strip() if len(cells) > 6 else ''

            if not name and not phone:
                skipped += 1
                continue

            if phone and db.leads.find_one({'phone': phone}):
                duplicates += 1
                continue

            lead = {
                'name': name,
                'phone': phone,
                'email': email,
                'whatsapp': whatsapp,
                'address': address,
                'status': status,
                'assigned_to': assigned_to,
                'notes': '',
                'contacted_count': 0,
                'last_contacted': None,
                'created_by': 'import',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            }
            db.leads.insert_one(lead)
            imported += 1
        except Exception as e:
            errors.append(f'Row {i}: {str(e)}')

    return jsonify({
        'message': f'Imported {imported} leads (skipped {skipped}, duplicates {duplicates})',
        'imported': imported,
        'duplicates': duplicates,
        'skipped': skipped,
        'errors': errors,
    })


@leads_bp.route('/export', methods=['GET'])
@admin_required
def export_leads():
    db = current_app.config['db']
    leads = list(db.leads.find().sort('created_at', -1))

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Leads'
    ws.append(['Name', 'Phone', 'Email', 'WhatsApp', 'Address', 'Status', 'Assigned To', 'Contacted Count', 'Last Contacted', 'Notes'])

    for l in leads:
        ws.append([
            l.get('name', ''),
            l.get('phone', ''),
            l.get('email', ''),
            l.get('whatsapp', ''),
            l.get('address', ''),
            l.get('status', ''),
            l.get('assigned_to', ''),
            l.get('contacted_count', 0),
            str(l.get('last_contacted', '') or ''),
            l.get('notes', ''),
        ])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name='leads.xlsx'
    )


@leads_bp.route('/bulk-delete', methods=['POST'])
@admin_required
def bulk_delete_leads():
    db = current_app.config['db']
    data = request.get_json()
    ids = data.get('ids', [])
    if not ids:
        return jsonify({'error': 'No IDs provided'}), 400

    obj_ids = [ObjectId(id) for id in ids]
    result = db.leads.delete_many({'_id': {'$in': obj_ids}})
    return jsonify({'message': f'Deleted {result.deleted_count} leads', 'count': result.deleted_count})


@leads_bp.route('/delete-all', methods=['DELETE'])
@admin_required
def delete_all_leads():
    db = current_app.config['db']
    result = db.leads.delete_many({})
    return jsonify({'message': f'Deleted {result.deleted_count} leads', 'count': result.deleted_count})
