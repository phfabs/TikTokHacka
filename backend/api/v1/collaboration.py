from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError, validate
from typing import cast
from datetime import datetime, timedelta
from bson import ObjectId
from backend.auth.routes import require_auth

# Create blueprint
collaboration_bp = Blueprint('collaboration', __name__)

# Validation Schemas
class CreateGroupSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    description = fields.Str(load_default="", validate=validate.Length(max=500))
    skill_id = fields.Str(required=True, validate=validate.Length(min=24, max=24))
    privacy = fields.Str(load_default="public", validate=validate.OneOf(["public", "private", "invite_only"]))
    max_members = fields.Int(load_default=50, validate=validate.Range(min=2, max=100))

class JoinGroupSchema(Schema):
    invitation_code = fields.Str(validate=validate.Length(min=8, max=8))

class UpdateGroupSchema(Schema):
    name = fields.Str(validate=validate.Length(min=3, max=100))
    description = fields.Str(validate=validate.Length(max=500))
    privacy = fields.Str(validate=validate.OneOf(["public", "private", "invite_only"]))
    max_members = fields.Int(validate=validate.Range(min=2, max=100))

class CreateDiscussionSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=5, max=200))
    content = fields.Str(required=True, validate=validate.Length(min=10, max=2000))
    tags = fields.List(fields.Str(), load_default=[], validate=validate.Length(max=10))

class ReplyDiscussionSchema(Schema):
    content = fields.Str(required=True, validate=validate.Length(min=1, max=1000))
    parent_reply_id = fields.Str(validate=validate.Length(min=24, max=24))

# Error handlers
@collaboration_bp.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"error": "Validation failed", "details": err.messages}), 422

@collaboration_bp.errorhandler(ValueError)
def handle_value_error(err):
    return jsonify({"error": str(err)}), 400

@collaboration_bp.errorhandler(Exception)
def handle_generic_error(err):
    return jsonify({"error": "An unexpected error occurred."}), 500

# Helper functions
def generate_invitation_code():
    """Generate a unique 8-character invitation code"""
    import random
    import string
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

# Routes
@collaboration_bp.route('/groups', methods=['POST'])
@require_auth
def create_group():
    """Create a new collaboration group"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, CreateGroupSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        
        # Verify the skill exists and belongs to the user
        skill = g.db.plans.find_one({
            "_id": ObjectId(validated_data["skill_id"]),
            "user_id": ObjectId(current_user_id),
            "type": "skill"
        })
        
        if not skill:
            return jsonify({"error": "Skill not found or access denied"}), 404
        
        # Create the group
        group_data = {
            "name": validated_data["name"],
            "description": validated_data["description"],
            "skill_id": ObjectId(validated_data["skill_id"]),
            "skill_title": skill["title"],
            "creator_id": ObjectId(current_user_id),
            "privacy": validated_data["privacy"],
            "max_members": validated_data["max_members"],
            "current_members": 1,
            "invitation_code": generate_invitation_code(),
            "members": [{
                "user_id": ObjectId(current_user_id),
                "username": g.current_user["username"],
                "role": "admin",
                "joined_at": datetime.utcnow(),
                "progress": {
                    "current_day": 1,
                    "completed_days": 0,
                    "completion_percentage": 0.0
                }
            }],
            "stats": {
                "total_discussions": 0,
                "total_messages": 0,
                "avg_completion_rate": 0.0
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = g.db.collaboration_groups.insert_one(group_data)
        group_id = str(result.inserted_id)
        
        # Update user's group creation stats
        g.db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {
                "$inc": {"stats.groups_created": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return jsonify({
            "message": "Collaboration group created successfully",
            "group_id": group_id,
            "invitation_code": group_data["invitation_code"],
            "group_name": validated_data["name"]
        }), 201
        
    except ValidationError as e:
        return jsonify({"error": "Invalid group data", "details": e.messages}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to create group: {str(e)}"}), 500

@collaboration_bp.route('/groups/<group_id>/join', methods=['POST'])
@require_auth
def join_group(group_id: str):
    """Join a collaboration group"""
    try:
        data = request.get_json() or {}
        validated_data = cast(dict, JoinGroupSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        
        # Get the group
        group = g.db.collaboration_groups.find_one({"_id": ObjectId(group_id)})
        
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        # Check if user is already a member
        existing_member = next(
            (m for m in group["members"] if str(m["user_id"]) == current_user_id), 
            None
        )
        
        if existing_member:
            return jsonify({"error": "You are already a member of this group"}), 409
        
        # Check group capacity
        if group["current_members"] >= group["max_members"]:
            return jsonify({"error": "Group has reached maximum capacity"}), 403
        
        # Check privacy and invitation requirements
        if group["privacy"] == "private":
            return jsonify({"error": "This is a private group"}), 403
        elif group["privacy"] == "invite_only":
            invitation_code = validated_data.get("invitation_code")
            if not invitation_code or invitation_code != group["invitation_code"]:
                return jsonify({"error": "Invalid or missing invitation code"}), 403
        
        # Add user to the group
        new_member = {
            "user_id": ObjectId(current_user_id),
            "username": g.current_user["username"],
            "role": "member",
            "joined_at": datetime.utcnow(),
            "progress": {
                "current_day": 1,
                "completed_days": 0,
                "completion_percentage": 0.0
            }
        }
        
        g.db.collaboration_groups.update_one(
            {"_id": ObjectId(group_id)},
            {
                "$push": {"members": new_member},
                "$inc": {"current_members": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        # Update user's group join stats
        g.db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {
                "$inc": {"stats.groups_joined": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return jsonify({
            "message": f"Successfully joined group '{group['name']}'",
            "group_name": group["name"],
            "member_count": group["current_members"] + 1
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid join data", "details": e.messages}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to join group: {str(e)}"}), 500

@collaboration_bp.route('/groups', methods=['GET'])
def get_groups():
    """Get collaboration groups with filtering"""
    try:
        # Parse query parameters
        page = request.args.get('page', 1, type=int)
        limit = min(request.args.get('limit', 20, type=int), 50)
        skill_category = request.args.get('category')
        search_query = request.args.get('q', '').strip()
        
        # Build query
        query = {"privacy": {"$in": ["public", "invite_only"]}}
        
        if skill_category:
            # Get skills in the category first
            skills = g.db.plans.find({"category": skill_category, "type": "skill"})
            skill_ids = [skill["_id"] for skill in skills]
            if skill_ids:
                query["skill_id"] = {"$in": skill_ids}
            else:
                query["skill_id"] = ObjectId("000000000000000000000000")  # No matches
        
        if search_query:
            query["$or"] = [
                {"name": {"$regex": search_query, "$options": "i"}},
                {"description": {"$regex": search_query, "$options": "i"}},
                {"skill_title": {"$regex": search_query, "$options": "i"}}
            ]
        
        # Get groups with pagination
        skip = (page - 1) * limit
        groups = list(g.db.collaboration_groups.find(query)
                     .sort("created_at", -1)
                     .skip(skip)
                     .limit(limit))
        
        # Convert ObjectIds to strings
        for group in groups:
            group["_id"] = str(group["_id"])
            group["skill_id"] = str(group["skill_id"])
            group["creator_id"] = str(group["creator_id"])
            for member in group["members"]:
                member["user_id"] = str(member["user_id"])
        
        total_count = g.db.collaboration_groups.count_documents(query)
        
        return jsonify({
            "message": "Groups retrieved successfully",
            "groups": groups,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "has_more": skip + len(groups) < total_count
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get groups: {str(e)}"}), 500

@collaboration_bp.route('/groups/<group_id>', methods=['GET'])
def get_group_detail(group_id: str):
    """Get detailed information about a group"""
    try:
        group = g.db.collaboration_groups.find_one({"_id": ObjectId(group_id)})
        
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        # Check if user has access (public groups or members)
        user_id = None
        is_member = False
        if hasattr(g, 'current_user') and g.current_user:
            user_id = str(g.current_user['_id'])
            is_member = any(str(m["user_id"]) == user_id for m in group["members"])
        
        if group["privacy"] == "private" and not is_member:
            return jsonify({"error": "Access denied to private group"}), 403
        
        # Convert ObjectIds to strings
        group["_id"] = str(group["_id"])
        group["skill_id"] = str(group["skill_id"])
        group["creator_id"] = str(group["creator_id"])
        
        for member in group["members"]:
            member["user_id"] = str(member["user_id"])
        
        # Hide invitation code from non-members
        if not is_member:
            group.pop("invitation_code", None)
        
        return jsonify({
            "message": "Group details retrieved successfully",
            "group": group,
            "is_member": is_member
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get group details: {str(e)}"}), 500

@collaboration_bp.route('/groups/<group_id>/discussions', methods=['POST'])
@require_auth
def create_discussion(group_id: str):
    """Create a new discussion in a group"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, CreateDiscussionSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        
        # Verify user is a member of the group
        group = g.db.collaboration_groups.find_one({"_id": ObjectId(group_id)})
        
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        is_member = any(str(m["user_id"]) == current_user_id for m in group["members"])
        if not is_member:
            return jsonify({"error": "You must be a group member to create discussions"}), 403
        
        # Create discussion
        discussion_data = {
            "group_id": ObjectId(group_id),
            "title": validated_data["title"],
            "content": validated_data["content"],
            "tags": validated_data["tags"],
            "author_id": ObjectId(current_user_id),
            "author_username": g.current_user["username"],
            "replies_count": 0,
            "last_activity": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = g.db.group_discussions.insert_one(discussion_data)
        discussion_id = str(result.inserted_id)
        
        # Update group discussion count
        g.db.collaboration_groups.update_one(
            {"_id": ObjectId(group_id)},
            {
                "$inc": {"stats.total_discussions": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return jsonify({
            "message": "Discussion created successfully",
            "discussion_id": discussion_id,
            "title": validated_data["title"]
        }), 201
        
    except ValidationError as e:
        return jsonify({"error": "Invalid discussion data", "details": e.messages}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to create discussion: {str(e)}"}), 500

@collaboration_bp.route('/groups/<group_id>/discussions', methods=['GET'])
def get_group_discussions(group_id: str):
    """Get discussions for a group"""
    try:
        # Verify group exists and user has access
        group = g.db.collaboration_groups.find_one({"_id": ObjectId(group_id)})
        
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        # Check access for private groups
        if group["privacy"] == "private":
            if not (hasattr(g, 'current_user') and g.current_user):
                return jsonify({"error": "Authentication required"}), 401
            
            user_id = str(g.current_user['_id'])
            is_member = any(str(m["user_id"]) == user_id for m in group["members"])
            if not is_member:
                return jsonify({"error": "Access denied to private group"}), 403
        
        # Get discussions with pagination
        page = request.args.get('page', 1, type=int)
        limit = min(request.args.get('limit', 20, type=int), 50)
        skip = (page - 1) * limit
        
        discussions = list(g.db.group_discussions.find({"group_id": ObjectId(group_id)})
                          .sort("last_activity", -1)
                          .skip(skip)
                          .limit(limit))
        
        # Convert ObjectIds to strings
        for discussion in discussions:
            discussion["_id"] = str(discussion["_id"])
            discussion["group_id"] = str(discussion["group_id"])
            discussion["author_id"] = str(discussion["author_id"])
        
        total_count = g.db.group_discussions.count_documents({"group_id": ObjectId(group_id)})
        
        return jsonify({
            "message": "Discussions retrieved successfully",
            "discussions": discussions,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "has_more": skip + len(discussions) < total_count
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get discussions: {str(e)}"}), 500

@collaboration_bp.route('/my-groups', methods=['GET'])
@require_auth
def get_my_groups():
    """Get groups that the current user is a member of"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        # Find groups where user is a member
        groups = list(g.db.collaboration_groups.find({
            "members.user_id": ObjectId(current_user_id)
        }).sort("updated_at", -1))
        
        # Convert ObjectIds and add user-specific info
        for group in groups:
            group["_id"] = str(group["_id"])
            group["skill_id"] = str(group["skill_id"])
            group["creator_id"] = str(group["creator_id"])
            
            # Find user's info in the group
            user_member = next(
                (m for m in group["members"] if str(m["user_id"]) == current_user_id),
                None
            )
            
            if user_member:
                group["my_role"] = user_member["role"]
                group["my_progress"] = user_member["progress"]
                group["joined_at"] = user_member["joined_at"]
            
            # Convert member ObjectIds
            for member in group["members"]:
                member["user_id"] = str(member["user_id"])
        
        return jsonify({
            "message": "My groups retrieved successfully",
            "groups": groups,
            "total_count": len(groups)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get my groups: {str(e)}"}), 500