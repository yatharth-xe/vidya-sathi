from app.core.security import create_access_token
from app.database.database import SessionLocal
from app.database.crud import get_user_by_email
from datetime import timedelta

db = SessionLocal()
user = get_user_by_email(db, "teacherA@test.com")
if user:
    token = create_access_token(user.id, timedelta(minutes=60))
    print("TOKEN:", token)
else:
    print("User not found")
