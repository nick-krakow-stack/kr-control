from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from dependencies import verify_token
from models import Case, CaseImage
from schemas import CaseResponse, StatusUpdate
from typing import List, Optional
from datetime import datetime, timedelta
import aiofiles
import os
import uuid

router = APIRouter(dependencies=[Depends(verify_token)])

UPLOAD_DIR = "uploads"
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


def _get_case_or_404(case_id: int, db: Session) -> Case:
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden")
    return case


@router.get("/", response_model=List[CaseResponse])
def get_cases(
    location_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(Case).order_by(Case.reported_at.desc())
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
    case_type: str = Form("standard"),
    images: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
):
    reported_dt = datetime.fromisoformat(reported_at) if reported_at else datetime.utcnow()

    case = Case(
        location_id=location_id,
        license_plate=license_plate.upper().strip(),
        reported_at=reported_dt,
        notes=notes,
        case_type=case_type,
        status="new",
        payment_deadline=reported_dt + timedelta(days=3),
    )
    db.add(case)
    db.flush()

    for image in images:
        if not image.filename:
            continue
        content = await image.read()
        if len(content) > MAX_FILE_SIZE:
            continue  # skip oversized files silently

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
def get_case(case_id: int, db: Session = Depends(get_db)):
    return _get_case_or_404(case_id, db)


@router.patch("/{case_id}/status")
def update_status(case_id: int, data: StatusUpdate, db: Session = Depends(get_db)):
    case = _get_case_or_404(case_id, db)
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


@router.patch("/{case_id}/image-type")
def update_image_type(
    case_id: int,
    image_id: int,
    image_type: str,
    db: Session = Depends(get_db),
):
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
def delete_case(case_id: int, db: Session = Depends(get_db)):
    case = _get_case_or_404(case_id, db)
    # Delete image files
    for img in case.images:
        path = os.path.join(UPLOAD_DIR, img.filename)
        if os.path.exists(path):
            os.remove(path)
    db.delete(case)
    db.commit()
    return {"ok": True}
