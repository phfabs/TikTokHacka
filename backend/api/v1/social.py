from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError, validate
from typing import cast
from datetime import datetime
from backend.auth.routes import require_auth
from backend.services.social_service import SocialService
from backend.services.custom_task_service import CustomTaskService
from backend.services.interaction_service import InteractionService

# Create blueprint
social_bp = Blueprint('social', __name__)

# Validation Schemas
class ShareSkillSchema(Schema):
    skill_id = fields.Str(required=True, validate=validate.Length(min=24, max=24))
    description = fields.Str(required=True, validate=validate.Length(min=10, max=500))
    tags = fields.List(fields.Str(), load_default=[], validate=validate.Length(max=10))
    visibility = fields.Str(load_default="public", validate=validate.OneOf(["public", "private"]))
    include_custom_tasks = fields.Bool(load_default=False)

class CustomTaskSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=5, max=100))
    description = fields.Str(required=True, validate=validate.Length(min=10, max=500))
    instructions = fields.Str(load_default="", validate=validate.Length(max=2000))
    task_type = fields.Str(required=True, validate=validate.OneOf(["reading", "exercise", "project", "video", "quiz"]))
    estimated_time = fields.Int(load_default=60, validate=validate.Range(min=5, max=480))
    resources = fields.List(fields.Dict(), load_default=[])

class VoteTaskSchema(Schema):
    vote_type = fields.Str(required=True, validate=validate.OneOf(["up", "down"]))

class RateSkillSchema(Schema):
    rating = fields.Int(required=True, validate=validate.Range(min=1, max=5))
    review = fields.Str(load_default="", validate=validate.Length(max=500))

class CommentSchema(Schema):
    content = fields.Str(required=True, validate=validate.Length(min=1, max=1000))
    parent_id = fields.Str(load_default=None, validate=validate.Length(min=24, max=24))

# Error handlers
@social_bp.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"error": "Validation failed", "details": err.messages}), 422

@social_bp.errorhandler(ValueError)
def handle_value_error(err):
    return jsonify({"error": str(err)}), 400

@social_bp.errorhandler(Exception)
def handle_generic_error(err):
    return jsonify({"error": "An unexpected error occurred."}), 500

# Routes
@social_bp.route('/skills/share', methods=['POST'])
@require_auth
def share_skill():
    """Share a user's skill with the community"""
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "Invalid JSON"}), 400
    
    validated_data = cast(dict, ShareSkillSchema().load(json_data))
    user_id = str(g.current_user['_id'])
    
    result = SocialService.share_skill(
        user_id=user_id,
        skill_id=validated_data['skill_id'],
        description=validated_data['description'],
        tags=validated_data['tags'],
        visibility=validated_data['visibility'],
        include_custom_tasks=validated_data['include_custom_tasks']
    )
    
    return jsonify({
        "message": "Skill shared successfully",
        "shared_skill": result
    }), 201

@social_bp.route('/skills', methods=['GET'])
def get_shared_skills():
    """Get shared skills with filtering and pagination"""
    # Parse query parameters
    page = request.args.get('page', 1, type=int)
    limit = min(request.args.get('limit', 10, type=int), 50)  # Cap at 50
    
    # Parse filters
    filters = {}
    if request.args.get('category'):
        filters['category'] = request.args.get('category')
    if request.args.get('difficulty'):
        filters['difficulty'] = request.args.get('difficulty')
    if request.args.get('has_custom_tasks'):
        filters['has_custom_tasks'] = request.args.get('has_custom_tasks').lower() == 'true'
    if request.args.get('min_rating'):
        try:
            filters['min_rating'] = float(request.args.get('min_rating'))
        except (ValueError, TypeError):
            pass
    
    result = SocialService.get_shared_skills(filters=filters, page=page, limit=limit)
    
    return jsonify({
        "message": "Shared skills retrieved successfully",
        **result
    }), 200

@social_bp.route('/skills/<skill_id>', methods=['GET'])
def get_shared_skill_detail(skill_id: str):
    """Get detailed information about a shared skill"""
    # Get user_id if authenticated
    user_id = None
    if hasattr(g, 'current_user') and g.current_user:
        user_id = str(g.current_user['_id'])
    
    result = SocialService.get_shared_skill_detail(skill_id, user_id)
    
    return jsonify({
        "message": "Skill details retrieved successfully",
        **result
    }), 200

@social_bp.route('/skills/<skill_id>/download', methods=['POST'])
@require_auth
def download_skill(skill_id: str):
    """Download a shared skill to user's personal collection"""
    user_id = str(g.current_user['_id'])
    
    result = SocialService.download_skill(user_id, skill_id)
    
    return jsonify({
        "message": result["message"],
        "skill_id": result["skill_id"],
        "title": result["title"]
    }), 201

@social_bp.route('/skills/<skill_id>/days/<int:day>/tasks', methods=['POST'])
@require_auth
def add_custom_task(skill_id: str, day: int):
    """Add a custom task to a specific day"""
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "Invalid JSON"}), 400
    
    validated_data = cast(dict, CustomTaskSchema().load(json_data))
    user_id = str(g.current_user['_id'])
    
    result = CustomTaskService.add_custom_task(skill_id, day, user_id, validated_data)
    
    return jsonify({
        "message": "Custom task added successfully",
        "task": result
    }), 201

@social_bp.route('/skills/<skill_id>/custom-tasks', methods=['GET'])
def get_skill_custom_tasks(skill_id: str):
    """Get custom tasks for a skill"""
    day = request.args.get('day', type=int)
    
    result = CustomTaskService.get_skill_custom_tasks(skill_id, day)
    
    return jsonify({
        "message": "Custom tasks retrieved successfully",
        **result
    }), 200

@social_bp.route('/tasks/<task_id>/vote', methods=['POST'])
@require_auth
def vote_on_task(task_id: str):
    """Vote on a custom task"""
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "Invalid JSON"}), 400
    
    validated_data = cast(dict, VoteTaskSchema().load(json_data))
    user_id = str(g.current_user['_id'])
    
    result = CustomTaskService.vote_on_task(task_id, user_id, validated_data['vote_type'])
    
    return jsonify({
        "message": result["message"],
        "vote": result
    }), 200

@social_bp.route('/tasks/<task_id>', methods=['PUT'])
@require_auth
def update_custom_task(task_id: str):
    """Update a custom task (only by creator)"""
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "Invalid JSON"}), 400
    
    user_id = str(g.current_user['_id'])
    
    result = CustomTaskService.update_custom_task(task_id, user_id, json_data)
    
    return jsonify({
        "message": "Custom task updated successfully",
        "task": result
    }), 200

@social_bp.route('/tasks/<task_id>', methods=['DELETE'])
@require_auth
def delete_custom_task(task_id: str):
    """Delete a custom task (only by creator)"""
    user_id = str(g.current_user['_id'])
    
    result = CustomTaskService.delete_custom_task(task_id, user_id)
    
    return jsonify({
        "message": result["message"]
    }), 200

@social_bp.route('/skills/<skill_id>/like', methods=['POST'])
@require_auth
def toggle_like_skill(skill_id: str):
    """Toggle like on a shared skill"""
    user_id = str(g.current_user['_id'])
    
    result = InteractionService.toggle_like(user_id, skill_id)
    
    return jsonify({
        "message": result["message"],
        "like": result
    }), 200

@social_bp.route('/plans/<plan_id>/like', methods=['POST'])
@require_auth
def toggle_like_plan(plan_id: str):
    """Toggle like on a shared skill (legacy endpoint)"""
    user_id = str(g.current_user['_id'])
    
    result = InteractionService.toggle_like(user_id, plan_id)
    
    return jsonify({
        "message": result["message"],
        "like": result
    }), 200

@social_bp.route('/skills/<skill_id>/rate', methods=['POST'])
@require_auth
def rate_skill(skill_id: str):
    """Rate a shared skill"""
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "Invalid JSON"}), 400
    
    validated_data = cast(dict, RateSkillSchema().load(json_data))
    user_id = str(g.current_user['_id'])
    
    result = InteractionService.rate_plan(
        user_id, 
        skill_id, 
        validated_data['rating'], 
        validated_data.get('review')
    )
    
    return jsonify({
        "message": result["message"],
        "rating": result
    }), 200

@social_bp.route('/plans/<plan_id>/rate', methods=['POST'])
@require_auth
def rate_plan(plan_id: str):
    """Rate a shared skill (legacy endpoint)"""
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "Invalid JSON"}), 400
    
    validated_data = cast(dict, RateSkillSchema().load(json_data))
    user_id = str(g.current_user['_id'])
    
    result = InteractionService.rate_plan(
        user_id, 
        plan_id, 
        validated_data['rating'], 
        validated_data.get('review')
    )
    
    return jsonify({
        "message": result["message"],
        "rating": result
    }), 200

@social_bp.route('/skills/<skill_id>/comments', methods=['POST'])
@require_auth
def add_skill_comment(skill_id: str):
    """Add a comment to a shared skill"""
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "Invalid JSON"}), 400
    
    validated_data = cast(dict, CommentSchema().load(json_data))
    user_id = str(g.current_user['_id'])
    
    result = InteractionService.add_comment(
        user_id, 
        skill_id, 
        validated_data['content'],
        validated_data.get('parent_id')
    )
    
    return jsonify({
        "message": result["message"],
        "comment": result
    }), 201

@social_bp.route('/skills/<skill_id>/comments', methods=['GET'])
def get_skill_comments(skill_id: str):
    """Get comments for a shared skill"""
    limit = min(request.args.get('limit', 100, type=int), 200)  # Cap at 200
    
    result = InteractionService.get_comments(skill_id, limit)
    
    return jsonify({
        "message": "Comments retrieved successfully",
        **result
    }), 200

@social_bp.route('/plans/<plan_id>/comments', methods=['POST'])
@require_auth
def add_comment(plan_id: str):
    """Add a comment to a shared skill (legacy endpoint)"""
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "Invalid JSON"}), 400
    
    validated_data = cast(dict, CommentSchema().load(json_data))
    user_id = str(g.current_user['_id'])
    
    result = InteractionService.add_comment(
        user_id, 
        plan_id, 
        validated_data['content'],
        validated_data.get('parent_id')
    )
    
    return jsonify({
        "message": result["message"],
        "comment": result
    }), 201

@social_bp.route('/plans/<plan_id>/comments', methods=['GET'])
def get_comments(plan_id: str):
    """Get comments for a shared skill (legacy endpoint)"""
    limit = min(request.args.get('limit', 100, type=int), 200)  # Cap at 200
    
    result = InteractionService.get_comments(plan_id, limit)
    
    return jsonify({
        "message": "Comments retrieved successfully",
        **result
    }), 200

@social_bp.route('/comments/<comment_id>/like', methods=['POST'])
@require_auth
def toggle_comment_like(comment_id: str):
    """Toggle like on a comment"""
    user_id = str(g.current_user['_id'])
    
    result = InteractionService.toggle_comment_like(user_id, comment_id)
    
    return jsonify({
        "message": result["message"],
        "like": result
    }), 200

@social_bp.route('/trending', methods=['GET'])
def get_trending_skills():
    """Get trending skills"""
    time_period = request.args.get('period', 'week')
    limit = min(request.args.get('limit', 10, type=int), 50)  # Cap at 50
    
    if time_period not in ['day', 'week', 'month']:
        time_period = 'week'
    
    skills = SocialService.get_trending_skills(time_period, limit)
    
    return jsonify({
        "message": "Trending skills retrieved successfully",
        "skills": skills,
        "period": time_period
    }), 200

@social_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get skill categories with counts"""
    categories = SocialService.get_categories()
    
    return jsonify({
        "message": "Categories retrieved successfully",
        "categories": categories
    }), 200

@social_bp.route('/tasks/popular', methods=['GET'])
def get_popular_tasks():
    """Get popular custom tasks across all skills"""
    limit = min(request.args.get('limit', 20, type=int), 50)  # Cap at 50
    
    tasks = CustomTaskService.get_popular_custom_tasks(limit)
    
    return jsonify({
        "message": "Popular custom tasks retrieved successfully",
        "tasks": tasks
    }), 200

@social_bp.route('/my/interactions', methods=['GET'])
@require_auth
def get_my_interactions():
    """Get user's interaction summary"""
    user_id = str(g.current_user['_id'])
    
    result = InteractionService.get_user_interactions_summary(user_id)
    
    return jsonify({
        "message": "User interactions retrieved successfully",
        **result
    }), 200

@social_bp.route('/my/contributions', methods=['GET'])
@require_auth
def get_my_contributions():
    """Get user's custom task contributions"""
    user_id = str(g.current_user['_id'])
    limit = min(request.args.get('limit', 50, type=int), 100)  # Cap at 100
    
    result = CustomTaskService.get_user_task_contributions(user_id, limit)
    
    return jsonify({
        "message": "User contributions retrieved successfully",
        **result
    }), 200

@social_bp.route('/plans/<plan_id>/stats', methods=['GET'])
def get_plan_stats(plan_id: str):
    """Get interaction statistics for a plan"""
    # Get user_id if authenticated
    user_id = None
    if hasattr(g, 'current_user') and g.current_user:
        user_id = str(g.current_user['_id'])
    
    result = InteractionService.get_plan_interaction_summary(plan_id, user_id)
    
    return jsonify({
        "message": "Plan statistics retrieved successfully",
        **result
    }), 200