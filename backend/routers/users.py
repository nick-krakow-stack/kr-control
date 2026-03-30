from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from dependencies import require_admin
from models import User, Location
from schemas import UserCreate, UserUpdate, UserResponse, AssignLocationsRequest
from routers.auth import hash_password
from datetime import datetime, timedelta
import secrets

router = APIRouter(dependencies=[Depends(require_admin)])

VALID_ROLES = {"admin", "mitarbeiter", "self_control_business", "self_control_private"}


def _user_to_response(user: User) -> UserResponse:
    data = UserResponse.model_validate(user)
    data.location_ids = [loc.id for loc in user.locations]
    return data


@router.get("/", response_model=list[UserResponse])
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [_user_to_response(u) for u in users]


@router.post("/", response_model=UserResponse)
def create_user(
    data: UserCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Ungültige Rolle. Erlaubt: {', '.join(VALID_ROLES)}")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Benutzername bereits vergeben")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="E-Mail bereits registriert")

    invite_token = secrets.token_urlsafe(32)
    user = User(
        username=data.username,
        email=data.email,
        role=data.role,
        recall_hours=data.recall_hours or 24,
        invite_token=invite_token,
        invite_expires_at=datetime.utcnow() + timedelta(hours=72),
        created_by_id=current_user.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    from services.email import send_invite_email
    background_tasks.add_task(send_invite_email, user.email, user.username, invite_token)

    return _user_to_response(user)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    return _user_to_response(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

    if data.role is not None:
        if data.role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail="Ungültige Rolle")
        user.role = data.role
    if data.username is not None:
        existing = db.query(User).filter(User.username == data.username, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Benutzername bereits vergeben")
        user.username = data.username
    if data.email is not None:
        existing = db.query(User).filter(User.email == data.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="E-Mail bereits registriert")
        user.email = data.email
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.recall_hours is not None:
        user.recall_hours = data.recall_hours

    db.commit()
    db.refresh(user)
    return _user_to_response(user)


@router.delete("/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Sie können Ihren eigenen Account nicht löschen")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    db.delete(user)
    db.commit()
    return {"ok": True}


@router.put("/{user_id}/locations")
def assign_locations(user_id: int, data: AssignLocationsRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

    locations = db.query(Location).filter(Location.id.in_(data.location_ids)).all()
    if len(locations) != len(data.location_ids):
        raise HTTPException(status_code=400, detail="Einer oder mehrere Parkplätze nicht gefunden")

    user.locations = locations
    db.commit()
    return {"ok": True}


@router.post("/{user_id}/resend-invite")
def resend_invite(user_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    if user.email_verified:
        raise HTTPException(status_code=400, detail="Benutzer hat sein Passwort bereits gesetzt")

    invite_token = secrets.token_urlsafe(32)
    user.invite_token = invite_token
    user.invite_expires_at = datetime.utcnow() + timedelta(hours=72)
    db.commit()

    from services.email import send_invite_email
    background_tasks.add_task(send_invite_email, user.email, user.username, invite_token)

    return {"ok": True}
