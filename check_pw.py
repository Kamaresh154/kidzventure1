import bcrypt

hash_val = b'$2b$12$WlEn0dGWYL8yt3TT4rXwHuIultiMKqWnxgabwQRVP7Npvj4Y7D3se'
for pw in ['admin', 'admin123', 'password', 'kidzventure', 'kidzventure1', 'Kidzventure1']:
    result = bcrypt.checkpw(pw.encode(), hash_val)
    print(f'{pw}: {result}')
