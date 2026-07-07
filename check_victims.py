from pymongo import MongoClient

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)
db = client.get_database()

# Check total before
total = db.leads.count_documents({})
print(f'Total before: {total}')

# Check what would be deleted
victims = list(db.leads.find({
    'school_name': {'$in': ['', None]},
    'phone': {'$in': ['', None]}
}).limit(10))
print(f'Would be deleted (sample): {len(victims)}')
for v in victims:
    print(f'  name={v.get("name")!r} phone={v.get("phone")!r} school_name={v.get("school_name")!r} email={v.get("email")!r}')
