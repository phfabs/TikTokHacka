from typing import Dict, List, Any, Optional
from datetime import datetime
from flask import g, current_app
from bson import ObjectId
import logging
from backend.repositories.notification_repository import NotificationRepository

class NotificationService:
    """Service for managing user notifications and real-time updates"""

    # Notification types
    LIKE_RECEIVED = "like_received"
    COMMENT_RECEIVED = "comment_received"
    COMMENT_REPLY = "comment_reply"
    SKILL_DOWNLOADED = "skill_downloaded"
    CUSTOM_TASK_ADDED = "custom_task_added"
    TASK_VOTED = "task_voted"
    FOLLOWER_ADDED = "follower_added"
    SKILL_RATED = "skill_rated"

    @staticmethod
    def create_notification(user_id: str, notification_type: str, 
                          reference_type: str, reference_id: str, 
                          data: Dict, actor_id: str = None) -> Dict:
        """Create a new notification"""
        
        notification_repo = NotificationRepository(g.db.notifications)
        
        # Check if similar notification already exists (to avoid spam)
        existing = notification_repo.find_by_type_and_reference(
            user_id, notification_type, reference_id, reference_type
        )
        
        if existing and notification_type in [
            NotificationService.LIKE_RECEIVED, 
            NotificationService.SKILL_DOWNLOADED
        ]:
            # For some notification types, aggregate rather than create duplicates
            return NotificationService._update_aggregated_notification(
                existing, data, actor_id
            )
        
        # Create new notification
        notification_data = {
            "user_id": ObjectId(user_id),
            "notification_type": notification_type,
            "reference_type": reference_type,  # 'skill', 'comment', 'task', 'user'
            "reference_id": ObjectId(reference_id),
            "data": data,
            "actor_id": ObjectId(actor_id) if actor_id else None
        }
        
        notification = notification_repo.create(notification_data)
        
        # Send real-time notification if WebSocket is available
        try:
            if hasattr(current_app, 'websocket_service'):
                websocket_service = current_app.websocket_service
                websocket_service.notify_user_personal(
                    user_id=user_id,
                    notification_type=notification_type,
                    data={
                        "notification_id": str(notification["_id"]),
                        "message": NotificationService._format_notification_message(
                            notification_type, data
                        ),
                        **data
                    }
                )
        except Exception as e:
            logging.error(f"Failed to send real-time notification: {e}")
        
        logging.info(f"Created {notification_type} notification for user {user_id}")
        
        return notification

    @staticmethod
    def notify_like_received(skill_id: str, skill_owner_id: str, liker_id: str, 
                           skill_title: str) -> Optional[Dict]:
        """Notify skill owner about received like"""
        
        if skill_owner_id == liker_id:  # Don't notify self-likes
            return None
        
        # Get liker info
        from backend.auth.models import User
        liker = User.find_by_id(liker_id)
        liker_name = liker.get("username", "Someone") if liker else "Someone"
        
        return NotificationService.create_notification(
            user_id=skill_owner_id,
            notification_type=NotificationService.LIKE_RECEIVED,
            reference_type="skill",
            reference_id=skill_id,
            data={
                "skill_title": skill_title,
                "liker_name": liker_name,
                "message": f"{liker_name} liked your skill \"{skill_title}\""
            },
            actor_id=liker_id
        )

    @staticmethod
    def notify_comment_received(skill_id: str, skill_owner_id: str, commenter_id: str,
                              skill_title: str, comment_content: str) -> Optional[Dict]:
        """Notify skill owner about received comment"""
        
        if skill_owner_id == commenter_id:  # Don't notify self-comments
            return None
        
        # Get commenter info
        from backend.auth.models import User
        commenter = User.find_by_id(commenter_id)
        commenter_name = commenter.get("username", "Someone") if commenter else "Someone"
        
        # Truncate comment for notification
        short_comment = comment_content[:100] + "..." if len(comment_content) > 100 else comment_content
        
        return NotificationService.create_notification(
            user_id=skill_owner_id,
            notification_type=NotificationService.COMMENT_RECEIVED,
            reference_type="skill",
            reference_id=skill_id,
            data={
                "skill_title": skill_title,
                "commenter_name": commenter_name,
                "comment_preview": short_comment,
                "message": f"{commenter_name} commented on your skill \"{skill_title}\""
            },
            actor_id=commenter_id
        )

    @staticmethod
    def notify_comment_reply(parent_comment_id: str, parent_author_id: str, 
                           replier_id: str, skill_id: str, skill_title: str,
                           reply_content: str) -> Optional[Dict]:
        """Notify parent comment author about reply"""
        
        if parent_author_id == replier_id:  # Don't notify self-replies
            return None
        
        # Get replier info
        from backend.auth.models import User
        replier = User.find_by_id(replier_id)
        replier_name = replier.get("username", "Someone") if replier else "Someone"
        
        # Truncate reply for notification
        short_reply = reply_content[:100] + "..." if len(reply_content) > 100 else reply_content
        
        return NotificationService.create_notification(
            user_id=parent_author_id,
            notification_type=NotificationService.COMMENT_REPLY,
            reference_type="comment",
            reference_id=parent_comment_id,
            data={
                "skill_title": skill_title,
                "skill_id": skill_id,
                "replier_name": replier_name,
                "reply_preview": short_reply,
                "message": f"{replier_name} replied to your comment on \"{skill_title}\""
            },
            actor_id=replier_id
        )

    @staticmethod
    def notify_skill_downloaded(skill_id: str, skill_owner_id: str, downloader_id: str,
                              skill_title: str) -> Optional[Dict]:
        """Notify skill owner about skill download"""
        
        if skill_owner_id == downloader_id:  # Don't notify self-downloads
            return None
        
        # Get downloader info
        from backend.auth.models import User
        downloader = User.find_by_id(downloader_id)
        downloader_name = downloader.get("username", "Someone") if downloader else "Someone"
        
        return NotificationService.create_notification(
            user_id=skill_owner_id,
            notification_type=NotificationService.SKILL_DOWNLOADED,
            reference_type="skill",
            reference_id=skill_id,
            data={
                "skill_title": skill_title,
                "downloader_name": downloader_name,
                "message": f"{downloader_name} downloaded your skill \"{skill_title}\""
            },
            actor_id=downloader_id
        )

    @staticmethod
    def notify_custom_task_added(skill_id: str, skill_owner_id: str, contributor_id: str,
                               skill_title: str, day: int, task_title: str) -> Optional[Dict]:
        """Notify skill owner about custom task added to their skill"""
        
        if skill_owner_id == contributor_id:  # Don't notify if owner added their own task
            return None
        
        # Get contributor info
        from backend.auth.models import User
        contributor = User.find_by_id(contributor_id)
        contributor_name = contributor.get("username", "Someone") if contributor else "Someone"
        
        return NotificationService.create_notification(
            user_id=skill_owner_id,
            notification_type=NotificationService.CUSTOM_TASK_ADDED,
            reference_type="skill",
            reference_id=skill_id,
            data={
                "skill_title": skill_title,
                "contributor_name": contributor_name,
                "day": day,
                "task_title": task_title,
                "message": f"{contributor_name} added a custom task \"{task_title}\" to day {day} of your skill \"{skill_title}\""
            },
            actor_id=contributor_id
        )

    @staticmethod
    def notify_task_voted(task_id: str, task_author_id: str, voter_id: str,
                        vote_type: str, skill_title: str, task_title: str) -> Optional[Dict]:
        """Notify task author about vote on their custom task"""
        
        if task_author_id == voter_id:  # Don't notify self-votes
            return None
        
        # Only notify for upvotes to reduce spam
        if vote_type != "up":
            return None
        
        # Get voter info
        from backend.auth.models import User
        voter = User.find_by_id(voter_id)
        voter_name = voter.get("username", "Someone") if voter else "Someone"
        
        return NotificationService.create_notification(
            user_id=task_author_id,
            notification_type=NotificationService.TASK_VOTED,
            reference_type="task",
            reference_id=task_id,
            data={
                "skill_title": skill_title,
                "task_title": task_title,
                "voter_name": voter_name,
                "vote_type": vote_type,
                "message": f"{voter_name} upvoted your custom task \"{task_title}\""
            },
            actor_id=voter_id
        )

    @staticmethod
    def notify_skill_rated(skill_id: str, skill_owner_id: str, rater_id: str,
                         skill_title: str, rating: int, review: str = None) -> Optional[Dict]:
        """Notify skill owner about rating received"""
        
        if skill_owner_id == rater_id:  # Don't notify self-ratings
            return None
        
        # Get rater info
        from backend.auth.models import User
        rater = User.find_by_id(rater_id)
        rater_name = rater.get("username", "Someone") if rater else "Someone"
        
        # Format rating message
        stars = "⭐" * rating
        review_text = f": \"{review[:50]}...\"" if review and len(review) > 3 else ""
        
        return NotificationService.create_notification(
            user_id=skill_owner_id,
            notification_type=NotificationService.SKILL_RATED,
            reference_type="skill",
            reference_id=skill_id,
            data={
                "skill_title": skill_title,
                "rater_name": rater_name,
                "rating": rating,
                "stars": stars,
                "review_preview": review[:100] if review else "",
                "message": f"{rater_name} rated your skill \"{skill_title}\" {stars}{review_text}"
            },
            actor_id=rater_id
        )

    @staticmethod
    def get_user_notifications(user_id: str, limit: int = 50, unread_only: bool = False) -> Dict:
        """Get notifications for a user"""
        
        notification_repo = NotificationRepository(g.db.notifications)
        
        notifications = notification_repo.find_by_user(user_id, limit, unread_only)
        unread_count = notification_repo.find_unread_count(user_id)
        
        # Enrich notifications with user info
        enriched_notifications = []
        for notification in notifications:
            # Add actor info if available
            if notification.get("actor_id"):
                actor_info = NotificationService._get_user_info(str(notification["actor_id"]))
                notification["actor_info"] = actor_info
            
            # Format timestamps
            notification["created_at_formatted"] = NotificationService._format_timestamp(
                notification["created_at"]
            )
            
            enriched_notifications.append(notification)
        
        return {
            "notifications": enriched_notifications,
            "unread_count": unread_count,
            "total_count": len(notifications)
        }

    @staticmethod
    def mark_notification_read(notification_id: str, user_id: str) -> bool:
        """Mark a notification as read"""
        
        notification_repo = NotificationRepository(g.db.notifications)
        result = notification_repo.mark_as_read(notification_id, user_id)
        
        return result.modified_count > 0

    @staticmethod
    def mark_all_notifications_read(user_id: str) -> int:
        """Mark all notifications as read for a user"""
        
        notification_repo = NotificationRepository(g.db.notifications)
        result = notification_repo.mark_all_as_read(user_id)
        
        return result.modified_count

    @staticmethod
    def delete_notification(notification_id: str, user_id: str) -> bool:
        """Delete a notification"""
        
        notification_repo = NotificationRepository(g.db.notifications)
        result = notification_repo.delete_notification(notification_id, user_id)
        
        return result.deleted_count > 0

    @staticmethod
    def get_notification_stats(user_id: str) -> Dict:
        """Get notification statistics for a user"""
        
        notification_repo = NotificationRepository(g.db.notifications)
        return notification_repo.get_notification_stats(user_id)

    @staticmethod
    def cleanup_old_notifications(days_old: int = 30) -> int:
        """Clean up old notifications (background task)"""
        
        notification_repo = NotificationRepository(g.db.notifications)
        result = notification_repo.delete_old_notifications(days_old)
        
        logging.info(f"Cleaned up {result.deleted_count} old notifications")
        return result.deleted_count

    @staticmethod
    def _update_aggregated_notification(existing: Dict, new_data: Dict, actor_id: str = None) -> Dict:
        """Update an existing notification with aggregated data"""
        
        notification_repo = NotificationRepository(g.db.notifications)
        
        # Aggregate the data (e.g., multiple likes)
        aggregated_data = existing["data"].copy()
        
        if "count" not in aggregated_data:
            aggregated_data["count"] = 1
        
        aggregated_data["count"] += 1
        
        # Update latest actor info
        if actor_id:
            actor_info = NotificationService._get_user_info(actor_id)
            aggregated_data["latest_actor"] = actor_info
        
        # Update message for aggregated notifications
        if aggregated_data["count"] > 1:
            base_message = new_data.get("message", "")
            if "liked your skill" in base_message:
                skill_title = aggregated_data.get("skill_title", "your skill")
                aggregated_data["message"] = f"{aggregated_data['count']} people liked \"{skill_title}\""
        
        # Update the notification
        notification_repo.update_notification_data(str(existing["_id"]), aggregated_data)
        
        # Get updated notification
        return notification_repo.find_by_id(str(existing["_id"]))

    @staticmethod
    def _format_notification_message(notification_type: str, data: Dict) -> str:
        """Format notification message based on type"""
        return data.get("message", f"New {notification_type.replace('_', ' ')}")

    @staticmethod
    def _format_timestamp(timestamp: datetime) -> str:
        """Format timestamp for display"""
        now = datetime.utcnow()
        diff = now - timestamp
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"

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