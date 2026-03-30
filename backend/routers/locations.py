from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from dependencies import get_current_user, require_admin, get_accessible_location_ids
from models import Location, Case, User
from schemas import LocationCreate, LocationResponse
from typing import List

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/", response_model=List[LocationResponse])
def get_locations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accessible = get_accessible_location_ids(current_user)
    query = db.query(Location).order_by(Location.created_at.desc())
    if accessible is not None:
        query = query.filter(Location.id.in_(accessible))

    locations = query.all()
    result = []
    for loc in locations:
        count = db.query(Case).filter(Case.location_id == loc.id).count()
        data = LocationResponse.model_validate(loc)
        data.cases_count = count
        result.append(data)
    return result


@router.post("/", response_model=LocationResponse)
def create_location(
    data: LocationCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    location = Location(**data.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    resp = LocationResponse.model_validate(location)
    resp.cases_count = 0
    return resp


@router.get("/{location_id}", response_model=LocationResponse)
def get_location(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accessible = get_accessible_location_ids(current_user)
    if accessible is not None and location_id not in accessible:
        raise HTTPException(status_code=403, detail="Kein Zugriff auf diesen Standort")

    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Parkplatz nicht gefunden")
    count = db.query(Case).filter(Case.location_id == location_id).count()
    data = LocationResponse.model_validate(location)
    data.cases_count = count
    return data


@router.put("/{location_id}", response_model=LocationResponse)
def update_location(
    location_id: int,
    data: LocationCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Parkplatz nicht gefunden")
    for key, value in data.model_dump().items():
        setattr(location, key, value)
    db.commit()
    db.refresh(location)
    count = db.query(Case).filter(Case.location_id == location_id).count()
    resp = LocationResponse.model_validate(location)
    resp.cases_count = count
    return resp


@router.delete("/{location_id}")
def delete_location(
    location_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Parkplatz nicht gefunden")
    db.delete(location)
    db.commit()
    return {"ok": True}
