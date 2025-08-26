from typing import Dict, Any
from datetime import datetime, date, timedelta
from backend.repositories.habit_repository import HabitRepository
from backend.repositories.checkin_repository import CheckinRepository
from backend.services.ai_service import AIService
import logging
from flask import g
from backend.services.unsplash_service import UnsplashService

class HabitService:
    @staticmethod
    def create_habit(
        user_id: str,
        title: str,
        category: str,
        color: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        reminder_time: Any = None,
        custom_days: list | None = None,
        reminder_message: str | None = None
    ) -> Dict[str, Any]:
        habit_repo = HabitRepository(g.db.habits)

        now = datetime.utcnow()

        if start_date and end_date and end_date < start_date:
            raise ValueError("End date cannot be before start date.")

        if reminder_time and hasattr(reminder_time, 'isoformat'):
            reminder_time_val = reminder_time.isoformat()
        else:
            reminder_time_val = None

        target_days = custom_days if custom_days else [1, 2, 3, 4, 5, 6, 7]

        start_date_dt = datetime.combine(start_date, datetime.min.time()) if start_date else None
        end_date_dt = datetime.combine(end_date, datetime.min.time()) if end_date else None

        habit_plan_data = {
            "user_id": user_id,
            "title": title,
            "category": category,
            "pattern": {
                "target_days": target_days,
                "reminder_time": reminder_time_val
            },
            "streaks": {
                "current_streak": 0,
                "longest_streak": 0,
                "total_completions": 0
            },
            "goals": {
                "target_streak": 30,
                "weekly_target": 7,
                "monthly_target": 30
            },
            "status": "active",
            "icon_url": None,
            "color": color,
            "created_at": now,
            "updated_at": now,
            "start_date": start_date_dt,
            "end_date": end_date_dt
        }
        if reminder_message:
            habit_plan_data["reminder_message"] = reminder_message

        try:
            import asyncio
            habit_plan_data["icon_url"] = asyncio.run(UnsplashService.fetch_image(category or title))
        except Exception as e:
            logging.error(f"Unsplash fetch failed for habit '{title}': {e}")

        try:
            created_plan_dict = habit_repo.create(habit_plan_data)
        except Exception as e:
            logging.error(f"Failed to save habit plan for user {user_id}: {e}")
            raise
        
        if created_plan_dict and '_id' in created_plan_dict:
            created_plan_dict['_id'] = str(created_plan_dict['_id'])

        return created_plan_dict

    @staticmethod
    def get_user_habits(user_id: str) -> list:
        repository = HabitRepository(g.db.habits)
        checkin_repo = CheckinRepository(g.db.habit_checkins)
        habits = repository.find_by_user(user_id)
        
        today = date.today()
        
        for habit in habits:
            habit['_id'] = str(habit['_id'])
            
            todays_checkin = checkin_repo.find_by_habit_and_date(habit['_id'], user_id, today)
            habit['checked_today'] = todays_checkin is not None
            
        return habits

    @staticmethod
    def get_habit_by_id(habit_id: str, user_id: str) -> dict:
        repository = HabitRepository(g.db.habits)
        habit = repository.find_by_id(habit_id, user_id)
        if not habit:
            raise ValueError("Habit not found or access denied")
        habit['_id'] = str(habit['_id'])
        return habit

    @staticmethod
    def update_habit(habit_id: str, user_id: str, update_fields: dict) -> dict:
        habit_repo = HabitRepository(g.db.habits)
        habit = habit_repo.find_by_id(habit_id, user_id)
        if not habit:
            raise ValueError("Habit not found or access denied")

        if 'start_date' in update_fields and update_fields['start_date']:
            update_fields['start_date'] = datetime.combine(update_fields['start_date'], datetime.min.time())
        if 'end_date' in update_fields and update_fields['end_date']:
            update_fields['end_date'] = datetime.combine(update_fields['end_date'], datetime.min.time())
        if 'reminder_time' in update_fields and update_fields['reminder_time']:
            update_fields['reminder_time'] = update_fields['reminder_time'].isoformat()
        if 'custom_days' in update_fields and update_fields['custom_days'] is not None:
            if 'pattern' not in update_fields:
                update_fields['pattern'] = habit.get('pattern', {})
            update_fields['pattern']['target_days'] = update_fields.pop('custom_days')
        if 'reminder_time' in update_fields:
            if 'pattern' not in update_fields:
                update_fields['pattern'] = habit.get('pattern', {})
            update_fields['pattern']['reminder_time'] = update_fields.pop('reminder_time')
        for field in ['custom_days', 'reminder_time']:
            if field in update_fields:
                update_fields.pop(field)
        if 'reminder_message' in update_fields:
            # Directly update the reminder_message field
            pass  # No transformation needed, just store as-is
        habit_repo.update(habit_id, user_id, update_fields)
        updated = habit_repo.find_by_id(habit_id, user_id)
        updated['_id'] = str(updated['_id'])
        return updated

    @staticmethod
    def record_checkin(habit_id: str, user_id: str, checkin_data: dict) -> dict:
        
        habit_repo = HabitRepository(g.db.habits)
        checkin_repo = CheckinRepository(g.db.habit_checkins)

        habit = habit_repo.find_by_id(habit_id, user_id)
        if not habit:
            raise ValueError("Habit not found or access denied")

        if checkin_data['date'].date() > date.today():
            raise ValueError("Cannot log check-ins for a future date.")

        full_checkin_data = {
            "habit_id": habit_id,
            "user_id": user_id,
            **checkin_data,
            "created_at": datetime.utcnow()
        }
        
        created_checkin = checkin_repo.create_or_update(full_checkin_data)

        updated_streaks = HabitService._recalculate_streaks(habit_id, user_id)

        habit_repo.update_streaks(habit_id, user_id, updated_streaks)

        return {
            "checkin": created_checkin,
            "updated_streaks": updated_streaks
        }

    @staticmethod
    def _recalculate_streaks(habit_id: str, user_id: str) -> dict:
        """Recalculate streaks with improved accuracy and efficiency"""
        checkin_repo = CheckinRepository(g.db.habit_checkins)
        
        checkins = checkin_repo.find_completed_by_habit(habit_id, user_id)

        if not checkins:
            return {"current_streak": 0, "longest_streak": 0, "total_completions": 0}

        total_completions = len(checkins)
        today = date.today()
        
        checkin_dates = sorted({c['date'].date() for c in checkins})
        
        current_streak = 0
        check_date = today
        
        if check_date in checkin_dates:
            current_streak = 1
            check_date -= timedelta(days=1)
        else:
            check_date = today - timedelta(days=1)
            if check_date in checkin_dates:
                current_streak = 1
                check_date -= timedelta(days=1)
        
        while check_date in checkin_dates:
            current_streak += 1
            check_date -= timedelta(days=1)
        
        longest_streak = 0
        if checkin_dates:
            temp_streak = 1
            max_streak = 1
            
            for i in range(1, len(checkin_dates)):
                if (checkin_dates[i] - checkin_dates[i-1]).days == 1:
                    temp_streak += 1
                    max_streak = max(max_streak, temp_streak)
                else:
                    temp_streak = 1
            
            longest_streak = max_streak
        
        return {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "total_completions": total_completions
        }

    @staticmethod
    def validate_and_fix_streaks(habit_id: str, user_id: str) -> dict:
        """Validate and fix any streak inconsistencies"""
        habit_repo = HabitRepository(g.db.habits)
        checkin_repo = CheckinRepository(g.db.habit_checkins)
        
        habit = habit_repo.find_by_id(habit_id, user_id)
        if not habit:
            raise ValueError("Habit not found or access denied")
        
        updated_streaks = HabitService._recalculate_streaks(habit_id, user_id)
        
        checkins = checkin_repo.find_completed_by_habit(habit_id, user_id)
        
        seen_dates = set()
        for checkin in checkins:
            checkin_date = checkin['date'].date()
            if checkin_date in seen_dates:
                checkin_repo.delete_by_id(checkin['_id'], user_id)
                logging.warning(f"Removed duplicate checkin for habit {habit_id}, date {checkin_date}")
            else:
                seen_dates.add(checkin_date)
        
        final_streaks = HabitService._recalculate_streaks(habit_id, user_id)
        habit_repo.update_streaks(habit_id, user_id, final_streaks)
        
        return {
            "habit_id": habit_id,
            "streaks": final_streaks,
            "validation_complete": True
        }

    @staticmethod
    def delete_habit(habit_id: str, user_id: str) -> bool:
        habit_repo = HabitRepository(g.db.habits)
        checkin_repo = CheckinRepository(g.db.habit_checkins)
        
        if not habit_repo.find_by_id(habit_id, user_id):
            raise ValueError("Habit not found or access denied")
        
        checkin_repo.delete_by_habit_id(habit_id, user_id)
        
        result = habit_repo.delete_by_id(habit_id, user_id)
        return result.deleted_count > 0 