from datetime import datetime


class Product:
    collection_name = 'products'

    @staticmethod
    def schema():
        return {
            'name': str,
            'sku': str,
            'category': str,
            'price': float,
            'cost_price': float,
            'selling_price': float,
            'mrp': float,
            'stock': int,
            'description': str,
            'is_active': bool,
            'created_at': datetime,
            'updated_at': datetime,
        }

    @staticmethod
    def create_indexes(db):
        db.products.create_index('sku', unique=True, sparse=True)
        db.products.create_index('name')
