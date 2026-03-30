from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from config import settings
from database import get_db
from models import User
from schemas import Token, UserMeResponse, SetupPasswordRequest, ChangePasswordRequest
from dependencies import get_current_user

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.username == form_data.username,
        User.is_active == True,
    ).first()

    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Benutzername oder Passwort falsch",
        )

    token = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/setup-password")
def setup_password(
    data: SetupPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.invite_token == data.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Token ungültig")
    if user.invite_expires_at and user.invite_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token abgelaufen – bitte Administrator kontaktieren")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 8 Zeichen haben")

    user.hashed_password = hash_password(data.password)
    user.email_verified = True
    user.invite_token = None
    user.invite_expires_at = None
    db.commit()

    from services.email import send_password_changed_email
    background_tasks.add_task(send_password_changed_email, user.email, user.username)

    return {"ok": True}


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.hashed_password or not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Aktuelles Passwort ist falsch")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Neues Passwort muss mindestens 8 Zeichen haben")

    current_user.hashed_password = hash_password(data.new_password)
    db.commit()

    from services.email import send_password_changed_email
    background_tasks.add_task(send_password_changed_email, current_user.email, current_user.username)

    return {"ok": True}
