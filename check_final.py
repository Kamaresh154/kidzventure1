from pymongo import MongoClient

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)
db = client.get_database()

total = db.leads.count_documents({})
print(f'Total leads: {total}')

with_school = db.leads.count_documents({'school_name': {'$ne': ''}})
with_phone = db.leads.count_documents({'phone': {'$ne': ''}})
with_city = db.leads.count_documents({'city': {'$ne': ''}})
with_email = db.leads.count_documents({'email': {'$ne': ''}})
with_school_head = db.leads.count_documents({'school_head_first_name': {'$ne': ''}})
with_address = db.leads.count_documents({'address': {'$ne': ''}})
print(f'With school_name: {with_school}')
print(f'With phone: {with_phone}')
print(f'With city: {with_city}')
print(f'With email: {with_email}')
print(f'With school_head: {with_school_head}')
print(f'With address: {with_address}')

# Sample a few
samples = list(db.leads.find().limit(3))
for s in samples:
    print(f'\nSample: {s.get("school_name")}')
    print(f'  phone={s.get("phone")!r}, city={s.get("city")!r}, state={s.get("state")!r}')
    print(f'  head={s.get("school_head_first_name")!r} {s.get("school_head_last_name")!r}')
    print(f'  address={s.get("address")!r}')
