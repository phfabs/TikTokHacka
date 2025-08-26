from typing import List, Optional, Dict, Any
from datetime import datetime
from flask import g
from bson import ObjectId
import logging
from backend.repositories.custom_task_repository import CustomTaskRepository
from backend.repositories.shared_skill_repository import SharedSkillRepository

class CustomTaskService:
    """Service for managing custom tasks added to shared skills"""

    @staticmethod
    def add_custom_task(skill_id: str, day: int, user_id: str, task_data: Dict) -> Dict[str, Any]:
        """Add a custom task to a specific day of a shared skill"""
        
        # Validate day range
        if not (1 <= day <= 30):
            raise ValueError("Day must be between 1 and 30")
        
        # Verify the shared skill exists
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        shared_skill = shared_skill_repo.find_by_id(skill_id)
        
        if not shared_skill:
            raise ValueError("Shared skill not found")
        
        # Check if user already has a task for this skill and day
        custom_task_repo = CustomTaskRepository(g.db.custom_tasks)
        if custom_task_repo.check_user_has_task_for_day(skill_id, day, user_id):
            raise ValueError("You already have a custom task for this skill and day")
        
        # Validate task data
        required_fields = ['title', 'description', 'task_type']
        for field in required_fields:
            if not task_data.get(field, '').strip():
                raise ValueError(f"{field} is required")
        
        # Validate task type
        valid_task_types = ['reading', 'exercise', 'project', 'video', 'quiz']
        if task_data['task_type'] not in valid_task_types:
            raise ValueError(f"Task type must be one of: {', '.join(valid_task_types)}")
        
        # Sanitize and structure the task data
        clean_task_data = {
            "skill_id": ObjectId(skill_id),
            "day": day,
            "user_id": ObjectId(user_id),
            "task": {
                "title": task_data['title'].strip(),
                "description": task_data['description'].strip(),
                "instructions": task_data.get('instructions', '').strip(),
                "resources": CustomTaskService._process_resources(task_data.get('resources', [])),
                "estimated_time": int(task_data.get('estimated_time', 60)),
                "task_type": task_data['task_type']
            }
        }
        
        # Create the custom task
        custom_task = custom_task_repo.create(clean_task_data)
        
        # Update shared skill's custom task status
        current_task_count = custom_task_repo.count_tasks_for_skill(skill_id)
        if current_task_count == 1:  # This is the first custom task
            shared_skill_repo.update_custom_task_status(skill_id, True)
        
        # Add user info to the response
        custom_task["user_info"] = CustomTaskService._get_user_info(user_id)
        
        logging.info(f"User {user_id} added custom task to skill {skill_id}, day {day}")
        
        return {
            "task_id": str(custom_task["_id"]),
            "skill_id": skill_id,
            "day": day,
            "task": custom_task["task"],
            "votes": custom_task["votes"],
            "user_info": custom_task["user_info"],
            "created_at": custom_task["created_at"]
        }

    @staticmethod
    def vote_on_task(task_id: str, user_id: str, vote_type: str) -> Dict[str, Any]:
        """Vote on a custom task (up or down)"""
        
        if vote_type not in ['up', 'down']:
            raise ValueError("Vote type must be 'up' or 'down'")
        
        custom_task_repo = CustomTaskRepository(g.db.custom_tasks)
        
        # Check if task exists
        task = custom_task_repo.find_by_id(task_id)
        if not task:
            raise ValueError("Custom task not found")
        
        # Don't allow users to vote on their own tasks
        if str(task["user_id"]) == user_id:
            raise ValueError("You cannot vote on your own task")
        
        # Check if user has already voted (simple implementation - could be enhanced with vote tracking)
        # For now, we'll allow multiple votes but this could be restricted
        
        if vote_type == 'up':
            result = custom_task_repo.vote_up(task_id)
        else:
            result = custom_task_repo.vote_down(task_id)
        
        if result.modified_count == 0:
            raise ValueError("Failed to record vote")
        
        # Get updated task
        updated_task = custom_task_repo.find_by_id(task_id)
        
        logging.info(f"User {user_id} voted {vote_type} on task {task_id}")
        
        return {
            "task_id": task_id,
            "vote_type": vote_type,
            "votes": updated_task["votes"],
            "message": f"Vote recorded successfully"
        }

    @staticmethod
    def get_skill_custom_tasks(skill_id: str, day: Optional[int] = None) -> Dict[str, Any]:
        """Get custom tasks for a skill, optionally filtered by day"""
        
        custom_task_repo = CustomTaskRepository(g.db.custom_tasks)
        
        if day:
            # Get tasks for specific day
            tasks = custom_task_repo.find_by_skill_and_day(skill_id, day)
        else:
            # Get all tasks for skill
            tasks = custom_task_repo.find_by_skill(skill_id)
        
        # Enrich tasks with user information
        enriched_tasks = []
        for task in tasks:
            task["user_info"] = CustomTaskService._get_user_info(str(task["user_id"]))
            enriched_tasks.append(task)
        
        # Group by day if getting all tasks
        if not day:
            tasks_by_day = {}
            for task in enriched_tasks:
                task_day = task["day"]
                if task_day not in tasks_by_day:
                    tasks_by_day[task_day] = []
                tasks_by_day[task_day].append(task)
            
            return {
                "skill_id": skill_id,
                "tasks_by_day": tasks_by_day,
                "total_tasks": len(enriched_tasks)
            }
        else:
            return {
                "skill_id": skill_id,
                "day": day,
                "tasks": enriched_tasks,
                "task_count": len(enriched_tasks)
            }

    @staticmethod
    def get_popular_custom_tasks(limit: int = 20) -> List[Dict]:
        """Get most popular custom tasks across all skills"""
        
        custom_task_repo = CustomTaskRepository(g.db.custom_tasks)
        popular_tasks = custom_task_repo.get_popular_tasks(limit)
        
        # Enrich with user information
        for task in popular_tasks:
            task["user_info"] = CustomTaskService._get_user_info(str(task["user_id"]))
        
        return popular_tasks

    @staticmethod
    def update_custom_task(task_id: str, user_id: str, updates: Dict) -> Dict[str, Any]:
        """Update a custom task (only by the creator)"""
        
        custom_task_repo = CustomTaskRepository(g.db.custom_tasks)
        
        # Verify task exists and user owns it
        task = custom_task_repo.find_by_id(task_id)
        if not task:
            raise ValueError("Custom task not found")
        
        if str(task["user_id"]) != user_id:
            raise ValueError("You can only edit your own tasks")
        
        # Process allowed updates
        allowed_updates = {}
        
        if 'title' in updates and updates['title'].strip():
            allowed_updates['task.title'] = updates['title'].strip()
        
        if 'description' in updates and updates['description'].strip():
            allowed_updates['task.description'] = updates['description'].strip()
        
        if 'instructions' in updates:
            allowed_updates['task.instructions'] = updates['instructions'].strip()
        
        if 'resources' in updates:
            allowed_updates['task.resources'] = CustomTaskService._process_resources(updates['resources'])
        
        if 'estimated_time' in updates:
            try:
                allowed_updates['task.estimated_time'] = int(updates['estimated_time'])
            except (ValueError, TypeError):
                pass
        
        if not allowed_updates:
            raise ValueError("No valid updates provided")
        
        # Perform update
        result = custom_task_repo.update_task(task_id, user_id, allowed_updates)
        
        if result.modified_count == 0:
            raise ValueError("Failed to update task")
        
        # Get updated task
        updated_task = custom_task_repo.find_by_id(task_id)
        updated_task["user_info"] = CustomTaskService._get_user_info(user_id)
        
        logging.info(f"User {user_id} updated custom task {task_id}")
        
        return updated_task

    @staticmethod
    def delete_custom_task(task_id: str, user_id: str) -> Dict[str, Any]:
        """Delete a custom task (only by the creator)"""
        
        custom_task_repo = CustomTaskRepository(g.db.custom_tasks)
        
        # Verify task exists and get skill_id before deletion
        task = custom_task_repo.find_by_id(task_id)
        if not task:
            raise ValueError("Custom task not found")
        
        if str(task["user_id"]) != user_id:
            raise ValueError("You can only delete your own tasks")
        
        skill_id = str(task["skill_id"])
        
        # Delete the task
        result = custom_task_repo.delete_task(task_id, user_id)
        
        if result.deleted_count == 0:
            raise ValueError("Failed to delete task")
        
        # Check if skill still has custom tasks
        remaining_tasks = custom_task_repo.count_tasks_for_skill(skill_id)
        if remaining_tasks == 0:
            shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
            shared_skill_repo.update_custom_task_status(skill_id, False)
        
        logging.info(f"User {user_id} deleted custom task {task_id}")
        
        return {
            "message": "Custom task deleted successfully",
            "task_id": task_id
        }

    @staticmethod
    def get_user_task_contributions(user_id: str, limit: int = 50) -> Dict[str, Any]:
        """Get a user's custom task contributions"""
        
        custom_task_repo = CustomTaskRepository(g.db.custom_tasks)
        
        # Get user's tasks
        tasks = custom_task_repo.find_by_user(user_id, limit)
        
        # Get user stats
        stats = custom_task_repo.get_user_task_stats(user_id)
        
        return {
            "user_id": user_id,
            "tasks": tasks,
            "stats": stats
        }

    @staticmethod
    def _process_resources(resources: List) -> List[Dict]:
        """Process and validate resource links"""
        processed_resources = []
        
        for resource in resources[:10]:  # Limit to 10 resources
            if isinstance(resource, dict):
                title = resource.get('title', '').strip()
                url = resource.get('url', '').strip()
                description = resource.get('description', '').strip()
                
                if title and url:
                    processed_resources.append({
                        'title': title[:100],  # Limit title length
                        'url': url,
                        'description': description[:200],  # Limit description length
                        'type': CustomTaskService._categorize_resource_type(url)
                    })
            elif isinstance(resource, str) and resource.strip():
                # Simple URL string
                url = resource.strip()
                processed_resources.append({
                    'title': 'Resource',
                    'url': url,
                    'description': '',
                    'type': CustomTaskService._categorize_resource_type(url)
                })
        
        return processed_resources

    @staticmethod
    def _categorize_resource_type(url: str) -> str:
        """Categorize resource type based on URL"""
        url_lower = url.lower()
        
        if 'youtube.com' in url_lower or 'youtu.be' in url_lower:
            return 'video'
        elif any(domain in url_lower for domain in ['github.com', 'gitlab.com', 'bitbucket.org']):
            return 'code'
        elif any(ext in url_lower for ext in ['.pdf', 'pdf']):
            return 'pdf'
        elif any(domain in url_lower for domain in ['docs.google.com', 'drive.google.com']):
            return 'document'
        elif any(domain in url_lower for domain in ['medium.com', 'dev.to', 'blog']):
            return 'article'
        else:
            return 'website'

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