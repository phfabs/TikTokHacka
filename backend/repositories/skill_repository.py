from bson import ObjectId
from pymongo.results import InsertOneResult, UpdateResult, DeleteResult
from datetime import datetime

class SkillRepository:

    def __init__(self, db_collection):
        self.collection = db_collection
    
    def create(self, skill_data: dict) -> dict:
        result: InsertOneResult = self.collection.insert_one(skill_data)
        return self.collection.find_one({"_id": result.inserted_id})

    def find_by_user(self, user_id: str) -> list:
        return list(self.collection.find({"user_id": user_id}))

    def find_by_id(self, skill_id: str, user_id: str) -> dict:
        return self.collection.find_one({
            "_id": ObjectId(skill_id), 
            "user_id": user_id
        })

    def update_day_completion(self, skill_id: str, user_id: str, day_number: int) -> UpdateResult:
        return self.collection.update_one(
            {"_id": ObjectId(skill_id), "user_id": user_id},
            {"$set": { f"curriculum.daily_tasks.{day_number - 1}.completed": True, "updated_at": datetime.utcnow()}}
        )
    
    def update_day_completion_undo(self, skill_id: str, user_id: str, day_number: int) -> UpdateResult:
        return self.collection.update_one(
            {"_id": ObjectId(skill_id), "user_id": user_id},
            {"$unset": { f"curriculum.daily_tasks.{day_number - 1}.completed": ""}, "$set": {"updated_at": datetime.utcnow()}}
        )

    def update_progress_stats(self, skill_id: str, user_id: str, progress_data: dict) -> UpdateResult:
        return self.collection.update_one(
            {"_id": ObjectId(skill_id), "user_id": user_id},
            {"$set": {"progress": progress_data, "updated_at": datetime.utcnow()}}
        )
    
    def update_skill(self, skill_id: str, user_id: str, update_data: dict) -> dict:
        update_data["updated_at"] = datetime.utcnow()
        
        result: UpdateResult = self.collection.update_one(
            {"_id": ObjectId(skill_id), "user_id": user_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise ValueError("Skill not found or access denied")
        
        return self.collection.find_one({
            "_id": ObjectId(skill_id), 
            "user_id": user_id
        })

    def delete_by_id(self, skill_id: str, user_id: str) -> DeleteResult:
        return self.collection.delete_one({
            "_id": ObjectId(skill_id), 
            "user_id": user_id
        })

    def get_by_user_paginated(self, user_id, status, page, limit):
        skip = (page - 1) * limit
        return list(self.collection.find(
            {"user_id": user_id, "status": status}
        ).skip(skip).limit(limit)) 