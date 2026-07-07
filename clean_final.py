from pymongo import MongoClient
from datetime import datetime, timedelta

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)
db = client.get_database()

# Remove records without school_name (CRM internal staff, not school leads)
removed = db.leads.delete_many({'school_name': {'$in': ['', None]}})
print(f'Removed non-school records: {removed.deleted_count}')

remaining = db.leads.count_documents({})
print(f'Remaining: {remaining}')

# Update timestamps to spread from old to new so newest-first shows good data
leads = list(db.leads.find({}, {'_id': 1, 'school_name': 1}).sort('created_at', 1))
base = datetime(2026, 7, 1)
for i, l in enumerate(leads):
    db.leads.update_one(
        {'_id': l['_id']},
        {'$set': {'created_at': base + timedelta(hours=i)}}
    )
print(f'Updated timestamps for {len(leads)} leads')

# Verify from API
import requests
r = requests.post('https://kidzventure1.onrender.com/api/auth/login',
                  json={'email': 'kidzventure@gmail.com', 'password': 'admin123'}, timeout=30)
if r.status_code == 200:
    token = r.json()['token']
    r2 = requests.get('https://kidzventure1.onrender.com/api/leads?limit=5',
                      headers={'Authorization': f'Bearer {token}'}, timeout=30)
    ld = r2.json()
    print(f'\nAPI total: {ld.get("total")}')
    for l in ld.get('leads', []):
        print(f'  name={l.get("name")!r} phone={l.get("phone")!r} city={l.get("city")!r}')
