from pymongo import MongoClient
MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)
db = client.get_database()
print(f'Total leads: {db.leads.count_documents({})}')
print(f'test=True: {db.leads.count_documents({"test": True})}')

# Check if our import actually ran
# Maybe the delete_many at the end of our last check_db run removed them?
# Let me check all counts more carefully
for coll in db.list_collection_names():
    print(f'{coll}: {db[coll].count_documents({})}')
