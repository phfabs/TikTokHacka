from bson import ObjectId
from pymongo.results import InsertOneResult, UpdateResult, DeleteResult
from datetime import datetime
from typing import List, Dict, Optional

class CommentRepository:
    """Repository for managing comments on shared skills"""

    def __init__(self, db_collection):
        self.collection = db_collection

    def create(self, comment_data: Dict) -> Dict:
        """Create a new comment"""
        comment_data['created_at'] = datetime.utcnow()
        comment_data['updated_at'] = datetime.utcnow()
        comment_data['likes_count'] = 0
        
        result: InsertOneResult = self.collection.insert_one(comment_data)
        return self.collection.find_one({"_id": result.inserted_id})

    def find_by_id(self, comment_id: str) -> Optional[Dict]:
        """Find a comment by its ID"""
        try:
            return self.collection.find_one({"_id": ObjectId(comment_id)})
        except:
            return None

    def find_by_plan(self, plan_id: str, limit: int = 100) -> List[Dict]:
        """Find comments for a specific plan, organized for threading"""
        # First get all comments for the plan
        all_comments = list(self.collection.find({
            "plan_id": ObjectId(plan_id)
        }).sort("created_at", 1))
        
        # Organize into nested structure
        comments_dict = {}
        root_comments = []
        
        for comment in all_comments:
            comment_id = str(comment["_id"])
            comments_dict[comment_id] = comment
            comment["replies"] = []
            
            parent_id = comment.get("parent_comment_id")
            if parent_id:
                parent_id = str(parent_id)
                if parent_id in comments_dict:
                    comments_dict[parent_id]["replies"].append(comment)
            else:
                root_comments.append(comment)
        
        return root_comments[:limit]

    def find_by_user(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Find comments made by a specific user"""
        return list(self.collection.find({
            "user_id": ObjectId(user_id)
        }).sort("created_at", -1).limit(limit))

    def find_replies(self, parent_comment_id: str) -> List[Dict]:
        """Find direct replies to a comment"""
        return list(self.collection.find({
            "parent_comment_id": ObjectId(parent_comment_id)
        }).sort("created_at", 1))

    def get_comment_thread(self, comment_id: str, max_depth: int = 3) -> Dict:
        """Get a comment and all its nested replies up to max_depth"""
        def get_replies_recursive(comment_obj: Dict, current_depth: int) -> Dict:
            if current_depth >= max_depth:
                return comment_obj
            
            comment_obj["replies"] = list(self.collection.find({
                "parent_comment_id": comment_obj["_id"]
            }).sort("created_at", 1))
            
            # Recursively get replies for each reply
            for reply in comment_obj["replies"]:
                reply = get_replies_recursive(reply, current_depth + 1)
                
            return comment_obj
        
        root_comment = self.find_by_id(comment_id)
        if not root_comment:
            return None
            
        return get_replies_recursive(root_comment, 0)

    def increment_likes(self, comment_id: str) -> UpdateResult:
        """Increment likes count for a comment"""
        return self.collection.update_one(
            {"_id": ObjectId(comment_id)},
            {
                "$inc": {"likes_count": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

    def decrement_likes(self, comment_id: str) -> UpdateResult:
        """Decrement likes count for a comment"""
        return self.collection.update_one(
            {"_id": ObjectId(comment_id)},
            {
                "$inc": {"likes_count": -1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

    def update_comment(self, comment_id: str, user_id: str, content: str) -> UpdateResult:
        """Update a comment (only by the author)"""
        return self.collection.update_one(
            {"_id": ObjectId(comment_id), "user_id": ObjectId(user_id)},
            {
                "$set": {
                    "content": content,
                    "updated_at": datetime.utcnow()
                }
            }
        )

    def delete_comment(self, comment_id: str, user_id: str) -> DeleteResult:
        """Delete a comment (only by the author)"""
        return self.collection.delete_one({
            "_id": ObjectId(comment_id),
            "user_id": ObjectId(user_id)
        })

    def delete_comment_and_replies(self, comment_id: str, user_id: str) -> int:
        """Delete a comment and all its replies (only by the author)"""
        # First verify ownership of the root comment
        root_comment = self.collection.find_one({
            "_id": ObjectId(comment_id),
            "user_id": ObjectId(user_id)
        })
        
        if not root_comment:
            return 0
        
        # Get all reply IDs recursively
        def get_all_reply_ids(parent_id: str) -> List[ObjectId]:
            reply_ids = []
            replies = list(self.collection.find(
                {"parent_comment_id": ObjectId(parent_id)},
                {"_id": 1}
            ))
            
            for reply in replies:
                reply_id = str(reply["_id"])
                reply_ids.append(reply["_id"])
                reply_ids.extend(get_all_reply_ids(reply_id))
                
            return reply_ids
        
        # Get all IDs to delete (root + all replies)
        all_ids_to_delete = [ObjectId(comment_id)]
        all_ids_to_delete.extend(get_all_reply_ids(comment_id))
        
        # Delete all comments
        result = self.collection.delete_many({"_id": {"$in": all_ids_to_delete}})
        return result.deleted_count

    def get_plan_comment_stats(self, plan_id: str) -> Dict:
        """Get comment statistics for a plan"""
        pipeline = [
            {"$match": {"plan_id": ObjectId(plan_id)}},
            {"$group": {
                "_id": None,
                "total_comments": {"$sum": 1},
                "total_likes": {"$sum": "$likes_count"},
                "unique_commenters": {"$addToSet": "$user_id"},
                "root_comments": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$parent_comment_id", None]},
                            1,
                            0
                        ]
                    }
                },
                "reply_comments": {
                    "$sum": {
                        "$cond": [
                            {"$ne": ["$parent_comment_id", None]},
                            1,
                            0
                        ]
                    }
                }
            }},
            {"$project": {
                "_id": 0,
                "total_comments": 1,
                "total_likes": 1,
                "root_comments": 1,
                "reply_comments": 1,
                "unique_commenters": {"$size": "$unique_commenters"}
            }}
        ]
        
        result = list(self.collection.aggregate(pipeline))
        return result[0] if result else {
            "total_comments": 0,
            "total_likes": 0,
            "root_comments": 0,
            "reply_comments": 0,
            "unique_commenters": 0
        }

    def get_user_comment_stats(self, user_id: str) -> Dict:
        """Get comment statistics for a user"""
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            {"$group": {
                "_id": None,
                "total_comments": {"$sum": 1},
                "total_likes_received": {"$sum": "$likes_count"},
                "unique_plans_commented": {"$addToSet": "$plan_id"}
            }},
            {"$project": {
                "_id": 0,
                "total_comments": 1,
                "total_likes_received": 1,
                "unique_plans_commented": {"$size": "$unique_plans_commented"}
            }}
        ]
        
        result = list(self.collection.aggregate(pipeline))
        return result[0] if result else {
            "total_comments": 0,
            "total_likes_received": 0,
            "unique_plans_commented": 0
        }

    def get_recent_comments(self, limit: int = 20, plan_id: Optional[str] = None) -> List[Dict]:
        """Get recent comments, optionally filtered by plan"""
        query = {}
        if plan_id:
            query["plan_id"] = ObjectId(plan_id)
        
        return list(self.collection.find(query)
                   .sort("created_at", -1)
                   .limit(limit))

    def count_comments_for_plan(self, plan_id: str) -> int:
        """Count total comments for a plan"""
        return self.collection.count_documents({"plan_id": ObjectId(plan_id)})

    def count_comments_by_user(self, user_id: str) -> int:
        """Count comments made by a user"""
        return self.collection.count_documents({"user_id": ObjectId(user_id)})

    def get_most_liked_comments(self, plan_id: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """Get most liked comments, optionally for a specific plan"""
        query = {"likes_count": {"$gt": 0}}
        if plan_id:
            query["plan_id"] = ObjectId(plan_id)
        
        return list(self.collection.find(query)
                   .sort([("likes_count", -1), ("created_at", -1)])
                   .limit(limit))

    def search_comments(self, query: str, plan_id: Optional[str] = None, limit: int = 20) -> List[Dict]:
        """Search comments by content"""
        search_filter = {
            "content": {"$regex": query, "$options": "i"}
        }
        
        if plan_id:
            search_filter["plan_id"] = ObjectId(plan_id)
        
        return list(self.collection.find(search_filter)
                   .sort("created_at", -1)
                   .limit(limit))