from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError, validate
from typing import cast
from backend.auth.routes import require_auth
from backend.services.user_profile_service import UserProfileService

# Create blueprint
users_bp = Blueprint('users', __name__)

# Validation Schemas
class UpdateProfileSchema(Schema):
    username = fields.Str(validate=validate.Length(min=3, max=30))
    bio = fields.Str(validate=validate.Length(max=500))
    location = fields.Str(validate=validate.Length(max=100))
    website = fields.Url()
    birth_date = fields.Date()
    skills_interests = fields.List(fields.Str(validate=validate.Length(max=50)), 
                                 validate=validate.Length(max=20))
    learning_goals = fields.List(fields.Str(validate=validate.Length(max=100)), 
                               validate=validate.Length(max=10))
    preferred_difficulty = fields.Str(validate=validate.OneOf(['Beginner', 'Intermediate', 'Advanced']))
    timezone = fields.Str(validate=validate.Length(max=50))
    privacy_settings = fields.Dict()

class SearchUsersSchema(Schema):
    query = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    limit = fields.Int(load_default=20, validate=validate.Range(min=1, max=50))
    skip = fields.Int(load_default=0, validate=validate.Range(min=0))

class PaginationSchema(Schema):
    limit = fields.Int(load_default=20, validate=validate.Range(min=1, max=100))
    skip = fields.Int(load_default=0, validate=validate.Range(min=0))

# Error handlers
@users_bp.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"error": "Validation failed", "details": err.messages}), 422

@users_bp.errorhandler(ValueError)
def handle_value_error(err):
    return jsonify({"error": str(err)}), 400

@users_bp.errorhandler(Exception)
def handle_generic_error(err):
    return jsonify({"error": "An unexpected error occurred."}), 500

# Routes
@users_bp.route('/me', methods=['GET'])
@require_auth
def get_my_profile():
    """Get current user's full profile"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        profile = UserProfileService.get_user_profile(current_user_id, include_private=True)
        
        if profile:
            return jsonify({
                "message": "Profile retrieved successfully",
                "profile": profile
            }), 200
        else:
            return jsonify({"error": "Profile not found"}), 404
            
    except Exception as e:
        return jsonify({"error": f"Failed to get profile: {str(e)}"}), 500

@users_bp.route('/me', methods=['PUT'])
@require_auth
def update_my_profile():
    """Update current user's profile"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, UpdateProfileSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        
        success, message, updated_profile = UserProfileService.update_user_profile(
            current_user_id, validated_data
        )
        
        if success:
            return jsonify({
                "message": message,
                "profile": updated_profile
            }), 200
        else:
            return jsonify({"error": message}), 400
            
    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400

@users_bp.route('/<user_id>', methods=['GET'])
@require_auth
def get_user_profile(user_id: str):
    """Get another user's public profile"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        profile = UserProfileService.get_user_profile(
            user_id, 
            viewer_id=current_user_id,
            include_private=False
        )
        
        if profile:
            return jsonify({
                "message": "User profile retrieved successfully",
                "profile": profile
            }), 200
        else:
            return jsonify({"error": "User not found"}), 404
            
    except Exception as e:
        return jsonify({"error": f"Failed to get user profile: {str(e)}"}), 500

@users_bp.route('/search', methods=['GET'])
@require_auth
def search_users():
    """Search for users by username, bio, or skills"""
    try:
        # Parse query parameters
        query_params = {
            'query': request.args.get('query', ''),
            'limit': request.args.get('limit', 20, type=int),
            'skip': request.args.get('skip', 0, type=int)
        }
        
        validated_data = cast(dict, SearchUsersSchema().load(query_params))
        current_user_id = str(g.current_user['_id'])
        
        results = UserProfileService.search_users(
            query=validated_data['query'],
            searcher_id=current_user_id,
            limit=validated_data['limit'],
            skip=validated_data['skip']
        )
        
        return jsonify({
            "message": "User search completed",
            "query": validated_data['query'],
            **results
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid search parameters", "details": e.messages}), 400

@users_bp.route('/leaderboard', methods=['GET'])
@require_auth
def get_user_leaderboard():
    """Get user leaderboard based on various metrics"""
    try:
        leaderboard_type = request.args.get('type', 'overall')  # overall, followers, skills_shared, etc.
        limit = min(request.args.get('limit', 50, type=int), 100)
        
        leaderboard = UserProfileService.get_user_leaderboard(leaderboard_type, limit)
        
        return jsonify({
            "message": "Leaderboard retrieved successfully",
            "leaderboard_type": leaderboard_type,
            "leaderboard": leaderboard
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get leaderboard: {str(e)}"}), 500

@users_bp.route('/me/stats', methods=['GET'])
@require_auth
def get_my_stats():
    """Get detailed statistics for current user"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        stats = UserProfileService.get_user_detailed_stats(current_user_id)
        
        return jsonify({
            "message": "User statistics retrieved successfully",
            "stats": stats
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get user stats: {str(e)}"}), 500

@users_bp.route('/<user_id>/stats', methods=['GET'])
@require_auth
def get_user_stats(user_id: str):
    """Get public statistics for a user"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        stats = UserProfileService.get_user_public_stats(user_id, viewer_id=current_user_id)
        
        return jsonify({
            "message": "User statistics retrieved successfully",
            "user_id": user_id,
            "stats": stats
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get user stats: {str(e)}"}), 500

@users_bp.route('/me/activity', methods=['GET'])
@require_auth
def get_my_activity():
    """Get current user's recent activity"""
    try:
        limit = min(request.args.get('limit', 50, type=int), 100)
        activity_types = request.args.getlist('types')  # Filter by activity types
        
        current_user_id = str(g.current_user['_id'])
        
        activity = UserProfileService.get_user_activity(
            current_user_id, 
            limit=limit,
            activity_types=activity_types if activity_types else None
        )
        
        return jsonify({
            "message": "User activity retrieved successfully",
            **activity
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get user activity: {str(e)}"}), 500

@users_bp.route('/<user_id>/activity', methods=['GET'])
@require_auth
def get_user_activity(user_id: str):
    """Get public activity for a user"""
    try:
        limit = min(request.args.get('limit', 20, type=int), 50)  # Lower limit for other users
        current_user_id = str(g.current_user['_id'])
        
        activity = UserProfileService.get_user_public_activity(
            user_id, 
            viewer_id=current_user_id,
            limit=limit
        )
        
        return jsonify({
            "message": "User activity retrieved successfully",
            "user_id": user_id,
            **activity
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get user activity: {str(e)}"}), 500

@users_bp.route('/me/achievements', methods=['GET'])
@require_auth
def get_my_achievements():
    """Get current user's achievements and badges"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        achievements = UserProfileService.get_user_achievements(current_user_id)
        
        return jsonify({
            "message": "User achievements retrieved successfully",
            **achievements
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get achievements: {str(e)}"}), 500

@users_bp.route('/<user_id>/achievements', methods=['GET'])
@require_auth
def get_user_achievements(user_id: str):
    """Get public achievements for a user"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        achievements = UserProfileService.get_user_public_achievements(
            user_id, viewer_id=current_user_id
        )
        
        return jsonify({
            "message": "User achievements retrieved successfully",
            "user_id": user_id,
            **achievements
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get user achievements: {str(e)}"}), 500

@users_bp.route('/me/privacy', methods=['PUT'])
@require_auth
def update_privacy_settings():
    """Update user's privacy settings"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        current_user_id = str(g.current_user['_id'])
        
        success, message, updated_settings = UserProfileService.update_privacy_settings(
            current_user_id, data
        )
        
        if success:
            return jsonify({
                "message": message,
                "privacy_settings": updated_settings
            }), 200
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        return jsonify({"error": f"Failed to update privacy settings: {str(e)}"}), 500

@users_bp.route('/trending', methods=['GET'])
@require_auth
def get_trending_users():
    """Get trending users based on recent activity"""
    try:
        limit = min(request.args.get('limit', 20, type=int), 50)
        time_period = request.args.get('period', 'week')  # week, month, all_time
        
        trending_users = UserProfileService.get_trending_users(
            limit=limit,
            time_period=time_period
        )
        
        return jsonify({
            "message": "Trending users retrieved successfully",
            "time_period": time_period,
            **trending_users
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get trending users: {str(e)}"}), 500

@users_bp.route('/recommendations', methods=['GET'])
@require_auth
def get_user_recommendations():
    """Get user recommendations based on interests and activity"""
    try:
        current_user_id = str(g.current_user['_id'])
        limit = min(request.args.get('limit', 10, type=int), 20)
        
        recommendations = UserProfileService.get_user_recommendations(
            current_user_id, limit=limit
        )
        
        return jsonify({
            "message": "User recommendations retrieved successfully",
            **recommendations
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get user recommendations: {str(e)}"}), 500

# Profile verification endpoints
@users_bp.route('/me/verify-email', methods=['POST'])
@require_auth
def request_email_verification():
    """Request email verification for current user"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        success, message = UserProfileService.request_email_verification(current_user_id)
        
        if success:
            return jsonify({"message": message}), 200
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        return jsonify({"error": f"Failed to request email verification: {str(e)}"}), 500

@users_bp.route('/verify-email/<token>', methods=['POST'])
def verify_email(token: str):
    """Verify email with verification token"""
    try:
        success, message, user_data = UserProfileService.verify_email(token)
        
        if success:
            return jsonify({
                "message": message,
                "user": user_data
            }), 200
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        return jsonify({"error": f"Failed to verify email: {str(e)}"}), 500

@users_bp.route('/me/deactivate', methods=['POST'])
@require_auth
def deactivate_account():
    """Deactivate user account (soft delete)"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason', '')
        current_user_id = str(g.current_user['_id'])
        
        success, message = UserProfileService.deactivate_account(current_user_id, reason)
        
        if success:
            return jsonify({"message": message}), 200
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        return jsonify({"error": f"Failed to deactivate account: {str(e)}"}), 500