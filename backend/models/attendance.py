from datetime import datetime


class Attendance:
    collection_name = 'attendance'

    @staticmethod
    def schema():
        return {
            'user_id': str,
            'user_name': str,
            'date': str,
            'check_in': str,
            'check_out': str,
            'status': str,  # present, absent, half-day
            'notes': str,
            'created_at': datetime,
            'updated_at': datetime,
        }

    @staticmethod
    def create_indexes(db):
        db.attendance.create_index([('user_id', 1), ('date', 1)], unique=True)
