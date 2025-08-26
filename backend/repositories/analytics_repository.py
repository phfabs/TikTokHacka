from bson import ObjectId
from pymongo.results import InsertOneResult, UpdateResult
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class AnalyticsRepository:
    """Repository for managing user engagement analytics and metrics"""

    def __init__(self, db_collection):
        self.collection = db_collection

    def record_event(self, event_data: Dict) -> Dict:
        """Record an analytics event"""
        event_data['timestamp'] = datetime.utcnow()
        
        result: InsertOneResult = self.collection.insert_one(event_data)
        return self.collection.find_one({"_id": result.inserted_id})

    def get_user_engagement_metrics(self, user_id: str, days: int = 30) -> Dict:
        """Get engagement metrics for a specific user"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {
                "user_id": ObjectId(user_id),
                "timestamp": {"$gte": cutoff_date}
            }},
            {"$group": {
                "_id": "$event_type",
                "count": {"$sum": 1},
                "latest": {"$max": "$timestamp"}
            }},
            {"$sort": {"count": -1}}
        ]
        
        results = list(self.collection.aggregate(pipeline))
        
        # Calculate engagement score
        engagement_weights = {
            "skill_view": 1,
            "skill_like": 3,
            "skill_download": 5,
            "skill_comment": 4,
            "skill_share": 6,
            "custom_task_add": 4,
            "task_vote": 2,
            "user_follow": 3,
            "profile_view": 1
        }
        
        total_score = 0
        event_counts = {}
        
        for result in results:
            event_type = result["_id"]
            count = result["count"]
            event_counts[event_type] = count
            
            weight = engagement_weights.get(event_type, 1)
            total_score += count * weight
        
        return {
            "user_id": user_id,
            "period_days": days,
            "total_engagement_score": total_score,
            "event_counts": event_counts,
            "events_breakdown": results
        }

    def get_skill_performance_metrics(self, skill_id: str, days: int = 30) -> Dict:
        """Get performance metrics for a specific skill"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {
                "skill_id": ObjectId(skill_id),
                "timestamp": {"$gte": cutoff_date}
            }},
            {"$group": {
                "_id": {
                    "event_type": "$event_type",
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}}
                },
                "count": {"$sum": 1}
            }},
            {"$group": {
                "_id": "$_id.event_type",
                "total_count": {"$sum": "$count"},
                "daily_data": {
                    "$push": {
                        "date": "$_id.date",
                        "count": "$count"
                    }
                }
            }},
            {"$sort": {"total_count": -1}}
        ]
        
        results = list(self.collection.aggregate(pipeline))
        
        # Calculate conversion rates
        metrics = {"skill_id": skill_id, "period_days": days}
        view_count = 0
        
        for result in results:
            event_type = result["_id"]
            total_count = result["total_count"]
            
            metrics[f"{event_type}_count"] = total_count
            metrics[f"{event_type}_daily"] = result["daily_data"]
            
            if event_type == "skill_view":
                view_count = total_count
        
        # Calculate conversion rates
        if view_count > 0:
            metrics["like_conversion_rate"] = (metrics.get("skill_like_count", 0) / view_count) * 100
            metrics["download_conversion_rate"] = (metrics.get("skill_download_count", 0) / view_count) * 100
            metrics["comment_conversion_rate"] = (metrics.get("skill_comment_count", 0) / view_count) * 100
        
        return metrics

    def get_trending_content(self, content_type: str = "skill", days: int = 7, limit: int = 20) -> List[Dict]:
        """Get trending content based on engagement metrics"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Define event types for trending calculation
        trending_events = {
            "skill": ["skill_view", "skill_like", "skill_download", "skill_comment", "skill_share"],
            "user": ["user_follow", "profile_view"],
            "task": ["custom_task_add", "task_vote"]
        }
        
        event_types = trending_events.get(content_type, ["skill_view"])
        
        pipeline = [
            {"$match": {
                "event_type": {"$in": event_types},
                "timestamp": {"$gte": cutoff_date}
            }},
            {"$group": {
                "_id": f"${content_type}_id",
                "total_interactions": {"$sum": 1},
                "unique_users": {"$addToSet": "$user_id"},
                "latest_activity": {"$max": "$timestamp"}
            }},
            {"$addFields": {
                "unique_user_count": {"$size": "$unique_users"},
                "trending_score": {
                    "$add": [
                        "$total_interactions",
                        {"$multiply": ["$unique_user_count", 2]}  # Weight unique users more
                    ]
                }
            }},
            {"$sort": {"trending_score": -1, "latest_activity": -1}},
            {"$limit": limit},
            {"$project": {
                f"{content_type}_id": "$_id",
                "total_interactions": 1,
                "unique_user_count": 1,
                "trending_score": 1,
                "latest_activity": 1
            }}
        ]
        
        return list(self.collection.aggregate(pipeline))

    def get_platform_overview_metrics(self, days: int = 30) -> Dict:
        """Get overall platform engagement metrics"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_date}}},
            {"$group": {
                "_id": {
                    "event_type": "$event_type",
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}}
                },
                "count": {"$sum": 1},
                "unique_users": {"$addToSet": "$user_id"}
            }},
            {"$group": {
                "_id": "$_id.event_type",
                "total_events": {"$sum": "$count"},
                "daily_breakdown": {
                    "$push": {
                        "date": "$_id.date",
                        "count": "$count",
                        "unique_users": {"$size": "$unique_users"}
                    }
                }
            }},
            {"$sort": {"total_events": -1}}
        ]
        
        results = list(self.collection.aggregate(pipeline))
        
        # Calculate additional metrics
        total_events = sum(result["total_events"] for result in results)
        
        # Get unique active users
        unique_users_pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_date}}},
            {"$group": {"_id": None, "unique_users": {"$addToSet": "$user_id"}}},
            {"$project": {"unique_user_count": {"$size": "$unique_users"}}}
        ]
        
        unique_users_result = list(self.collection.aggregate(unique_users_pipeline))
        unique_users_count = unique_users_result[0]["unique_user_count"] if unique_users_result else 0
        
        return {
            "period_days": days,
            "total_events": total_events,
            "unique_active_users": unique_users_count,
            "events_by_type": results,
            "average_events_per_user": total_events / unique_users_count if unique_users_count > 0 else 0
        }

    def get_user_retention_metrics(self, cohort_start_date: datetime, days_to_track: int = 30) -> Dict:
        """Calculate user retention metrics for a cohort"""
        cohort_end_date = cohort_start_date + timedelta(days=1)
        
        # Get users who joined in the cohort period
        user_collection = self.collection.database.users
        cohort_users = list(user_collection.find({
            "created_at": {
                "$gte": cohort_start_date,
                "$lt": cohort_end_date
            }
        }, {"_id": 1}))
        
        cohort_user_ids = [user["_id"] for user in cohort_users]
        cohort_size = len(cohort_user_ids)
        
        if cohort_size == 0:
            return {"cohort_size": 0, "retention_data": []}
        
        # Track retention over time
        retention_data = []
        
        for day in range(days_to_track + 1):
            check_date = cohort_start_date + timedelta(days=day)
            next_day = check_date + timedelta(days=1)
            
            # Count active users on this day
            active_users = self.collection.count_documents({
                "user_id": {"$in": cohort_user_ids},
                "timestamp": {
                    "$gte": check_date,
                    "$lt": next_day
                }
            })
            
            retention_rate = (active_users / cohort_size) * 100
            
            retention_data.append({
                "day": day,
                "date": check_date.strftime("%Y-%m-%d"),
                "active_users": active_users,
                "retention_rate": retention_rate
            })
        
        return {
            "cohort_start_date": cohort_start_date.strftime("%Y-%m-%d"),
            "cohort_size": cohort_size,
            "retention_data": retention_data
        }

    def get_feature_usage_analytics(self, days: int = 30) -> Dict:
        """Get analytics on feature usage across the platform"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_date}}},
            {"$group": {
                "_id": "$event_type",
                "total_uses": {"$sum": 1},
                "unique_users": {"$addToSet": "$user_id"},
                "first_use": {"$min": "$timestamp"},
                "last_use": {"$max": "$timestamp"}
            }},
            {"$addFields": {
                "unique_user_count": {"$size": "$unique_users"}
            }},
            {"$sort": {"total_uses": -1}}
        ]
        
        results = list(self.collection.aggregate(pipeline))
        
        # Calculate adoption rates and engagement
        feature_analytics = []
        total_platform_users = self._get_active_users_count(days)
        
        for result in results:
            adoption_rate = (result["unique_user_count"] / total_platform_users) * 100 if total_platform_users > 0 else 0
            avg_uses_per_user = result["total_uses"] / result["unique_user_count"]
            
            feature_analytics.append({
                "feature": result["_id"],
                "total_uses": result["total_uses"],
                "unique_users": result["unique_user_count"],
                "adoption_rate": adoption_rate,
                "average_uses_per_user": avg_uses_per_user,
                "first_use": result["first_use"].isoformat(),
                "last_use": result["last_use"].isoformat()
            })
        
        return {
            "period_days": days,
            "total_active_users": total_platform_users,
            "feature_analytics": feature_analytics
        }

    def _get_active_users_count(self, days: int) -> int:
        """Get count of active users in the specified period"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_date}}},
            {"$group": {"_id": None, "unique_users": {"$addToSet": "$user_id"}}},
            {"$project": {"count": {"$size": "$unique_users"}}}
        ]
        
        result = list(self.collection.aggregate(pipeline))
        return result[0]["count"] if result else 0

    def get_conversion_funnel(self, funnel_events: List[str], days: int = 30) -> Dict:
        """Analyze conversion funnel for a sequence of events"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        funnel_data = []
        
        for i, event_type in enumerate(funnel_events):
            if i == 0:
                # First step - count all users who performed this event
                users_pipeline = [
                    {"$match": {
                        "event_type": event_type,
                        "timestamp": {"$gte": cutoff_date}
                    }},
                    {"$group": {"_id": None, "users": {"$addToSet": "$user_id"}}},
                    {"$project": {"count": {"$size": "$users"}}}
                ]
                
                result = list(self.collection.aggregate(users_pipeline))
                user_count = result[0]["count"] if result else 0
                conversion_rate = 100.0
                
            else:
                # Subsequent steps - count users who performed both previous and current event
                previous_users_pipeline = [
                    {"$match": {
                        "event_type": {"$in": funnel_events[:i]},
                        "timestamp": {"$gte": cutoff_date}
                    }},
                    {"$group": {"_id": None, "users": {"$addToSet": "$user_id"}}}
                ]
                
                current_users_pipeline = [
                    {"$match": {
                        "event_type": event_type,
                        "timestamp": {"$gte": cutoff_date}
                    }},
                    {"$group": {"_id": None, "users": {"$addToSet": "$user_id"}}}
                ]
                
                prev_result = list(self.collection.aggregate(previous_users_pipeline))
                curr_result = list(self.collection.aggregate(current_users_pipeline))
                
                if prev_result and curr_result:
                    prev_users = set(str(uid) for uid in prev_result[0]["users"])
                    curr_users = set(str(uid) for uid in curr_result[0]["users"])
                    
                    converted_users = prev_users.intersection(curr_users)
                    user_count = len(converted_users)
                    conversion_rate = (user_count / len(prev_users)) * 100 if prev_users else 0
                else:
                    user_count = 0
                    conversion_rate = 0
            
            funnel_data.append({
                "step": i + 1,
                "event_type": event_type,
                "user_count": user_count,
                "conversion_rate": conversion_rate,
                "drop_off_rate": 100 - conversion_rate
            })
        
        return {
            "funnel_events": funnel_events,
            "period_days": days,
            "funnel_data": funnel_data
        }