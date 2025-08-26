from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError, validate
from typing import cast
from datetime import datetime
from backend.auth.routes import require_auth
from backend.services.moderation_service import ModerationService

# Create blueprint
moderation_bp = Blueprint('moderation', __name__)

# Validation Schemas
class ReportContentSchema(Schema):
    content_type = fields.Str(required=True, validate=validate.OneOf([
        "skill", "comment", "user", "custom_task"
    ]))
    content_id = fields.Str(required=True, validate=validate.Length(min=24, max=24))
    reason = fields.Str(required=True, validate=validate.OneOf([
        "spam", "inappropriate_content", "harassment", "hate_speech", 
        "violence", "illegal_content", "copyright_violation", 
        "misinformation", "fake_profile", "other"
    ]))
    description = fields.Str(validate=validate.Length(max=1000))
    evidence_urls = fields.List(fields.Url(), load_default=[])

class ReviewReportSchema(Schema):
    action = fields.Str(required=True, validate=validate.OneOf([
        "no_action", "warning", "content_removal", 
        "temporary_ban", "permanent_ban", "account_suspension"
    ]))
    notes = fields.Str(validate=validate.Length(max=1000))

class PaginationSchema(Schema):
    limit = fields.Int(load_default=20, validate=validate.Range(min=1, max=100))
    skip = fields.Int(load_default=0, validate=validate.Range(min=0))

class AutoModerationRuleSchema(Schema):
    type = fields.Str(required=True, validate=validate.OneOf([
        "keyword_filter", "spam_detection", "rate_limit"
    ]))
    name = fields.Str(required=True, validate=validate.Length(min=3, max=100))
    description = fields.Str(required=True, validate=validate.Length(max=500))
    keywords = fields.List(fields.Str(), load_default=[])
    severity = fields.Str(load_default="medium", validate=validate.OneOf([
        "low", "medium", "high", "critical"
    ]))
    priority_score = fields.Int(load_default=50, validate=validate.Range(min=1, max=100))

# Error handlers
@moderation_bp.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"error": "Validation failed", "details": err.messages}), 422

@moderation_bp.errorhandler(ValueError)
def handle_value_error(err):
    return jsonify({"error": str(err)}), 400

@moderation_bp.errorhandler(Exception)
def handle_generic_error(err):
    return jsonify({"error": "An unexpected error occurred."}), 500

# Routes
@moderation_bp.route('/report', methods=['POST'])
@require_auth
def report_content():
    """Report content for moderation"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, ReportContentSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        
        success, message, report_data = ModerationService.report_content(
            reporter_id=current_user_id,
            content_type=validated_data['content_type'],
            content_id=validated_data['content_id'],
            reason=validated_data['reason'],
            description=validated_data.get('description'),
            evidence_urls=validated_data.get('evidence_urls', [])
        )
        
        if success:
            return jsonify({
                "message": message,
                "report": report_data
            }), 201
        else:
            return jsonify({"error": message}), 400
            
    except ValidationError as e:
        return jsonify({"error": "Invalid report data", "details": e.messages}), 400

@moderation_bp.route('/reports/my', methods=['GET'])
@require_auth
def get_my_reports():
    """Get reports filed by current user"""
    try:
        report_type = request.args.get('type', 'filed')  # filed or received
        limit = request.args.get('limit', 20, type=int)
        
        if report_type not in ['filed', 'received']:
            return jsonify({"error": "Invalid report type"}), 400
        
        current_user_id = str(g.current_user['_id'])
        reports_data = ModerationService.get_user_reports(current_user_id, report_type, limit)
        
        if "error" in reports_data:
            return jsonify(reports_data), 500
        
        return jsonify({
            "message": f"User {report_type} reports retrieved successfully",
            **reports_data
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get reports: {str(e)}"}), 500

@moderation_bp.route('/queue', methods=['GET'])
@require_auth
def get_moderation_queue():
    """Get moderation queue (moderators only)"""
    try:
        # TODO: Add proper moderator role check
        # For now, we'll allow any authenticated user to access this
        # In production, you should check for moderator privileges
        
        limit = request.args.get('limit', 20, type=int)
        if limit > 100:
            limit = 100
        
        current_user_id = str(g.current_user['_id'])
        queue_data = ModerationService.get_moderation_queue(current_user_id, limit)
        
        return jsonify({
            "message": "Moderation queue retrieved successfully",
            **queue_data
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get moderation queue: {str(e)}"}), 500

@moderation_bp.route('/reports/<report_id>/review', methods=['POST'])
@require_auth
def review_report(report_id: str):
    """Review a moderation report (moderators only)"""
    try:
        # TODO: Add proper moderator role check
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, ReviewReportSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        
        success, message = ModerationService.review_report(
            moderator_id=current_user_id,
            report_id=report_id,
            action=validated_data['action'],
            notes=validated_data.get('notes')
        )
        
        if success:
            return jsonify({"message": message}), 200
        else:
            return jsonify({"error": message}), 400
            
    except ValidationError as e:
        return jsonify({"error": "Invalid review data", "details": e.messages}), 400

@moderation_bp.route('/stats', methods=['GET'])
@require_auth
def get_moderation_stats():
    """Get moderation statistics (moderators/admins only)"""
    try:
        # TODO: Add proper moderator/admin role check
        
        days = request.args.get('days', 30, type=int)
        if days > 365:
            days = 365
        
        stats = ModerationService.get_moderation_stats(days)
        
        return jsonify({
            "message": "Moderation statistics retrieved successfully",
            **stats
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get moderation stats: {str(e)}"}), 500

@moderation_bp.route('/auto-rules', methods=['POST'])
@require_auth
def create_auto_rule():
    """Create an automated moderation rule (admins only)"""
    try:
        # TODO: Add proper admin role check
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, AutoModerationRuleSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        
        success, message, rule_data = ModerationService.create_auto_moderation_rule(
            moderator_id=current_user_id,
            rule_data=validated_data
        )
        
        if success:
            return jsonify({
                "message": message,
                "rule": rule_data
            }), 201
        else:
            return jsonify({"error": message}), 400
            
    except ValidationError as e:
        return jsonify({"error": "Invalid rule data", "details": e.messages}), 400

@moderation_bp.route('/auto-rules', methods=['GET'])
@require_auth
def get_auto_rules():
    """Get automated moderation rules (moderators only)"""
    try:
        # TODO: Add proper moderator role check
        
        # This would retrieve auto-moderation rules from the database
        # For now, return a placeholder response
        return jsonify({
            "message": "Auto-moderation rules retrieved successfully",
            "rules": []
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get auto-moderation rules: {str(e)}"}), 500

@moderation_bp.route('/scan-content', methods=['POST'])
@require_auth
def scan_content():
    """Scan content for potential violations (system/admin use)"""
    try:
        # TODO: Add proper admin/system role check
        
        data = request.get_json()
        if not data or 'content_type' not in data or 'content_data' not in data:
            return jsonify({"error": "content_type and content_data are required"}), 400
        
        violation = ModerationService.scan_content_for_violations(
            content_type=data['content_type'],
            content_data=data['content_data']
        )
        
        if violation:
            return jsonify({
                "message": "Violation detected",
                "violation": {
                    "report_id": str(violation["_id"]),
                    "reason": violation["reason"],
                    "priority_score": violation.get("priority_score", 50)
                }
            }), 200
        else:
            return jsonify({
                "message": "No violations detected",
                "violation": None
            }), 200
            
    except Exception as e:
        return jsonify({"error": f"Failed to scan content: {str(e)}"}), 500

# Content-specific reporting endpoints
@moderation_bp.route('/report/skill/<skill_id>', methods=['POST'])
@require_auth
def report_skill(skill_id: str):
    """Quick report endpoint for skills"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'inappropriate_content')
        description = data.get('description', '')
        
        current_user_id = str(g.current_user['_id'])
        
        success, message, report_data = ModerationService.report_content(
            reporter_id=current_user_id,
            content_type=ModerationService.SKILL,
            content_id=skill_id,
            reason=reason,
            description=description
        )
        
        if success:
            return jsonify({
                "message": message,
                "report": report_data
            }), 201
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        return jsonify({"error": f"Failed to report skill: {str(e)}"}), 500

@moderation_bp.route('/report/user/<user_id>', methods=['POST'])
@require_auth
def report_user(user_id: str):
    """Quick report endpoint for users"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'inappropriate_content')
        description = data.get('description', '')
        
        current_user_id = str(g.current_user['_id'])
        
        success, message, report_data = ModerationService.report_content(
            reporter_id=current_user_id,
            content_type=ModerationService.USER,
            content_id=user_id,
            reason=reason,
            description=description
        )
        
        if success:
            return jsonify({
                "message": message,
                "report": report_data
            }), 201
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        return jsonify({"error": f"Failed to report user: {str(e)}"}), 500

@moderation_bp.route('/report/comment/<comment_id>', methods=['POST'])
@require_auth
def report_comment(comment_id: str):
    """Quick report endpoint for comments"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'inappropriate_content')
        description = data.get('description', '')
        
        current_user_id = str(g.current_user['_id'])
        
        success, message, report_data = ModerationService.report_content(
            reporter_id=current_user_id,
            content_type=ModerationService.COMMENT,
            content_id=comment_id,
            reason=reason,
            description=description
        )
        
        if success:
            return jsonify({
                "message": message,
                "report": report_data
            }), 201
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        return jsonify({"error": f"Failed to report comment: {str(e)}"}), 500

# Community safety endpoints
@moderation_bp.route('/safety/guidelines', methods=['GET'])
def get_community_guidelines():
    """Get community guidelines and reporting information"""
    guidelines = {
        "community_guidelines": {
            "respectful_behavior": "Be respectful and kind to other community members",
            "no_spam": "Don't post repetitive or promotional content",
            "accurate_information": "Share accurate and helpful information",
            "appropriate_content": "Keep content appropriate for all audiences",
            "copyright_respect": "Respect intellectual property rights",
            "no_harassment": "Don't harass, bully, or threaten other users",
            "constructive_feedback": "Provide constructive and helpful feedback"
        },
        "reporting_reasons": {
            "spam": "Repetitive, promotional, or irrelevant content",
            "inappropriate_content": "Content that violates community standards",
            "harassment": "Bullying, threats, or targeted harassment",
            "hate_speech": "Content promoting hatred or discrimination",
            "violence": "Content promoting or depicting violence",
            "illegal_content": "Content that violates laws",
            "copyright_violation": "Unauthorized use of copyrighted material",
            "misinformation": "False or misleading information",
            "fake_profile": "Impersonation or fake account",
            "other": "Other violations not listed above"
        },
        "what_happens_after_reporting": [
            "Your report is reviewed by our moderation team",
            "We investigate the reported content within 24-48 hours",
            "Appropriate action is taken if violations are found",
            "You'll be notified of the outcome when available"
        ]
    }
    
    return jsonify({
        "message": "Community guidelines retrieved successfully",
        **guidelines
    }), 200

@moderation_bp.route('/safety/emergency', methods=['POST'])
@require_auth
def emergency_report():
    """Emergency reporting for serious violations"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        # Emergency reports get highest priority
        emergency_data = {
            **data,
            "priority_score": 100,
            "is_emergency": True
        }
        
        validated_data = cast(dict, ReportContentSchema().load(emergency_data))
        current_user_id = str(g.current_user['_id'])
        
        success, message, report_data = ModerationService.report_content(
            reporter_id=current_user_id,
            content_type=validated_data['content_type'],
            content_id=validated_data['content_id'],
            reason=validated_data['reason'],
            description=f"EMERGENCY REPORT: {validated_data.get('description', '')}",
            evidence_urls=validated_data.get('evidence_urls', [])
        )
        
        if success:
            return jsonify({
                "message": "Emergency report submitted - our team will review this immediately",
                "report": report_data
            }), 201
        else:
            return jsonify({"error": message}), 400
            
    except ValidationError as e:
        return jsonify({"error": "Invalid emergency report data", "details": e.messages}), 400

# Health check for moderation system
@moderation_bp.route('/health', methods=['GET'])
def moderation_health():
    """Check moderation system health"""
    try:
        # Basic health check - verify database connectivity
        current_time = datetime.utcnow()
        
        # Check if we can access moderation collections
        reports_count = g.db.moderation_reports.count_documents({})
        
        return jsonify({
            "status": "healthy",
            "message": "Moderation system operational",
            "timestamp": current_time.isoformat(),
            "total_reports": reports_count
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "unhealthy", 
            "message": f"Moderation system error: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }), 503