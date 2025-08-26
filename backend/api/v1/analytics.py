from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError, validate
from typing import cast
from datetime import datetime
from bson import ObjectId
from backend.auth.routes import require_auth
from backend.services.analytics_service import AnalyticsService

# Create blueprint
analytics_bp = Blueprint('analytics', __name__)

# Validation Schemas
class TrackEventSchema(Schema):
    event_type = fields.Str(required=True)
    skill_id = fields.Str(validate=validate.Length(min=24, max=24))
    target_user_id = fields.Str(validate=validate.Length(min=24, max=24))
    task_id = fields.Str(validate=validate.Length(min=24, max=24))
    metadata = fields.Dict(load_default=lambda: {})

class AnalyticsPeriodSchema(Schema):
    days = fields.Int(load_default=30, validate=validate.Range(min=1, max=365))

class TrendingContentSchema(Schema):
    content_type = fields.Str(load_default="skill", validate=validate.OneOf(["skill", "user", "task"]))
    days = fields.Int(load_default=7, validate=validate.Range(min=1, max=30))
    limit = fields.Int(load_default=20, validate=validate.Range(min=1, max=100))

# Error handlers
@analytics_bp.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"error": "Validation failed", "details": err.messages}), 422

@analytics_bp.errorhandler(ValueError)
def handle_value_error(err):
    return jsonify({"error": str(err)}), 400

@analytics_bp.errorhandler(Exception)
def handle_generic_error(err):
    return jsonify({"error": "An unexpected error occurred."}), 500

# Routes
@analytics_bp.route('/track', methods=['POST'])
@require_auth
def track_event():
    """Track a user engagement event"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, TrackEventSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        
        success = AnalyticsService.track_event(
            event_type=validated_data['event_type'],
            user_id=current_user_id,
            skill_id=validated_data.get('skill_id'),
            target_user_id=validated_data.get('target_user_id'),
            task_id=validated_data.get('task_id'),
            **validated_data.get('metadata', {})
        )
        
        if success:
            return jsonify({"message": "Event tracked successfully"}), 201
        else:
            return jsonify({"error": "Failed to track event"}), 500
            
    except ValidationError as e:
        return jsonify({"error": "Invalid event data", "details": e.messages}), 400

@analytics_bp.route('/user/engagement', methods=['GET'])
@require_auth
def get_user_engagement():
    """Get engagement analytics for current user"""
    try:
        # Parse query parameters
        query_params = {
            'days': request.args.get('days', 30, type=int)
        }
        
        validated_data = cast(dict, AnalyticsPeriodSchema().load(query_params))
        current_user_id = str(g.current_user['_id'])
        
        engagement_data = AnalyticsService.get_user_engagement_summary(
            current_user_id, validated_data['days']
        )
        
        return jsonify({
            "message": "User engagement data retrieved successfully",
            **engagement_data
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid parameters", "details": e.messages}), 400

@analytics_bp.route('/user/behavior', methods=['GET'])
@require_auth
def get_user_behavior():
    """Get behavioral insights for current user"""
    try:
        # Parse query parameters
        query_params = {
            'days': request.args.get('days', 30, type=int)
        }
        
        validated_data = cast(dict, AnalyticsPeriodSchema().load(query_params))
        current_user_id = str(g.current_user['_id'])
        
        behavior_data = AnalyticsService.get_user_behavior_insights(
            current_user_id, validated_data['days']
        )
        
        return jsonify({
            "message": "User behavior insights retrieved successfully",
            **behavior_data
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid parameters", "details": e.messages}), 400

@analytics_bp.route('/skills/<skill_id>', methods=['GET'])
@require_auth
def get_skill_analytics(skill_id: str):
    """Get analytics for a specific skill"""
    try:
        # Check if user owns the skill or has permission to view analytics
        skill = g.db.shared_skills.find_one({"_id": ObjectId(skill_id)})
        if not skill:
            return jsonify({"error": "Skill not found"}), 404
        
        current_user_id = str(g.current_user['_id'])
        if str(skill['shared_by']) != current_user_id:
            return jsonify({"error": "Unauthorized to view this skill's analytics"}), 403
        
        days = request.args.get('days', 30, type=int)
        if days < 1 or days > 365:
            days = 30
        
        analytics_data = AnalyticsService.get_skill_analytics(skill_id, days)
        
        return jsonify({
            "message": "Skill analytics retrieved successfully",
            "skill_id": skill_id,
            **analytics_data
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get skill analytics: {str(e)}"}), 500

@analytics_bp.route('/trending', methods=['GET'])
@require_auth
def get_trending_content():
    """Get trending content based on engagement metrics"""
    try:
        # Parse query parameters
        query_params = {
            'content_type': request.args.get('content_type', 'skill'),
            'days': request.args.get('days', 7, type=int),
            'limit': request.args.get('limit', 20, type=int)
        }
        
        validated_data = cast(dict, TrendingContentSchema().load(query_params))
        
        trending_data = AnalyticsService.get_trending_content(
            content_type=validated_data['content_type'],
            days=validated_data['days'],
            limit=validated_data['limit']
        )
        
        return jsonify({
            "message": "Trending content retrieved successfully",
            **trending_data
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid parameters", "details": e.messages}), 400

@analytics_bp.route('/dashboard', methods=['GET'])
@require_auth
def get_dashboard_metrics():
    """Get comprehensive dashboard metrics (admin/power users only)"""
    try:
        # Note: In a real application, you would check for admin privileges here
        # For now, we'll allow any authenticated user to access this
        
        days = request.args.get('days', 30, type=int)
        if days < 1 or days > 365:
            days = 30
        
        dashboard_data = AnalyticsService.get_platform_dashboard_metrics(days)
        
        return jsonify({
            "message": "Dashboard metrics retrieved successfully",
            **dashboard_data
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get dashboard metrics: {str(e)}"}), 500

# Convenience endpoints for common tracking scenarios
@analytics_bp.route('/track/skill/view', methods=['POST'])
@require_auth
def track_skill_view():
    """Track a skill view event"""
    try:
        data = request.get_json()
        if not data or 'skill_id' not in data:
            return jsonify({"error": "skill_id is required"}), 400
        
        current_user_id = str(g.current_user['_id'])
        view_duration = data.get('view_duration')
        
        success = AnalyticsService.track_skill_view(
            skill_id=data['skill_id'],
            user_id=current_user_id,
            view_duration=view_duration
        )
        
        if success:
            return jsonify({"message": "Skill view tracked successfully"}), 201
        else:
            return jsonify({"error": "Failed to track skill view"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Failed to track skill view: {str(e)}"}), 500

@analytics_bp.route('/track/skill/interaction', methods=['POST'])
@require_auth
def track_skill_interaction():
    """Track skill interaction events (like, download, comment, etc.)"""
    try:
        data = request.get_json()
        if not data or 'skill_id' not in data or 'interaction_type' not in data:
            return jsonify({"error": "skill_id and interaction_type are required"}), 400
        
        current_user_id = str(g.current_user['_id'])
        
        # Extract metadata
        metadata = {k: v for k, v in data.items() if k not in ['skill_id', 'interaction_type']}
        
        success = AnalyticsService.track_skill_interaction(
            interaction_type=data['interaction_type'],
            skill_id=data['skill_id'],
            user_id=current_user_id,
            **metadata
        )
        
        if success:
            return jsonify({"message": f"Skill {data['interaction_type']} tracked successfully"}), 201
        else:
            return jsonify({"error": "Failed to track skill interaction"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Failed to track skill interaction: {str(e)}"}), 500

@analytics_bp.route('/track/user/interaction', methods=['POST'])
@require_auth
def track_user_interaction():
    """Track user-to-user interaction events"""
    try:
        data = request.get_json()
        if not data or 'target_user_id' not in data or 'interaction_type' not in data:
            return jsonify({"error": "target_user_id and interaction_type are required"}), 400
        
        current_user_id = str(g.current_user['_id'])
        
        success = AnalyticsService.track_user_interaction(
            interaction_type=data['interaction_type'],
            target_user_id=data['target_user_id'],
            user_id=current_user_id
        )
        
        if success:
            return jsonify({"message": f"User {data['interaction_type']} tracked successfully"}), 201
        else:
            return jsonify({"error": "Failed to track user interaction"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Failed to track user interaction: {str(e)}"}), 500

@analytics_bp.route('/insights/personal', methods=['GET'])
@require_auth
def get_personal_insights():
    """Get personalized insights for the current user"""
    try:
        current_user_id = str(g.current_user['_id'])
        days = request.args.get('days', 30, type=int)
        
        # Get comprehensive user data
        engagement_data = AnalyticsService.get_user_engagement_summary(current_user_id, days)
        behavior_data = AnalyticsService.get_user_behavior_insights(current_user_id, days)
        
        # Combine insights
        personal_insights = {
            "user_id": current_user_id,
            "period_days": days,
            "engagement_summary": engagement_data,
            "behavior_patterns": behavior_data,
            "recommendations": AnalyticsService._generate_personal_recommendations(
                engagement_data, behavior_data
            )
        }
        
        return jsonify({
            "message": "Personal insights retrieved successfully",
            **personal_insights
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get personal insights: {str(e)}"}), 500

@analytics_bp.route('/export/user-data', methods=['GET'])
@require_auth
def export_user_analytics():
    """Export user's analytics data (GDPR compliance)"""
    try:
        current_user_id = str(g.current_user['_id'])
        days = request.args.get('days', 365, type=int)  # Default to 1 year
        
        # Get comprehensive analytics data for the user
        engagement_data = AnalyticsService.get_user_engagement_summary(current_user_id, days)
        behavior_data = AnalyticsService.get_user_behavior_insights(current_user_id, days)
        
        # Prepare export data
        export_data = {
            "user_id": current_user_id,
            "export_date": datetime.utcnow().isoformat(),
            "data_period_days": days,
            "engagement_metrics": engagement_data,
            "behavior_insights": behavior_data,
            "data_retention_policy": "Analytics data is retained for 2 years for product improvement purposes"
        }
        
        return jsonify({
            "message": "User analytics data exported successfully",
            "export_data": export_data
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to export user data: {str(e)}"}), 500

# Health check endpoint for analytics service
@analytics_bp.route('/health', methods=['GET'])
@require_auth
def analytics_health_check():
    """Check analytics service health"""
    try:
        # Test database connectivity and basic functionality
        current_user_id = str(g.current_user['_id'])
        
        # Try to track a test event
        test_success = AnalyticsService.track_event(
            "health_check",
            user_id=current_user_id,
            test=True
        )
        
        return jsonify({
            "status": "healthy" if test_success else "degraded",
            "message": "Analytics service is operational" if test_success else "Analytics tracking may be impaired",
            "timestamp": datetime.utcnow().isoformat()
        }), 200 if test_success else 503
        
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "message": f"Analytics service error: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }), 503