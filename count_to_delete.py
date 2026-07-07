from pymongo import MongoClient

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)
db = client.get_database()

total = db.leads.count_documents({})
print(f'Total: {total}')

# No school and no phone
no_school_no_phone = db.leads.count_documents({
    'school_name': {'$in': ['', None]},
    'phone': {'$in': ['', None]}
})
print(f'No school AND no phone: {no_school_no_phone}')

# Has school name
has_school = db.leads.count_documents({'school_name': {'$ne': ''}})
print(f'Has school_name: {has_school}')

# Has phone
has_phone = db.leads.count_documents({'phone': {'$ne': ''}})
print(f'Has phone: {has_phone}')

# Has both
has_both = db.leads.count_documents({
    'school_name': {'$ne': ''},
    'phone': {'$ne': ''}
})
print(f'Has school AND phone: {has_both}')

# Has either
has_either = db.leads.count_documents({
    '$or': [
        {'school_name': {'$ne': ''}},
        {'phone': {'$ne': ''}}
    ]
})
print(f'Has school OR phone: {has_either}')
