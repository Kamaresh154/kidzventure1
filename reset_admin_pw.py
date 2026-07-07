import bcrypt
from pymongo import MongoClient

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
client = MongoClient(MONGO_URI)
db = client.get_database()

admin = db.users.find_one({'role': 'admin'})
print(f'Admin: {admin["email"]}')

# Generate new hash
new_pw = 'admin123'
hashed = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()
db.users.update_one({'_id': admin['_id']}, {'$set': {'password_hash': hashed}})
print(f'Password reset to: {new_pw}')

# Verify
import requests
r = requests.post('https://kidzventure1.onrender.com/api/auth/login',
                  json={'email': 'kidzventure@gmail.com', 'password': 'admin123'}, timeout=30)
print(f'Login test: {r.status_code}')
if r.status_code == 200:
    data = r.json()
    print(f'Token: {data["token"][:30]}...')
    # Check page 1 (newest)
    r2 = requests.get('https://kidzventure1.onrender.com/api/leads?limit=5',
                      headers={'Authorization': f'Bearer {data["token"]}'}, timeout=30)
    print(f'Page 1 (newest): {r2.status_code}')
    ld = r2.json()
    print(f'Total: {ld.get("total")}')
    has_data = 0
    for l in ld.get('leads', []):
        if l.get('name') and not l['name'].startswith('Record'):
            has_data += 1
        print(f'  name={l.get("name")!r} phone={l.get("phone")!r} city={l.get("city")!r}')
    print(f'Records with real names on page 1: {has_data}')

    # Check page 45 (older records that should have data)
    r3 = requests.get('https://kidzventure1.onrender.com/api/leads?limit=5&page=45',
                      headers={'Authorization': f'Bearer {data["token"]}'}, timeout=30)
    print(f'\nPage 45: {r3.status_code}')
    ld3 = r3.json()
    has_data2 = 0
    for l in ld3.get('leads', []):
        if l.get('name') and not l['name'].startswith('Record'):
            has_data2 += 1
        print(f'  name={l.get("name")!r} phone={l.get("phone")!r} city={l.get("city")!r}')
    print(f'Records with real names on page 45: {has_data2}')

    # Search for 'school'
    r4 = requests.get('https://kidzventure1.onrender.com/api/leads?limit=5&search=school',
                      headers={'Authorization': f'Bearer {data["token"]}'}, timeout=30)
    print(f'\nSearch "school": {r4.status_code}')
    ld4 = r4.json()
    for l in ld4.get('leads', []):
        print(f'  name={l.get("name")!r} phone={l.get("phone")!r} city={l.get("city")!r}')
else:
    print(r.text[:300])
