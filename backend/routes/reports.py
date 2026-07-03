from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.helpers import admin_required, employee_or_admin

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    current_user = get_jwt_identity()
    db = current_app.config['db']

    today = date.today().isoformat()
    start_of_month = date.today().replace(day=1).isoformat()

    if current_user['role'] == 'admin':
        # Admin dashboard
        total_employees = db.users.count_documents({'role': 'employee', 'is_active': True})
        total_leads = db.leads.count_documents({})
        new_leads_today = db.leads.count_documents({'created_at': {'$gte': datetime.combine(date.today(), datetime.min.time())}})
        total_quotations = db.quotations.count_documents({})
        pending_leaves = db.leave_requests.count_documents({'status': 'Pending'})
        checked_in_today = db.attendance.count_documents({'date': today, 'check_in': {'$ne': ''}})
        total_products = db.products.count_documents({'is_active': True})

        # Monthly quotations total
        month_quotations = list(db.quotations.find({
            'created_at': {'$gte': datetime.combine(date.today().replace(day=1), datetime.min.time())}
        }))
        monthly_revenue = sum(q.get('grand_total', 0) for q in month_quotations)

        # Leads by status
        leads_by_status = list(db.leads.aggregate([
            {'$group': {'_id': '$status', 'count': {'$sum': 1}}}
        ]))

        # Recent leads
        recent_leads = list(db.leads.find().sort('created_at', -1).limit(5))

        # Employee performance
        employee_performance = []
        employees = list(db.users.find({'role': 'employee', 'is_active': True}))
        for emp in employees:
            emp_name = emp.get('full_name', '')
            lead_count = db.leads.count_documents({'assigned_to': emp_name})
            contacted = db.leads.count_documents({'assigned_to': emp_name, 'contacted_count': {'$gt': 0}})
            attendance_today = db.attendance.find_one({'user_id': str(emp['_id']), 'date': today})
            employee_performance.append({
                'name': emp_name,
                'email': emp.get('email', ''),
                'leads_assigned': lead_count,
                'leads_contacted': contacted,
                'checked_in': bool(attendance_today and attendance_today.get('check_in')),
                'checked_in_time': attendance_today.get('check_in', '') if attendance_today else '',
            })

        return jsonify({
            'total_employees': total_employees,
            'total_leads': total_leads,
            'new_leads_today': new_leads_today,
            'total_quotations': total_quotations,
            'pending_leaves': pending_leaves,
            'checked_in_today': checked_in_today,
            'total_products': total_products,
            'monthly_revenue': monthly_revenue,
            'leads_by_status': leads_by_status,
            'recent_leads': [{'name': l.get('name', ''), 'phone': l.get('phone', ''), 'status': l.get('status', '')} for l in recent_leads],
            'employee_performance': employee_performance,
        })

    else:
        # Employee dashboard
        emp_name = current_user['full_name']
        total_leads = db.leads.count_documents({'assigned_to': emp_name})
        contacted_leads = db.leads.count_documents({'assigned_to': emp_name, 'contacted_count': {'$gt': 0}})
        month_leads = db.leads.count_documents({
            'assigned_to': emp_name,
            'created_at': {'$gte': datetime.combine(date.today().replace(day=1), datetime.min.time())}
        })
        my_leaves = db.leave_requests.count_documents({'user_id': current_user['id'], 'status': 'Pending'})
        attendance_today = db.attendance.find_one({'user_id': current_user['id'], 'date': today})

        recent_contacts = list(db.leads.find(
            {'assigned_to': emp_name, 'contacted_count': {'$gt': 0}},
            {'name': 1, 'phone': 1, 'status': 1, 'contacted_count': 1, 'last_contacted': 1}
        ).sort('last_contacted', -1).limit(10))

        return jsonify({
            'total_leads': total_leads,
            'contacted_leads': contacted_leads,
            'month_leads': month_leads,
            'pending_leaves': my_leaves,
            'checked_in': bool(attendance_today and attendance_today.get('check_in')),
            'checked_out': bool(attendance_today and attendance_today.get('check_out')),
            'recent_contacts': [
                {'name': l.get('name', ''), 'phone': l.get('phone', ''), 'status': l.get('status', ''),
                 'count': l.get('contacted_count', 0)}
                for l in recent_contacts
            ],
        })
