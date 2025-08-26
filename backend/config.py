from dotenv import load_dotenv
import os

load_dotenv()  
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/skillplan_db")
BCRYPT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", 12))

if not OPENROUTER_API_KEY:
    raise RuntimeError("Missing OPENROUTER_API_KEY in environment")
