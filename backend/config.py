import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/kidzventure')
    SECRET_KEY = os.getenv('JWT_SECRET', 'super-secret-key-change-in-production')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET', 'super-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 86400))
    DEBUG = os.getenv('FLASK_DEBUG', '0') == '1'
