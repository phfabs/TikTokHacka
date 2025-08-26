from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError, validate
from typing import cast
from datetime import datetime
from bson import ObjectId
from backend.auth.routes import require_auth

# Create blueprint
skill_enhancement_bp = Blueprint('skill_enhancement', __name__)

# Validation Schemas
class UpgradeSkillSchema(Schema):
    enhancement_level = fields.Str(required=True, validate=validate.OneOf(["standard", "enhanced", "professional"]))
    payment_method = fields.Str(required=True, validate=validate.OneOf(["credit_card", "paypal", "apple_pay", "google_pay"]))
    payment_token = fields.Str(required=True, validate=validate.Length(min=1))

# Enhancement levels and pricing
ENHANCEMENT_LEVELS = {
    "standard": {
        "name": "Standard",
        "price": 0.00,
        "features": [
            "30-day structured learning plan",
            "Daily tasks and exercises", 
            "Progress tracking",
            "Basic resources"
        ]
    },
    "enhanced": {
        "name": "Enhanced",
        "price": 9.99,
        "features": [
            "Everything in Standard",
            "Video tutorials and demonstrations",
            "Interactive quizzes and assessments",
            "Personalized feedback",
            "Expert tips and best practices",
            "Bonus advanced challenges",
            "Certificate of completion",
            "Priority community support"
        ]
    },
    "professional": {
        "name": "Professional", 
        "price": 29.99,
        "features": [
            "Everything in Enhanced",
            "Live expert mentorship sessions",
            "Industry project portfolios",
            "Real-world case studies",
            "Networking opportunities",
            "Job placement assistance",
            "LinkedIn skill verification",
            "Lifetime access to updates"
        ]
    }
}

# Error handlers
@skill_enhancement_bp.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"error": "Validation failed", "details": err.messages}), 422

@skill_enhancement_bp.errorhandler(ValueError)
def handle_value_error(err):
    return jsonify({"error": str(err)}), 400

@skill_enhancement_bp.errorhandler(Exception)
def handle_generic_error(err):
    return jsonify({"error": "An unexpected error occurred."}), 500

# Routes
@skill_enhancement_bp.route('/levels', methods=['GET'])
def get_enhancement_levels():
    """Get all available enhancement levels"""
    try:
        return jsonify({
            "message": "Enhancement levels retrieved successfully",
            "levels": ENHANCEMENT_LEVELS
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to get enhancement levels: {str(e)}"}), 500

@skill_enhancement_bp.route('/skills/<skill_id>/upgrade', methods=['POST'])
@require_auth
def upgrade_skill(skill_id: str):
    """Upgrade a skill to a higher enhancement level"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, UpgradeSkillSchema().load(data))
        current_user_id = str(g.current_user['_id'])
        
        # Get the skill to upgrade
        skill = g.db.plans.find_one({
            "_id": ObjectId(skill_id),
            "user_id": ObjectId(current_user_id),
            "type": "skill"
        })
        
        if not skill:
            return jsonify({"error": "Skill not found or access denied"}), 404
        
        target_level = validated_data["enhancement_level"]
        current_level = skill.get("enhancement_level", "standard")
        
        # Check if upgrade is valid
        level_order = ["standard", "enhanced", "professional"]
        current_index = level_order.index(current_level)
        target_index = level_order.index(target_level)
        
        if target_index <= current_index:
            return jsonify({"error": "Invalid upgrade level"}), 400
        
        # Process payment (simulate payment processing)
        payment_amount = ENHANCEMENT_LEVELS[target_level]["price"]
        if payment_amount > 0:
            payment_result = process_payment(
                validated_data["payment_method"],
                validated_data["payment_token"],
                payment_amount
            )
            
            if not payment_result["success"]:
                return jsonify({
                    "error": "Payment failed",
                    "details": payment_result["error"]
                }), 402
        
        # Update skill with new enhancement level
        update_data = {
            "enhancement_level": target_level,
            "upgraded_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Add enhanced content based on level
        if target_level == "enhanced":
            update_data["enhanced_content"] = {
                "video_tutorials": True,
                "interactive_quizzes": True,
                "personalized_feedback": True,
                "expert_tips": True,
                "bonus_challenges": True,
                "certificate_eligible": True,
                "priority_support": True
            }
        elif target_level == "professional":
            update_data["enhanced_content"] = {
                "video_tutorials": True,
                "interactive_quizzes": True,
                "personalized_feedback": True,
                "expert_tips": True,
                "bonus_challenges": True,
                "certificate_eligible": True,
                "priority_support": True,
                "mentorship_sessions": True,
                "industry_projects": True,
                "case_studies": True,
                "networking_access": True,
                "job_placement": True,
                "linkedin_verification": True,
                "lifetime_updates": True
            }
        
        result = g.db.plans.update_one(
            {"_id": ObjectId(skill_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "Failed to upgrade skill"}), 500
        
        # Record the upgrade transaction
        transaction_data = {
            "user_id": ObjectId(current_user_id),
            "skill_id": ObjectId(skill_id),
            "from_level": current_level,
            "to_level": target_level,
            "amount_paid": payment_amount,
            "payment_method": validated_data["payment_method"],
            "created_at": datetime.utcnow()
        }
        
        g.db.skill_upgrades.insert_one(transaction_data)
        
        # Update user's upgrade stats
        g.db.users.update_one(
            {"_id": ObjectId(current_user_id)},
            {
                "$inc": {"stats.skills_upgraded": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return jsonify({
            "message": f"Skill upgraded to {ENHANCEMENT_LEVELS[target_level]['name']} successfully",
            "enhancement_level": target_level,
            "features": ENHANCEMENT_LEVELS[target_level]["features"],
            "amount_paid": payment_amount
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid upgrade data", "details": e.messages}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to upgrade skill: {str(e)}"}), 500

@skill_enhancement_bp.route('/skills/<skill_id>/status', methods=['GET'])
@require_auth
def get_skill_enhancement_status(skill_id: str):
    """Get current enhancement status of a skill"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        # Get the skill
        skill = g.db.plans.find_one({
            "_id": ObjectId(skill_id),
            "user_id": ObjectId(current_user_id),
            "type": "skill"
        })
        
        if not skill:
            return jsonify({"error": "Skill not found or access denied"}), 404
        
        current_level = skill.get("enhancement_level", "standard")
        enhanced_content = skill.get("enhanced_content", {})
        
        # Get available upgrades
        level_order = ["standard", "enhanced", "professional"]
        current_index = level_order.index(current_level)
        available_upgrades = []
        
        for i in range(current_index + 1, len(level_order)):
            level = level_order[i]
            available_upgrades.append({
                "level": level,
                "name": ENHANCEMENT_LEVELS[level]["name"],
                "price": ENHANCEMENT_LEVELS[level]["price"],
                "features": ENHANCEMENT_LEVELS[level]["features"]
            })
        
        return jsonify({
            "message": "Skill enhancement status retrieved successfully",
            "current_level": current_level,
            "current_features": ENHANCEMENT_LEVELS[current_level]["features"],
            "enhanced_content": enhanced_content,
            "available_upgrades": available_upgrades,
            "upgraded_at": skill.get("upgraded_at")
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get enhancement status: {str(e)}"}), 500

@skill_enhancement_bp.route('/my-upgrades', methods=['GET'])
@require_auth
def get_my_upgrades():
    """Get user's upgrade history"""
    try:
        current_user_id = str(g.current_user['_id'])
        
        # Get upgrade transactions
        upgrades = list(g.db.skill_upgrades.find({
            "user_id": ObjectId(current_user_id)
        }).sort("created_at", -1))
        
        # Get skill names for each upgrade
        for upgrade in upgrades:
            skill = g.db.plans.find_one({"_id": upgrade["skill_id"]})
            upgrade["skill_title"] = skill.get("title", "Unknown Skill") if skill else "Unknown Skill"
            upgrade["_id"] = str(upgrade["_id"])
            upgrade["user_id"] = str(upgrade["user_id"])
            upgrade["skill_id"] = str(upgrade["skill_id"])
        
        return jsonify({
            "message": "Upgrade history retrieved successfully",
            "upgrades": upgrades,
            "total_spent": sum(upgrade["amount_paid"] for upgrade in upgrades)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get upgrade history: {str(e)}"}), 500

def process_payment(payment_method: str, payment_token: str, amount: float):
    """
    Simulate payment processing
    In a real implementation, this would integrate with Stripe, PayPal, etc.
    """
    try:
        # Simulate payment processing logic
        if payment_token == "test_fail":
            return {"success": False, "error": "Payment declined"}
        
        # Simulate successful payment
        return {
            "success": True,
            "transaction_id": f"txn_{payment_method}_{int(datetime.utcnow().timestamp())}",
            "amount": amount,
            "currency": "USD"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}