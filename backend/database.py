from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/invertis_bank')

client = MongoClient(MONGO_URI)
db = client.get_database('invertis_bank')

# Collections
users_col = db['users']
accounts_col = db['accounts']
transactions_col = db['transactions']
loans_col = db['loans']
customers_col = db['customers']
audit_col = db['audit_logs']

def get_db():
    return db
