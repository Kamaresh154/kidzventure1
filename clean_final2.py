from pymongo import MongoClient

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)
db = client.get_database()

removed = db.leads.delete_many({'school_name': {'$in': ['', None]}})
print(f'Removed non-school records: {removed.deleted_count}')

remaining = db.leads.count_documents({})
print(f'Remaining: {remaining}')
