from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError, validate
from typing import cast
from datetime import datetime, timedelta
from bson import ObjectId
from backend.auth.routes import require_auth
import re

# Create blueprint
content_moderation_bp = Blueprint('content_moderation', __name__)

# Validation Schemas
class ReportContentSchema(Schema):
    content_type = fields.Str(required=True, validate=validate.OneOf([
        "shared_skill", "custom_task", "comment", "discussion", "user_profile"
    ]))
    content_id = fields.Str(required=True, validate=validate.Length(min=24, max=24))
    reason = fields.Str(required=True, validate=validate.OneOf([
        "spam", "inappropriate_content", "harassment", "copyright_violation", 
        "misinformation", "off_topic", "low_quality", "other"
    ]))
    description = fields.Str(load_default="", validate=validate.Length(max=500))

class ModerationActionSchema(Schema):
    action = fields.Str(required=True, validate=validate.OneOf([
        "approve", "reject", "remove", "warn_user", "suspend_user", "ban_user"
    ]))
    reason = fields.Str(required=True, validate=validate.Length(min=5, max=500))
    duration_days = fields.Int(validate=validate.Range(min=1, max=365))  # For suspensions

# Content filtering patterns
PROFANITY_PATTERNS = [
    r'\b(spam|scam|fake|fraud)\b',
    r'\b(hate|stupid|dumb|idiot)\b',
    r'\b(click\s*here|buy\s*now|limited\s*time)\b',
    # Add more patterns as needed
]

SUSPICIOUS_PATTERNS = [
    r'https?://[^\s]+\.(tk|ml|ga|cf)',  # Suspicious domains
    r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',  # Credit card patterns
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email patterns in inappropriate contexts
]

# Error handlers
@content_moderation_bp.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"error": "Validation failed", "details": err.messages}), 422

@content_moderation_bp.errorhandler(ValueError)
def handle_value_error(err):
    return jsonify({"error": str(err)}), 400

@content_moderation_bp.errorhandler(Exception)
def handle_generic_error(err):
    return jsonify({"error": "An unexpected error occurred."}), 500

# Helper functions
def analyze_content_safety(content: str) -> dict:
    """Analyze content for potential safety issues"""
    issues = []
    risk_score = 0
    
    # Check for profanity/inappropriate language
    for pattern in PROFANITY_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE):
            issues.append("potentially_inappropriate_language")
            risk_score += 2
            break
    
    # Check for suspicious patterns
    for pattern in SUSPICIOUS_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE):
            issues.append("suspicious_content")
            risk_score += 3
            break
    
    # Check content length and quality indicators
    if len(content.strip()) < 10:
        issues.append("low_quality_content")
        risk_score += 1
    
    # Check for excessive caps
    caps_ratio = sum(1 for c in content if c.isupper()) / max(len(content), 1)
    if caps_ratio > 0.5 and len(content) > 20:
        issues.append("excessive_caps")
        risk_score += 1
    
    # Check for repetitive content
    words = content.lower().split()
    if len(words) > 5:
        unique_words = set(words)
        repetition_ratio = 1 - (len(unique_words) / len(words))
        if repetition_ratio > 0.7:
            issues.append("repetitive_content")
            risk_score += 2
    
    return {
        "risk_score": min(risk_score, 10),  # Cap at 10
        "issues": issues,
        "requires_review": risk_score >= 5,
        "auto_approve": risk_score <= 2
    }

def get_user_trust_score(user_id: str) -> float:
    """Calculate user trust score based on history"""
    try:
        user = g.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return 0.0
        
        # Base score from account age
        account_age_days = (datetime.utcnow() - user.get("created_at", datetime.utcnow())).days
        age_score = min(account_age_days / 30, 3.0)  # Max 3 points for 30+ days
        
        # Contribution score
        stats = user.get("stats", {})
        contributions = stats.get("skills_shared", 0) + stats.get("custom_tasks_added", 0)
        contribution_score = min(contributions / 5, 2.0)  # Max 2 points for 5+ contributions
        
        # Moderation history (negative score)
        warnings = g.db.user_warnings.count_documents({"user_id": ObjectId(user_id)})
        moderation_penalty = min(warnings * 0.5, 3.0)
        
        # Community engagement (positive score)
        likes_given = stats.get("likes_given", 0)
        comments_made = stats.get("comments_made", 0)
        engagement_score = min((likes_given + comments_made) / 20, 2.0)
        
        trust_score = age_score + contribution_score + engagement_score - moderation_penalty
        return max(0.0, min(trust_score, 10.0))  # Score between 0-10
        
    except Exception:
        return 5.0  # Default neutral score

# Routes
@content_moderation_bp.route('/report', methods=['POST'])
@require_auth
def report_content():
    """Report content for moderation review"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, ReportContentSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        
        # Check if user has already reported this content
        existing_report = g.db.content_reports.find_one({
            "reporter_id": ObjectId(current_user_id),
            "content_type": validated_data["content_type"],
            "content_id": ObjectId(validated_data["content_id"])
        })
        
        if existing_report:
            return jsonify({"error": "You have already reported this content"}), 409
        
        # Create the report
        report_data = {
            "reporter_id": ObjectId(current_user_id),
            "reporter_username": g.current_user["username"],
            "content_type": validated_data["content_type"],
            "content_id": ObjectId(validated_data["content_id"]),
            "reason": validated_data["reason"],
            "description": validated_data["description"],
            "status": "pending",
            "priority": "normal",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Determine priority based on reason
        high_priority_reasons = ["harassment", "inappropriate_content", "spam"]
        if validated_data["reason"] in high_priority_reasons:
            report_data["priority"] = "high"
        
        result = g.db.content_reports.insert_one(report_data)
        report_id = str(result.inserted_id)
        
        # Auto-hide content if multiple reports
        report_count = g.db.content_reports.count_documents({
            "content_type": validated_data["content_type"],
            "content_id": ObjectId(validated_data["content_id"]),
            "status": "pending"
        })
        
        if report_count >= 3:  # Auto-hide after 3 reports
            auto_moderate_content(
                validated_data["content_type"],
                validated_data["content_id"],
                "auto_hidden",
                "Multiple user reports"
            )
        
        return jsonify({
            "message": "Content reported successfully",
            "report_id": report_id,
            "status": "under_review"
        }), 201
        
    except ValidationError as e:
        return jsonify({"error": "Invalid report data", "details": e.messages}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to report content: {str(e)}"}), 500

@content_moderation_bp.route('/analyze', methods=['POST'])
@require_auth
def analyze_content():
    """Analyze content for potential moderation issues (for development/testing)"""
    try:
        data = request.get_json()
        if not data or "content" not in data:
            return jsonify({"error": "Content text is required"}), 400
        
        content = data["content"]
        user_id = str(g.current_user['_id'])
        
        # Analyze content safety
        safety_analysis = analyze_content_safety(content)
        
        # Get user trust score
        trust_score = get_user_trust_score(user_id)
        
        # Adjust based on user trust
        if trust_score >= 8.0:
            safety_analysis["auto_approve"] = True
            safety_analysis["requires_review"] = False
        elif trust_score <= 3.0:
            safety_analysis["requires_review"] = True
            safety_analysis["auto_approve"] = False
        
        return jsonify({
            "message": "Content analyzed successfully",
            "safety_analysis": safety_analysis,
            "user_trust_score": trust_score,
            "recommendation": (
                "auto_approve" if safety_analysis["auto_approve"] else
                "requires_review" if safety_analysis["requires_review"] else
                "standard_review"
            )
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to analyze content: {str(e)}"}), 500

@content_moderation_bp.route('/reports', methods=['GET'])
@require_auth
def get_pending_reports():
    """Get pending moderation reports (admin only)"""
    try:
        # Check if user is admin/moderator
        if not g.current_user.get("is_admin", False) and not g.current_user.get("is_moderator", False):
            return jsonify({"error": "Access denied"}), 403
        
        # Parse query parameters
        page = request.args.get('page', 1, type=int)
        limit = min(request.args.get('limit', 20, type=int), 50)
        priority = request.args.get('priority')  # high, normal
        content_type = request.args.get('content_type')
        
        # Build query
        query = {"status": "pending"}
        if priority:
            query["priority"] = priority
        if content_type:
            query["content_type"] = content_type
        
        # Get reports with pagination
        skip = (page - 1) * limit
        reports = list(g.db.content_reports.find(query)
                      .sort([("priority", -1), ("created_at", 1)])  # High priority first, then oldest
                      .skip(skip)
                      .limit(limit))
        
        # Convert ObjectIds and add content previews
        for report in reports:
            report["_id"] = str(report["_id"])
            report["reporter_id"] = str(report["reporter_id"])
            report["content_id"] = str(report["content_id"])
            
            # Add content preview based on type
            content_preview = get_content_preview(
                report["content_type"], 
                report["content_id"]
            )
            report["content_preview"] = content_preview
        
        total_count = g.db.content_reports.count_documents(query)
        
        return jsonify({
            "message": "Reports retrieved successfully",
            "reports": reports,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "has_more": skip + len(reports) < total_count
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get reports: {str(e)}"}), 500

@content_moderation_bp.route('/reports/<report_id>/action', methods=['POST'])
@require_auth
def take_moderation_action(report_id: str):
    """Take moderation action on a reported content"""
    try:
        # Check if user is admin/moderator
        if not g.current_user.get("is_admin", False) and not g.current_user.get("is_moderator", False):
            return jsonify({"error": "Access denied"}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, ModerationActionSchema().load(data))
        moderator_id = str(g.current_user['_id'])
        
        # Get the report
        report = g.db.content_reports.find_one({"_id": ObjectId(report_id)})
        if not report:
            return jsonify({"error": "Report not found"}), 404
        
        if report["status"] != "pending":
            return jsonify({"error": "Report has already been processed"}), 409
        
        action = validated_data["action"]
        reason = validated_data["reason"]
        
        # Update report status
        g.db.content_reports.update_one(
            {"_id": ObjectId(report_id)},
            {
                "$set": {
                    "status": "resolved",
                    "moderator_id": ObjectId(moderator_id),
                    "moderator_username": g.current_user["username"],
                    "action_taken": action,
                    "action_reason": reason,
                    "resolved_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Take appropriate action
        action_result = {}
        if action in ["remove", "reject"]:
            action_result = moderate_content(
                report["content_type"],
                str(report["content_id"]),
                action,
                reason
            )
        elif action in ["warn_user", "suspend_user", "ban_user"]:
            action_result = moderate_user(
                report["content_type"],
                str(report["content_id"]),
                action,
                reason,
                validated_data.get("duration_days")
            )
        
        # Log the moderation action
        log_moderation_action(
            moderator_id,
            report_id,
            action,
            reason,
            action_result
        )
        
        return jsonify({
            "message": f"Moderation action '{action}' completed successfully",
            "action": action,
            "report_id": report_id,
            "result": action_result
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid action data", "details": e.messages}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to take moderation action: {str(e)}"}), 500

# Helper functions
def get_content_preview(content_type: str, content_id: str) -> dict:
    """Get a preview of the reported content"""
    try:
        if content_type == "shared_skill":
            content = g.db.shared_skills.find_one({"_id": ObjectId(content_id)})
            return {
                "title": content.get("title", "Unknown") if content else "Not found",
                "preview": content.get("description", "")[:100] if content else ""
            }
        elif content_type == "custom_task":
            content = g.db.custom_tasks.find_one({"_id": ObjectId(content_id)})
            return {
                "title": content["task"].get("title", "Unknown") if content else "Not found",
                "preview": content["task"].get("description", "")[:100] if content else ""
            }
        elif content_type == "comment":
            content = g.db.skill_comments.find_one({"_id": ObjectId(content_id)})
            return {
                "title": "Comment",
                "preview": content.get("content", "")[:100] if content else "Not found"
            }
        # Add more content types as needed
        
        return {"title": "Unknown content", "preview": ""}
    except Exception:
        return {"title": "Error loading content", "preview": ""}

def auto_moderate_content(content_type: str, content_id: str, action: str, reason: str):
    """Automatically moderate content based on system rules"""
    try:
        if content_type == "shared_skill":
            g.db.shared_skills.update_one(
                {"_id": ObjectId(content_id)},
                {
                    "$set": {
                        "moderation_status": action,
                        "moderation_reason": reason,
                        "moderated_at": datetime.utcnow()
                    }
                }
            )
        elif content_type == "custom_task":
            g.db.custom_tasks.update_one(
                {"_id": ObjectId(content_id)},
                {
                    "$set": {
                        "moderation_status": action,
                        "moderation_reason": reason,
                        "moderated_at": datetime.utcnow()
                    }
                }
            )
        # Add more content types as needed
        
    except Exception as e:
        print(f"Error auto-moderating content: {e}")

def moderate_content(content_type: str, content_id: str, action: str, reason: str) -> dict:
    """Apply moderation action to content"""
    try:
        if action == "remove":
            status = "removed"
        elif action == "reject":
            status = "rejected"
        else:
            status = "approved"
        
        # Update content moderation status
        collections_map = {
            "shared_skill": "shared_skills",
            "custom_task": "custom_tasks",
            "comment": "skill_comments"
        }
        
        collection_name = collections_map.get(content_type)
        if collection_name:
            collection = getattr(g.db, collection_name)
            result = collection.update_one(
                {"_id": ObjectId(content_id)},
                {
                    "$set": {
                        "moderation_status": status,
                        "moderation_reason": reason,
                        "moderated_at": datetime.utcnow()
                    }
                }
            )
            
            return {
                "success": result.modified_count > 0,
                "content_updated": result.modified_count
            }
        
        return {"success": False, "error": "Unknown content type"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

def moderate_user(content_type: str, content_id: str, action: str, reason: str, duration_days: int = None) -> dict:
    """Apply moderation action to user"""
    try:
        # Get the content author
        author_id = None
        if content_type == "shared_skill":
            content = g.db.shared_skills.find_one({"_id": ObjectId(content_id)})
            author_id = content.get("shared_by") if content else None
        elif content_type == "custom_task":
            content = g.db.custom_tasks.find_one({"_id": ObjectId(content_id)})
            author_id = content.get("user_id") if content else None
        
        if not author_id:
            return {"success": False, "error": "Could not find content author"}
        
        # Apply user moderation
        if action == "warn_user":
            g.db.user_warnings.insert_one({
                "user_id": author_id,
                "reason": reason,
                "content_type": content_type,
                "content_id": ObjectId(content_id),
                "created_at": datetime.utcnow()
            })
            return {"success": True, "action": "warning_issued"}
            
        elif action == "suspend_user":
            until_date = datetime.utcnow() + timedelta(days=duration_days or 7)
            g.db.users.update_one(
                {"_id": author_id},
                {
                    "$set": {
                        "suspended_until": until_date,
                        "suspension_reason": reason
                    }
                }
            )
            return {"success": True, "action": "user_suspended", "until": until_date}
            
        elif action == "ban_user":
            g.db.users.update_one(
                {"_id": author_id},
                {
                    "$set": {
                        "banned": True,
                        "ban_reason": reason,
                        "banned_at": datetime.utcnow()
                    }
                }
            )
            return {"success": True, "action": "user_banned"}
        
        return {"success": False, "error": "Unknown user action"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

def log_moderation_action(moderator_id: str, report_id: str, action: str, reason: str, result: dict):
    """Log moderation action for audit trail"""
    try:
        g.db.moderation_logs.insert_one({
            "moderator_id": ObjectId(moderator_id),
            "report_id": ObjectId(report_id),
            "action": action,
            "reason": reason,
            "result": result,
            "timestamp": datetime.utcnow()
        })
    except Exception as e:
        print(f"Error logging moderation action: {e}")

@content_moderation_bp.route('/stats', methods=['GET'])
@require_auth
def get_moderation_stats():
    """Get moderation statistics (admin only)"""
    try:
        if not g.current_user.get("is_admin", False):
            return jsonify({"error": "Access denied"}), 403
        
        # Get various statistics
        pending_reports = g.db.content_reports.count_documents({"status": "pending"})
        resolved_reports = g.db.content_reports.count_documents({"status": "resolved"})
        
        # Reports by priority
        high_priority = g.db.content_reports.count_documents({"status": "pending", "priority": "high"})
        
        # Reports by reason
        reason_stats = list(g.db.content_reports.aggregate([
            {"$match": {"status": "pending"}},
            {"$group": {"_id": "$reason", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]))
        
        # Content type distribution
        content_type_stats = list(g.db.content_reports.aggregate([
            {"$match": {"status": "pending"}},
            {"$group": {"_id": "$content_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]))
        
        return jsonify({
            "message": "Moderation statistics retrieved successfully",
            "stats": {
                "pending_reports": pending_reports,
                "resolved_reports": resolved_reports,
                "high_priority_pending": high_priority,
                "reports_by_reason": reason_stats,
                "reports_by_content_type": content_type_stats
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get moderation stats: {str(e)}"}), 500