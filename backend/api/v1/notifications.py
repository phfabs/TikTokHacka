from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError, validate
from typing import cast
from backend.auth.routes import require_auth
from backend.services.notification_service import NotificationService

# Create blueprint
notifications_bp = Blueprint('notifications', __name__)

# Validation Schemas
class NotificationQuerySchema(Schema):
    limit = fields.Int(load_default=50, validate=validate.Range(min=1, max=100))
    unread_only = fields.Bool(load_default=False)

class MarkReadSchema(Schema):
    notification_id = fields.Str(required=True, validate=validate.Length(min=24, max=24))

# Error handlers
@notifications_bp.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"error": "Validation failed", "details": err.messages}), 422

@notifications_bp.errorhandler(ValueError)
def handle_value_error(err):
    return jsonify({"error": str(err)}), 400

@notifications_bp.errorhandler(Exception)
def handle_generic_error(err):
    return jsonify({"error": "An unexpected error occurred."}), 500

# Routes
@notifications_bp.route('/', methods=['GET'])
@require_auth
def get_notifications():
    """Get user notifications with pagination"""
    try:
        # Parse query parameters
        query_params = {
            'limit': request.args.get('limit', 50, type=int),
            'unread_only': request.args.get('unread_only', 'false').lower() == 'true'
        }
        
        validated_data = cast(dict, NotificationQuerySchema().load(query_params))
        user_id = str(g.current_user['_id'])
        
        result = NotificationService.get_user_notifications(
            user_id=user_id,
            limit=validated_data['limit'],
            unread_only=validated_data['unread_only']
        )
        
        return jsonify({
            "message": "Notifications retrieved successfully",
            **result
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid query parameters", "details": e.messages}), 400

@notifications_bp.route('/unread-count', methods=['GET'])
@require_auth
def get_unread_count():
    """Get count of unread notifications"""
    try:
        from backend.repositories.notification_repository import NotificationRepository
        
        user_id = str(g.current_user['_id'])
        notification_repo = NotificationRepository(g.db.notifications)
        unread_count = notification_repo.find_unread_count(user_id)
        
        return jsonify({
            "message": "Unread count retrieved successfully",
            "unread_count": unread_count
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get unread count: {str(e)}"}), 500

@notifications_bp.route('/<notification_id>/read', methods=['POST'])
@require_auth
def mark_notification_read(notification_id: str):
    """Mark a specific notification as read"""
    try:
        user_id = str(g.current_user['_id'])
        
        success = NotificationService.mark_notification_read(notification_id, user_id)
        
        if success:
            return jsonify({
                "message": "Notification marked as read",
                "notification_id": notification_id
            }), 200
        else:
            return jsonify({
                "error": "Notification not found or already read"
            }), 404
            
    except Exception as e:
        return jsonify({"error": f"Failed to mark notification as read: {str(e)}"}), 500

@notifications_bp.route('/read-all', methods=['POST'])
@require_auth
def mark_all_notifications_read():
    """Mark all notifications as read for the user"""
    try:
        user_id = str(g.current_user['_id'])
        
        count = NotificationService.mark_all_notifications_read(user_id)
        
        return jsonify({
            "message": f"Marked {count} notifications as read",
            "marked_count": count
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to mark notifications as read: {str(e)}"}), 500

@notifications_bp.route('/<notification_id>', methods=['DELETE'])
@require_auth
def delete_notification(notification_id: str):
    """Delete a specific notification"""
    try:
        user_id = str(g.current_user['_id'])
        
        success = NotificationService.delete_notification(notification_id, user_id)
        
        if success:
            return jsonify({
                "message": "Notification deleted successfully",
                "notification_id": notification_id
            }), 200
        else:
            return jsonify({
                "error": "Notification not found"
            }), 404
            
    except Exception as e:
        return jsonify({"error": f"Failed to delete notification: {str(e)}"}), 500

@notifications_bp.route('/stats', methods=['GET'])
@require_auth
def get_notification_stats():
    """Get notification statistics for the user"""
    try:
        user_id = str(g.current_user['_id'])
        
        stats = NotificationService.get_notification_stats(user_id)
        
        return jsonify({
            "message": "Notification stats retrieved successfully",
            "stats": stats
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get notification stats: {str(e)}"}), 500

@notifications_bp.route('/test/<notification_type>', methods=['POST'])
@require_auth  
def test_notification(notification_type: str):
    """Test notification system (development only)"""
    try:
        user_id = str(g.current_user['_id'])
        
        # Test notification creation
        if notification_type == "like":
            notification = NotificationService.notify_like_received(
                skill_id="507f1f77bcf86cd799439011",
                skill_owner_id=user_id,
                liker_id="507f1f77bcf86cd799439012",
                skill_title="Test Skill"
            )
        elif notification_type == "comment":
            notification = NotificationService.notify_comment_received(
                skill_id="507f1f77bcf86cd799439011",
                skill_owner_id=user_id,
                commenter_id="507f1f77bcf86cd799439012", 
                skill_title="Test Skill",
                comment_content="This is a test comment for the notification system!"
            )
        elif notification_type == "download":
            notification = NotificationService.notify_skill_downloaded(
                skill_id="507f1f77bcf86cd799439011",
                skill_owner_id=user_id,
                downloader_id="507f1f77bcf86cd799439012",
                skill_title="Test Skill"
            )
        else:
            return jsonify({"error": "Invalid notification type"}), 400
        
        return jsonify({
            "message": f"Test {notification_type} notification created",
            "notification": {
                "id": str(notification["_id"]) if notification else None,
                "type": notification_type
            }
        }), 201
        
    except Exception as e:
        return jsonify({"error": f"Failed to create test notification: {str(e)}"}), 500

# Background cleanup endpoint (for admin/cron use)
@notifications_bp.route('/cleanup', methods=['POST'])
@require_auth
def cleanup_old_notifications():
    """Clean up old notifications (admin endpoint)"""
    try:
        # Only allow admin users (you might want to add admin check here)
        days_old = request.json.get('days_old', 30) if request.json else 30
        
        if not isinstance(days_old, int) or days_old < 1:
            return jsonify({"error": "days_old must be a positive integer"}), 400
        
        deleted_count = NotificationService.cleanup_old_notifications(days_old)
        
        return jsonify({
            "message": f"Cleaned up old notifications",
            "deleted_count": deleted_count,
            "days_old": days_old
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to cleanup notifications: {str(e)}"}), 500