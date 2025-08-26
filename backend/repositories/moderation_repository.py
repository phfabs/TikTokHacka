from bson import ObjectId
from pymongo.results import InsertOneResult, UpdateResult, DeleteResult
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class ModerationRepository:
    """Repository for managing content moderation and reporting"""

    def __init__(self, db_collection):
        self.collection = db_collection

    def create_report(self, report_data: Dict) -> Dict:
        """Create a new content report"""
        report_data['created_at'] = datetime.utcnow()
        report_data['status'] = 'pending'  # pending, reviewed, resolved, dismissed
        report_data['priority'] = report_data.get('priority', 'medium')  # low, medium, high, urgent
        
        result: InsertOneResult = self.collection.insert_one(report_data)
        return self.collection.find_one({"_id": result.inserted_id})

    def get_pending_reports(self, limit: int = 50, skip: int = 0) -> List[Dict]:
        """Get pending moderation reports"""
        return list(self.collection.find({"status": "pending"})
                   .sort([("priority_score", -1), ("created_at", 1)])
                   .skip(skip)
                   .limit(limit))

    def get_reports_by_content(self, content_type: str, content_id: str) -> List[Dict]:
        """Get all reports for a specific piece of content"""
        return list(self.collection.find({
            "content_type": content_type,
            "content_id": ObjectId(content_id)
        }).sort("created_at", -1))

    def get_reports_by_user(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get reports filed by a specific user"""
        return list(self.collection.find({"reporter_id": ObjectId(user_id)})
                   .sort("created_at", -1)
                   .limit(limit))

    def get_reports_against_user(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get reports filed against a specific user's content"""
        return list(self.collection.find({"reported_user_id": ObjectId(user_id)})
                   .sort("created_at", -1)
                   .limit(limit))

    def update_report_status(self, report_id: str, status: str, moderator_id: str, 
                           resolution_notes: str = None) -> UpdateResult:
        """Update report status and add moderation notes"""
        update_data = {
            "status": status,
            "moderator_id": ObjectId(moderator_id),
            "reviewed_at": datetime.utcnow()
        }
        
        if resolution_notes:
            update_data["resolution_notes"] = resolution_notes
        
        if status == "resolved":
            update_data["resolved_at"] = datetime.utcnow()
        
        return self.collection.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": update_data}
        )

    def get_moderation_stats(self, days: int = 30) -> Dict:
        """Get moderation statistics"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {"created_at": {"$gte": cutoff_date}}},
            {"$group": {
                "_id": {
                    "status": "$status",
                    "content_type": "$content_type",
                    "reason": "$reason"
                },
                "count": {"$sum": 1}
            }},
            {"$group": {
                "_id": "$_id.status",
                "total": {"$sum": "$count"},
                "breakdown": {
                    "$push": {
                        "content_type": "$_id.content_type",
                        "reason": "$_id.reason",
                        "count": "$count"
                    }
                }
            }}
        ]
        
        results = list(self.collection.aggregate(pipeline))
        
        stats = {
            "period_days": days,
            "total_reports": sum(r["total"] for r in results),
            "by_status": {r["_id"]: r["total"] for r in results},
            "detailed_breakdown": results
        }
        
        return stats

    def get_frequent_reporters(self, limit: int = 10, days: int = 30) -> List[Dict]:
        """Get users who file reports frequently"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {
                "created_at": {"$gte": cutoff_date},
                "reporter_id": {"$ne": None}
            }},
            {"$group": {
                "_id": "$reporter_id",
                "report_count": {"$sum": 1},
                "latest_report": {"$max": "$created_at"},
                "report_types": {"$addToSet": "$reason"}
            }},
            {"$sort": {"report_count": -1}},
            {"$limit": limit},
            {"$lookup": {
                "from": "users",
                "localField": "_id",
                "foreignField": "_id",
                "as": "user_info"
            }},
            {"$unwind": "$user_info"},
            {"$project": {
                "user_id": "$_id",
                "username": "$user_info.username",
                "report_count": 1,
                "latest_report": 1,
                "report_types": 1
            }}
        ]
        
        return list(self.collection.aggregate(pipeline))

    def get_frequently_reported_content(self, limit: int = 10, days: int = 30) -> List[Dict]:
        """Get content that gets reported frequently"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {"created_at": {"$gte": cutoff_date}}},
            {"$group": {
                "_id": {
                    "content_type": "$content_type",
                    "content_id": "$content_id"
                },
                "report_count": {"$sum": 1},
                "latest_report": {"$max": "$created_at"},
                "report_reasons": {"$addToSet": "$reason"},
                "reporters": {"$addToSet": "$reporter_id"}
            }},
            {"$addFields": {
                "unique_reporters": {"$size": "$reporters"}
            }},
            {"$sort": {"report_count": -1}},
            {"$limit": limit}
        ]
        
        return list(self.collection.aggregate(pipeline))

    def calculate_priority_score(self, report_data: Dict) -> int:
        """Calculate priority score for a report"""
        base_score = 50
        
        # Adjust based on reason
        reason_weights = {
            "spam": 20,
            "inappropriate_content": 30,
            "harassment": 80,
            "hate_speech": 90,
            "violence": 95,
            "illegal_content": 100,
            "copyright_violation": 40,
            "misinformation": 60,
            "fake_profile": 30,
            "other": 10
        }
        
        reason_score = reason_weights.get(report_data.get('reason'), 10)
        
        # Adjust based on reporter credibility (if available)
        reporter_credibility = report_data.get('reporter_credibility', 1.0)
        credibility_multiplier = min(reporter_credibility, 2.0)  # Cap at 2x
        
        # Adjust based on content age (newer content gets higher priority)
        content_age_hours = report_data.get('content_age_hours', 24)
        age_multiplier = max(0.5, 1.0 - (content_age_hours / 168))  # 1 week = 168 hours
        
        # Calculate final score
        final_score = int(base_score + (reason_score * credibility_multiplier * age_multiplier))
        
        return min(final_score, 100)  # Cap at 100

    def bulk_update_reports(self, report_ids: List[str], update_data: Dict) -> UpdateResult:
        """Bulk update multiple reports"""
        update_data['bulk_updated_at'] = datetime.utcnow()
        
        return self.collection.update_many(
            {"_id": {"$in": [ObjectId(rid) for rid in report_ids]}},
            {"$set": update_data}
        )

    def get_moderation_queue(self, moderator_id: str = None, limit: int = 20) -> List[Dict]:
        """Get moderation queue with prioritized reports"""
        query = {"status": "pending"}
        
        if moderator_id:
            # Optionally filter by assigned moderator
            query["assigned_moderator_id"] = ObjectId(moderator_id)
        
        pipeline = [
            {"$match": query},
            {"$addFields": {
                "priority_score": {"$ifNull": ["$priority_score", 50]}
            }},
            {"$sort": {"priority_score": -1, "created_at": 1}},
            {"$limit": limit},
            {"$lookup": {
                "from": "users",
                "localField": "reporter_id",
                "foreignField": "_id",
                "as": "reporter_info"
            }},
            {"$lookup": {
                "from": "users",
                "localField": "reported_user_id",
                "foreignField": "_id",
                "as": "reported_user_info"
            }}
        ]
        
        return list(self.collection.aggregate(pipeline))

    def create_auto_moderation_rule(self, rule_data: Dict) -> Dict:
        """Create an automated moderation rule"""
        rule_data['created_at'] = datetime.utcnow()
        rule_data['is_active'] = True
        rule_data['trigger_count'] = 0
        
        # Store in a separate rules collection
        rules_collection = self.collection.database.moderation_rules
        result = rules_collection.insert_one(rule_data)
        return rules_collection.find_one({"_id": result.inserted_id})

    def get_auto_moderation_rules(self, active_only: bool = True) -> List[Dict]:
        """Get automated moderation rules"""
        rules_collection = self.collection.database.moderation_rules
        query = {"is_active": True} if active_only else {}
        
        return list(rules_collection.find(query).sort("created_at", -1))

    def apply_auto_moderation(self, content_type: str, content_data: Dict) -> Optional[Dict]:
        """Apply automated moderation rules to content"""
        rules = self.get_auto_moderation_rules(active_only=True)
        
        for rule in rules:
            if self._matches_rule(content_data, rule):
                # Create automatic report
                auto_report = {
                    "content_type": content_type,
                    "content_id": content_data.get("_id"),
                    "reported_user_id": content_data.get("user_id"),
                    "reason": rule.get("reason", "automated_detection"),
                    "description": f"Automatically detected: {rule.get('description', 'content violation')}",
                    "reporter_id": None,  # System generated
                    "is_automated": True,
                    "rule_id": rule["_id"],
                    "priority_score": rule.get("priority_score", 70),
                    "severity": rule.get("severity", "medium")
                }
                
                report = self.create_report(auto_report)
                
                # Update rule trigger count
                rules_collection = self.collection.database.moderation_rules
                rules_collection.update_one(
                    {"_id": rule["_id"]},
                    {"$inc": {"trigger_count": 1}}
                )
                
                return report
        
        return None

    def _matches_rule(self, content_data: Dict, rule: Dict) -> bool:
        """Check if content matches a moderation rule"""
        rule_type = rule.get("type")
        
        if rule_type == "keyword_filter":
            content_text = " ".join([
                str(content_data.get("title", "")),
                str(content_data.get("description", "")),
                str(content_data.get("content", ""))
            ]).lower()
            
            keywords = rule.get("keywords", [])
            return any(keyword.lower() in content_text for keyword in keywords)
        
        elif rule_type == "spam_detection":
            # Simple spam detection based on repetition and length
            title = content_data.get("title", "")
            description = content_data.get("description", "")
            
            # Check for excessive repetition
            if len(set(title.split())) < len(title.split()) * 0.5:
                return True
            
            # Check for excessive capitalization
            if len(title) > 10 and sum(c.isupper() for c in title) > len(title) * 0.7:
                return True
        
        elif rule_type == "rate_limit":
            # Check if user has posted too frequently
            user_id = content_data.get("user_id")
            time_window = rule.get("time_window_minutes", 60)
            max_posts = rule.get("max_posts", 5)
            
            cutoff_time = datetime.utcnow() - timedelta(minutes=time_window)
            
            # This would need to be implemented based on the specific content collection
            # For now, we'll return False
            pass
        
        return False

    def get_content_reports_summary(self, content_type: str, content_id: str) -> Dict:
        """Get summary of reports for specific content"""
        reports = self.get_reports_by_content(content_type, content_id)
        
        if not reports:
            return {"total_reports": 0, "status": "no_reports"}
        
        # Analyze reports
        reasons = {}
        statuses = {}
        total_reporters = set()
        
        for report in reports:
            reason = report.get("reason", "other")
            status = report.get("status", "pending")
            reporter_id = report.get("reporter_id")
            
            reasons[reason] = reasons.get(reason, 0) + 1
            statuses[status] = statuses.get(status, 0) + 1
            
            if reporter_id:
                total_reporters.add(str(reporter_id))
        
        # Determine overall status
        if statuses.get("resolved", 0) > 0:
            overall_status = "action_taken"
        elif statuses.get("dismissed", 0) == len(reports):
            overall_status = "dismissed"
        elif statuses.get("pending", 0) > 0:
            overall_status = "under_review"
        else:
            overall_status = "reviewed"
        
        return {
            "total_reports": len(reports),
            "unique_reporters": len(total_reporters),
            "most_common_reason": max(reasons.items(), key=lambda x: x[1])[0] if reasons else None,
            "reasons_breakdown": reasons,
            "status_breakdown": statuses,
            "overall_status": overall_status,
            "latest_report": reports[0]["created_at"].isoformat() if reports else None
        }