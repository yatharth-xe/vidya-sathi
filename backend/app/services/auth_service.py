from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.database import crud
from app.schemas import auth as auth_schemas
from app.core import security

def authenticate_user(db: Session, email: str, password: str):
    user = crud.get_user_by_email(db, email)
    if not user:
        return False
    if not security.verify_password(password, user.hashed_password):
        return False
    return user

def register_user(db: Session, user_data: auth_schemas.UserCreate):
    existing_user = crud.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    return crud.create_user(db, user_data)
