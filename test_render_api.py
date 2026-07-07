import requests

BASE = 'https://kidzventure1.onrender.com/api'

# Login
r = requests.post(f'{BASE}/auth/login', json={'email': 'kidzventure@gmail.com', 'password': 'admin123'}, timeout=30)
print('Login:', r.status_code)
if r.status_code != 200:
    # Try with username
    r = requests.post(f'{BASE}/auth/login', json={'email': 'admin', 'password': 'admin'}, timeout=30)
    print('Login2:', r.status_code)
    if r.status_code != 200:
        print(r.text[:500])
        exit()

token = r.json()['access_token']
print(f'Token: {token[:30]}...')

# Get leads
r2 = requests.get(f'{BASE}/leads?limit=5', headers={'Authorization': f'Bearer {token}'}, timeout=30)
print(f'Leads: {r2.status_code}')
data = r2.json()
print(f'Total: {data.get("total")}')
for l in data.get('leads', []):
    print(f'  _id={l.get("_id")} name={l.get("name")!r} phone={l.get("phone")!r} city={l.get("city")!r} status={l.get("status")!r}')
