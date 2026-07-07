from pymongo import MongoClient, InsertOne
from datetime import datetime

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)
db = client.get_database()
print(f'DB name: {db.name}')

# Test insert
result = db.leads.bulk_write([InsertOne({'test': True, 'name': 'test_lead', 'created_at': datetime.utcnow()})])
print(f'Inserted count: {result.inserted_count}')
if result.inserted_count > 0:
    print(f'Inserted ID: {result.inserted_ids}')

count = db.leads.count_documents({'test': True})
print(f'Test lead found: {count}')

# Clean up
db.leads.delete_one({'test': True})
print('Cleaned up')
