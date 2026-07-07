from pymongo import MongoClient

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)
db = client.get_database()

# Remove records with meaningless data (no school name, no phone, no email, no city)
# These are the CRM internal staff records
removed = db.leads.delete_many({
    '$or': [
        {'name': {'$regex': '^Record '}},
        {'$and': [
            {'school_name': {'$in': ['', None]}},
            {'phone': {'$in': ['', None]}},
            {'email': {'$in': ['', None]}},
        ]}
    ]
})
print(f'Removed meaningless records: {removed.deleted_count}')

remaining = db.leads.count_documents({})
print(f'Remaining leads: {remaining}')

# Update timestamps to spread from oldest to newest so the view is chronological
# and the first page shows school records with names
leads = list(db.leads.find({}, {'_id': 1}).sort('created_at', 1))
from datetime import datetime, timedelta
base = datetime(2026, 1, 1)
for i, l in enumerate(leads):
    db.leads.update_one(
        {'_id': l['_id']},
        {'$set': {'created_at': base + timedelta(hours=i)}}
    )
print(f'Updated timestamps for {len(leads)} leads')

# Verify
samples = list(db.leads.find().sort('created_at', -1).limit(5))
print('\nTop 5 newest:')
for s in samples:
    print(f'  name={s.get("name")!r} phone={s.get("phone")!r} city={s.get("city")!r} school={s.get("school_name")!r}')
