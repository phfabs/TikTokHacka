from datetime import datetime, timedelta
import jwt
from flask import current_app, g
from werkzeug.exceptions import BadRequest
from bson.objectid import ObjectId

class User:
    @staticmethod
    def create(username: str, email: str, password_hash: str):
        user_data = {
            'username': username,
            'email': email,
            'password_hash': password_hash,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'last_login': None
        }
        result = g.db.users.insert_one(user_data)
        return str(result.inserted_id)

    @staticmethod
    def find_by_username_or_email(identifier: str):
        return g.db.users.find_one({
            '$or': [
                {'username': identifier},
                {'email': identifier}
            ]
        })

    @staticmethod
    def find_by_id(user_id: str):
        try:
            doc = g.db.users.find_one({'_id': ObjectId(user_id)})
            return doc
        except:
            return None

    @staticmethod
    def update_last_login(user_id: str):
        g.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'last_login': datetime.utcnow()}}
        )

    @staticmethod
    def generate_jwt_token(user_id: str):
        payload = {
            'user_id': str(user_id),
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(days=7)
        }
        return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

    @staticmethod
    def verify_jwt_token(token: str):
        try:
            payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            return payload['user_id']
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
        
        