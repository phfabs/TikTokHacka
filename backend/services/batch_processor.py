import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from flask import g
from bson import ObjectId
from backend.repositories.analytics_repository import AnalyticsRepository
from backend.services.cache_service import CacheService
from backend.services.notification_service import NotificationService
import threading
import time
import json

class BatchProcessor:
    """Service for batch processing of engagement metrics and system tasks"""

    def __init__(self):
        self.running = False
        self.batch_threads = {}
        self.last_processed = {}
        self.app = None

    def start_batch_processing(self, app=None):
        """Start all batch processing tasks"""
        if self.running:
            logging.warning("Batch processing already running")
            return

        self.app = app
        self.running = True
        logging.info("Starting batch processing services")

        # Start different batch processors
        self._start_engagement_metrics_processor()
        self._start_trending_content_processor()
        self._start_notification_digest_processor()
        self._start_cache_maintenance_processor()
        self._start_analytics_aggregation_processor()

    def stop_batch_processing(self):
        """Stop all batch processing tasks"""
        self.running = False
        logging.info("Stopping batch processing services")

        # Wait for threads to finish
        for thread_name, thread in self.batch_threads.items():
            if thread.is_alive():
                logging.info(f"Waiting for {thread_name} to stop...")
                thread.join(timeout=10)

    def _start_engagement_metrics_processor(self):
        """Start engagement metrics batch processor"""
        def process_engagement_metrics():
            while self.running:
                try:
                    self._process_engagement_batch()
                    time.sleep(300)  # Process every 5 minutes
                except Exception as e:
                    logging.error(f"Engagement metrics processing error: {e}")
                    time.sleep(60)  # Wait 1 minute before retry

        thread = threading.Thread(target=process_engagement_metrics, daemon=True)
        thread.start()
        self.batch_threads['engagement_metrics'] = thread

    def _start_trending_content_processor(self):
        """Start trending content batch processor"""
        def process_trending_content():
            while self.running:
                try:
                    self._update_trending_content()
                    time.sleep(900)  # Process every 15 minutes
                except Exception as e:
                    logging.error(f"Trending content processing error: {e}")
                    time.sleep(300)  # Wait 5 minutes before retry

        thread = threading.Thread(target=process_trending_content, daemon=True)
        thread.start()
        self.batch_threads['trending_content'] = thread

    def _start_notification_digest_processor(self):
        """Start notification digest batch processor"""
        def process_notification_digest():
            while self.running:
                try:
                    self._process_notification_digest()
                    time.sleep(3600)  # Process every 1 hour
                except Exception as e:
                    logging.error(f"Notification digest processing error: {e}")
                    time.sleep(600)  # Wait 10 minutes before retry

        thread = threading.Thread(target=process_notification_digest, daemon=True)
        thread.start()
        self.batch_threads['notification_digest'] = thread

    def _start_cache_maintenance_processor(self):
        """Start cache maintenance batch processor"""
        def process_cache_maintenance():
            while self.running:
                try:
                    self._perform_cache_maintenance()
                    time.sleep(1800)  # Process every 30 minutes
                except Exception as e:
                    logging.error(f"Cache maintenance processing error: {e}")
                    time.sleep(600)  # Wait 10 minutes before retry

        thread = threading.Thread(target=process_cache_maintenance, daemon=True)
        thread.start()
        self.batch_threads['cache_maintenance'] = thread

    def _start_analytics_aggregation_processor(self):
        """Start analytics aggregation batch processor"""
        def process_analytics_aggregation():
            while self.running:
                try:
                    self._aggregate_analytics_data()
                    time.sleep(600)  # Process every 10 minutes
                except Exception as e:
                    logging.error(f"Analytics aggregation processing error: {e}")
                    time.sleep(300)  # Wait 5 minutes before retry

        thread = threading.Thread(target=process_analytics_aggregation, daemon=True)
        thread.start()
        self.batch_threads['analytics_aggregation'] = thread

    def _process_engagement_batch(self):
        """Process engagement metrics in batches"""
        try:
            if not self.app:
                return
                
            with self.app.app_context():
                # Process skill engagement updates
                self._update_skill_engagement_scores()
                
                # Process user engagement metrics
                self._update_user_engagement_metrics()
                
                # Update leaderboards
                self._update_leaderboards()
                
                logging.info("Engagement metrics batch processing completed")

        except Exception as e:
            logging.error(f"Error processing engagement batch: {e}")

    def _update_skill_engagement_scores(self):
        """Update skill engagement scores based on recent activity"""
        try:
            # Get recent interactions (last hour)
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            
            analytics_repo = AnalyticsRepository(g.db.analytics_events)
            
            # Aggregate skill interactions
            pipeline = [
                {"$match": {
                    "timestamp": {"$gte": cutoff_time},
                    "skill_id": {"$exists": True},
                    "event_type": {"$in": ["skill_view", "skill_like", "skill_download", "skill_comment"]}
                }},
                {"$group": {
                    "_id": "$skill_id",
                    "views": {"$sum": {"$cond": [{"$eq": ["$event_type", "skill_view"]}, 1, 0]}},
                    "likes": {"$sum": {"$cond": [{"$eq": ["$event_type", "skill_like"]}, 1, 0]}},
                    "downloads": {"$sum": {"$cond": [{"$eq": ["$event_type", "skill_download"]}, 1, 0]}},
                    "comments": {"$sum": {"$cond": [{"$eq": ["$event_type", "skill_comment"]}, 1, 0]}},
                    "unique_users": {"$addToSet": "$user_id"}
                }},
                {"$addFields": {
                    "engagement_score": {
                        "$add": [
                            "$views",
                            {"$multiply": ["$likes", 3]},
                            {"$multiply": ["$downloads", 5]},
                            {"$multiply": ["$comments", 4]},
                            {"$multiply": [{"$size": "$unique_users"}, 2]}
                        ]
                    }
                }}
            ]
            
            skill_updates = list(analytics_repo.collection.aggregate(pipeline))
            
            # Update skills collection with new engagement scores
            for update in skill_updates:
                skill_id = update["_id"]
                engagement_score = update["engagement_score"]
                
                g.db.shared_skills.update_one(
                    {"_id": skill_id},
                    {
                        "$inc": {
                            "views_count": update["views"],
                            "likes_count": update["likes"], 
                            "downloads_count": update["downloads"],
                            "comments_count": update["comments"]
                        },
                        "$set": {
                            "engagement_score": engagement_score,
                            "last_engagement_update": datetime.utcnow()
                        }
                    }
                )
                
                # Invalidate skill cache
                CacheService.delete_pattern(f"skill:*{skill_id}*")

            logging.info(f"Updated engagement scores for {len(skill_updates)} skills")

        except Exception as e:
            logging.error(f"Error updating skill engagement scores: {e}")

    def _update_user_engagement_metrics(self):
        """Update user engagement metrics"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=24)
            
            analytics_repo = AnalyticsRepository(g.db.analytics_events)
            
            # Aggregate user activity
            pipeline = [
                {"$match": {
                    "timestamp": {"$gte": cutoff_time},
                    "user_id": {"$exists": True}
                }},
                {"$group": {
                    "_id": "$user_id",
                    "total_events": {"$sum": 1},
                    "event_types": {"$addToSet": "$event_type"},
                    "last_activity": {"$max": "$timestamp"}
                }},
                {"$addFields": {
                    "activity_score": {
                        "$multiply": [
                            "$total_events",
                            {"$size": "$event_types"}
                        ]
                    }
                }}
            ]
            
            user_updates = list(analytics_repo.collection.aggregate(pipeline))
            
            # Update users collection
            for update in user_updates:
                user_id = update["_id"]
                activity_score = update["activity_score"]
                
                g.db.users.update_one(
                    {"_id": user_id},
                    {
                        "$set": {
                            "daily_activity_score": activity_score,
                            "last_activity": update["last_activity"]
                        },
                        "$inc": {"total_engagement_score": activity_score}
                    }
                )
                
                # Invalidate user cache
                CacheService.delete_pattern(f"user:*{user_id}*")

            logging.info(f"Updated engagement metrics for {len(user_updates)} users")

        except Exception as e:
            logging.error(f"Error updating user engagement metrics: {e}")

    def _update_leaderboards(self):
        """Update cached leaderboards"""
        try:
            # Update follower leaderboard
            follower_pipeline = [
                {"$lookup": {
                    "from": "user_relationships",
                    "let": {"user_id": "$_id"},
                    "pipeline": [
                        {"$match": {
                            "$expr": {"$eq": ["$following_id", "$$user_id"]},
                            "relationship_type": "follow",
                            "is_active": True
                        }},
                        {"$count": "followers"}
                    ],
                    "as": "follower_data"
                }},
                {"$addFields": {
                    "followers_count": {
                        "$ifNull": [{"$arrayElemAt": ["$follower_data.followers", 0]}, 0]
                    }
                }},
                {"$sort": {"followers_count": -1}},
                {"$limit": 50},
                {"$project": {
                    "username": 1,
                    "profile_picture": 1,
                    "is_verified": 1,
                    "followers_count": 1
                }}
            ]
            
            follower_leaderboard = list(g.db.users.aggregate(follower_pipeline))
            
            # Cache leaderboards
            CacheService.set("leaderboard:followers", follower_leaderboard, CacheService.MEDIUM_TTL)
            
            logging.info("Updated leaderboards cache")

        except Exception as e:
            logging.error(f"Error updating leaderboards: {e}")

    def _update_trending_content(self):
        """Update trending content based on engagement patterns"""
        try:
            if not self.app:
                return
                
            with self.app.app_context():
                from backend.services.analytics_service import AnalyticsService
                
                # Get trending skills
                trending_skills = AnalyticsService.get_trending_content("skill", days=1, limit=50)
                
                # Cache trending skills
                CacheService.cache_trending_skills(trending_skills.get("trending_items", []))
                
                # Update trending scores in database
                for item in trending_skills.get("trending_items", []):
                    skill_id = item.get("skill_id")
                    trending_score = item.get("trending_score", 0)
                    
                    if skill_id:
                        g.db.shared_skills.update_one(
                            {"_id": ObjectId(skill_id)},
                            {
                                "$set": {
                                    "trending_score": trending_score,
                                    "trending_updated_at": datetime.utcnow()
                                }
                            }
                        )
                
                logging.info(f"Updated trending content - {len(trending_skills.get('trending_items', []))} items")

        except Exception as e:
            logging.error(f"Error updating trending content: {e}")

    def _process_notification_digest(self):
        """Process notification digests for users"""
        try:
            if not self.app:
                return
                
            with self.app.app_context():
                # Find users eligible for digest notifications
                digest_cutoff = datetime.utcnow() - timedelta(hours=24)
                
                # Get users who have unread notifications
                pipeline = [
                    {"$match": {
                        "read": False,
                        "created_at": {"$gte": digest_cutoff},
                        "notification_type": {"$in": [
                            "like_received", "comment_received", "follower_added"
                        ]}
                    }},
                    {"$group": {
                        "_id": "$user_id",
                        "unread_count": {"$sum": 1},
                        "notification_types": {"$addToSet": "$notification_type"},
                        "latest_notification": {"$max": "$created_at"}
                    }},
                    {"$match": {"unread_count": {"$gte": 5}}}  # At least 5 unread notifications
                ]
                
                digest_candidates = list(g.db.notifications.aggregate(pipeline))
                
                for candidate in digest_candidates:
                    user_id = str(candidate["_id"])
                    unread_count = candidate["unread_count"]
                    
                    # Check if user hasn't been sent a digest recently
                    last_digest_key = f"digest_sent:{user_id}"
                    if not CacheService.exists(last_digest_key):
                        
                        # Create digest notification
                        digest_message = f"You have {unread_count} unread notifications"
                        
                        NotificationService.create_notification(
                            user_id=user_id,
                            notification_type="daily_digest",
                            reference_type="system",
                            reference_id=user_id,
                            data={
                                "message": digest_message,
                                "unread_count": unread_count,
                                "digest_date": datetime.utcnow().isoformat()
                            }
                        )
                        
                        # Mark digest as sent (prevent duplicate for 24 hours)
                        CacheService.set(last_digest_key, True, 86400)
                
                logging.info(f"Processed notification digests for {len(digest_candidates)} users")

        except Exception as e:
            logging.error(f"Error processing notification digest: {e}")

    def _perform_cache_maintenance(self):
        """Perform cache maintenance tasks"""
        try:
            if not CacheService.is_available():
                return

            # Get cache stats
            stats = CacheService.get_cache_stats()
            
            # Log cache performance
            logging.info(f"Cache stats - Keys: {stats.get('keys', 0)}, "
                        f"Hit rate: {stats.get('hit_rate', 0)}%, "
                        f"Memory: {stats.get('used_memory_human', '0B')}")
            
            # Warm frequently accessed cache if hit rate is low
            if stats.get('hit_rate', 100) < 60:
                CacheService.warm_cache("trending")
                logging.info("Warmed cache due to low hit rate")

        except Exception as e:
            logging.error(f"Error performing cache maintenance: {e}")

    def _aggregate_analytics_data(self):
        """Aggregate analytics data for reporting"""
        try:
            if not self.app:
                return
                
            with self.app.app_context():
                # Aggregate daily analytics
                today = datetime.utcnow().date()
                daily_key = f"daily_analytics:{today.isoformat()}"
                
                # Check if already processed today
                if CacheService.exists(daily_key):
                    return
                
                analytics_repo = AnalyticsRepository(g.db.analytics_events)
                
                # Get platform overview for today
                start_of_day = datetime.combine(today, datetime.min.time())
                end_of_day = datetime.combine(today, datetime.max.time())
                
                pipeline = [
                    {"$match": {
                        "timestamp": {"$gte": start_of_day, "$lte": end_of_day}
                    }},
                    {"$group": {
                        "_id": "$event_type",
                        "count": {"$sum": 1},
                        "unique_users": {"$addToSet": "$user_id"}
                    }},
                    {"$project": {
                        "event_type": "$_id",
                        "count": 1,
                        "unique_users": {"$size": "$unique_users"}
                    }}
                ]
                
                daily_aggregation = list(analytics_repo.collection.aggregate(pipeline))
                
                # Cache daily aggregation
                CacheService.set(daily_key, daily_aggregation, CacheService.LONG_TTL)
                
                logging.info(f"Aggregated analytics data for {today}")

        except Exception as e:
            logging.error(f"Error aggregating analytics data: {e}")

    def process_immediate_batch(self, batch_type: str) -> Dict[str, Any]:
        """Process a specific batch type immediately"""
        try:
            result = {"success": False, "message": "", "processed_items": 0}
            
            if batch_type == "engagement":
                self._process_engagement_batch()
                result["success"] = True
                result["message"] = "Engagement metrics processed"
                
            elif batch_type == "trending":
                self._update_trending_content()
                result["success"] = True
                result["message"] = "Trending content updated"
                
            elif batch_type == "notifications":
                self._process_notification_digest()
                result["success"] = True
                result["message"] = "Notification digests processed"
                
            elif batch_type == "cache_maintenance":
                self._perform_cache_maintenance()
                result["success"] = True
                result["message"] = "Cache maintenance completed"
                
            elif batch_type == "analytics":
                self._aggregate_analytics_data()
                result["success"] = True
                result["message"] = "Analytics data aggregated"
                
            else:
                result["message"] = f"Unknown batch type: {batch_type}"
            
            return result
            
        except Exception as e:
            logging.error(f"Error processing immediate batch {batch_type}: {e}")
            return {
                "success": False,
                "message": f"Error processing {batch_type}: {str(e)}",
                "processed_items": 0
            }

    def get_batch_status(self) -> Dict[str, Any]:
        """Get status of all batch processes"""
        return {
            "running": self.running,
            "active_threads": {
                name: thread.is_alive() for name, thread in self.batch_threads.items()
            },
            "last_processed": self.last_processed,
            "started_at": getattr(self, 'started_at', None)
        }

    def cleanup_old_data(self, days_old: int = 90):
        """Clean up old analytics and log data"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            # Clean old analytics events
            result = g.db.analytics_events.delete_many({
                "timestamp": {"$lt": cutoff_date}
            })
            
            logging.info(f"Cleaned up {result.deleted_count} old analytics events")
            
            # Clean old notifications
            notification_result = g.db.notifications.delete_many({
                "created_at": {"$lt": cutoff_date},
                "read": True
            })
            
            logging.info(f"Cleaned up {notification_result.deleted_count} old notifications")

        except Exception as e:
            logging.error(f"Error cleaning up old data: {e}")

# Global batch processor instance
batch_processor = BatchProcessor()