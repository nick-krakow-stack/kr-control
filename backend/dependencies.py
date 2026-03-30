from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from config import settings
from database import get_db
from models import User
from typing import List

security = HTTPBearer()

SELF_CONTROL_ROLES = {"self_control_business", "self_control_private"}
STAFF_ROLES = {"admin", "mitarbeiter"}
ALL_ROLES = STAFF_ROLES | SELF_CONTROL_ROLES


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token ungültig")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ungültig oder abgelaufen",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Benutzer nicht gefunden oder inaktiv")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nur Administratoren haben Zugriff")
    return current_user


def require_staff(current_user: User = Depends(get_current_user)) -> User:
    """Admin oder Mitarbeiter - kein Self-Control."""
    if current_user.role not in STAFF_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Kein Zugriff")
    return current_user


def get_accessible_location_ids(current_user: User) -> List[int]:
    """
    Admin: None (kein Filter = alle Standorte)
    Alle anderen: nur zugewiesene Standorte
    """
    if current_user.role == "admin":
        return None  # None bedeutet: kein Filter
    return [loc.id for loc in current_user.locations]
