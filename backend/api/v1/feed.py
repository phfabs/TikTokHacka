from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError, validate
from typing import cast
from datetime import datetime
from bson import ObjectId
from backend.auth.routes import require_auth
from backend.services.activity_feed_service import ActivityFeedService
from backend.middleware.cache_middleware import cache_user_specific

# Create blueprint
feed_bp = Blueprint('feed', __name__)

# Validation Schemas
class FeedQuerySchema(Schema):
    limit = fields.Int(load_default=20, validate=validate.Range(min=1, max=100))
    include_own = fields.Bool(load_default=False)

class GlobalFeedQuerySchema(Schema):
    limit = fields.Int(load_default=50, validate=validate.Range(min=1, max=100))

# Error handlers
@feed_bp.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"error": "Validation failed", "details": err.messages}), 422

@feed_bp.errorhandler(ValueError)
def handle_value_error(err):
    return jsonify({"error": str(err)}), 400

@feed_bp.errorhandler(Exception)
def handle_generic_error(err):
    return jsonify({"error": "An unexpected error occurred."}), 500

# Feed endpoints
@feed_bp.route('/', methods=['GET'])
@require_auth
@cache_user_specific(ttl=300)  # Cache for 5 minutes
def get_user_feed():
    """Get personalized activity feed for current user"""
    try:
        # Parse query parameters
        query_params = {
            'limit': request.args.get('limit', 20, type=int),
            'include_own': request.args.get('include_own', 'false').lower() == 'true'
        }
        
        validated_data = cast(dict, FeedQuerySchema().load(query_params))
        current_user_id = str(g.current_user['_id'])
        
        feed_data = ActivityFeedService.generate_user_feed(
            current_user_id,
            limit=validated_data['limit'],
            include_own=validated_data['include_own']
        )
        
        return jsonify({
            "message": "Activity feed retrieved successfully",
            **feed_data
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid query parameters", "details": e.messages}), 400

@feed_bp.route('/global', methods=['GET'])
def get_global_feed():
    """Get global public activity feed"""
    try:
        # Parse query parameters
        query_params = {
            'limit': request.args.get('limit', 50, type=int)
        }
        
        validated_data = cast(dict, GlobalFeedQuerySchema().load(query_params))
        
        feed_data = ActivityFeedService.get_global_feed(
            limit=validated_data['limit']
        )
        
        return jsonify({
            "message": "Global activity feed retrieved successfully",
            **feed_data
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid query parameters", "details": e.messages}), 400

@feed_bp.route('/refresh', methods=['POST'])
@require_auth
def refresh_user_feed():
    """Refresh/invalidate user's activity feed cache"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        # Invalidate cached feed
        ActivityFeedService.invalidate_user_feed(current_user_id)
        
        # Generate fresh feed
        feed_data = ActivityFeedService.generate_user_feed(current_user_id, limit=20)
        
        return jsonify({
            "message": "Activity feed refreshed successfully",
            **feed_data
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to refresh feed: {str(e)}"}), 500

@feed_bp.route('/discovery', methods=['GET'])
@require_auth
def get_discovery_feed():
    """Get discovery feed for exploring new content"""
    try:
        limit = request.args.get('limit', 30, type=int)
        limit = min(limit, 100)  # Cap at 100
        
        current_user_id = str(g.current_user['_id'])
        
        # Generate discovery feed (no following required)
        discovery_data = ActivityFeedService._generate_discovery_feed(current_user_id, limit)
        
        return jsonify({
            "message": "Discovery feed retrieved successfully",
            **discovery_data
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get discovery feed: {str(e)}"}), 500

@feed_bp.route('/trending', methods=['GET'])
def get_trending_feed():
    """Get trending content feed"""
    try:
        limit = request.args.get('limit', 20, type=int)
        limit = min(limit, 50)  # Cap at 50
        
        trending_activities = ActivityFeedService._get_trending_skills(limit)
        
        return jsonify({
            "message": "Trending feed retrieved successfully",
            "activities": trending_activities,
            "total_count": len(trending_activities)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get trending feed: {str(e)}"}), 500

@feed_bp.route('/popular', methods=['GET'])
def get_popular_feed():
    """Get popular content feed"""
    try:
        limit = request.args.get('limit', 20, type=int)
        limit = min(limit, 50)  # Cap at 50
        
        popular_activities = ActivityFeedService._get_popular_activities(limit)
        
        return jsonify({
            "message": "Popular feed retrieved successfully",
            "activities": popular_activities,
            "total_count": len(popular_activities)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get popular feed: {str(e)}"}), 500

# Feed management endpoints
@feed_bp.route('/settings', methods=['GET'])
@require_auth
def get_feed_settings():
    """Get user's feed preferences"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        # Get user's feed settings from database
        user = g.db.users.find_one({"_id": ObjectId(current_user_id)})
        feed_settings = user.get('feed_settings', {}) if user else {}
        
        # Default settings
        default_settings = {
            "show_own_activities": False,
            "show_skill_shares": True,
            "show_likes": True,
            "show_downloads": True,
            "show_comments": True,
            "show_follows": True,
            "content_filters": {
                "categories": [],  # Empty means show all
                "difficulty_levels": []  # Empty means show all
            },
            "notification_frequency": "real_time"  # real_time, daily, weekly
        }
        
        # Merge with user settings
        final_settings = {**default_settings, **feed_settings}
        
        return jsonify({
            "message": "Feed settings retrieved successfully",
            "settings": final_settings
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get feed settings: {str(e)}"}), 500

@feed_bp.route('/settings', methods=['PUT'])
@require_auth
def update_feed_settings():
    """Update user's feed preferences"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        current_user_id = str(g.current_user['_id'])
        
        # Validate settings (basic validation)
        allowed_fields = [
            'show_own_activities', 'show_skill_shares', 'show_likes',
            'show_downloads', 'show_comments', 'show_follows',
            'content_filters', 'notification_frequency'
        ]
        
        settings_update = {}
        for field in allowed_fields:
            if field in data:
                settings_update[field] = data[field]
        
        # Update user settings
        g.db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {"$set": {"feed_settings": settings_update, "updated_at": datetime.utcnow()}}
        )
        
        # Invalidate user's feed cache
        ActivityFeedService.invalidate_user_feed(current_user_id)
        
        return jsonify({
            "message": "Feed settings updated successfully",
            "settings": settings_update
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to update feed settings: {str(e)}"}), 500

# Feed analytics endpoints
@feed_bp.route('/stats', methods=['GET'])
@require_auth
def get_feed_stats():
    """Get feed engagement statistics for current user"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        # Get basic feed stats
        feed_data = ActivityFeedService.generate_user_feed(current_user_id, limit=100)
        activities = feed_data.get("activities", [])
        
        # Analyze activity types
        activity_types = {}
        categories = {}
        for activity in activities:
            activity_type = activity.get("activity_type", "unknown")
            activity_types[activity_type] = activity_types.get(activity_type, 0) + 1
            
            category = activity.get("skill_category")
            if category:
                categories[category] = categories.get(category, 0) + 1
        
        stats = {
            "total_activities": len(activities),
            "activity_breakdown": activity_types,
            "category_breakdown": categories,
            "is_cached": feed_data.get("cached", False),
            "feed_type": "personalized" if activities else "discovery"
        }
        
        return jsonify({
            "message": "Feed statistics retrieved successfully",
            "stats": stats
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get feed stats: {str(e)}"}), 500

# Health check endpoint
@feed_bp.route('/health', methods=['GET'])
def feed_health():
    """Health check for activity feed system"""
    try:
        # Test basic feed generation
        from backend.services.cache_service import CacheService
        
        cache_available = CacheService.is_available()
        
        # Test database connectivity for feed queries
        try:
            g.db.shared_skills.count_documents({"visibility": "public"}, limit=1)
            db_available = True
        except:
            db_available = False
        
        status = "healthy" if (cache_available and db_available) else "degraded"
        
        return jsonify({
            "status": status,
            "message": "Activity feed system operational" if status == "healthy" else "Activity feed system degraded",
            "components": {
                "cache": "available" if cache_available else "unavailable",
                "database": "available" if db_available else "unavailable"
            },
            "timestamp": datetime.utcnow().isoformat()
        }), 200 if status == "healthy" else 503
        
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "message": f"Activity feed system error: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }), 503