from datetime import datetime


class Lead:
    collection_name = 'leads'

    @staticmethod
    def schema():
        return {
            'name': str,
            'email': str,
            'phone': str,
            'whatsapp': str,
            'address': str,
            'status': str,  # New, Contacted, Follow-up, Converted, Closed
            'assigned_to': str,  # employee name/id
            'notes': str,
            'contacted_count': int,
            'last_contacted': datetime,
            'created_by': str,
            'created_at': datetime,
            'updated_at': datetime,
        }

    @staticmethod
    def create_indexes(db):
        db.leads.create_index('phone')
        db.leads.create_index('assigned_to')
        db.leads.create_index('status')
