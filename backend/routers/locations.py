from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from dependencies import verify_token
from models import Location, Case
from schemas import LocationCreate, LocationResponse
from typing import List

router = APIRouter(dependencies=[Depends(verify_token)])


@router.get("/", response_model=List[LocationResponse])
def get_locations(db: Session = Depends(get_db)):
    locations = db.query(Location).order_by(Location.created_at.desc()).all()
    result = []
    for loc in locations:
        count = db.query(Case).filter(Case.location_id == loc.id).count()
        data = LocationResponse.model_validate(loc)
        data.cases_count = count
        result.append(data)
    return result


@router.post("/", response_model=LocationResponse)
def create_location(data: LocationCreate, db: Session = Depends(get_db)):
    location = Location(**data.model_dump())
    db.add(location)
    db.commit()
    db.refresh(location)
    resp = LocationResponse.model_validate(location)
    resp.cases_count = 0
    return resp


@router.get("/{location_id}", response_model=LocationResponse)
def get_location(location_id: int, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Parkplatz nicht gefunden")
    count = db.query(Case).filter(Case.location_id == location_id).count()
    data = LocationResponse.model_validate(location)
    data.cases_count = count
    return data


@router.put("/{location_id}", response_model=LocationResponse)
def update_location(location_id: int, data: LocationCreate, db: Session = Depends(get_db)):
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
def delete_location(location_id: int, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Parkplatz nicht gefunden")
    db.delete(location)
    db.commit()
    return {"ok": True}
