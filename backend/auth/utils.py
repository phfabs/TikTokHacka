import bcrypt
import jwt
import os

try:
    from config import BCRYPT_ROUNDS  # type: ignore
except ModuleNotFoundError:
    BCRYPT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", "12"))

def hash_password(plaintext_password: str) -> str:

    salt = bcrypt.gensalt(BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(plaintext_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def check_password(plaintext_password: str, password_hash: str) -> bool:

    try:
        return bcrypt.checkpw(
            plaintext_password.encode("utf-8"),
            password_hash.encode("utf-8")
        )
    except:
        return False



def verify_password(plaintext_password: str, password_hash: str) -> bool:
    
    return check_password(plaintext_password, password_hash)

def decode_token(token: str):
    """Decode JWT token and return user ID"""
    try:
        secret_key = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
        decoded = jwt.decode(token, secret_key, algorithms=['HS256'])
        return decoded.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
