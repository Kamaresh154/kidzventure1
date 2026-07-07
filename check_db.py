from pymongo import MongoClient

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)
db = client.get_database()

total = db.leads.count_documents({})
imported = db.leads.count_documents({'imported': True})
print(f'Total leads: {total}')
print(f'imported=True: {imported}')

sample = db.leads.find_one()
if sample:
    print(f'Sample keys: {sorted(sample.keys())}')
    has_imported = 'imported' in sample
    print(f'Has imported key: {has_imported}')
    if has_imported:
        print(f'imported value: {sample["imported"]!r}')
    # Show first 10 keys
    for k, v in list(sample.items())[:15]:
        print(f'  {k}: {v!r}')
