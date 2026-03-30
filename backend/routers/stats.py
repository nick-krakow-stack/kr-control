from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from dependencies import get_current_user, get_accessible_location_ids
from models import Case, Location, User
from datetime import datetime, timedelta

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/")
def get_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    accessible = get_accessible_location_ids(current_user)

    def base_query():
        q = db.query(Case)
        if accessible is not None:
            q = q.filter(Case.location_id.in_(accessible))
        return q

    total_cases = base_query().count()
    cases_today = base_query().filter(Case.reported_at >= today_start).count()
    cases_week = base_query().filter(Case.reported_at >= week_start).count()
    cases_month = base_query().filter(Case.reported_at >= month_start).count()

    open_statuses = ["new", "in_progress", "ticket_issued", "pending"]
    open_cases = base_query().filter(Case.status.in_(open_statuses)).count()

    deadline_exceeded = base_query().filter(
        Case.status.in_(["new", "ticket_issued"]),
        Case.payment_deadline < now
    ).count()

    # Standort-Anzahl (nur zugängliche)
    if accessible is None:
        total_locations = db.query(Location).count()
    else:
        total_locations = db.query(Location).filter(Location.id.in_(accessible)).count()

    # Status-Verteilung
    status_q = db.query(Case.status, func.count(Case.id)).group_by(Case.status)
    if accessible is not None:
        status_q = status_q.filter(Case.location_id.in_(accessible))
    status_distribution = [{"status": s, "count": c} for s, c in status_q.all()]

    # Top Standorte
    top_q = (
        db.query(Location.name, func.count(Case.id).label("count"))
        .join(Case, Case.location_id == Location.id)
        .group_by(Location.id, Location.name)
        .order_by(func.count(Case.id).desc())
        .limit(5)
    )
    if accessible is not None:
        top_q = top_q.filter(Location.id.in_(accessible))

    # Letzte 10 Fälle (für Self-Control nur pending/recalled/new)
    recent_q = base_query().order_by(Case.reported_at.desc()).limit(10)
    recent_cases = recent_q.all()

    return {
        "total_cases": total_cases,
        "cases_today": cases_today,
        "cases_week": cases_week,
        "cases_month": cases_month,
        "open_cases": open_cases,
        "deadline_exceeded": deadline_exceeded,
        "total_locations": total_locations,
        "status_distribution": status_distribution,
        "top_locations": [{"name": n, "count": c} for n, c in top_q.all()],
        "recent_cases": [
            {
                "id": c.id,
                "license_plate": c.license_plate,
                "status": c.status,
                "case_type": c.case_type,
                "reported_at": c.reported_at.isoformat(),
                "location_id": c.location_id,
                "payment_deadline": c.payment_deadline.isoformat() if c.payment_deadline else None,
                "recall_deadline": c.recall_deadline.isoformat() if c.recall_deadline else None,
            }
            for c in recent_cases
        ],
    }
