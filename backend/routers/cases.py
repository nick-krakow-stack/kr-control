from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user, get_accessible_location_ids
from models import Case, CaseImage, User
from schemas import CaseResponse, StatusUpdate
from typing import List, Optional
from datetime import datetime, timedelta
import aiofiles
import os
import uuid

router = APIRouter(dependencies=[Depends(get_current_user)])

UPLOAD_DIR = "uploads"
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

SELF_CONTROL_ROLES = {"self_control_business", "self_control_private"}


def _get_case_or_404(case_id: int, db: Session) -> Case:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden")
    return case


def _check_location_access(location_id: int, current_user: User):
    """Prüft ob der User Zugriff auf diesen Standort hat."""
    accessible = get_accessible_location_ids(current_user)
    if accessible is not None and location_id not in accessible:
        raise HTTPException(status_code=403, detail="Kein Zugriff auf diesen Standort")


@router.get("/", response_model=List[CaseResponse])
def get_cases(
    location_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accessible = get_accessible_location_ids(current_user)
    query = db.query(Case).order_by(Case.reported_at.desc())

    # Standort-Filter basierend auf Berechtigung
    if accessible is not None:
        query = query.filter(Case.location_id.in_(accessible))
    if location_id:
        query = query.filter(Case.location_id == location_id)
    if status:
        query = query.filter(Case.status == status)
    if search:
        query = query.filter(Case.license_plate.ilike(f"%{search}%"))

    return query.offset(offset).limit(limit).all()


@router.post("/", response_model=CaseResponse)
async def create_case(
    location_id: int = Form(...),
    license_plate: str = Form(...),
    reported_at: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    case_type: Optional[str] = Form(None),
    ticket_number: Optional[str] = Form(None),
    images: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_location_access(location_id, current_user)

    reported_dt = datetime.fromisoformat(reported_at) if reported_at else datetime.utcnow()

    # Status und Typ automatisch setzen basierend auf Rolle
    if current_user.role == "self_control_business":
        initial_status = "pending"
        auto_case_type = "self_control_ticket"
        recall_deadline = reported_dt + timedelta(hours=current_user.recall_hours)
    elif current_user.role == "self_control_private":
        initial_status = "pending"
        auto_case_type = "self_control_direct"
        recall_deadline = reported_dt + timedelta(hours=current_user.recall_hours)
    else:
        # Admin oder Mitarbeiter
        initial_status = "new"
        auto_case_type = case_type or "standard"
        recall_deadline = None

    case = Case(
        location_id=location_id,
        license_plate=license_plate.upper().strip(),
        reported_at=reported_dt,
        notes=notes,
        case_type=auto_case_type,
        status=initial_status,
        ticket_number=ticket_number,
        payment_deadline=reported_dt + timedelta(days=3),
        recall_deadline=recall_deadline,
        reported_by_user_id=current_user.id,
    )
    db.add(case)
    db.flush()

    for image in images:
        if not image.filename:
            continue
        content = await image.read()
        if len(content) > MAX_FILE_SIZE:
            continue

        ext = os.path.splitext(image.filename)[1].lower() or ".jpg"
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        async with aiofiles.open(filepath, "wb") as f:
            await f.write(content)

        db_image = CaseImage(
            case_id=case.id,
            filename=filename,
            original_filename=image.filename,
            image_type="additional",
        )
        db.add(db_image)

    db.commit()
    db.refresh(case)
    return case


@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    case = _get_case_or_404(case_id, db)
    _check_location_access(case.location_id, current_user)
    return case


@router.patch("/{case_id}/status")
def update_status(
    case_id: int,
    data: StatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = _get_case_or_404(case_id, db)
    _check_location_access(case.location_id, current_user)

    # Self-Control darf Status nicht manuell ändern (nur Widerruf)
    if current_user.role in SELF_CONTROL_ROLES:
        raise HTTPException(status_code=403, detail="Kein Zugriff auf Statusänderung")

    case.status = data.status
    if data.ticket_number:
        case.ticket_number = data.ticket_number
    if data.notes:
        case.notes = (case.notes or "") + f"\n[{datetime.utcnow().strftime('%d.%m.%Y %H:%M')}] {data.notes}"
    if data.status == "letter_sent":
        case.letter_sent_at = datetime.utcnow()
    if data.status == "ordnungsamt":
        case.ordnungsamt_requested_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@router.post("/{case_id}/recall")
def recall_case(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Self-Control User widerruft einen Fall innerhalb des Widerruf-Fensters."""
    case = _get_case_or_404(case_id, db)
    _check_location_access(case.location_id, current_user)

    if case.status != "pending":
        raise HTTPException(status_code=400, detail="Nur ausstehende Fälle können widerrufen werden")
    if not case.recall_deadline or datetime.utcnow() > case.recall_deadline:
        raise HTTPException(status_code=400, detail="Widerruf-Frist abgelaufen")

    case.status = "recalled"
    case.recalled_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@router.patch("/{case_id}/image-type")
def update_image_type(
    case_id: int,
    image_id: int,
    image_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = _get_case_or_404(case_id, db)
    _check_location_access(case.location_id, current_user)

    image = db.query(CaseImage).filter(
        CaseImage.id == image_id,
        CaseImage.case_id == case_id
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Bild nicht gefunden")
    image.image_type = image_type
    db.commit()
    return {"ok": True}


@router.delete("/{case_id}")
def delete_case(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = _get_case_or_404(case_id, db)
    _check_location_access(case.location_id, current_user)

    # Self-Control darf nur eigene ausstehende Fälle löschen
    if current_user.role in SELF_CONTROL_ROLES:
        if case.reported_by_user_id != current_user.id or case.status not in ("pending", "recalled"):
            raise HTTPException(status_code=403, detail="Kein Löschrecht für diesen Fall")

    for img in case.images:
        path = os.path.join(UPLOAD_DIR, img.filename)
        if os.path.exists(path):
            os.remove(path)
    db.delete(case)
    db.commit()
    return {"ok": True}
