from datetime import datetime, timedelta
from typing import Dict, List, Optional
from backend.repositories.skill_repository import SkillRepository
from backend.repositories.habit_repository import HabitRepository
from backend.repositories.checkin_repository import CheckinRepository
from backend.repositories.skill_completion_repository import SkillCompletionRepository


class StatsService:
    @staticmethod
    def get_user_stats(user_id: str, skill_repo: SkillRepository, habit_repo: HabitRepository, checkin_repo: CheckinRepository, completion_repo: SkillCompletionRepository) -> Dict:
        """
        Generate comprehensive user statistics for the stats dashboard
        """
        
        skills = skill_repo.find_by_user(user_id)
        habits = habit_repo.find_by_user(user_id)
        
        skills_stats = StatsService._calculate_skills_stats(skills, completion_repo, user_id)
        
        habits_stats = StatsService._calculate_habits_stats(habits, checkin_repo, user_id)
        
        overall_stats = StatsService._calculate_overall_stats(skills, habits)
        
        activity_timeline = StatsService._calculate_activity_timeline(skills, habits, checkin_repo, completion_repo, user_id)
        
        return {
            "overview": overall_stats,
            "skills": skills_stats,
            "habits": habits_stats,
            "activity_timeline": activity_timeline,
            "generated_at": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def _calculate_skills_stats(skills: List[Dict], completion_repo: SkillCompletionRepository, user_id: str) -> Dict:
        """Calculate detailed skills statistics"""
        if not skills:
            return {
                "total_skills": 0,
                "active_skills": 0,
                "completed_skills": 0,
                "average_completion": 0,
                "total_days_completed": 0,
                "skills_breakdown": [],
                "completion_trend": []
            }
        
        total_skills = len(skills)
        active_skills = len([s for s in skills if s.get('status') == 'active'])
        completed_skills = len([s for s in skills if s.get('status') == 'completed'])
        
        completion_percentages = []
        total_days_completed = 0
        skills_breakdown = []
        
        for skill in skills:
            progress = skill.get('progress', {})
            completion_percentage = progress.get('completion_percentage', 0)
            completed_days = progress.get('completed_days', 0)
            current_day = progress.get('current_day', 1)
            
            completion_percentages.append(completion_percentage)
            total_days_completed += completed_days
            
            skills_breakdown.append({
                "id": str(skill.get('_id')),
                "title": skill.get('title', skill.get('skill_name', 'Unknown')),
                "completion_percentage": completion_percentage,
                "completed_days": completed_days,
                "current_day": current_day,
                "status": skill.get('status', 'active'),
                "created_at": skill.get('created_at'),
                "image_url": skill.get('image_url')
            })
        
        average_completion = sum(completion_percentages) / len(completion_percentages) if completion_percentages else 0
        
        completion_trend = StatsService._calculate_skills_completion_trend(skills, completion_repo, user_id)
        
        return {
            "total_skills": total_skills,
            "active_skills": active_skills,
            "completed_skills": completed_skills,
            "average_completion": int(average_completion) if average_completion > 0 else 0,
            "total_days_completed": total_days_completed,
            "skills_breakdown": skills_breakdown,
            "completion_trend": completion_trend
        }
    
    @staticmethod
    def _calculate_habits_stats(habits: List[Dict], checkin_repo: CheckinRepository, user_id: str) -> Dict:
        """Calculate detailed habits statistics"""
        if not habits:
            return {
                "total_habits": 0,
                "active_habits": 0,
                "total_checkins": 0,
                "current_streaks": 0,
                "longest_streak": 0,
                "consistency_score": 0,
                "habits_breakdown": [],
                "weekly_checkins": []
            }
        
        total_habits = len(habits)
        active_habits = len([h for h in habits if h.get('status') == 'active'])
        
        total_checkins = 0
        all_current_streaks = []
        all_longest_streaks = []
        habits_breakdown = []
        
        for habit in habits:
            habit_id = str(habit.get('_id'))
            streaks = habit.get('streaks', {})
            current_streak = streaks.get('current_streak', 0)
            longest_streak = streaks.get('longest_streak', 0)
            total_completions = streaks.get('total_completions', 0)
            
            total_checkins += total_completions
            all_current_streaks.append(current_streak)
            all_longest_streaks.append(longest_streak)
            
            recent_checkins = checkin_repo.get_recent_for_habit(habit_id, 30)
            
            habits_breakdown.append({
                "id": habit_id,
                "title": habit.get('title', 'Unknown'),
                "category": habit.get('category', 'general'),
                "color": habit.get('color', '#14B8A6'),
                "current_streak": current_streak,
                "longest_streak": longest_streak,
                "total_completions": total_completions,
                "status": habit.get('status', 'active'),
                "created_at": habit.get('created_at'),
                "icon_url": habit.get('icon_url'),
                "recent_activity": len(recent_checkins)
            })
        
        weekly_checkins = StatsService._calculate_weekly_checkins(habits, checkin_repo, user_id)
        
        consistency_score = StatsService._calculate_consistency_score(habits, checkin_repo, user_id)
        
        return {
            "total_habits": total_habits,
            "active_habits": active_habits,
            "total_checkins": total_checkins,
            "current_streaks": sum(all_current_streaks),
            "longest_streak": max(all_longest_streaks) if all_longest_streaks else 0,
            "consistency_score": int(consistency_score) if consistency_score > 0 else 0,
            "habits_breakdown": habits_breakdown,
            "weekly_checkins": weekly_checkins
        }
    
    @staticmethod
    def _calculate_overall_stats(skills: List[Dict], habits: List[Dict]) -> Dict:
        """Calculate overall user progress statistics"""
        all_items = skills + habits
        if not all_items:
            days_active = 0
        else:
            creation_dates = [item.get('created_at') for item in all_items if item.get('created_at')]
            if creation_dates:
                oldest_date = min(creation_dates)
                if isinstance(oldest_date, str):
                    oldest_date = datetime.fromisoformat(oldest_date.replace('Z', '+00:00'))
                days_active = (datetime.utcnow() - oldest_date).days
            else:
                days_active = 0
        
        total_skills = len(skills)
        total_habits = len(habits)
        total_skill_days = sum([skill.get('progress', {}).get('completed_days', 0) for skill in skills])
        total_habit_checkins = sum([habit.get('streaks', {}).get('total_completions', 0) for habit in habits])
        
        return {
            "total_skills": total_skills,
            "total_habits": total_habits,
            "days_active": days_active,
            "total_skill_days_completed": total_skill_days,
            "total_habit_checkins": total_habit_checkins,
            "total_progress_points": total_skill_days + total_habit_checkins
        }
    
    @staticmethod
    def _calculate_skills_completion_trend(skills: List[Dict], completion_repo: SkillCompletionRepository, user_id: str) -> List[Dict]:
        """Calculate skill completion trend over the last 7 days using real completion data"""
        trend_data = []
        base_date = datetime.utcnow() - timedelta(days=6)
        
        for i in range(7):
            date = base_date + timedelta(days=i)
            
            skill_completions = completion_repo.find_completions_by_date(user_id, date)
            completed_days = len(skill_completions)
            
            trend_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "completed_days": completed_days,
                "day_label": date.strftime("%a")
            })
        
        return trend_data
    
    @staticmethod
    def _calculate_weekly_checkins(habits: List[Dict], checkin_repo: CheckinRepository, user_id: str) -> List[Dict]:
        """Calculate habit checkins for the last 7 days"""
        weekly_data = []
        base_date = datetime.utcnow() - timedelta(days=6)
        
        for i in range(7):
            date = base_date + timedelta(days=i)
            day_checkins = 0
            
            for habit in habits:
                habit_id = str(habit.get('_id'))
                checkin = checkin_repo.find_by_habit_and_date(habit_id, user_id, date.date())
                if checkin:
                    day_checkins += 1
            
            weekly_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "checkins": day_checkins,
                "day_label": date.strftime("%a")
            })
        
        return weekly_data
    
    @staticmethod
    def _calculate_consistency_score(habits: List[Dict], checkin_repo: CheckinRepository, user_id: str) -> float:
        """Calculate overall consistency score as percentage"""
        if not habits:
            return 0.0
        
        total_expected = 0
        total_completed = 0
        
        for habit in habits:
            habit_id = str(habit.get('_id'))
            frequency = habit.get('pattern', {}).get('frequency', 'daily')
            
            if frequency == 'daily':
                expected_checkins = 30
            elif frequency == 'weekly':
                expected_checkins = 4  
            else:
                expected_checkins = 15  
            
            total_expected += expected_checkins
            
            recent_checkins = checkin_repo.get_recent_for_habit(habit_id, 30)
            total_completed += len(recent_checkins)
        
        if total_expected == 0:
            return 0.0
        
        return (total_completed / total_expected) * 100
    
    @staticmethod
    def _calculate_activity_timeline(skills: List[Dict], habits: List[Dict], checkin_repo: CheckinRepository, completion_repo: SkillCompletionRepository, user_id: str) -> List[Dict]:
        """Calculate activity timeline for the last 30 days using real completion data"""
        timeline_data = []
        base_date = datetime.utcnow() - timedelta(days=29)
        
        for i in range(30):
            date = base_date + timedelta(days=i)
            
            skill_completions = completion_repo.find_completions_by_date(user_id, date)
            skill_activity = len(skill_completions)
            
            habit_checkins = 0
            for habit in habits:
                habit_id = str(habit.get('_id'))
                checkin = checkin_repo.find_by_habit_and_date(habit_id, user_id, date.date())
                if checkin:
                    habit_checkins += 1
            
            total_activity = skill_activity + habit_checkins
            
            max_possible = len(skills) + len(habits)
            intensity = min(total_activity / max(max_possible, 1), 1.0) if max_possible > 0 else 0
            
            completion_details = []
            for completion in skill_completions:
                completion_details.append({
                    "type": "skill",
                    "title": completion.get('completion_data', {}).get('skill_title', 'Unknown Skill'),
                    "day_title": completion.get('completion_data', {}).get('day_title', f"Day {completion.get('day_number', 1)}"),
                    "completed_at": completion.get('completed_at').strftime("%H:%M") if completion.get('completed_at') else "Unknown"
                })
            
            for habit in habits:
                habit_id = str(habit.get('_id'))
                checkin = checkin_repo.find_by_habit_and_date(habit_id, user_id, date.date())
                if checkin:
                    completion_details.append({
                        "type": "habit",
                        "title": habit.get('title', 'Unknown Habit'),
                        "completed_at": checkin.get('checked_in_at').strftime("%H:%M") if checkin.get('checked_in_at') else "Unknown"
                    })
            
            timeline_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "skill_activity": skill_activity,
                "habit_checkins": habit_checkins,
                "total_activity": total_activity,
                "day_of_week": date.strftime("%a"),
                "intensity": intensity,
                "completion_details": completion_details
            })
        
        return timeline_data