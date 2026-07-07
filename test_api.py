import requests

r = requests.post('https://kidzventure1.onrender.com/api/auth/login',
                  json={'username': 'admin', 'password': 'admin'}, timeout=30)
print('Login:', r.status_code)
if r.status_code != 200:
    print(r.text[:500])
    exit()

token = r.json()['access_token']
r2 = requests.get('https://kidzventure1.onrender.com/api/leads?limit=5',
                  headers={'Authorization': f'Bearer {token}'}, timeout=30)
print('Leads:', r2.status_code)
data = r2.json()
print('Total:', data.get('total'))
for l in data.get('leads', []):
    print(f'  name={l.get("name")!r} phone={l.get("phone")!r} city={l.get("city")!r} email={l.get("email")!r} status={l.get("status")!r}')
