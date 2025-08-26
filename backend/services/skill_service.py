from typing import List, Optional, Dict, Any, cast
from datetime import datetime, timedelta
from backend.models.base import SkillPlan
from backend.repositories.skill_repository import SkillRepository
from backend.repositories.skill_completion_repository import SkillCompletionRepository
from backend.services.ai_service import AIService
import logging
from flask import g
from bson import ObjectId
from backend.services.unsplash_service import UnsplashService

class SkillService:
    @staticmethod
    def create_skill(user_id: str, title: str, start_date_str: Optional[str] = None) -> Dict[str, Any]:
     
        skill_repo = SkillRepository(g.db.skills)

        try:
            import asyncio
            daily_tasks_list = asyncio.run(AIService.generate_structured_plan(topic=title, plan_type="skill"))
        except (ValueError, ConnectionError) as e:
            logging.error(f"AI Service failed to generate plan for skill '{title}': {e}")
            raise

        now = datetime.utcnow()
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        if start_date_str:
            try:
                start_date = datetime.fromisoformat(start_date_str)
            except ValueError:
                raise ValueError("Invalid date format. Use YYYY-MM-DD.")


        image_url = None
        try:
            logging.info(f"Fetching skill-specific image for: {title}")
            image_url = asyncio.run(UnsplashService.fetch_image(title, use_specific_query=True))
            logging.info(f"Successfully fetched image: {image_url}")
        except Exception as e:
            logging.error(f"Unsplash fetch failed for skill '{title}': {e}")
            image_url = UnsplashService._get_fallback_image(title)

        skill_plan_data = {
            "user_id": user_id,
            "title": title,
            "skill_name": title,
            "difficulty": "beginner",
            "curriculum": {
                "daily_tasks": daily_tasks_list,
                "total_days": 30
            },
            "progress": {
                "current_day": 1,
                "completed_days": 0,
                "completion_percentage": 0,
                "started_at": start_date,
                "last_activity": start_date,
                "projected_completion": start_date + timedelta(days=30)
            },
            "status": "active",
            "image_url": image_url,
            "created_at": now,
            "updated_at": now
        }

        try:
            created_plan_dict = skill_repo.create(skill_plan_data)
        except Exception as e:
            logging.error(f"Failed to save skill plan for user {user_id}: {e}")
            raise
        
        if created_plan_dict and '_id' in created_plan_dict:
            created_plan_dict['_id'] = str(created_plan_dict['_id'])
            
        return created_plan_dict
    
    @staticmethod
    def get_user_skills(user_id: str) -> list:
        repository = SkillRepository(g.db.skills)
        skills = repository.find_by_user(user_id)
        for skill in skills:
            skill['_id'] = str(skill['_id'])
        return skills

    @staticmethod
    def get_skill_by_id(skill_id: str, user_id: str) -> dict:
        repository = SkillRepository(g.db.skills)
        skill = repository.find_by_id(skill_id, user_id)
        if not skill:
            raise ValueError("Skill not found or access denied")
        skill['_id'] = str(skill['_id'])
        return skill

    @staticmethod
    def complete_skill_day(skill_id: str, user_id: str, day_number: int) -> dict:
        repository = SkillRepository(g.db.skills)
        completion_repo = SkillCompletionRepository(g.db.skill_completions)
        skill = repository.find_by_id(skill_id, user_id)
        
        if not skill:
            raise ValueError("Skill not found or access denied")
        if not (1 <= day_number <= 30):
            raise ValueError("Day number must be between 1 and 30")

        daily_tasks = skill.get('curriculum', {}).get('daily_tasks', [])
        if not (0 <= day_number - 1 < len(daily_tasks)):
            raise ValueError("Invalid day number for the curriculum")

        if daily_tasks[day_number - 1].get('completed', False):
            raise ValueError("Day is already completed")
        
        repository.update_day_completion(skill_id, user_id, day_number)
        
        completion_data = {
            "skill_title": skill.get('title', skill.get('skill_name', 'Unknown')),
            "day_title": daily_tasks[day_number - 1].get('title', f'Day {day_number}'),
            "day_description": daily_tasks[day_number - 1].get('description', ''),
        }
        completion_repo.create_completion(skill_id, user_id, day_number, completion_data)
        
        return SkillService._recalculate_progress(skill_id, user_id, repository)

    @staticmethod
    def undo_skill_day(skill_id: str, user_id: str, day_number: int) -> dict:
        repository = SkillRepository(g.db.skills)
        completion_repo = SkillCompletionRepository(g.db.skill_completions)
        skill = repository.find_by_id(skill_id, user_id)
        
        if not skill:
            raise ValueError("Skill not found or access denied")
        if not (1 <= day_number <= 30):
            raise ValueError("Day number must be between 1 and 30")

        daily_tasks = skill.get('curriculum', {}).get('daily_tasks', [])
        if not (0 <= day_number - 1 < len(daily_tasks)):
            raise ValueError("Invalid day number for the curriculum")

        if not daily_tasks[day_number - 1].get('completed', False):
            raise ValueError("Day is not completed")
        
        repository.update_day_completion_undo(skill_id, user_id, day_number)
        
        completion_repo.delete_completion(skill_id, user_id, day_number)
        
        return SkillService._recalculate_progress(skill_id, user_id, repository)

    @staticmethod
    def update_skill(skill_id: str, user_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        repository = SkillRepository(g.db.skills)
        
        if 'skill_name' in update_data:
            update_data['title'] = update_data['skill_name']
        
        updated_skill = repository.update_skill(skill_id, user_id, update_data)
        if updated_skill and '_id' in updated_skill:
            updated_skill['_id'] = str(updated_skill['_id'])
        
        return updated_skill

    @staticmethod
    def _recalculate_progress(skill_id: str, user_id: str, repository: SkillRepository) -> dict:
        skill = repository.find_by_id(skill_id, user_id)
        if not skill:
            raise ValueError("Skill not found or access denied")
        
        daily_tasks = skill.get('curriculum', {}).get('daily_tasks', [])
        total_days = len(daily_tasks)
        
        actual_completed = sum(1 for task in daily_tasks if task.get('completed', False))
        
        current_day = 1
        for i, task in enumerate(daily_tasks):
            if not task.get('completed', False):
                current_day = i + 1
                break
        else:
            current_day = total_days
        
        completion_percentage = round((actual_completed / total_days) * 100, 2) if total_days > 0 else 0
        
        progress_data = {
            "completed_days": actual_completed,
            "completion_percentage": completion_percentage,
            "current_day": current_day,
            "last_activity": datetime.utcnow(),
            "projected_completion": skill.get('progress', {}).get('started_at', datetime.utcnow()) + timedelta(days=total_days)
        }
        
        repository.update_progress_stats(skill_id, user_id, progress_data)
        return progress_data

    @staticmethod
    def validate_and_fix_progress(skill_id: str, user_id: str) -> dict:
        repository = SkillRepository(g.db.skills)
        skill = repository.find_by_id(skill_id, user_id)
        
        if not skill:
            raise ValueError("Skill not found or access denied")
        
        progress_data = SkillService._recalculate_progress(skill_id, user_id, repository)
        
        daily_tasks = skill.get('curriculum', {}).get('daily_tasks', [])
        total_days = len(daily_tasks)
        
        for i, task in enumerate(daily_tasks):
            if 'completed' in task and not isinstance(task['completed'], bool):
                repository.update_day_completion_undo(skill_id, user_id, i + 1)
                logging.warning(f"Fixed invalid completion state for skill {skill_id}, day {i + 1}")
        
        final_progress = SkillService._recalculate_progress(skill_id, user_id, repository)
        
        return {
            "skill_id": skill_id,
            "progress": final_progress,
            "total_days": total_days,
            "validation_complete": True
        }

    @staticmethod
    def refresh_skill_image(skill_id: str, user_id: str) -> dict:
        repository = SkillRepository(g.db.skills)
        skill = repository.find_by_id(skill_id, user_id)
        
        if not skill:
            raise ValueError("Skill not found or access denied")
        
        skill_name = skill.get('title', 'learning')
        logging.info(f"Refreshing image for skill '{skill_name}' (ID: {skill_id})")
        
        try:
            import asyncio
            from backend.services.unsplash_service import UnsplashService
            
            strategies = [
                (True, "specific query"),    
                (False, "category query"),  
            ]
            
            new_image_url = None
            current_image = skill.get('image_url', '')
            
            for use_specific, strategy_name in strategies:
                try:
                    logging.info(f"Trying {strategy_name} for skill '{skill_name}'")
                    candidate_url = asyncio.run(UnsplashService.fetch_image(skill_name, use_specific))
                    
                    if candidate_url and candidate_url != current_image:
                        new_image_url = candidate_url
                        logging.info(f"Successfully got new image with {strategy_name}: {new_image_url}")
                        break
                    else:
                        logging.info(f"{strategy_name} returned same image or failed, trying next strategy")
                        continue
                        
                except Exception as e:
                    logging.warning(f"{strategy_name} failed: {e}")
                    continue
            
            if not new_image_url:
                logging.info("All strategies failed, forcing fallback image")
                new_image_url = UnsplashService._get_fallback_image(skill_name)
            
            logging.info(f"Final new image URL: {new_image_url}")
            
            update_data = {
                'image_url': new_image_url,
                'updated_at': datetime.utcnow()
            }
            
            repository.update_skill(skill_id, user_id, update_data)
            logging.info(f"Updated skill {skill_id} with new image")
            
            updated_skill = repository.find_by_id(skill_id, user_id)
            updated_skill['_id'] = str(updated_skill['_id'])
            logging.info(f"Returning updated skill: {updated_skill.get('title')} with image: {updated_skill.get('image_url')}")
            return updated_skill
            
        except Exception as e:
            logging.error(f"Failed to refresh image for skill {skill_id}: {e}")
            raise ValueError(f"Failed to refresh image: {str(e)}")

    @staticmethod
    def delete_skill(skill_id: str, user_id: str) -> bool:
        repository = SkillRepository(g.db.skills)
        if not repository.find_by_id(skill_id, user_id):
            raise ValueError("Skill not found or access denied")
        result = repository.delete_by_id(skill_id, user_id)
        return result.deleted_count > 0 