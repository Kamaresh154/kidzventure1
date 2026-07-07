from pymongo import MongoClient

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)
db = client.get_database()

# Remove records with NO school_name AND NO phone (not actionable as leads)
removed = db.leads.delete_many({
    'school_name': {'$in': ['', None]},
    'phone': {'$in': ['', None]},
})
print(f'Removed: {removed.deleted_count}')

remaining = db.leads.count_documents({})
print(f'Remaining: {remaining}')

# Stats
with_school = db.leads.count_documents({'school_name': {'$ne': ''}})
with_phone = db.leads.count_documents({'phone': {'$ne': ''}})
with_city = db.leads.count_documents({'city': {'$ne': ''}})
with_school_head = db.leads.count_documents({'school_head_first_name': {'$ne': ''}})
print(f'With school name: {with_school}')
print(f'With phone: {with_phone}')
print(f'With city: {with_city}')
print(f'With school head: {with_school_head}')

# Sample top 5
samples = list(db.leads.find().sort('created_at', -1).limit(5))
print('\nTop 5 (newest first):')
for s in samples:
    print(f'  name={s.get("name")!r} phone={s.get("phone")!r} city={s.get("city")!r} school={s.get("school_name")!r}')
