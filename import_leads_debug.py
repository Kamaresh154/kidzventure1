import json
from datetime import datetime
from pymongo import MongoClient, InsertOne

MONGO_URI = 'mongodb+srv://kidzventure:kidzventure@cluster0.ufp9o64.mongodb.net/kidzventure?retryWrites=true&w=majority&maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
JSON_PATH = r'C:\Users\NITHESHWAR\Downloads\Master_Merged_Data.json'

def normalize_key(key):
    return str(key).strip().lower().replace(' ', '_').replace('/', '_').replace('-', '_')

def main():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        records = json.load(f)

    print(f'Total records in JSON: {len(records)}')

    client = MongoClient(MONGO_URI)
    db = client.get_database()
    leads = db.leads
    print(f'Connected to DB: {db.name}')
    print(f'Initial leads count: {leads.count_documents({})}')
    print(f'Server info: {client.server_info()["version"]}')

    inserted = 0
    errors = 0
    now = datetime.utcnow()
    ops = []

    def flush():
        nonlocal inserted, ops
        if not ops:
            return
        print(f'Flushing {len(ops)} ops...')
        result = leads.bulk_write(ops)
        c = result.inserted_count
        inserted += c
        print(f'  -> {c} inserted (total: {inserted})')
        ops = []

    for i, rec in enumerate(records):
        try:
            normalized = {normalize_key(k): ('' if v is None else v) for k, v in rec.items()}

            school_name = normalized.get('school_name', '').strip()
            contact_number = normalized.get('contact_number', '')
            school_phone = normalized.get('school_phone', '')
            email = normalized.get('email', '')

            if isinstance(contact_number, (int, float)):
                contact_number = str(int(contact_number))
            if isinstance(school_phone, (int, float)):
                school_phone = str(int(school_phone))

            phone = str(contact_number).strip() if contact_number not in ('', None, 0) else ''
            if not phone:
                phone = str(school_phone).strip() if school_phone not in ('', None, 0) else ''

            doc = {
                'name': school_name or email or f'Record {i+1}',
                'phone': phone,
                'school_name': school_name,
                'email': email,
                'contact_number': contact_number,
                'school_phone': school_phone,
                'whatsapp': phone,
                'status': 'New',
                'contacted_count': 0,
                'last_contacted': None,
                'created_by': 'import',
                'created_at': now,
                'updated_at': now,
            }

            for k, v in normalized.items():
                if k not in ('phone', 'name') and v != '':
                    doc[k] = v

            ops.append(InsertOne(doc))

            if len(ops) >= 500:
                flush()

        except Exception as e:
            errors += 1
            print(f'Error on record {i} ({rec.get("School Name", "?")}): {e}')
            ops = []

    flush()

    final_count = leads.count_documents({})
    print(f'\nTotal inserted: {inserted}')
    print(f'Errors: {errors}')
    print(f'Final leads count: {final_count}')

    # Verify
    if final_count > 0:
        s = leads.find_one()
        print(f'Sample lead name: {s.get("name")}')
        print(f'Sample lead keys: {list(s.keys())}')

    client.close()

if __name__ == '__main__':
    main()
