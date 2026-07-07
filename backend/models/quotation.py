from datetime import datetime


class Quotation:
    collection_name = 'quotations'

    @staticmethod
    def schema():
        return {
            'quotation_no': str,
            'customer_name': str,
            'customer_phone': str,
            'customer_email': str,
            'items': list,  # [{product_id, name, qty, price, total}]
            'subtotal': float,
            'discount': float,
            'tax': float,
            'grand_total': float,
            'status': str,  # Draft, Sent, Accepted, Rejected
            'created_by': str,
            'created_at': datetime,
            'updated_at': datetime,
        }

    @staticmethod
    def create_indexes(db):
        db.quotations.create_index('quotation_no', unique=True)
        db.quotations.create_index('created_by')
        db.quotations.create_index('created_at')
