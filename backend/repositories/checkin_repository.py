from pymongo.results import DeleteResult
from pymongo import ReturnDocument

class CheckinRepository:
    def __init__(self, db_collection):
        self.collection = db_collection

    def create_or_update(self, checkin_data: dict) -> dict:
        result = self.collection.find_one_and_update(
            {
                "habit_id": checkin_data["habit_id"],
                "user_id": checkin_data["user_id"],
                "date": checkin_data["date"]
            },
            {"$set": checkin_data},
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        return result

    def find_completed_by_habit(self, habit_id: str, user_id: str) -> list:
        return list(self.collection.find({
            "habit_id": habit_id,
            "user_id": user_id,
            "completed": True
        }).sort("date", -1))

    def find_by_habit_and_date(self, habit_id: str, user_id: str, date_to_check) -> dict:
        """Find a specific checkin for a habit on a specific date"""
        from datetime import datetime
        
        if isinstance(date_to_check, str):
            date_to_check = datetime.fromisoformat(date_to_check).date()
        elif isinstance(date_to_check, datetime):
            date_to_check = date_to_check.date()
        
        start_of_day = datetime.combine(date_to_check, datetime.min.time())
        end_of_day = datetime.combine(date_to_check, datetime.max.time())
        
        return self.collection.find_one({
            "habit_id": habit_id,
            "user_id": user_id,
            "date": {"$gte": start_of_day, "$lte": end_of_day},
            "completed": True
        })

    def delete_by_habit_id(self, habit_id: str, user_id: str) -> DeleteResult:
        return self.collection.delete_many({
            "habit_id": habit_id,
            "user_id": user_id
        })
    
    def delete_by_id(self, checkin_id: str, user_id: str) -> DeleteResult:
        """Delete a specific checkin by ID"""
        from bson import ObjectId
        return self.collection.delete_one({
            "_id": ObjectId(checkin_id),
            "user_id": user_id
        })

    def upsert_by_date(self, checkin_data):
        return self.collection.find_one_and_update(
            {
                "habit_id": checkin_data["habit_id"],
                "user_id": checkin_data["user_id"],
                "date": checkin_data["date"]
            },
            {"$set": checkin_data},
            upsert=True,
            return_document=ReturnDocument.AFTER
        )

    def get_recent_for_habit(self, habit_id, days):
        from datetime import datetime, timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        return list(self.collection.find({
            "habit_id": habit_id,
            "date": {"$gte": cutoff_date}
        }).sort("date", -1)) 