from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError, validate
from typing import cast
from backend.auth.routes import require_auth
from backend.services.follow_service import FollowService

# Create blueprint
follow_bp = Blueprint('follow', __name__)

# Validation Schemas
class FollowUserSchema(Schema):
    user_id = fields.Str(required=True, validate=validate.Length(min=24, max=24))

class BulkUnfollowSchema(Schema):
    user_ids = fields.List(
        fields.Str(validate=validate.Length(min=24, max=24)),
        required=True,
        validate=validate.Length(min=1, max=50)  # Limit bulk operations
    )

class PaginationSchema(Schema):
    limit = fields.Int(load_default=20, validate=validate.Range(min=1, max=100))
    skip = fields.Int(load_default=0, validate=validate.Range(min=0))

# Error handlers
@follow_bp.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"error": "Validation failed", "details": err.messages}), 422

@follow_bp.errorhandler(ValueError)
def handle_value_error(err):
    return jsonify({"error": str(err)}), 400

@follow_bp.errorhandler(Exception)
def handle_generic_error(err):
    return jsonify({"error": "An unexpected error occurred."}), 500

# Routes
@follow_bp.route('/', methods=['POST'])
@require_auth
def follow_user():
    """Follow a user"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, FollowUserSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        target_user_id = validated_data['user_id']
        
        success, message, result_data = FollowService.follow_user(
            current_user_id, target_user_id
        )
        
        if success:
            return jsonify({
                "message": message,
                "data": result_data
            }), 201
        else:
            return jsonify({"error": message}), 400
            
    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400

@follow_bp.route('/<user_id>', methods=['DELETE'])
@require_auth
def unfollow_user(user_id: str):
    """Unfollow a user"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        success, message = FollowService.unfollow_user(current_user_id, user_id)
        
        if success:
            return jsonify({"message": message}), 200
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        return jsonify({"error": f"Failed to unfollow user: {str(e)}"}), 500

@follow_bp.route('/bulk-unfollow', methods=['POST'])
@require_auth
def bulk_unfollow():
    """Unfollow multiple users at once"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, BulkUnfollowSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        
        success, message, result_data = FollowService.bulk_unfollow(
            current_user_id, validated_data['user_ids']
        )
        
        if success:
            return jsonify({
                "message": message,
                "data": result_data
            }), 200
        else:
            return jsonify({"error": message}), 400
            
    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400

@follow_bp.route('/followers', methods=['GET'])
@require_auth
def get_my_followers():
    """Get current user's followers"""
    try:
        # Parse query parameters
        query_params = {
            'limit': request.args.get('limit', 20, type=int),
            'skip': request.args.get('skip', 0, type=int)
        }
        
        validated_data = cast(dict, PaginationSchema().load(query_params))
        current_user_id = str(g.current_user['_id'])
        
        result = FollowService.get_followers(
            current_user_id, 
            validated_data['limit'], 
            validated_data['skip']
        )
        
        return jsonify({
            "message": "Followers retrieved successfully",
            **result
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid query parameters", "details": e.messages}), 400

@follow_bp.route('/following', methods=['GET'])
@require_auth
def get_my_following():
    """Get users current user is following"""
    try:
        # Parse query parameters
        query_params = {
            'limit': request.args.get('limit', 20, type=int),
            'skip': request.args.get('skip', 0, type=int)
        }
        
        validated_data = cast(dict, PaginationSchema().load(query_params))
        current_user_id = str(g.current_user['_id'])
        
        result = FollowService.get_following(
            current_user_id, 
            validated_data['limit'], 
            validated_data['skip']
        )
        
        return jsonify({
            "message": "Following retrieved successfully",
            **result
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid query parameters", "details": e.messages}), 400

@follow_bp.route('/users/<user_id>/followers', methods=['GET'])
@require_auth
def get_user_followers(user_id: str):
    """Get followers of a specific user"""
    try:
        # Parse query parameters
        query_params = {
            'limit': request.args.get('limit', 20, type=int),
            'skip': request.args.get('skip', 0, type=int)
        }
        
        validated_data = cast(dict, PaginationSchema().load(query_params))
        
        result = FollowService.get_followers(
            user_id, 
            validated_data['limit'], 
            validated_data['skip']
        )
        
        return jsonify({
            "message": "User followers retrieved successfully",
            "user_id": user_id,
            **result
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid query parameters", "details": e.messages}), 400

@follow_bp.route('/users/<user_id>/following', methods=['GET'])
@require_auth
def get_user_following(user_id: str):
    """Get users that a specific user is following"""
    try:
        # Parse query parameters
        query_params = {
            'limit': request.args.get('limit', 20, type=int),
            'skip': request.args.get('skip', 0, type=int)
        }
        
        validated_data = cast(dict, PaginationSchema().load(query_params))
        
        result = FollowService.get_following(
            user_id, 
            validated_data['limit'], 
            validated_data['skip']
        )
        
        return jsonify({
            "message": "User following retrieved successfully",
            "user_id": user_id,
            **result
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid query parameters", "details": e.messages}), 400

@follow_bp.route('/status/<user_id>', methods=['GET'])
@require_auth
def get_follow_status(user_id: str):
    """Get follow status with a specific user"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        status = FollowService.get_follow_status(current_user_id, user_id)
        
        return jsonify({
            "message": "Follow status retrieved successfully",
            "user_id": user_id,
            "status": status
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get follow status: {str(e)}"}), 500

@follow_bp.route('/suggestions', methods=['GET'])
@require_auth
def get_follow_suggestions():
    """Get suggested users to follow"""
    try:
        limit = request.args.get('limit', 10, type=int)
        if limit > 50:  # Limit the suggestions
            limit = 50
        
        current_user_id = str(g.current_user['_id'])
        
        result = FollowService.get_follow_suggestions(current_user_id, limit)
        
        return jsonify({
            "message": "Follow suggestions retrieved successfully",
            **result
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get follow suggestions: {str(e)}"}), 500

@follow_bp.route('/mutual/<user_id>', methods=['GET'])
@require_auth
def get_mutual_followers(user_id: str):
    """Get mutual followers with another user"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        result = FollowService.get_mutual_followers(current_user_id, user_id)
        
        return jsonify({
            "message": "Mutual followers retrieved successfully",
            "user_id": user_id,
            **result
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get mutual followers: {str(e)}"}), 500

@follow_bp.route('/stats', methods=['GET'])
@require_auth
def get_follow_stats():
    """Get follow statistics for current user"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        stats = FollowService.get_user_follow_stats(current_user_id)
        
        return jsonify({
            "message": "Follow statistics retrieved successfully",
            "stats": stats
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get follow stats: {str(e)}"}), 500

@follow_bp.route('/users/<user_id>/stats', methods=['GET'])
@require_auth
def get_user_follow_stats(user_id: str):
    """Get follow statistics for a specific user"""
    try:
        stats = FollowService.get_user_follow_stats(user_id)
        
        return jsonify({
            "message": "User follow statistics retrieved successfully",
            "user_id": user_id,
            "stats": stats
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get user follow stats: {str(e)}"}), 500

# Block/Unblock endpoints
@follow_bp.route('/block', methods=['POST'])
@require_auth
def block_user():
    """Block a user"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, FollowUserSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        target_user_id = validated_data['user_id']
        
        success, message = FollowService.block_user(current_user_id, target_user_id)
        
        if success:
            return jsonify({"message": message}), 200
        else:
            return jsonify({"error": message}), 400
            
    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400

@follow_bp.route('/unblock/<user_id>', methods=['DELETE'])
@require_auth
def unblock_user(user_id: str):
    """Unblock a user"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        success, message = FollowService.unblock_user(current_user_id, user_id)
        
        if success:
            return jsonify({"message": message}), 200
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        return jsonify({"error": f"Failed to unblock user: {str(e)}"}), 500