from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError, validate
from typing import cast
from backend.services.search_service import SearchService

# Create blueprint
discovery_bp = Blueprint('discovery', __name__)

# Validation Schemas
class SearchSchema(Schema):
    q = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    category = fields.Str(load_default=None)
    difficulty = fields.Str(load_default=None, validate=validate.OneOf(["beginner", "intermediate", "advanced"]))
    has_custom_tasks = fields.Bool(load_default=None)
    min_rating = fields.Float(load_default=None, validate=validate.Range(min=0, max=5))
    page = fields.Int(load_default=1, validate=validate.Range(min=1))
    limit = fields.Int(load_default=10, validate=validate.Range(min=1, max=50))

class AdvancedSearchSchema(Schema):
    title = fields.Str(load_default=None, validate=validate.Length(max=100))
    description = fields.Str(load_default=None, validate=validate.Length(max=200))
    category = fields.Str(load_default=None)
    difficulty = fields.Str(load_default=None, validate=validate.OneOf(["beginner", "intermediate", "advanced"]))
    tags = fields.List(fields.Str(), load_default=[])
    min_rating = fields.Float(load_default=None, validate=validate.Range(min=0, max=5))
    has_custom_tasks = fields.Bool(load_default=None)
    created_after = fields.Str(load_default=None)  # ISO date string

class SuggestionsSchema(Schema):
    q = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    limit = fields.Int(load_default=5, validate=validate.Range(min=1, max=10))

class TaskSearchSchema(Schema):
    q = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    skill_id = fields.Str(load_default=None, validate=validate.Length(min=24, max=24))
    limit = fields.Int(load_default=20, validate=validate.Range(min=1, max=50))

# Error handlers
@discovery_bp.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"error": "Validation failed", "details": err.messages}), 422

@discovery_bp.errorhandler(ValueError)
def handle_value_error(err):
    return jsonify({"error": str(err)}), 400

@discovery_bp.errorhandler(Exception)
def handle_generic_error(err):
    return jsonify({"error": "An unexpected error occurred."}), 500

# Routes
@discovery_bp.route('/search', methods=['GET'])
def search_skills():
    """Search skills with filters and pagination"""
    try:
        # Parse query parameters
        query_params = {
            'q': request.args.get('q', '').strip(),
            'category': request.args.get('category'),
            'difficulty': request.args.get('difficulty'),
            'has_custom_tasks': request.args.get('has_custom_tasks'),
            'min_rating': request.args.get('min_rating'),
            'page': request.args.get('page', 1, type=int),
            'limit': request.args.get('limit', 10, type=int)
        }
        
        # Remove None values
        query_params = {k: v for k, v in query_params.items() if v is not None}
        
        # Validate
        validated_data = cast(dict, SearchSchema().load(query_params))
        
        # Extract filters
        filters = {}
        for key in ['category', 'difficulty', 'has_custom_tasks', 'min_rating']:
            if key in validated_data and validated_data[key] is not None:
                filters[key] = validated_data[key]
        
        # Perform search
        result = SearchService.search_skills(
            query=validated_data['q'],
            filters=filters if filters else None,
            page=validated_data['page'],
            limit=validated_data['limit']
        )
        
        return jsonify({
            "message": "Search completed successfully",
            **result
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid search parameters", "details": e.messages}), 400

@discovery_bp.route('/search/suggestions', methods=['GET'])
def get_search_suggestions():
    """Get search suggestions based on partial query"""
    try:
        query_params = {
            'q': request.args.get('q', '').strip(),
            'limit': request.args.get('limit', 5, type=int)
        }
        
        validated_data = cast(dict, SuggestionsSchema().load(query_params))
        
        suggestions = SearchService.get_search_suggestions(
            query=validated_data['q'],
            limit=validated_data['limit']
        )
        
        return jsonify({
            "message": "Suggestions retrieved successfully",
            "query": validated_data['q'],
            "suggestions": suggestions
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid suggestion parameters", "details": e.messages}), 400

@discovery_bp.route('/search/advanced', methods=['POST'])
def advanced_search():
    """Perform advanced search with multiple criteria"""
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "Invalid JSON"}), 400
    
    validated_data = cast(dict, AdvancedSearchSchema().load(json_data))
    
    # Remove None values
    criteria = {k: v for k, v in validated_data.items() if v is not None and v != []}
    
    if not criteria:
        return jsonify({"error": "At least one search criteria is required"}), 400
    
    result = SearchService.advanced_search(criteria)
    
    return jsonify({
        "message": "Advanced search completed successfully",
        **result
    }), 200

@discovery_bp.route('/search/tasks', methods=['GET'])
def search_custom_tasks():
    """Search custom tasks by content"""
    try:
        query_params = {
            'q': request.args.get('q', '').strip(),
            'skill_id': request.args.get('skill_id'),
            'limit': request.args.get('limit', 20, type=int)
        }
        
        # Remove None values
        query_params = {k: v for k, v in query_params.items() if v is not None}
        
        validated_data = cast(dict, TaskSearchSchema().load(query_params))
        
        tasks = SearchService.search_custom_tasks(
            query=validated_data['q'],
            skill_id=validated_data.get('skill_id'),
            limit=validated_data['limit']
        )
        
        return jsonify({
            "message": "Custom tasks search completed successfully",
            "query": validated_data['q'],
            "skill_id": validated_data.get('skill_id'),
            "tasks": tasks,
            "count": len(tasks)
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid task search parameters", "details": e.messages}), 400

@discovery_bp.route('/trending', methods=['GET'])
def get_trending():
    """Get trending search terms and topics"""
    days = min(request.args.get('days', 7, type=int), 30)  # Cap at 30 days
    limit = min(request.args.get('limit', 10, type=int), 20)  # Cap at 20
    
    trending = SearchService.get_trending_searches(days, limit)
    
    return jsonify({
        "message": "Trending topics retrieved successfully",
        "trending": trending,
        "period_days": days
    }), 200

@discovery_bp.route('/filters', methods=['GET'])
def get_filter_options():
    """Get available filter options for search"""
    options = SearchService.get_filter_options()
    
    return jsonify({
        "message": "Filter options retrieved successfully",
        "filters": options
    }), 200

@discovery_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get skill categories with counts"""
    from backend.services.social_service import SocialService
    
    categories = SocialService.get_categories()
    
    return jsonify({
        "message": "Categories retrieved successfully",
        "categories": categories
    }), 200

@discovery_bp.route('/popular', methods=['GET'])
def get_popular_content():
    """Get popular content across different types"""
    content_type = request.args.get('type', 'skills')  # skills, tasks, categories
    limit = min(request.args.get('limit', 10, type=int), 50)  # Cap at 50
    time_period = request.args.get('period', 'week')  # day, week, month
    
    if content_type == 'skills':
        from backend.services.social_service import SocialService
        content = SocialService.get_trending_skills(time_period, limit)
        
    elif content_type == 'tasks':
        from backend.services.custom_task_service import CustomTaskService
        content = CustomTaskService.get_popular_custom_tasks(limit)
        
    elif content_type == 'categories':
        from backend.services.social_service import SocialService
        content = SocialService.get_categories()
        content = content[:limit]  # Limit categories
        
    else:
        return jsonify({"error": "Invalid content type. Must be 'skills', 'tasks', or 'categories'"}), 400
    
    return jsonify({
        "message": f"Popular {content_type} retrieved successfully",
        "type": content_type,
        "period": time_period if content_type != 'categories' else None,
        "content": content
    }), 200

@discovery_bp.route('/stats', methods=['GET'])
def get_discovery_stats():
    """Get discovery and search statistics"""
    from flask import g
    
    # Get basic counts
    total_skills = g.db.shared_skills.count_documents({"visibility": "public"})
    total_tasks = g.db.custom_tasks.count_documents({})
    
    # Get category distribution
    category_pipeline = [
        {"$match": {"visibility": "public"}},
        {"$group": {
            "_id": "$category",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    
    top_categories = list(g.db.shared_skills.aggregate(category_pipeline))
    
    # Get difficulty distribution
    difficulty_pipeline = [
        {"$match": {"visibility": "public"}},
        {"$group": {
            "_id": "$difficulty",
            "count": {"$sum": 1}
        }}
    ]
    
    difficulty_dist = list(g.db.shared_skills.aggregate(difficulty_pipeline))
    
    # Get enhanced skills count
    enhanced_skills = g.db.shared_skills.count_documents({
        "visibility": "public",
        "has_custom_tasks": True
    })
    
    return jsonify({
        "message": "Discovery statistics retrieved successfully",
        "stats": {
            "total_skills": total_skills,
            "total_custom_tasks": total_tasks,
            "enhanced_skills": enhanced_skills,
            "standard_skills": total_skills - enhanced_skills,
            "top_categories": [
                {"category": cat["_id"], "count": cat["count"]}
                for cat in top_categories
            ],
            "difficulty_distribution": [
                {"difficulty": diff["_id"], "count": diff["count"]}
                for diff in difficulty_dist
            ]
        }
    }), 200

@discovery_bp.route('/recent', methods=['GET'])
def get_recent_content():
    """Get recently shared skills and tasks"""
    content_type = request.args.get('type', 'skills')  # skills, tasks, comments
    limit = min(request.args.get('limit', 10, type=int), 50)  # Cap at 50
    
    if content_type == 'skills':
        from backend.services.social_service import SocialService
        
        # Get recent skills
        result = SocialService.get_shared_skills(filters=None, page=1, limit=limit)
        content = result['skills']
        
    elif content_type == 'tasks':
        from backend.services.custom_task_service import CustomTaskService
        
        # Get recent popular tasks (they're already sorted by creation date)
        content = CustomTaskService.get_popular_custom_tasks(limit)
        
    elif content_type == 'comments':
        from backend.services.interaction_service import InteractionService
        
        # Get recent comments across all plans
        recent_comments = list(g.db.plan_comments.find({})
                             .sort("created_at", -1)
                             .limit(limit))
        
        # Add user info to comments
        for comment in recent_comments:
            user_id = str(comment["user_id"])
            from backend.auth.models import User
            user = User.find_by_id(user_id)
            if user:
                comment["user_info"] = {
                    "user_id": user_id,
                    "username": user.get("username", "Unknown"),
                    "avatar_url": f"https://ui-avatars.com/api/?name={user.get('username', 'U')}&background=8B5CF6&color=fff&size=40"
                }
            else:
                comment["user_info"] = {
                    "user_id": user_id,
                    "username": "Unknown User",
                    "avatar_url": "https://ui-avatars.com/api/?name=U&background=8B5CF6&color=fff&size=40"
                }
        
        content = recent_comments
        
    else:
        return jsonify({"error": "Invalid content type. Must be 'skills', 'tasks', or 'comments'"}), 400
    
    return jsonify({
        "message": f"Recent {content_type} retrieved successfully",
        "type": content_type,
        "content": content
    }), 200