from flask import Blueprint, request, jsonify, current_app, g
from werkzeug.exceptions import BadRequest
from functools import wraps
import jwt
from backend.auth.models import User
from backend.auth.utils import hash_password, verify_password

auth_bp = Blueprint("auth_bp", __name__, url_prefix="/auth")

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers and request.headers['Authorization'].startswith('Bearer '):
            token = request.headers['Authorization'].split(' ')[1]

        if not token:
            return jsonify({'error': 'Authentication token is missing!'}), 401

        try:
            user_id = User.verify_jwt_token(token)
            if not user_id:
                return jsonify({'error': 'Invalid or expired token!'}), 401
            
            user = User.find_by_id(user_id)
            if not user:
                return jsonify({'error': 'User not found!'}), 401

            g.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token!'}), 401

        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json() or {}
        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not all([username, email, password]):
            return jsonify({'error': 'All fields are required'}), 400
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        if User.find_by_username_or_email(username) or User.find_by_username_or_email(email):
            return jsonify({'error': 'Username or email already exists'}), 409
        pw_hash = hash_password(password)
        user_id = User.create(username, email, pw_hash)
        token = User.generate_jwt_token(user_id)
        return jsonify({
            'message': 'User created successfully',
            'token': token,
            'user': {
                'id': user_id,
                'username': username,
                'email': email
            }
        }), 201
    except Exception as e:
        current_app.logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json() or {}
        identifier = data.get("identifier", "").strip()
        password = data.get("password", "")
        if not all([identifier, password]):
            return jsonify({'error': 'All fields are required'}), 400
        user_doc = User.find_by_username_or_email(identifier)
        if not user_doc or not verify_password(password, user_doc["password_hash"]):
            return jsonify({'error': 'Invalid credentials'}), 401
        User.update_last_login(user_doc['_id'])
        token = User.generate_jwt_token(str(user_doc['_id']))
        user_safe = {
            'id': str(user_doc['_id']),
            'username': user_doc['username'],
            'email': user_doc['email']
        }
        return jsonify({'message': 'Login successful', 'token': token, 'user': user_safe}), 200
    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@auth_bp.route("/verify", methods=["POST"])
def verify_token():
    try:
        data = request.get_json() or {}
        token = data.get('token')
        if not token:
            return jsonify({'error': 'Token required'}), 400
        user_id = User.verify_jwt_token(token)
        if not user_id:
            return jsonify({'error': 'Invalid or expired token'}), 401
        user = User.find_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({
            'valid': True,
            'user': {
                'id': str(user['_id']),
                'username': user['username'],
                'email': user['email']
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Token verification error: {str(e)}")
        return jsonify({'error': 'Token verification failed'}), 500
    