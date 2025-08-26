from typing import List, Optional, Dict, Any
from datetime import datetime
from flask import g
from bson import ObjectId
import logging
from backend.repositories.interaction_repository import InteractionRepository
from backend.repositories.shared_skill_repository import SharedSkillRepository
from backend.repositories.comment_repository import CommentRepository

class InteractionService:
    """Service for managing user interactions with shared skills (likes, comments, ratings)"""

    @staticmethod
    def toggle_like(user_id: str, plan_id: str) -> Dict[str, Any]:
        """Toggle like on a shared skill"""
        
        # Verify the shared skill exists
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        shared_skill = shared_skill_repo.find_by_id(plan_id)
        
        if not shared_skill:
            raise ValueError("Shared skill not found")
        
        # Don't allow users to like their own skills
        if str(shared_skill["shared_by"]) == user_id:
            raise ValueError("You cannot like your own skill")
        
        interaction_repo = InteractionRepository(g.db.plan_interactions)
        
        # Check if user has already liked this plan
        existing_like = interaction_repo.get_user_interaction(user_id, plan_id, "like")
        
        if existing_like:
            # Remove like
            interaction_repo.remove_interaction(user_id, plan_id, "like")
            shared_skill_repo.decrement_likes(plan_id)
            action = "unliked"
            liked = False
        else:
            # Add like
            interaction_repo.upsert_interaction(user_id, plan_id, "like")
            shared_skill_repo.increment_likes(plan_id)
            action = "liked"
            liked = True
        
        # Get updated like count
        updated_skill = shared_skill_repo.find_by_id(plan_id)
        
        logging.info(f"User {user_id} {action} skill {plan_id}")
        
        return {
            "action": action,
            "liked": liked,
            "likes_count": updated_skill["likes_count"],
            "message": f"Skill {action} successfully"
        }

    @staticmethod
    def rate_plan(user_id: str, plan_id: str, rating: int, review: Optional[str] = None) -> Dict[str, Any]:
        """Rate a shared skill"""
        
        # Validate rating
        if not (1 <= rating <= 5):
            raise ValueError("Rating must be between 1 and 5")
        
        # Verify the shared skill exists
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        shared_skill = shared_skill_repo.find_by_id(plan_id)
        
        if not shared_skill:
            raise ValueError("Shared skill not found")
        
        # Don't allow users to rate their own skills
        if str(shared_skill["shared_by"]) == user_id:
            raise ValueError("You cannot rate your own skill")
        
        interaction_repo = InteractionRepository(g.db.plan_interactions)
        
        # Check if user has already rated this plan
        existing_rating = interaction_repo.get_user_interaction(user_id, plan_id, "rate")
        was_update = existing_rating is not None
        
        # Add/update rating
        rating_data = {"rating": rating}
        if review and review.strip():
            rating_data["review"] = review.strip()[:500]  # Limit review length
        
        interaction_repo.upsert_interaction(user_id, plan_id, "rate", rating_data)
        
        # Recalculate average rating
        all_ratings = interaction_repo.get_plan_interactions(plan_id, "rate")
        if all_ratings:
            total_rating = sum(r.get("rating", 0) for r in all_ratings)
            avg_rating = total_rating / len(all_ratings)
            rating_count = len(all_ratings)
            
            # Update shared skill rating
            shared_skill_repo.update_rating(plan_id, avg_rating, rating_count)
        
        action = "updated" if was_update else "added"
        
        logging.info(f"User {user_id} {action} rating {rating} for skill {plan_id}")
        
        return {
            "action": action,
            "rating": rating,
            "review": rating_data.get("review"),
            "average_rating": round(avg_rating, 2) if all_ratings else rating,
            "rating_count": rating_count if all_ratings else 1,
            "message": f"Rating {action} successfully"
        }

    @staticmethod
    def add_comment(user_id: str, plan_id: str, content: str, parent_id: Optional[str] = None) -> Dict[str, Any]:
        """Add a comment to a shared skill"""
        
        # Validate content
        if not content or not content.strip():
            raise ValueError("Comment content is required")
        
        content = content.strip()
        if len(content) > 1000:
            raise ValueError("Comment content cannot exceed 1000 characters")
        
        # Verify the shared skill exists
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        shared_skill = shared_skill_repo.find_by_id(plan_id)
        
        if not shared_skill:
            raise ValueError("Shared skill not found")
        
        comment_repo = CommentRepository(g.db.plan_comments)
        
        # If replying to a comment, verify parent exists
        if parent_id:
            parent_comment = comment_repo.find_by_id(parent_id)
            if not parent_comment:
                raise ValueError("Parent comment not found")
            if str(parent_comment["plan_id"]) != plan_id:
                raise ValueError("Parent comment does not belong to this skill")
        
        # Create comment data
        comment_data = {
            "plan_id": ObjectId(plan_id),
            "user_id": ObjectId(user_id),
            "content": content,
            "parent_comment_id": ObjectId(parent_id) if parent_id else None
        }
        
        # Create comment
        comment = comment_repo.create(comment_data)
        
        # Add user info to response
        comment["user_info"] = InteractionService._get_user_info(user_id)
        
        logging.info(f"User {user_id} added comment to skill {plan_id}")
        
        return {
            "comment_id": str(comment["_id"]),
            "plan_id": plan_id,
            "parent_id": parent_id,
            "content": comment["content"],
            "user_info": comment["user_info"],
            "likes_count": comment["likes_count"],
            "created_at": comment["created_at"],
            "message": "Comment added successfully"
        }

    @staticmethod
    def get_comments(plan_id: str, limit: int = 100) -> Dict[str, Any]:
        """Get comments for a shared skill"""
        
        comment_repo = CommentRepository(g.db.plan_comments)
        
        # Get comments organized in thread structure
        comments = comment_repo.find_by_plan(plan_id, limit)
        
        # Add user info to all comments and replies
        def add_user_info_recursive(comment_list):
            for comment in comment_list:
                comment["user_info"] = InteractionService._get_user_info(str(comment["user_id"]))
                if "replies" in comment:
                    add_user_info_recursive(comment["replies"])
        
        add_user_info_recursive(comments)
        
        # Get comment stats
        stats = comment_repo.get_plan_comment_stats(plan_id)
        
        return {
            "plan_id": plan_id,
            "comments": comments,
            "stats": stats
        }

    @staticmethod
    def toggle_comment_like(user_id: str, comment_id: str) -> Dict[str, Any]:
        """Toggle like on a comment"""
        
        comment_repo = CommentRepository(g.db.plan_comments)
        comment = comment_repo.find_by_id(comment_id)
        
        if not comment:
            raise ValueError("Comment not found")
        
        # Don't allow users to like their own comments
        if str(comment["user_id"]) == user_id:
            raise ValueError("You cannot like your own comment")
        
        # For simplicity, we'll track comment likes separately
        # In a production system, you might want a separate comment_likes collection
        # For now, we'll just increment/decrement based on user action
        
        # This is a simplified implementation - you'd want to track who liked what
        interaction_repo = InteractionRepository(g.db.plan_interactions)
        
        # Check if user has liked this comment (using comment_id as plan_id for interaction tracking)
        existing_like = interaction_repo.get_user_interaction(user_id, comment_id, "comment_like")
        
        if existing_like:
            # Remove like
            interaction_repo.remove_interaction(user_id, comment_id, "comment_like")
            comment_repo.decrement_likes(comment_id)
            action = "unliked"
            liked = False
        else:
            # Add like
            interaction_repo.upsert_interaction(user_id, comment_id, "comment_like")
            comment_repo.increment_likes(comment_id)
            action = "liked"
            liked = True
        
        # Get updated comment
        updated_comment = comment_repo.find_by_id(comment_id)
        
        logging.info(f"User {user_id} {action} comment {comment_id}")
        
        return {
            "action": action,
            "liked": liked,
            "likes_count": updated_comment["likes_count"],
            "message": f"Comment {action} successfully"
        }

    @staticmethod
    def get_user_interactions_summary(user_id: str) -> Dict[str, Any]:
        """Get summary of user's interactions"""
        
        interaction_repo = InteractionRepository(g.db.plan_interactions)
        comment_repo = CommentRepository(g.db.plan_comments)
        
        # Get interaction stats
        interaction_stats = interaction_repo.get_user_interaction_stats(user_id)
        
        # Get comment stats
        comment_stats = comment_repo.get_user_comment_stats(user_id)
        
        # Get recent interactions
        recent_likes = interaction_repo.get_user_liked_plans(user_id)[:5]
        recent_comments = comment_repo.find_by_user(user_id, 5)
        
        return {
            "user_id": user_id,
            "stats": {
                **interaction_stats,
                **comment_stats
            },
            "recent_activity": {
                "likes": [str(like["plan_id"]) for like in recent_likes],
                "comments": [
                    {
                        "comment_id": str(comment["_id"]),
                        "plan_id": str(comment["plan_id"]),
                        "content": comment["content"][:100] + "..." if len(comment["content"]) > 100 else comment["content"],
                        "created_at": comment["created_at"]
                    } for comment in recent_comments
                ]
            }
        }

    @staticmethod
    def get_plan_interaction_summary(plan_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get interaction summary for a plan"""
        
        interaction_repo = InteractionRepository(g.db.plan_interactions)
        comment_repo = CommentRepository(g.db.plan_comments)
        
        # Get plan stats
        interaction_stats = interaction_repo.get_plan_stats(plan_id)
        comment_stats = comment_repo.get_plan_comment_stats(plan_id)
        
        # Get user's interactions if user_id provided
        user_interactions = {}
        if user_id:
            user_interactions = {
                "has_liked": interaction_repo.check_user_has_liked(user_id, plan_id),
                "user_rating": interaction_repo.get_user_rating_for_plan(user_id, plan_id)
            }
        
        # Get rating distribution
        rating_distribution = interaction_repo.get_rating_distribution(plan_id)
        
        return {
            "plan_id": plan_id,
            "stats": {
                **interaction_stats,
                "total_comments": comment_stats["total_comments"],
                "comment_likes": comment_stats["total_likes"]
            },
            "rating_distribution": rating_distribution,
            "user_interactions": user_interactions
        }

    @staticmethod
    def _get_user_info(user_id: str) -> Dict:
        """Get basic user information"""
        from backend.auth.models import User
        
        user = User.find_by_id(user_id)
        if user:
            return {
                "user_id": user_id,
                "username": user.get("username", "Unknown"),
                "avatar_url": f"https://ui-avatars.com/api/?name={user.get('username', 'U')}&background=8B5CF6&color=fff&size=40"
            }
        else:
            return {
                "user_id": user_id,
                "username": "Unknown User",
                "avatar_url": "https://ui-avatars.com/api/?name=U&background=8B5CF6&color=fff&size=40"
            }