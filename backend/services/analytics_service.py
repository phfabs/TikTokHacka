from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from flask import g, request, current_app
from bson import ObjectId
import logging
from backend.repositories.analytics_repository import AnalyticsRepository

class AnalyticsService:
    """Service for managing user engagement analytics and tracking"""

    # Event types for analytics tracking
    SKILL_VIEW = "skill_view"
    SKILL_LIKE = "skill_like"
    SKILL_UNLIKE = "skill_unlike"
    SKILL_DOWNLOAD = "skill_download"
    SKILL_COMMENT = "skill_comment"
    SKILL_SHARE = "skill_share"
    CUSTOM_TASK_ADD = "custom_task_add"
    TASK_VOTE = "task_vote"
    USER_FOLLOW = "user_follow"
    USER_UNFOLLOW = "user_unfollow"
    PROFILE_VIEW = "profile_view"
    SEARCH_PERFORMED = "search_performed"
    LOGIN_EVENT = "user_login"
    SIGNUP_EVENT = "user_signup"
    SKILL_CREATE = "skill_create"
    PLAN_GENERATE = "plan_generate"

    @staticmethod
    def track_event(event_type: str, user_id: str = None, **kwargs) -> bool:
        """Track a user engagement event"""
        
        try:
            # Get user from session if not provided
            if not user_id and hasattr(g, 'current_user') and g.current_user:
                user_id = str(g.current_user['_id'])
            
            # Prepare event data
            event_data = {
                "event_type": event_type,
                "user_id": ObjectId(user_id) if user_id else None,
                "session_id": AnalyticsService._get_session_id(),
                "ip_address": AnalyticsService._get_client_ip(),
                "user_agent": request.headers.get('User-Agent', '') if request else '',
                "metadata": kwargs
            }
            
            # Add specific fields based on event type
            if event_type in [AnalyticsService.SKILL_VIEW, AnalyticsService.SKILL_LIKE, 
                             AnalyticsService.SKILL_DOWNLOAD, AnalyticsService.SKILL_COMMENT]:
                event_data["skill_id"] = ObjectId(kwargs.get("skill_id")) if kwargs.get("skill_id") else None
            
            if event_type in [AnalyticsService.USER_FOLLOW, AnalyticsService.USER_UNFOLLOW, 
                             AnalyticsService.PROFILE_VIEW]:
                event_data["target_user_id"] = ObjectId(kwargs.get("target_user_id")) if kwargs.get("target_user_id") else None
            
            if event_type in [AnalyticsService.CUSTOM_TASK_ADD, AnalyticsService.TASK_VOTE]:
                event_data["task_id"] = ObjectId(kwargs.get("task_id")) if kwargs.get("task_id") else None
            
            # Record the event
            analytics_repo = AnalyticsRepository(g.db.analytics_events)
            analytics_repo.record_event(event_data)
            
            # Update real-time metrics if WebSocket is available
            try:
                if hasattr(current_app, 'websocket_service'):
                    AnalyticsService._update_real_time_metrics(event_type, event_data)
            except Exception as e:
                logging.warning(f"Failed to update real-time metrics: {e}")
            
            return True
            
        except Exception as e:
            logging.error(f"Failed to track event {event_type}: {e}")
            return False

    @staticmethod
    def get_user_engagement_summary(user_id: str, days: int = 30) -> Dict:
        """Get engagement summary for a specific user"""
        
        try:
            analytics_repo = AnalyticsRepository(g.db.analytics_events)
            metrics = analytics_repo.get_user_engagement_metrics(user_id, days)
            
            # Add derived insights
            insights = AnalyticsService._generate_user_insights(metrics)
            metrics["insights"] = insights
            
            return metrics
            
        except Exception as e:
            logging.error(f"Error getting user engagement summary: {e}")
            return {}

    @staticmethod
    def get_skill_analytics(skill_id: str, days: int = 30) -> Dict:
        """Get detailed analytics for a specific skill"""
        
        try:
            analytics_repo = AnalyticsRepository(g.db.analytics_events)
            metrics = analytics_repo.get_skill_performance_metrics(skill_id, days)
            
            # Add additional skill-specific insights
            skill_insights = AnalyticsService._generate_skill_insights(metrics)
            metrics["insights"] = skill_insights
            
            # Get demographic data for skill viewers
            demographics = AnalyticsService._get_skill_viewer_demographics(skill_id, days)
            metrics["viewer_demographics"] = demographics
            
            return metrics
            
        except Exception as e:
            logging.error(f"Error getting skill analytics: {e}")
            return {}

    @staticmethod
    def get_trending_content(content_type: str = "skill", days: int = 7, limit: int = 20) -> Dict:
        """Get trending content based on engagement"""
        
        try:
            analytics_repo = AnalyticsRepository(g.db.analytics_events)
            trending_items = analytics_repo.get_trending_content(content_type, days, limit)
            
            # Enrich trending items with additional data
            enriched_items = []
            for item in trending_items:
                if content_type == "skill":
                    skill_data = AnalyticsService._get_skill_data(str(item[f"{content_type}_id"]))
                    if skill_data:
                        enriched_item = {**item, "skill_info": skill_data}
                        enriched_items.append(enriched_item)
                elif content_type == "user":
                    user_data = AnalyticsService._get_user_data(str(item[f"{content_type}_id"]))
                    if user_data:
                        enriched_item = {**item, "user_info": user_data}
                        enriched_items.append(enriched_item)
            
            return {
                "content_type": content_type,
                "period_days": days,
                "trending_items": enriched_items
            }
            
        except Exception as e:
            logging.error(f"Error getting trending content: {e}")
            return {"content_type": content_type, "trending_items": []}

    @staticmethod
    def get_platform_dashboard_metrics(days: int = 30) -> Dict:
        """Get comprehensive platform metrics for dashboard"""
        
        try:
            analytics_repo = AnalyticsRepository(g.db.analytics_events)
            
            # Get overview metrics
            overview = analytics_repo.get_platform_overview_metrics(days)
            
            # Get feature usage analytics
            feature_usage = analytics_repo.get_feature_usage_analytics(days)
            
            # Get retention metrics for recent cohorts
            retention_data = []
            for i in range(7):  # Last 7 days of cohorts
                cohort_date = datetime.utcnow() - timedelta(days=i)
                retention = analytics_repo.get_user_retention_metrics(cohort_date, 7)
                if retention["cohort_size"] > 0:
                    retention_data.append(retention)
            
            # Get conversion funnel for key user journey
            funnel_events = [
                AnalyticsService.SIGNUP_EVENT,
                AnalyticsService.SKILL_VIEW,
                AnalyticsService.SKILL_LIKE,
                AnalyticsService.SKILL_DOWNLOAD
            ]
            funnel = analytics_repo.get_conversion_funnel(funnel_events, days)
            
            return {
                "overview": overview,
                "feature_usage": feature_usage,
                "retention_cohorts": retention_data,
                "user_journey_funnel": funnel,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logging.error(f"Error getting platform dashboard metrics: {e}")
            return {}

    @staticmethod
    def get_user_behavior_insights(user_id: str, days: int = 30) -> Dict:
        """Get behavioral insights for a user"""
        
        try:
            analytics_repo = AnalyticsRepository(g.db.analytics_events)
            
            # Get user's activity patterns
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            # Activity by hour of day
            hourly_pipeline = [
                {"$match": {
                    "user_id": ObjectId(user_id),
                    "timestamp": {"$gte": cutoff_date}
                }},
                {"$group": {
                    "_id": {"$hour": "$timestamp"},
                    "activity_count": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}}
            ]
            
            hourly_activity = list(analytics_repo.collection.aggregate(hourly_pipeline))
            
            # Activity by day of week
            daily_pipeline = [
                {"$match": {
                    "user_id": ObjectId(user_id),
                    "timestamp": {"$gte": cutoff_date}
                }},
                {"$group": {
                    "_id": {"$dayOfWeek": "$timestamp"},
                    "activity_count": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}}
            ]
            
            daily_activity = list(analytics_repo.collection.aggregate(daily_pipeline))
            
            # Most engaged content types
            content_pipeline = [
                {"$match": {
                    "user_id": ObjectId(user_id),
                    "timestamp": {"$gte": cutoff_date},
                    "event_type": {"$in": [
                        AnalyticsService.SKILL_VIEW, AnalyticsService.SKILL_LIKE,
                        AnalyticsService.SKILL_DOWNLOAD, AnalyticsService.SKILL_COMMENT
                    ]}
                }},
                {"$lookup": {
                    "from": "shared_skills",
                    "localField": "skill_id",
                    "foreignField": "_id",
                    "as": "skill_info"
                }},
                {"$unwind": "$skill_info"},
                {"$group": {
                    "_id": "$skill_info.category",
                    "interaction_count": {"$sum": 1}
                }},
                {"$sort": {"interaction_count": -1}},
                {"$limit": 5}
            ]
            
            content_preferences = list(analytics_repo.collection.aggregate(content_pipeline))
            
            return {
                "user_id": user_id,
                "period_days": days,
                "activity_patterns": {
                    "hourly": [{"hour": item["_id"], "activity": item["activity_count"]} for item in hourly_activity],
                    "daily": [{"day": item["_id"], "activity": item["activity_count"]} for item in daily_activity]
                },
                "content_preferences": [
                    {"category": item["_id"], "interactions": item["interaction_count"]} 
                    for item in content_preferences
                ],
                "insights": AnalyticsService._generate_behavior_insights(
                    hourly_activity, daily_activity, content_preferences
                )
            }
            
        except Exception as e:
            logging.error(f"Error getting user behavior insights: {e}")
            return {}

    @staticmethod
    def track_skill_view(skill_id: str, user_id: str = None, view_duration: int = None):
        """Track a skill view event with additional metadata"""
        metadata = {}
        if view_duration is not None:
            metadata["view_duration_seconds"] = view_duration
        
        return AnalyticsService.track_event(
            AnalyticsService.SKILL_VIEW,
            user_id=user_id,
            skill_id=skill_id,
            **metadata
        )

    @staticmethod
    def track_skill_interaction(interaction_type: str, skill_id: str, user_id: str = None, **metadata):
        """Track various skill interactions"""
        event_types = {
            "like": AnalyticsService.SKILL_LIKE,
            "unlike": AnalyticsService.SKILL_UNLIKE,
            "download": AnalyticsService.SKILL_DOWNLOAD,
            "comment": AnalyticsService.SKILL_COMMENT,
            "share": AnalyticsService.SKILL_SHARE
        }
        
        event_type = event_types.get(interaction_type)
        if not event_type:
            return False
        
        return AnalyticsService.track_event(
            event_type,
            user_id=user_id,
            skill_id=skill_id,
            **metadata
        )

    @staticmethod
    def track_user_interaction(interaction_type: str, target_user_id: str, user_id: str = None):
        """Track user-to-user interactions"""
        event_types = {
            "follow": AnalyticsService.USER_FOLLOW,
            "unfollow": AnalyticsService.USER_UNFOLLOW,
            "profile_view": AnalyticsService.PROFILE_VIEW
        }
        
        event_type = event_types.get(interaction_type)
        if not event_type:
            return False
        
        return AnalyticsService.track_event(
            event_type,
            user_id=user_id,
            target_user_id=target_user_id
        )

    @staticmethod
    def _get_session_id() -> str:
        """Get or generate session ID"""
        if request and hasattr(request, 'session'):
            return request.session.get('session_id', 'anonymous')
        return 'anonymous'

    @staticmethod
    def _get_client_ip() -> str:
        """Get client IP address"""
        if not request:
            return 'unknown'
        
        # Check for forwarded IP first
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        elif request.headers.get('X-Real-IP'):
            return request.headers.get('X-Real-IP')
        else:
            return request.remote_addr or 'unknown'

    @staticmethod
    def _update_real_time_metrics(event_type: str, event_data: Dict):
        """Update real-time metrics via WebSocket"""
        if hasattr(current_app, 'websocket_service'):
            websocket_service = current_app.websocket_service
            
            # Send real-time update to dashboard
            websocket_service.notify_system_update(
                update_type="analytics_event",
                data={
                    "event_type": event_type,
                    "timestamp": datetime.utcnow().isoformat(),
                    "user_count": 1  # This could be enhanced with more real-time data
                }
            )

    @staticmethod
    def _generate_user_insights(metrics: Dict) -> List[str]:
        """Generate insights from user engagement metrics"""
        insights = []
        
        engagement_score = metrics.get("total_engagement_score", 0)
        event_counts = metrics.get("event_counts", {})
        
        if engagement_score > 100:
            insights.append("Highly engaged user with excellent activity levels")
        elif engagement_score > 50:
            insights.append("Moderately engaged user with good activity")
        else:
            insights.append("Low engagement - consider targeted re-engagement")
        
        # Analyze specific behaviors
        if event_counts.get("skill_download", 0) > event_counts.get("skill_view", 0) * 0.2:
            insights.append("High conversion rate from viewing to downloading skills")
        
        if event_counts.get("skill_comment", 0) > 0:
            insights.append("Active community participant who engages with comments")
        
        return insights

    @staticmethod
    def _generate_skill_insights(metrics: Dict) -> List[str]:
        """Generate insights from skill performance metrics"""
        insights = []
        
        view_count = metrics.get("skill_view_count", 0)
        like_rate = metrics.get("like_conversion_rate", 0)
        download_rate = metrics.get("download_conversion_rate", 0)
        
        if view_count > 100:
            insights.append("Popular skill with high visibility")
        
        if like_rate > 10:
            insights.append("High like rate - users find this skill appealing")
        
        if download_rate > 5:
            insights.append("Strong download conversion - very practical skill")
        
        if download_rate < 1 and view_count > 50:
            insights.append("Low download rate despite views - consider improving skill content")
        
        return insights

    @staticmethod
    def _generate_behavior_insights(hourly: List, daily: List, preferences: List) -> List[str]:
        """Generate behavioral insights from activity patterns"""
        insights = []
        
        # Analyze peak activity hours
        if hourly:
            peak_hour = max(hourly, key=lambda x: x["activity_count"])["_id"]
            if 9 <= peak_hour <= 17:
                insights.append("Most active during business hours")
            elif 18 <= peak_hour <= 22:
                insights.append("Most active during evening hours")
            else:
                insights.append("Most active during off-peak hours")
        
        # Analyze preferences
        if preferences and len(preferences) > 0:
            top_category = preferences[0]["_id"]
            insights.append(f"Shows strong preference for {top_category} skills")
        
        return insights

    @staticmethod
    def _get_skill_data(skill_id: str) -> Optional[Dict]:
        """Get basic skill information"""
        try:
            skill = g.db.shared_skills.find_one({"_id": ObjectId(skill_id)})
            if skill:
                return {
                    "title": skill.get("title", ""),
                    "category": skill.get("category", ""),
                    "difficulty": skill.get("difficulty", ""),
                    "likes_count": skill.get("likes_count", 0)
                }
            return None
        except:
            return None

    @staticmethod
    def _get_user_data(user_id: str) -> Optional[Dict]:
        """Get basic user information"""
        try:
            user = g.db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                return {
                    "username": user.get("username", ""),
                    "is_verified": user.get("is_verified", False)
                }
            return None
        except:
            return None

    @staticmethod
    def _get_skill_viewer_demographics(skill_id: str, days: int) -> Dict:
        """Get demographic information about skill viewers"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            pipeline = [
                {"$match": {
                    "skill_id": ObjectId(skill_id),
                    "event_type": AnalyticsService.SKILL_VIEW,
                    "timestamp": {"$gte": cutoff_date}
                }},
                {"$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "_id",
                    "as": "user_info"
                }},
                {"$unwind": "$user_info"},
                {"$group": {
                    "_id": "$user_info.preferred_difficulty",
                    "count": {"$sum": 1}
                }},
                {"$sort": {"count": -1}}
            ]
            
            analytics_repo = AnalyticsRepository(g.db.analytics_events)
            demographics = list(analytics_repo.collection.aggregate(pipeline))
            
            return {
                "difficulty_preferences": [
                    {"difficulty": item["_id"] or "Unknown", "count": item["count"]}
                    for item in demographics
                ]
            }
        except Exception as e:
            logging.error(f"Error getting skill viewer demographics: {e}")
            return {}