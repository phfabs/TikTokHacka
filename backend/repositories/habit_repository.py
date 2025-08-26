from bson import ObjectId
from pymongo.results import InsertOneResult, UpdateResult, DeleteResult
from datetime import datetime

class HabitRepository:
    def __init__(self, db_collection):
        self.collection = db_collection

    def create(self, habit_data: dict) -> dict:
        result: InsertOneResult = self.collection.insert_one(habit_data)
        return self.collection.find_one({"_id": result.inserted_id})

    def find_by_user(self, user_id: str) -> list:
        return list(self.collection.find({"user_id": user_id}))

    def find_by_id(self, habit_id: str, user_id: str) -> dict:
        return self.collection.find_one({
            "_id": ObjectId(habit_id), 
            "user_id": user_id
        })

    def update_streaks(self, habit_id: str, user_id: str, streak_data: dict) -> UpdateResult:
        return self.collection.update_one(
            {"_id": ObjectId(habit_id), "user_id": user_id},
            {"$set": {"streaks": streak_data, "updated_at": datetime.utcnow()}}
        )

    def delete_by_id(self, habit_id: str, user_id: str) -> DeleteResult:
        return self.collection.delete_one({
            "_id": ObjectId(habit_id), 
            "user_id": user_id
        })

    def get_by_id(self, habit_id):
        return self.collection.find_one({"_id": ObjectId(habit_id)})

    def get_by_id_and_user(self, habit_id, user_id):
        return self.collection.find_one({
            "_id": ObjectId(habit_id), 
            "user_id": user_id
        })

    def update(self, habit_id, user_id, update_fields: dict):
        update_fields['updated_at'] = datetime.utcnow()
        return self.collection.update_one(
            {"_id": ObjectId(habit_id), "user_id": user_id},
            {"$set": update_fields}
        ) 