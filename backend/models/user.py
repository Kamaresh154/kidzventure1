from datetime import datetime


class User:
    collection_name = 'users'

    @staticmethod
    def schema():
        return {
            'email': str,
            'password_hash': str,
            'full_name': str,
            'phone': str,
            'role': str,  # 'admin' or 'employee'
            'is_active': bool,
            'created_at': datetime,
            'updated_at': datetime,
        }

    @staticmethod
    def create_indexes(db):
        db.users.create_index('email', unique=True)
