from pymongo import MongoClient

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)

# Check all databases
dbs = client.list_database_names()
print('Databases:', dbs)

for db_name in dbs:
    db = client[db_name]
    colls = db.list_collection_names()
    print(f'\n{db_name} collections: {colls}')
    if 'leads' in colls:
        count = db.leads.count_documents({})
        print(f'  leads count: {count}')
        if count > 0:
            s = db.leads.find_one()
            print(f'  sample: {list(s.keys())[:10]}')
