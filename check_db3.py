from pymongo import MongoClient

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)
db = client.get_database()
print(f'Database from get_database(): {db.name}')
print(f'Collection names: {db.list_collection_names()}')

# Try explicit database
db2 = client['kidzventure']
count2 = db2.leads.count_documents({})
print(f'Explicit kidzventure leads count: {count2}')

# Check what the import script did - maybe it wrote but the leads are there
all_leads = list(db2.leads.find().limit(2))
print(f'Leads from explicit: {len(all_leads)}')
if all_leads:
    print(f'First lead: {all_leads[0].keys()}')
