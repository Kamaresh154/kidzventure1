from pymongo import MongoClient

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)
db = client.get_database()

total = db.leads.count_documents({})
print(f'Total leads: {total}')

# Remove test leads
db.leads.delete_many({'test': True})
print(f'After removing test leads: {db.leads.count_documents({})}')

# Sample an imported lead
lead = db.leads.find_one({'school_name': {'$ne': ''}})
if lead:
    print(f'\nSample lead:')
    for k, v in sorted(lead.items()):
        if k != '_id':
            print(f'  {k}: {v!r}')
else:
    # Find any lead
    lead = db.leads.find_one()
    if lead:
        print(f'\nAny lead:')
        for k, v in sorted(lead.items()):
            if k != '_id':
                print(f'  {k}: {v!r}')
    else:
        print('NO LEADS FOUND')

# Check leads with phone data
with_phone = db.leads.count_documents({'phone': {'$ne': ''}})
with_email = db.leads.count_documents({'email': {'$ne': ''}})
with_city = db.leads.count_documents({'city': {'$ne': ''}})
with_school = db.leads.count_documents({'school_name': {'$ne': ''}})
print(f'\nWith phone: {with_phone}')
print(f'With email: {with_email}')
print(f'With city: {with_city}')
print(f'With school_name: {with_school}')
