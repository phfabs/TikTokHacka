from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from flask import g, current_app
from bson import ObjectId
import logging
import re
from backend.repositories.moderation_repository import ModerationRepository
from backend.services.notification_service import NotificationService

class ModerationService:
    """Service for content moderation and community safety"""

    # Report reasons
    SPAM = "spam"
    INAPPROPRIATE_CONTENT = "inappropriate_content"
    HARASSMENT = "harassment"
    HATE_SPEECH = "hate_speech"
    VIOLENCE = "violence"
    ILLEGAL_CONTENT = "illegal_content"
    COPYRIGHT_VIOLATION = "copyright_violation"
    MISINFORMATION = "misinformation"
    FAKE_PROFILE = "fake_profile"
    OTHER = "other"

    # Content types
    SKILL = "skill"
    COMMENT = "comment"
    USER = "user"
    CUSTOM_TASK = "custom_task"

    # Moderation actions
    NO_ACTION = "no_action"
    WARNING = "warning"
    CONTENT_REMOVAL = "content_removal"
    TEMPORARY_BAN = "temporary_ban"
    PERMANENT_BAN = "permanent_ban"
    ACCOUNT_SUSPENSION = "account_suspension"

    @staticmethod
    def report_content(reporter_id: str, content_type: str, content_id: str, 
                      reason: str, description: str = None, evidence_urls: List[str] = None) -> Tuple[bool, str, Optional[Dict]]:
        """Report content for moderation review"""
        
        try:
            # Validate input
            if not ModerationService._is_valid_report_reason(reason):
                return False, "Invalid report reason", None
            
            if not ModerationService._is_valid_content_type(content_type):
                return False, "Invalid content type", None
            
            # Check if content exists and get reported user ID
            content_data = ModerationService._get_content_data(content_type, content_id)
            if not content_data:
                return False, "Content not found", None
            
            reported_user_id = ModerationService._get_content_owner(content_data, content_type)
            
            # Prevent self-reporting
            if reporter_id == reported_user_id:
                return False, "Cannot report your own content", None
            
            # Check for duplicate reports
            moderation_repo = ModerationRepository(g.db.moderation_reports)
            existing_reports = moderation_repo.get_reports_by_content(content_type, content_id)
            
            # Check if this user has already reported this content
            user_already_reported = any(
                str(report.get("reporter_id")) == reporter_id 
                for report in existing_reports
            )
            
            if user_already_reported:
                return False, "You have already reported this content", None
            
            # Get reporter credibility score
            reporter_credibility = ModerationService._get_user_credibility(reporter_id)
            
            # Calculate content age for priority scoring
            content_age = ModerationService._calculate_content_age(content_data)
            
            # Prepare report data
            report_data = {
                "reporter_id": ObjectId(reporter_id),
                "content_type": content_type,
                "content_id": ObjectId(content_id),
                "reported_user_id": ObjectId(reported_user_id),
                "reason": reason,
                "description": description or f"Report for {reason}",
                "evidence_urls": evidence_urls or [],
                "reporter_credibility": reporter_credibility,
                "content_age_hours": content_age
            }
            
            # Calculate priority score
            report_data["priority_score"] = moderation_repo.calculate_priority_score(report_data)
            
            # Create the report
            report = moderation_repo.create_report(report_data)
            
            # Apply automatic moderation if applicable
            auto_action = ModerationService._check_auto_moderation_thresholds(
                content_type, content_id, existing_reports + [report]
            )
            
            if auto_action:
                ModerationService._apply_automatic_action(content_type, content_id, auto_action, report["_id"])
            
            # Notify moderators if high priority
            if report["priority_score"] >= 80:
                ModerationService._notify_moderators_urgent(report)
            
            logging.info(f"Content reported: {content_type}:{content_id} by user {reporter_id}")
            
            return True, "Report submitted successfully", {
                "report_id": str(report["_id"]),
                "priority_score": report["priority_score"],
                "status": "pending"
            }
            
        except Exception as e:
            logging.error(f"Error reporting content: {e}")
            return False, "Failed to submit report", None

    @staticmethod
    def get_user_reports(user_id: str, report_type: str = "filed", limit: int = 20) -> Dict:
        """Get reports filed by or against a user"""
        
        try:
            moderation_repo = ModerationRepository(g.db.moderation_reports)
            
            if report_type == "filed":
                reports = moderation_repo.get_reports_by_user(user_id, limit)
                message_key = "filed_reports"
            elif report_type == "received":
                reports = moderation_repo.get_reports_against_user(user_id, limit)
                message_key = "received_reports"
            else:
                return {"error": "Invalid report type"}
            
            # Format reports for response
            formatted_reports = []
            for report in reports:
                formatted_reports.append({
                    "report_id": str(report["_id"]),
                    "content_type": report["content_type"],
                    "content_id": str(report["content_id"]),
                    "reason": report["reason"],
                    "status": report["status"],
                    "created_at": report["created_at"].isoformat(),
                    "priority_score": report.get("priority_score", 50)
                })
            
            return {
                message_key: formatted_reports,
                "total_count": len(formatted_reports)
            }
            
        except Exception as e:
            logging.error(f"Error getting user reports: {e}")
            return {"error": "Failed to retrieve reports"}

    @staticmethod
    def review_report(moderator_id: str, report_id: str, action: str, 
                     notes: str = None) -> Tuple[bool, str]:
        """Review a moderation report and take action"""
        
        try:
            moderation_repo = ModerationRepository(g.db.moderation_reports)
            
            # Get the report
            report = moderation_repo.collection.find_one({"_id": ObjectId(report_id)})
            if not report:
                return False, "Report not found"
            
            if report["status"] != "pending":
                return False, "Report has already been reviewed"
            
            # Validate action
            valid_actions = [
                ModerationService.NO_ACTION, ModerationService.WARNING,
                ModerationService.CONTENT_REMOVAL, ModerationService.TEMPORARY_BAN,
                ModerationService.PERMANENT_BAN, ModerationService.ACCOUNT_SUSPENSION
            ]
            
            if action not in valid_actions:
                return False, "Invalid moderation action"
            
            # Update report status
            status = "resolved" if action != ModerationService.NO_ACTION else "dismissed"
            moderation_repo.update_report_status(report_id, status, moderator_id, notes)
            
            # Apply the moderation action
            if action != ModerationService.NO_ACTION:
                success = ModerationService._execute_moderation_action(
                    report, action, moderator_id, notes
                )
                if not success:
                    return False, "Failed to execute moderation action"
            
            # Update user credibility scores
            ModerationService._update_credibility_scores(report, action)
            
            # Notify relevant parties
            ModerationService._notify_moderation_outcome(report, action, notes)
            
            logging.info(f"Report {report_id} reviewed by moderator {moderator_id} with action: {action}")
            
            return True, f"Report reviewed successfully with action: {action}"
            
        except Exception as e:
            logging.error(f"Error reviewing report: {e}")
            return False, "Failed to review report"

    @staticmethod
    def get_moderation_queue(moderator_id: str = None, limit: int = 20) -> Dict:
        """Get the moderation queue for review"""
        
        try:
            moderation_repo = ModerationRepository(g.db.moderation_reports)
            reports = moderation_repo.get_moderation_queue(moderator_id, limit)
            
            # Enrich reports with content information
            enriched_reports = []
            for report in reports:
                content_data = ModerationService._get_content_data(
                    report["content_type"], str(report["content_id"])
                )
                
                enriched_report = {
                    "report_id": str(report["_id"]),
                    "content_type": report["content_type"],
                    "content_id": str(report["content_id"]),
                    "reason": report["reason"],
                    "description": report["description"],
                    "priority_score": report.get("priority_score", 50),
                    "created_at": report["created_at"].isoformat(),
                    "reporter_info": {
                        "user_id": str(report["reporter_info"][0]["_id"]) if report.get("reporter_info") else None,
                        "username": report["reporter_info"][0]["username"] if report.get("reporter_info") else "Anonymous"
                    },
                    "reported_user_info": {
                        "user_id": str(report["reported_user_info"][0]["_id"]) if report.get("reported_user_info") else None,
                        "username": report["reported_user_info"][0]["username"] if report.get("reported_user_info") else "Unknown"
                    },
                    "content_preview": ModerationService._get_content_preview(content_data, report["content_type"])
                }
                
                enriched_reports.append(enriched_report)
            
            return {
                "queue": enriched_reports,
                "total_count": len(enriched_reports)
            }
            
        except Exception as e:
            logging.error(f"Error getting moderation queue: {e}")
            return {"queue": [], "total_count": 0}

    @staticmethod
    def get_moderation_stats(days: int = 30) -> Dict:
        """Get moderation statistics and insights"""
        
        try:
            moderation_repo = ModerationRepository(g.db.moderation_reports)
            stats = moderation_repo.get_moderation_stats(days)
            
            # Get additional insights
            frequent_reporters = moderation_repo.get_frequent_reporters(10, days)
            frequently_reported = moderation_repo.get_frequently_reported_content(10, days)
            
            # Calculate response metrics
            response_metrics = ModerationService._calculate_response_metrics(days)
            
            enhanced_stats = {
                **stats,
                "frequent_reporters": frequent_reporters,
                "frequently_reported_content": frequently_reported,
                "response_metrics": response_metrics,
                "insights": ModerationService._generate_moderation_insights(stats)
            }
            
            return enhanced_stats
            
        except Exception as e:
            logging.error(f"Error getting moderation stats: {e}")
            return {}

    @staticmethod
    def create_auto_moderation_rule(moderator_id: str, rule_data: Dict) -> Tuple[bool, str, Optional[Dict]]:
        """Create an automated moderation rule"""
        
        try:
            # Validate rule data
            required_fields = ["type", "name", "description"]
            for field in required_fields:
                if field not in rule_data:
                    return False, f"Missing required field: {field}", None
            
            rule_data["created_by"] = ObjectId(moderator_id)
            
            moderation_repo = ModerationRepository(g.db.moderation_reports)
            rule = moderation_repo.create_auto_moderation_rule(rule_data)
            
            logging.info(f"Auto-moderation rule created by {moderator_id}: {rule_data['name']}")
            
            return True, "Auto-moderation rule created successfully", {
                "rule_id": str(rule["_id"]),
                "name": rule["name"],
                "type": rule["type"]
            }
            
        except Exception as e:
            logging.error(f"Error creating auto-moderation rule: {e}")
            return False, "Failed to create auto-moderation rule", None

    @staticmethod
    def scan_content_for_violations(content_type: str, content_data: Dict) -> Optional[Dict]:
        """Scan content for potential violations using auto-moderation"""
        
        try:
            moderation_repo = ModerationRepository(g.db.moderation_reports)
            violation = moderation_repo.apply_auto_moderation(content_type, content_data)
            
            if violation:
                logging.info(f"Auto-moderation detected violation in {content_type}: {content_data.get('_id')}")
            
            return violation
            
        except Exception as e:
            logging.error(f"Error scanning content for violations: {e}")
            return None

    # Helper methods
    @staticmethod
    def _is_valid_report_reason(reason: str) -> bool:
        """Validate report reason"""
        valid_reasons = [
            ModerationService.SPAM, ModerationService.INAPPROPRIATE_CONTENT,
            ModerationService.HARASSMENT, ModerationService.HATE_SPEECH,
            ModerationService.VIOLENCE, ModerationService.ILLEGAL_CONTENT,
            ModerationService.COPYRIGHT_VIOLATION, ModerationService.MISINFORMATION,
            ModerationService.FAKE_PROFILE, ModerationService.OTHER
        ]
        return reason in valid_reasons

    @staticmethod
    def _is_valid_content_type(content_type: str) -> bool:
        """Validate content type"""
        valid_types = [
            ModerationService.SKILL, ModerationService.COMMENT,
            ModerationService.USER, ModerationService.CUSTOM_TASK
        ]
        return content_type in valid_types

    @staticmethod
    def _get_content_data(content_type: str, content_id: str) -> Optional[Dict]:
        """Get content data based on type"""
        try:
            collections = {
                ModerationService.SKILL: "shared_skills",
                ModerationService.COMMENT: "plan_comments",
                ModerationService.USER: "users",
                ModerationService.CUSTOM_TASK: "custom_tasks"
            }
            
            collection_name = collections.get(content_type)
            if not collection_name:
                return None
            
            collection = g.db[collection_name]
            return collection.find_one({"_id": ObjectId(content_id)})
            
        except Exception:
            return None

    @staticmethod
    def _get_content_owner(content_data: Dict, content_type: str) -> str:
        """Get the owner/author of content"""
        if content_type == ModerationService.USER:
            return str(content_data["_id"])
        elif content_type == ModerationService.SKILL:
            return str(content_data["shared_by"])
        elif content_type == ModerationService.COMMENT:
            return str(content_data["user_id"])
        elif content_type == ModerationService.CUSTOM_TASK:
            return str(content_data["user_id"])
        else:
            return str(content_data.get("user_id", content_data.get("_id")))

    @staticmethod
    def _get_user_credibility(user_id: str) -> float:
        """Calculate user credibility score for reporting"""
        try:
            # Base credibility
            credibility = 1.0
            
            # Get user's report history
            moderation_repo = ModerationRepository(g.db.moderation_reports)
            user_reports = moderation_repo.get_reports_by_user(user_id, 50)
            
            if not user_reports:
                return credibility
            
            # Calculate accuracy rate
            resolved_reports = [r for r in user_reports if r["status"] in ["resolved", "dismissed"]]
            if resolved_reports:
                accurate_reports = len([r for r in resolved_reports if r["status"] == "resolved"])
                accuracy_rate = accurate_reports / len(resolved_reports)
                
                # Adjust credibility based on accuracy
                if accuracy_rate >= 0.8:
                    credibility += 0.5
                elif accuracy_rate >= 0.6:
                    credibility += 0.2
                elif accuracy_rate < 0.3:
                    credibility -= 0.3
            
            # Prevent spam reporting
            recent_reports = [
                r for r in user_reports 
                if r["created_at"] > datetime.utcnow() - timedelta(days=7)
            ]
            
            if len(recent_reports) > 10:  # More than 10 reports in a week
                credibility -= 0.4
            
            return max(0.1, min(2.0, credibility))  # Clamp between 0.1 and 2.0
            
        except Exception:
            return 1.0  # Default credibility

    @staticmethod
    def _calculate_content_age(content_data: Dict) -> int:
        """Calculate content age in hours"""
        try:
            created_at = content_data.get("created_at", datetime.utcnow())
            age_delta = datetime.utcnow() - created_at
            return int(age_delta.total_seconds() / 3600)  # Convert to hours
        except Exception:
            return 24  # Default to 24 hours

    @staticmethod
    def _check_auto_moderation_thresholds(content_type: str, content_id: str, all_reports: List[Dict]) -> Optional[str]:
        """Check if content should be automatically moderated"""
        
        # Count reports by reason
        reasons_count = {}
        for report in all_reports:
            reason = report.get("reason", "other")
            reasons_count[reason] = reasons_count.get(reason, 0) + 1
        
        # Define thresholds for automatic action
        auto_thresholds = {
            ModerationService.HATE_SPEECH: 2,
            ModerationService.HARASSMENT: 3,
            ModerationService.VIOLENCE: 1,
            ModerationService.ILLEGAL_CONTENT: 1,
            ModerationService.SPAM: 5
        }
        
        # Check if any threshold is exceeded
        for reason, threshold in auto_thresholds.items():
            if reasons_count.get(reason, 0) >= threshold:
                if reason in [ModerationService.VIOLENCE, ModerationService.ILLEGAL_CONTENT]:
                    return ModerationService.CONTENT_REMOVAL
                elif reason == ModerationService.HATE_SPEECH:
                    return ModerationService.WARNING
                elif reason == ModerationService.HARASSMENT:
                    return ModerationService.WARNING
                elif reason == ModerationService.SPAM:
                    return ModerationService.CONTENT_REMOVAL
        
        return None

    @staticmethod
    def _apply_automatic_action(content_type: str, content_id: str, action: str, report_id: str):
        """Apply automatic moderation action"""
        try:
            if action == ModerationService.CONTENT_REMOVAL:
                ModerationService._remove_content(content_type, content_id)
            elif action == ModerationService.WARNING:
                ModerationService._issue_warning(content_type, content_id)
            
            logging.info(f"Automatic action applied: {action} to {content_type}:{content_id}")
            
        except Exception as e:
            logging.error(f"Error applying automatic action: {e}")

    @staticmethod
    def _remove_content(content_type: str, content_id: str):
        """Remove content from the platform"""
        collections = {
            ModerationService.SKILL: "shared_skills",
            ModerationService.COMMENT: "plan_comments",
            ModerationService.CUSTOM_TASK: "custom_tasks"
        }
        
        collection_name = collections.get(content_type)
        if collection_name:
            g.db[collection_name].update_one(
                {"_id": ObjectId(content_id)},
                {"$set": {"is_removed": True, "removed_at": datetime.utcnow()}}
            )

    @staticmethod
    def _issue_warning(content_type: str, content_id: str):
        """Issue a warning for content"""
        # This could be implemented to flag content or notify the user
        pass

    @staticmethod
    def _notify_moderators_urgent(report: Dict):
        """Notify moderators of urgent reports"""
        try:
            if hasattr(current_app, 'websocket_service'):
                websocket_service = current_app.websocket_service
                websocket_service.notify_system_update(
                    update_type="urgent_report",
                    data={
                        "report_id": str(report["_id"]),
                        "content_type": report["content_type"],
                        "reason": report["reason"],
                        "priority_score": report["priority_score"]
                    }
                )
        except Exception as e:
            logging.error(f"Failed to notify moderators: {e}")

    @staticmethod
    def _execute_moderation_action(report: Dict, action: str, moderator_id: str, notes: str) -> bool:
        """Execute the moderation action"""
        try:
            content_type = report["content_type"]
            content_id = str(report["content_id"])
            reported_user_id = str(report["reported_user_id"])
            
            if action == ModerationService.CONTENT_REMOVAL:
                ModerationService._remove_content(content_type, content_id)
            
            elif action == ModerationService.WARNING:
                ModerationService._issue_user_warning(reported_user_id, report, notes)
            
            elif action in [ModerationService.TEMPORARY_BAN, ModerationService.PERMANENT_BAN]:
                ModerationService._ban_user(reported_user_id, action, notes)
            
            elif action == ModerationService.ACCOUNT_SUSPENSION:
                ModerationService._suspend_user(reported_user_id, notes)
            
            return True
            
        except Exception as e:
            logging.error(f"Error executing moderation action: {e}")
            return False

    @staticmethod
    def _issue_user_warning(user_id: str, report: Dict, notes: str):
        """Issue a warning to a user"""
        # Create notification for the user
        NotificationService.create_notification(
            user_id=user_id,
            notification_type="moderation_warning",
            reference_type="moderation",
            reference_id=str(report["_id"]),
            data={
                "message": f"Warning issued for {report['reason']}",
                "notes": notes,
                "content_type": report["content_type"]
            }
        )

    @staticmethod
    def _ban_user(user_id: str, ban_type: str, notes: str):
        """Ban a user temporarily or permanently"""
        ban_duration = None
        if ban_type == ModerationService.TEMPORARY_BAN:
            ban_duration = datetime.utcnow() + timedelta(days=7)  # 7 day ban
        
        g.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "is_banned": True,
                    "ban_type": ban_type,
                    "ban_reason": notes,
                    "banned_at": datetime.utcnow(),
                    "ban_expires_at": ban_duration
                }
            }
        )

    @staticmethod
    def _suspend_user(user_id: str, notes: str):
        """Suspend a user account"""
        g.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "is_suspended": True,
                    "suspension_reason": notes,
                    "suspended_at": datetime.utcnow()
                }
            }
        )

    @staticmethod
    def _update_credibility_scores(report: Dict, action: str):
        """Update credibility scores based on moderation outcome"""
        # This would update the reporter's credibility based on whether their report was valid
        pass

    @staticmethod
    def _notify_moderation_outcome(report: Dict, action: str, notes: str):
        """Notify relevant parties about moderation outcome"""
        # Notify the reporter about the outcome
        if report.get("reporter_id"):
            NotificationService.create_notification(
                user_id=str(report["reporter_id"]),
                notification_type="report_resolved",
                reference_type="moderation",
                reference_id=str(report["_id"]),
                data={
                    "message": f"Your report has been reviewed",
                    "action_taken": action,
                    "content_type": report["content_type"]
                }
            )

    @staticmethod
    def _calculate_response_metrics(days: int) -> Dict:
        """Calculate moderation response time metrics"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            pipeline = [
                {"$match": {
                    "created_at": {"$gte": cutoff_date},
                    "reviewed_at": {"$exists": True}
                }},
                {"$addFields": {
                    "response_time_hours": {
                        "$divide": [
                            {"$subtract": ["$reviewed_at", "$created_at"]},
                            3600000  # Convert milliseconds to hours
                        ]
                    }
                }},
                {"$group": {
                    "_id": None,
                    "avg_response_time": {"$avg": "$response_time_hours"},
                    "max_response_time": {"$max": "$response_time_hours"},
                    "min_response_time": {"$min": "$response_time_hours"},
                    "total_resolved": {"$sum": 1}
                }}
            ]
            
            moderation_repo = ModerationRepository(g.db.moderation_reports)
            result = list(moderation_repo.collection.aggregate(pipeline))
            
            if result:
                metrics = result[0]
                return {
                    "average_response_hours": round(metrics.get("avg_response_time", 0), 2),
                    "max_response_hours": round(metrics.get("max_response_time", 0), 2),
                    "min_response_hours": round(metrics.get("min_response_time", 0), 2),
                    "total_resolved_reports": metrics.get("total_resolved", 0)
                }
            
            return {"average_response_hours": 0, "total_resolved_reports": 0}
            
        except Exception as e:
            logging.error(f"Error calculating response metrics: {e}")
            return {}

    @staticmethod
    def _generate_moderation_insights(stats: Dict) -> List[str]:
        """Generate insights from moderation statistics"""
        insights = []
        
        total_reports = stats.get("total_reports", 0)
        by_status = stats.get("by_status", {})
        
        if total_reports > 0:
            pending_count = by_status.get("pending", 0)
            if pending_count > total_reports * 0.3:
                insights.append(f"High number of pending reports ({pending_count}) - consider increasing moderation capacity")
            
            resolved_count = by_status.get("resolved", 0)
            if resolved_count > 0:
                resolution_rate = (resolved_count / total_reports) * 100
                if resolution_rate > 80:
                    insights.append("High resolution rate indicates effective moderation")
                else:
                    insights.append("Low resolution rate - review moderation processes")
        
        return insights

    @staticmethod
    def _get_content_preview(content_data: Dict, content_type: str) -> Dict:
        """Get a preview of content for moderation review"""
        if not content_data:
            return {"preview": "Content not found"}
        
        if content_type == ModerationService.SKILL:
            return {
                "title": content_data.get("title", "")[:100],
                "description": content_data.get("description", "")[:200],
                "category": content_data.get("category", ""),
                "difficulty": content_data.get("difficulty", "")
            }
        elif content_type == ModerationService.COMMENT:
            return {
                "content": content_data.get("content", "")[:300],
                "likes_count": content_data.get("likes_count", 0)
            }
        elif content_type == ModerationService.USER:
            return {
                "username": content_data.get("username", ""),
                "bio": content_data.get("bio", "")[:200],
                "created_at": content_data.get("created_at", "").isoformat() if content_data.get("created_at") else ""
            }
        elif content_type == ModerationService.CUSTOM_TASK:
            return {
                "title": content_data.get("title", "")[:100],
                "description": content_data.get("description", "")[:200],
                "day": content_data.get("day", "")
            }
        
        return {"preview": "Preview not available"}