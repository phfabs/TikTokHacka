from flask import Blueprint, jsonify, current_app
from backend.auth.routes import require_auth

# Create blueprint
websocket_bp = Blueprint('websocket', __name__)

@websocket_bp.route('/stats', methods=['GET'])
@require_auth
def get_websocket_stats():
    """Get WebSocket connection statistics"""
    try:
        websocket_service = current_app.websocket_service
        stats = websocket_service.get_connection_stats()
        
        return jsonify({
            "message": "WebSocket statistics retrieved successfully",
            "stats": stats
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get WebSocket stats: {str(e)}"}), 500

@websocket_bp.route('/users/online', methods=['GET'])
@require_auth 
def get_online_users():
    """Get count of online users"""
    try:
        websocket_service = current_app.websocket_service
        count = websocket_service.get_connected_users_count()
        
        return jsonify({
            "message": "Online users count retrieved successfully",
            "online_users": count
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get online users: {str(e)}"}), 500

@websocket_bp.route('/skills/<skill_id>/viewers', methods=['GET'])
@require_auth
def get_skill_viewers(skill_id: str):
    """Get users currently viewing a skill"""
    try:
        websocket_service = current_app.websocket_service
        users = websocket_service.get_skill_room_users(skill_id)
        
        return jsonify({
            "message": "Skill viewers retrieved successfully",
            "skill_id": skill_id,
            "viewer_count": len(users),
            "viewers": users
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get skill viewers: {str(e)}"}), 500