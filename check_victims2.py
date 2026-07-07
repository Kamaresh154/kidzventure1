from pymongo import MongoClient

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)
db = client.get_database()

# Check if any pre-existing leads (created_by not 'import') would be deleted
pre_existing = list(db.leads.find({'created_by': {'$ne': 'import'}}))
print(f'Pre-existing (not from import): {len(pre_existing)}')
for p in pre_existing:
    print(f'  name={p.get("name")!r} phone={p.get("phone")!r} school_name={p.get("school_name")!r}')

# Would any of them be deleted?
at_risk = [p for p in pre_existing if not p.get('school_name') and not p.get('phone')]
print(f'At risk of deletion: {len(at_risk)}')
