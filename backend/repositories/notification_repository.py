from bson import ObjectId
from pymongo.results import InsertOneResult, UpdateResult, DeleteResult
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class NotificationRepository:
    """Repository for managing user notifications"""

    def __init__(self, db_collection):
        self.collection = db_collection

    def create(self, notification_data: Dict) -> Dict:
        """Create a new notification"""
        notification_data['created_at'] = datetime.utcnow()
        notification_data['read'] = False
        notification_data['delivered'] = False
        
        result: InsertOneResult = self.collection.insert_one(notification_data)
        return self.collection.find_one({"_id": result.inserted_id})

    def find_by_id(self, notification_id: str) -> Optional[Dict]:
        """Find a notification by its ID"""
        try:
            return self.collection.find_one({"_id": ObjectId(notification_id)})
        except:
            return None

    def find_by_user(self, user_id: str, limit: int = 50, unread_only: bool = False) -> List[Dict]:
        """Find notifications for a user"""
        query = {"user_id": ObjectId(user_id)}
        
        if unread_only:
            query["read"] = False
            
        return list(self.collection.find(query)
                   .sort("created_at", -1)
                   .limit(limit))

    def find_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications for user"""
        return self.collection.count_documents({
            "user_id": ObjectId(user_id),
            "read": False
        })

    def mark_as_read(self, notification_id: str, user_id: str) -> UpdateResult:
        """Mark a notification as read"""
        return self.collection.update_one(
            {"_id": ObjectId(notification_id), "user_id": ObjectId(user_id)},
            {
                "$set": {
                    "read": True,
                    "read_at": datetime.utcnow()
                }
            }
        )

    def mark_all_as_read(self, user_id: str) -> UpdateResult:
        """Mark all notifications as read for a user"""
        return self.collection.update_many(
            {"user_id": ObjectId(user_id), "read": False},
            {
                "$set": {
                    "read": True,
                    "read_at": datetime.utcnow()
                }
            }
        )

    def mark_as_delivered(self, notification_id: str) -> UpdateResult:
        """Mark notification as delivered (for tracking delivery status)"""
        return self.collection.update_one(
            {"_id": ObjectId(notification_id)},
            {
                "$set": {
                    "delivered": True,
                    "delivered_at": datetime.utcnow()
                }
            }
        )

    def delete_notification(self, notification_id: str, user_id: str) -> DeleteResult:
        """Delete a notification"""
        return self.collection.delete_one({
            "_id": ObjectId(notification_id),
            "user_id": ObjectId(user_id)
        })

    def delete_old_notifications(self, days_old: int = 30) -> DeleteResult:
        """Delete notifications older than specified days"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        return self.collection.delete_many({
            "created_at": {"$lt": cutoff_date}
        })

    def find_by_type_and_reference(self, user_id: str, notification_type: str, 
                                 reference_id: str, reference_type: str) -> Optional[Dict]:
        """Find existing notification by type and reference"""
        return self.collection.find_one({
            "user_id": ObjectId(user_id),
            "notification_type": notification_type,
            "reference_id": ObjectId(reference_id),
            "reference_type": reference_type
        })

    def update_notification_data(self, notification_id: str, data: Dict) -> UpdateResult:
        """Update notification data (for aggregating similar notifications)"""
        return self.collection.update_one(
            {"_id": ObjectId(notification_id)},
            {
                "$set": {
                    "data": data,
                    "updated_at": datetime.utcnow()
                }
            }
        )

    def get_notification_stats(self, user_id: str) -> Dict:
        """Get notification statistics for a user"""
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            {"$group": {
                "_id": "$notification_type",
                "total": {"$sum": 1},
                "unread": {
                    "$sum": {
                        "$cond": [{"$eq": ["$read", False]}, 1, 0]
                    }
                },
                "latest": {"$max": "$created_at"}
            }},
            {"$sort": {"latest": -1}}
        ]
        
        results = list(self.collection.aggregate(pipeline))
        
        # Calculate totals
        total_notifications = sum(r["total"] for r in results)
        total_unread = sum(r["unread"] for r in results)
        
        return {
            "total_notifications": total_notifications,
            "total_unread": total_unread,
            "by_type": [
                {
                    "type": r["_id"],
                    "total": r["total"],
                    "unread": r["unread"],
                    "latest": r["latest"]
                }
                for r in results
            ]
        }

    def find_pending_delivery(self, limit: int = 100) -> List[Dict]:
        """Find notifications that haven't been delivered yet"""
        return list(self.collection.find({
            "delivered": False,
            "created_at": {"$gte": datetime.utcnow() - timedelta(hours=24)}  # Only recent ones
        }).sort("created_at", 1).limit(limit))

    def find_for_batch_processing(self, notification_types: List[str], 
                                 hours_old: int = 1, limit: int = 1000) -> List[Dict]:
        """Find notifications for batch processing (e.g., email digest)"""
        cutoff_date = datetime.utcnow() - timedelta(hours=hours_old)
        
        return list(self.collection.find({
            "notification_type": {"$in": notification_types},
            "created_at": {"$gte": cutoff_date},
            "batch_processed": {"$ne": True}
        }).sort("created_at", 1).limit(limit))

    def mark_batch_processed(self, notification_ids: List[str]) -> UpdateResult:
        """Mark notifications as batch processed"""
        return self.collection.update_many(
            {"_id": {"$in": [ObjectId(nid) for nid in notification_ids]}},
            {
                "$set": {
                    "batch_processed": True,
                    "batch_processed_at": datetime.utcnow()
                }
            }
        )

    def aggregate_similar_notifications(self, user_id: str, hours: int = 1) -> List[Dict]:
        """Aggregate similar notifications for better UX"""
        cutoff_date = datetime.utcnow() - timedelta(hours=hours)
        
        pipeline = [
            {"$match": {
                "user_id": ObjectId(user_id),
                "created_at": {"$gte": cutoff_date},
                "read": False
            }},
            {"$group": {
                "_id": {
                    "type": "$notification_type",
                    "reference_id": "$reference_id",
                    "reference_type": "$reference_type"
                },
                "count": {"$sum": 1},
                "latest": {"$max": "$created_at"},
                "first": {"$min": "$created_at"},
                "notifications": {"$push": "$$ROOT"}
            }},
            {"$match": {"count": {"$gt": 1}}},  # Only groups with multiple notifications
            {"$sort": {"latest": -1}}
        ]
        
        return list(self.collection.aggregate(pipeline))