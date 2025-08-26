from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError, validate
from typing import cast
from datetime import datetime
from bson import ObjectId
from backend.auth.routes import require_auth
from backend.services.social_service import SocialService

# Create blueprint
skill_sharing_bp = Blueprint('skill_sharing', __name__)

# Validation Schemas
class ShareSkillSchema(Schema):
    skill_id = fields.Str(required=True, validate=validate.Length(min=24, max=24))
    description = fields.Str(required=True, validate=validate.Length(min=10, max=500))
    tags = fields.List(fields.Str(), load_default=list)
    visibility = fields.Str(load_default="public", validate=validate.OneOf(["public", "private"]))
    include_custom_tasks = fields.Bool(load_default=True)

class CustomTaskSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    description = fields.Str(required=True, validate=validate.Length(min=10, max=1000))
    instructions = fields.Str(validate=validate.Length(max=2000))
    resources = fields.List(fields.Url(), load_default=list)
    estimated_time = fields.Int(validate=validate.Range(min=5, max=480))  # 5min to 8hrs
    task_type = fields.Str(required=True, validate=validate.OneOf([
        "reading", "exercise", "project", "video", "quiz"
    ]))

# Error handlers
@skill_sharing_bp.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"error": "Validation failed", "details": err.messages}), 422

@skill_sharing_bp.errorhandler(ValueError)
def handle_value_error(err):
    return jsonify({"error": str(err)}), 400

@skill_sharing_bp.errorhandler(Exception)
def handle_generic_error(err):
    return jsonify({"error": "An unexpected error occurred."}), 500

# Skill Sharing Endpoints
@skill_sharing_bp.route('/share', methods=['POST'])
@require_auth
def share_skill():
    """Share a user's personal skill with the community"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, ShareSkillSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        
        # Get the original skill to share
        original_skill = g.db.plans.find_one({
            "_id": ObjectId(validated_data["skill_id"]),
            "user_id": ObjectId(current_user_id),
            "type": "skill"
        })
        
        if not original_skill:
            return jsonify({"error": "Skill not found or access denied"}), 404
        
        # Create shared skill document
        shared_skill_data = {
            "original_skill_id": original_skill["_id"],
            "shared_by": ObjectId(current_user_id),
            "title": original_skill["title"],
            "description": validated_data["description"],
            "curriculum": original_skill.get("daily_tasks", []),
            "difficulty": original_skill.get("difficulty", "beginner"),
            "category": original_skill.get("category", "general"),
            "tags": validated_data["tags"],
            "visibility": validated_data["visibility"],
            "has_custom_tasks": validated_data["include_custom_tasks"],
            "likes_count": 0,
            "downloads_count": 0,
            "comments_count": 0,
            "views_count": 0,
            "rating": {"average": 0.0, "count": 0},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert into shared_skills collection
        result = g.db.shared_skills.insert_one(shared_skill_data)
        shared_skill_id = str(result.inserted_id)
        
        # Update user's sharing stats
        g.db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {
                "$inc": {"stats.skills_shared": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return jsonify({
            "message": "Skill shared successfully",
            "shared_skill_id": shared_skill_id,
            "url": f"/social/skills/{shared_skill_id}",
            "status": "published",
            "has_custom_tasks": validated_data["include_custom_tasks"]
        }), 201
        
    except ValidationError as e:
        return jsonify({"error": "Invalid input data", "details": e.messages}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to share skill: {str(e)}"}), 500

@skill_sharing_bp.route('/skills/<skill_id>/custom-tasks', methods=['GET'])
def get_skill_custom_tasks(skill_id):
    """Get custom tasks for a shared skill"""
    try:
        day_filter = request.args.get('day', type=int)
        
        # Build query
        query = {"skill_id": ObjectId(skill_id)}
        if day_filter:
            query["day"] = day_filter
        
        # Get custom tasks
        custom_tasks = list(g.db.custom_tasks.find(query).sort("day", 1))
        
        # Convert ObjectIds to strings
        for task in custom_tasks:
            task["_id"] = str(task["_id"])
            task["skill_id"] = str(task["skill_id"])
            task["user_id"] = str(task["user_id"])
        
        return jsonify({
            "message": "Custom tasks retrieved successfully",
            "tasks": custom_tasks,
            "total_count": len(custom_tasks)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get custom tasks: {str(e)}"}), 500

@skill_sharing_bp.route('/skills/<skill_id>/days/<int:day>/tasks', methods=['POST'])
@require_auth
def add_custom_task(skill_id, day):
    """Add a custom task to a specific day of a shared skill"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, CustomTaskSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        
        # Verify skill exists and is shareable
        skill = g.db.shared_skills.find_one({"_id": ObjectId(skill_id)})
        if not skill:
            return jsonify({"error": "Shared skill not found"}), 404
        
        # Check if day is valid (1-30)
        if not 1 <= day <= 30:
            return jsonify({"error": "Day must be between 1 and 30"}), 400
        
        # Check if user already has a custom task for this skill/day
        existing_task = g.db.custom_tasks.find_one({
            "skill_id": ObjectId(skill_id),
            "day": day,
            "user_id": ObjectId(current_user_id)
        })
        
        if existing_task:
            return jsonify({"error": "You already have a custom task for this day"}), 409
        
        # Create custom task document
        custom_task_data = {
            "skill_id": ObjectId(skill_id),
            "day": day,
            "user_id": ObjectId(current_user_id),
            "task": {
                "title": validated_data["title"],
                "description": validated_data["description"],
                "instructions": validated_data.get("instructions", ""),
                "resources": validated_data.get("resources", []),
                "estimated_time": validated_data.get("estimated_time", 60),
                "task_type": validated_data["task_type"]
            },
            "likes_count": 0,
            "usage_count": 0,
            "difficulty_rating": 0.0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert custom task
        result = g.db.custom_tasks.insert_one(custom_task_data)
        task_id = str(result.inserted_id)
        
        # Update shared skill to mark it as having custom tasks
        g.db.shared_skills.update_one(
            {"_id": ObjectId(skill_id)},
            {
                "$set": {
                    "has_custom_tasks": True,
                    "updated_at": datetime.utcnow()
                },
                "$inc": {"custom_tasks_count": 1}
            }
        )
        
        # Update user's contribution stats
        g.db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {
                "$inc": {"stats.custom_tasks_added": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return jsonify({
            "message": "Custom task added successfully",
            "task_id": task_id,
            "skill_id": skill_id,
            "day": day
        }), 201
        
    except ValidationError as e:
        return jsonify({"error": "Invalid task data", "details": e.messages}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to add custom task: {str(e)}"}), 500

@skill_sharing_bp.route('/my-shared-skills', methods=['GET'])
@require_auth
def get_my_shared_skills():
    """Get current user's shared skills"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        # Get user's shared skills
        shared_skills = list(g.db.shared_skills.find({
            "shared_by": ObjectId(current_user_id)
        }).sort("created_at", -1))
        
        # Convert ObjectIds to strings
        for skill in shared_skills:
            skill["_id"] = str(skill["_id"])
            skill["shared_by"] = str(skill["shared_by"])
            skill["original_skill_id"] = str(skill["original_skill_id"])
        
        return jsonify({
            "message": "Shared skills retrieved successfully",
            "skills": shared_skills,
            "total_count": len(shared_skills)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get shared skills: {str(e)}"}), 500

@skill_sharing_bp.route('/skills/<skill_id>', methods=['GET'])
def get_shared_skill_detail(skill_id):
    """Get detailed information about a shared skill"""
    try:
        # Get shared skill with user info
        pipeline = [
            {"$match": {"_id": ObjectId(skill_id)}},
            {"$lookup": {
                "from": "users",
                "localField": "shared_by",
                "foreignField": "_id",
                "as": "author"
            }},
            {"$unwind": "$author"},
            {"$project": {
                "_id": 1,
                "title": 1,
                "description": 1,
                "curriculum": 1,
                "difficulty": 1,
                "category": 1,
                "tags": 1,
                "has_custom_tasks": 1,
                "likes_count": 1,
                "downloads_count": 1,
                "comments_count": 1,
                "views_count": 1,
                "rating": 1,
                "created_at": 1,
                "author": {
                    "_id": "$author._id",
                    "username": "$author.username",
                    "profile_picture": "$author.profile_picture"
                }
            }}
        ]
        
        result = list(g.db.shared_skills.aggregate(pipeline))
        if not result:
            return jsonify({"error": "Shared skill not found"}), 404
        
        skill = result[0]
        skill["_id"] = str(skill["_id"])
        skill["author"]["_id"] = str(skill["author"]["_id"])
        
        # Increment view count
        g.db.shared_skills.update_one(
            {"_id": ObjectId(skill_id)},
            {"$inc": {"views_count": 1}}
        )
        
        return jsonify({
            "message": "Shared skill retrieved successfully",
            "skill": skill
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get shared skill: {str(e)}"}), 500