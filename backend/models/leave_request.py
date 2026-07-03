from datetime import datetime


class LeaveRequest:
    collection_name = 'leave_requests'

    @staticmethod
    def schema():
        return {
            'user_id': str,
            'user_name': str,
            'leave_type': str,  # Sick, Casual, Annual, Other
            'from_date': str,
            'to_date': str,
            'reason': str,
            'status': str,  # Pending, Approved, Rejected
            'approved_by': str,
            'approved_at': datetime,
            'created_at': datetime,
            'updated_at': datetime,
        }

    @staticmethod
    def create_indexes(db):
        db.leave_requests.create_index([('user_id', 1), ('status', 1)])
