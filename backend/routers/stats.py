from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from dependencies import verify_token
from models import Case, Location
from datetime import datetime, timedelta

router = APIRouter(dependencies=[Depends(verify_token)])


@router.get("/")
def get_stats(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    total_cases = db.query(Case).count()
    cases_today = db.query(Case).filter(Case.reported_at >= today_start).count()
    cases_week = db.query(Case).filter(Case.reported_at >= week_start).count()
    cases_month = db.query(Case).filter(Case.reported_at >= month_start).count()

    open_statuses = ["new", "in_progress", "ticket_issued"]
    open_cases = db.query(Case).filter(Case.status.in_(open_statuses)).count()

    # Payment deadline exceeded (open cases older than 3 days)
    deadline_exceeded = db.query(Case).filter(
        Case.status.in_(["new", "ticket_issued"]),
        Case.payment_deadline < now
    ).count()

    total_locations = db.query(Location).count()

    # Status distribution
    status_rows = db.query(Case.status, func.count(Case.id)).group_by(Case.status).all()
    status_distribution = [{"status": s, "count": c} for s, c in status_rows]

    # Top locations by case count
    top_locations = (
        db.query(Location.name, func.count(Case.id).label("count"))
        .join(Case, Case.location_id == Location.id)
        .group_by(Location.id, Location.name)
        .order_by(func.count(Case.id).desc())
        .limit(5)
        .all()
    )

    # Recent 10 cases
    recent_cases = db.query(Case).order_by(Case.reported_at.desc()).limit(10).all()

    return {
        "total_cases": total_cases,
        "cases_today": cases_today,
        "cases_week": cases_week,
        "cases_month": cases_month,
        "open_cases": open_cases,
        "deadline_exceeded": deadline_exceeded,
        "total_locations": total_locations,
        "status_distribution": status_distribution,
        "top_locations": [{"name": n, "count": c} for n, c in top_locations],
        "recent_cases": [
            {
                "id": c.id,
                "license_plate": c.license_plate,
                "status": c.status,
                "case_type": c.case_type,
                "reported_at": c.reported_at.isoformat(),
                "location_id": c.location_id,
                "payment_deadline": c.payment_deadline.isoformat() if c.payment_deadline else None,
            }
            for c in recent_cases
        ],
    }
