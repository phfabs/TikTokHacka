from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from flask import g
from bson import ObjectId
import logging
from backend.services.cache_service import CacheService
from backend.repositories.user_relationship_repository import UserRelationshipRepository

class ActivityFeedService:
    """Service for generating and managing user activity feeds"""

    # Activity types
    SKILL_SHARED = "skill_shared"
    SKILL_LIKED = "skill_liked"
    SKILL_DOWNLOADED = "skill_downloaded"
    SKILL_COMMENTED = "skill_commented"
    USER_FOLLOWED = "user_followed"
    CUSTOM_TASK_ADDED = "custom_task_added"
    SKILL_RATED = "skill_rated"
    ACHIEVEMENT_EARNED = "achievement_earned"

    @staticmethod
    def generate_user_feed(user_id: str, limit: int = 50, include_own: bool = False) -> Dict[str, Any]:
        """Generate personalized activity feed for a user"""
        
        try:
            # Check cache first
            cached_feed = CacheService.get_user_feed(user_id)
            if cached_feed is not None:
                return {
                    "activities": cached_feed,
                    "total_count": len(cached_feed),
                    "cached": True
                }
            
            # Get users that this user follows
            relationship_repo = UserRelationshipRepository(g.db.user_relationships)
            following_users = relationship_repo.get_following(user_id, limit=1000)
            
            following_ids = [str(follow["following_id"]) for follow in following_users]
            
            # Include own activities if requested
            if include_own:
                following_ids.append(user_id)
            
            if not following_ids:
                # User doesn't follow anyone, show popular/trending content
                return ActivityFeedService._generate_discovery_feed(user_id, limit)
            
            # Generate feed from followed users' activities
            activities = []
            
            # Get skill sharing activities
            skill_activities = ActivityFeedService._get_skill_activities(following_ids, limit)
            activities.extend(skill_activities)
            
            # Get social activities
            social_activities = ActivityFeedService._get_social_activities(following_ids, limit)
            activities.extend(social_activities)
            
            # Get engagement activities
            engagement_activities = ActivityFeedService._get_engagement_activities(following_ids, limit)
            activities.extend(engagement_activities)
            
            # Sort by timestamp and limit
            activities.sort(key=lambda x: x.get('timestamp', datetime.min), reverse=True)
            activities = activities[:limit]
            
            # Enrich activities with additional data
            enriched_activities = ActivityFeedService._enrich_activities(activities)
            
            # Cache the feed
            CacheService.cache_user_feed(user_id, enriched_activities, CacheService.SHORT_TTL)
            
            return {
                "activities": enriched_activities,
                "total_count": len(enriched_activities),
                "cached": False
            }
            
        except Exception as e:
            logging.error(f"Error generating user feed for {user_id}: {e}")
            return {"activities": [], "total_count": 0, "error": str(e)}

    @staticmethod
    def _generate_discovery_feed(user_id: str, limit: int) -> Dict[str, Any]:
        """Generate discovery feed for users with no following"""
        
        try:
            activities = []
            
            # Get trending skills
            trending_skills = ActivityFeedService._get_trending_skills(limit // 2)
            activities.extend(trending_skills)
            
            # Get recent popular activities
            popular_activities = ActivityFeedService._get_popular_activities(limit // 2)
            activities.extend(popular_activities)
            
            # Sort and limit
            activities.sort(key=lambda x: x.get('timestamp', datetime.min), reverse=True)
            activities = activities[:limit]
            
            # Enrich activities
            enriched_activities = ActivityFeedService._enrich_activities(activities)
            
            return {
                "activities": enriched_activities,
                "total_count": len(enriched_activities),
                "type": "discovery"
            }
            
        except Exception as e:
            logging.error(f"Error generating discovery feed: {e}")
            return {"activities": [], "total_count": 0}

    @staticmethod
    def _get_skill_activities(user_ids: List[str], limit: int) -> List[Dict]:
        """Get skill-related activities from followed users"""
        
        try:
            # Get recent skill shares
            cutoff_date = datetime.utcnow() - timedelta(days=7)
            
            pipeline = [
                {"$match": {
                    "shared_by": {"$in": [ObjectId(uid) for uid in user_ids]},
                    "created_at": {"$gte": cutoff_date},
                    "visibility": "public"
                }},
                {"$lookup": {
                    "from": "users",
                    "localField": "shared_by",
                    "foreignField": "_id",
                    "as": "user_info"
                }},
                {"$unwind": "$user_info"},
                {"$project": {
                    "activity_type": {"$literal": ActivityFeedService.SKILL_SHARED},
                    "timestamp": "$created_at",
                    "user_id": "$shared_by",
                    "username": "$user_info.username",
                    "user_avatar": "$user_info.profile_picture",
                    "skill_id": "$_id",
                    "skill_title": "$title",
                    "skill_description": "$description",
                    "skill_category": "$category",
                    "skill_difficulty": "$difficulty",
                    "likes_count": "$likes_count",
                    "downloads_count": "$downloads_count"
                }},
                {"$sort": {"timestamp": -1}},
                {"$limit": limit}
            ]
            
            return list(g.db.shared_skills.aggregate(pipeline))
            
        except Exception as e:
            logging.error(f"Error getting skill activities: {e}")
            return []

    @staticmethod
    def _get_social_activities(user_ids: List[str], limit: int) -> List[Dict]:
        """Get social activities from followed users"""
        
        try:
            activities = []
            cutoff_date = datetime.utcnow() - timedelta(days=3)
            
            # Get follow activities
            follow_pipeline = [
                {"$match": {
                    "follower_id": {"$in": [ObjectId(uid) for uid in user_ids]},
                    "relationship_type": "follow",
                    "created_at": {"$gte": cutoff_date}
                }},
                {"$lookup": {
                    "from": "users",
                    "localField": "follower_id",
                    "foreignField": "_id",
                    "as": "follower_info"
                }},
                {"$lookup": {
                    "from": "users",
                    "localField": "following_id",
                    "foreignField": "_id",
                    "as": "following_info"
                }},
                {"$unwind": "$follower_info"},
                {"$unwind": "$following_info"},
                {"$project": {
                    "activity_type": {"$literal": ActivityFeedService.USER_FOLLOWED},
                    "timestamp": "$created_at",
                    "user_id": "$follower_id",
                    "username": "$follower_info.username",
                    "user_avatar": "$follower_info.profile_picture",
                    "target_user_id": "$following_id",
                    "target_username": "$following_info.username",
                    "target_avatar": "$following_info.profile_picture"
                }},
                {"$sort": {"timestamp": -1}},
                {"$limit": limit // 2}
            ]
            
            follow_activities = list(g.db.user_relationships.aggregate(follow_pipeline))
            activities.extend(follow_activities)
            
            return activities
            
        except Exception as e:
            logging.error(f"Error getting social activities: {e}")
            return []

    @staticmethod
    def _get_engagement_activities(user_ids: List[str], limit: int) -> List[Dict]:
        """Get engagement activities from analytics data"""
        
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=2)
            
            # Get high-engagement activities (likes, downloads, comments)
            pipeline = [
                {"$match": {
                    "user_id": {"$in": [ObjectId(uid) for uid in user_ids]},
                    "timestamp": {"$gte": cutoff_date},
                    "event_type": {"$in": ["skill_like", "skill_download", "skill_comment"]}
                }},
                {"$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "_id",
                    "as": "user_info"
                }},
                {"$lookup": {
                    "from": "shared_skills",
                    "localField": "skill_id",
                    "foreignField": "_id",
                    "as": "skill_info"
                }},
                {"$unwind": "$user_info"},
                {"$unwind": "$skill_info"},
                {"$project": {
                    "activity_type": {
                        "$switch": {
                            "branches": [
                                {"case": {"$eq": ["$event_type", "skill_like"]}, "then": ActivityFeedService.SKILL_LIKED},
                                {"case": {"$eq": ["$event_type", "skill_download"]}, "then": ActivityFeedService.SKILL_DOWNLOADED},
                                {"case": {"$eq": ["$event_type", "skill_comment"]}, "then": ActivityFeedService.SKILL_COMMENTED}
                            ],
                            "default": "unknown"
                        }
                    },
                    "timestamp": "$timestamp",
                    "user_id": "$user_id",
                    "username": "$user_info.username",
                    "user_avatar": "$user_info.profile_picture",
                    "skill_id": "$skill_id",
                    "skill_title": "$skill_info.title",
                    "skill_category": "$skill_info.category",
                    "metadata": "$metadata"
                }},
                {"$sort": {"timestamp": -1}},
                {"$limit": limit}
            ]
            
            return list(g.db.analytics_events.aggregate(pipeline))
            
        except Exception as e:
            logging.error(f"Error getting engagement activities: {e}")
            return []

    @staticmethod
    def _get_trending_skills(limit: int) -> List[Dict]:
        """Get trending skills for discovery feed"""
        
        try:
            # Check cache first
            trending_skills = CacheService.get_trending_skills()
            if trending_skills:
                return trending_skills[:limit]
            
            # Calculate trending skills
            cutoff_date = datetime.utcnow() - timedelta(days=1)
            
            pipeline = [
                {"$match": {
                    "created_at": {"$gte": cutoff_date},
                    "visibility": "public"
                }},
                {"$addFields": {
                    "trending_score": {
                        "$add": [
                            "$views_count",
                            {"$multiply": ["$likes_count", 2]},
                            {"$multiply": ["$downloads_count", 3]},
                            {"$multiply": ["$comments_count", 1.5]}
                        ]
                    }
                }},
                {"$lookup": {
                    "from": "users",
                    "localField": "shared_by",
                    "foreignField": "_id",
                    "as": "user_info"
                }},
                {"$unwind": "$user_info"},
                {"$project": {
                    "activity_type": {"$literal": "trending_skill"},
                    "timestamp": "$created_at",
                    "user_id": "$shared_by",
                    "username": "$user_info.username",
                    "user_avatar": "$user_info.profile_picture",
                    "skill_id": "$_id",
                    "skill_title": "$title",
                    "skill_description": "$description",
                    "skill_category": "$category",
                    "trending_score": "$trending_score",
                    "likes_count": "$likes_count",
                    "downloads_count": "$downloads_count"
                }},
                {"$sort": {"trending_score": -1}},
                {"$limit": limit}
            ]
            
            return list(g.db.shared_skills.aggregate(pipeline))
            
        except Exception as e:
            logging.error(f"Error getting trending skills: {e}")
            return []

    @staticmethod
    def _get_popular_activities(limit: int) -> List[Dict]:
        """Get popular activities for discovery feed"""
        
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=3)
            
            # Get skills with high engagement
            pipeline = [
                {"$match": {
                    "created_at": {"$gte": cutoff_date},
                    "visibility": "public",
                    "$or": [
                        {"likes_count": {"$gte": 5}},
                        {"downloads_count": {"$gte": 3}},
                        {"comments_count": {"$gte": 2}}
                    ]
                }},
                {"$lookup": {
                    "from": "users",
                    "localField": "shared_by",
                    "foreignField": "_id",
                    "as": "user_info"
                }},
                {"$unwind": "$user_info"},
                {"$project": {
                    "activity_type": {"$literal": "popular_skill"},
                    "timestamp": "$created_at",
                    "user_id": "$shared_by",
                    "username": "$user_info.username",
                    "user_avatar": "$user_info.profile_picture",
                    "skill_id": "$_id",
                    "skill_title": "$title",
                    "skill_category": "$category",
                    "engagement_score": {
                        "$add": ["$likes_count", "$downloads_count", "$comments_count"]
                    }
                }},
                {"$sort": {"engagement_score": -1}},
                {"$limit": limit}
            ]
            
            return list(g.db.shared_skills.aggregate(pipeline))
            
        except Exception as e:
            logging.error(f"Error getting popular activities: {e}")
            return []

    @staticmethod
    def _enrich_activities(activities: List[Dict]) -> List[Dict]:
        """Enrich activities with additional context and formatting"""
        
        enriched_activities = []
        
        for activity in activities:
            try:
                enriched_activity = activity.copy()
                
                # Add display message
                enriched_activity["display_message"] = ActivityFeedService._generate_display_message(activity)
                
                # Add time formatting
                enriched_activity["time_ago"] = ActivityFeedService._format_time_ago(
                    activity.get("timestamp")
                )
                
                # Add user avatar URL if missing
                if not activity.get("user_avatar"):
                    username = activity.get("username", "U")
                    enriched_activity["user_avatar"] = f"https://ui-avatars.com/api/?name={username[0]}&background=8B5CF6&color=fff&size=40"
                
                # Add skill URL if skill activity
                if activity.get("skill_id"):
                    enriched_activity["skill_url"] = f"/skills/{activity['skill_id']}"
                
                # Add interaction counts for display
                if "likes_count" in activity:
                    enriched_activity["interaction_summary"] = ActivityFeedService._format_interaction_counts(activity)
                
                enriched_activities.append(enriched_activity)
                
            except Exception as e:
                logging.error(f"Error enriching activity: {e}")
                # Include the original activity even if enrichment fails
                enriched_activities.append(activity)
        
        return enriched_activities

    @staticmethod
    def _generate_display_message(activity: Dict) -> str:
        """Generate human-readable display message for activity"""
        
        activity_type = activity.get("activity_type", "")
        username = activity.get("username", "Someone")
        
        if activity_type == ActivityFeedService.SKILL_SHARED:
            return f"{username} shared a new skill: {activity.get('skill_title', 'Untitled')}"
        
        elif activity_type == ActivityFeedService.SKILL_LIKED:
            return f"{username} liked {activity.get('skill_title', 'a skill')}"
        
        elif activity_type == ActivityFeedService.SKILL_DOWNLOADED:
            return f"{username} downloaded {activity.get('skill_title', 'a skill')}"
        
        elif activity_type == ActivityFeedService.SKILL_COMMENTED:
            return f"{username} commented on {activity.get('skill_title', 'a skill')}"
        
        elif activity_type == ActivityFeedService.USER_FOLLOWED:
            target_username = activity.get("target_username", "someone")
            return f"{username} started following {target_username}"
        
        elif activity_type == "trending_skill":
            return f"Trending: {activity.get('skill_title', 'Untitled')} by {username}"
        
        elif activity_type == "popular_skill":
            return f"Popular: {activity.get('skill_title', 'Untitled')} by {username}"
        
        else:
            return f"{username} had some activity"

    @staticmethod
    def _format_time_ago(timestamp) -> str:
        """Format timestamp as 'time ago' string"""
        
        if not timestamp:
            return "Recently"
        
        try:
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            
            now = datetime.utcnow()
            diff = now - timestamp
            
            if diff.days > 7:
                return timestamp.strftime("%b %d")
            elif diff.days > 0:
                return f"{diff.days}d ago"
            elif diff.seconds > 3600:
                hours = diff.seconds // 3600
                return f"{hours}h ago"
            elif diff.seconds > 60:
                minutes = diff.seconds // 60
                return f"{minutes}m ago"
            else:
                return "Just now"
                
        except Exception:
            return "Recently"

    @staticmethod
    def _format_interaction_counts(activity: Dict) -> str:
        """Format interaction counts for display"""
        
        likes = activity.get("likes_count", 0)
        downloads = activity.get("downloads_count", 0)
        comments = activity.get("comments_count", 0)
        
        parts = []
        if likes > 0:
            parts.append(f"{likes} like{'s' if likes != 1 else ''}")
        if downloads > 0:
            parts.append(f"{downloads} download{'s' if downloads != 1 else ''}")
        if comments > 0:
            parts.append(f"{comments} comment{'s' if comments != 1 else ''}")
        
        if not parts:
            return ""
        
        return " • ".join(parts)

    @staticmethod
    def invalidate_user_feed(user_id: str):
        """Invalidate user's cached activity feed"""
        CacheService.invalidate_user_feed(user_id)
        
        # Also invalidate feeds of users who follow this user
        try:
            relationship_repo = UserRelationshipRepository(g.db.user_relationships)
            followers = relationship_repo.get_followers(user_id, limit=1000)
            
            for follower in followers:
                follower_id = str(follower["follower_id"])
                CacheService.invalidate_user_feed(follower_id)
                
        except Exception as e:
            logging.error(f"Error invalidating follower feeds: {e}")

    @staticmethod
    def get_global_feed(limit: int = 100) -> Dict[str, Any]:
        """Get global activity feed (public activities)"""
        
        try:
            # Check cache
            cache_key = "global_feed"
            cached_feed = CacheService.get(cache_key)
            if cached_feed is not None:
                return {
                    "activities": cached_feed[:limit],
                    "total_count": len(cached_feed),
                    "cached": True
                }
            
            # Generate global feed
            activities = []
            
            # Get recent skill shares
            skill_activities = ActivityFeedService._get_recent_skill_shares(limit // 2)
            activities.extend(skill_activities)
            
            # Get high-engagement activities
            engagement_activities = ActivityFeedService._get_high_engagement_activities(limit // 2)
            activities.extend(engagement_activities)
            
            # Sort and limit
            activities.sort(key=lambda x: x.get('timestamp', datetime.min), reverse=True)
            activities = activities[:limit]
            
            # Enrich activities
            enriched_activities = ActivityFeedService._enrich_activities(activities)
            
            # Cache global feed
            CacheService.set(cache_key, enriched_activities, CacheService.SHORT_TTL)
            
            return {
                "activities": enriched_activities,
                "total_count": len(enriched_activities),
                "cached": False
            }
            
        except Exception as e:
            logging.error(f"Error generating global feed: {e}")
            return {"activities": [], "total_count": 0}

    @staticmethod
    def _get_recent_skill_shares(limit: int) -> List[Dict]:
        """Get recent public skill shares"""
        
        cutoff_date = datetime.utcnow() - timedelta(days=2)
        
        pipeline = [
            {"$match": {
                "created_at": {"$gte": cutoff_date},
                "visibility": "public"
            }},
            {"$lookup": {
                "from": "users",
                "localField": "shared_by",
                "foreignField": "_id",
                "as": "user_info"
            }},
            {"$unwind": "$user_info"},
            {"$project": {
                "activity_type": {"$literal": ActivityFeedService.SKILL_SHARED},
                "timestamp": "$created_at",
                "user_id": "$shared_by",
                "username": "$user_info.username",
                "user_avatar": "$user_info.profile_picture",
                "skill_id": "$_id",
                "skill_title": "$title",
                "skill_description": "$description",
                "skill_category": "$category",
                "likes_count": "$likes_count",
                "downloads_count": "$downloads_count",
                "comments_count": "$comments_count"
            }},
            {"$sort": {"timestamp": -1}},
            {"$limit": limit}
        ]
        
        return list(g.db.shared_skills.aggregate(pipeline))

    @staticmethod
    def _get_high_engagement_activities(limit: int) -> List[Dict]:
        """Get high-engagement activities for global feed"""
        
        cutoff_date = datetime.utcnow() - timedelta(hours=12)
        
        pipeline = [
            {"$match": {
                "timestamp": {"$gte": cutoff_date},
                "event_type": {"$in": ["skill_like", "skill_download"]},
                "skill_id": {"$exists": True}
            }},
            {"$group": {
                "_id": "$skill_id",
                "activity_count": {"$sum": 1},
                "latest_timestamp": {"$max": "$timestamp"},
                "users": {"$addToSet": "$user_id"}
            }},
            {"$match": {
                "activity_count": {"$gte": 3},  # At least 3 interactions
                "$expr": {"$gte": [{"$size": "$users"}, 2]}  # From at least 2 different users
            }},
            {"$lookup": {
                "from": "shared_skills",
                "localField": "_id",
                "foreignField": "_id",
                "as": "skill_info"
            }},
            {"$unwind": "$skill_info"},
            {"$lookup": {
                "from": "users",
                "localField": "skill_info.shared_by",
                "foreignField": "_id",
                "as": "user_info"
            }},
            {"$unwind": "$user_info"},
            {"$project": {
                "activity_type": {"$literal": "high_engagement"},
                "timestamp": "$latest_timestamp",
                "user_id": "$skill_info.shared_by",
                "username": "$user_info.username",
                "user_avatar": "$user_info.profile_picture",
                "skill_id": "$_id",
                "skill_title": "$skill_info.title",
                "skill_category": "$skill_info.category",
                "activity_count": 1,
                "engagement_count": "$activity_count"
            }},
            {"$sort": {"engagement_count": -1, "timestamp": -1}},
            {"$limit": limit}
        ]
        
        return list(g.db.analytics_events.aggregate(pipeline))