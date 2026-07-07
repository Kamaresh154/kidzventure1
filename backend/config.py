import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    _mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/kidzventure')
    MONGO_URI = _mongo_uri + ('&' if '?' in _mongo_uri else '?') + 'maxPoolSize=20&socketTimeoutMS=30000&connectTimeoutMS=10000'
    SECRET_KEY = os.getenv('JWT_SECRET', 'super-secret-key-change-in-production')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET', 'super-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 86400))
    DEBUG = os.getenv('FLASK_DEBUG', '0') == '1'
