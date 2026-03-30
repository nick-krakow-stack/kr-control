from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class UserLocation(Base):
    __tablename__ = "user_locations"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    location_id = Column(Integer, ForeignKey("locations.id"), primary_key=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)  # Null bis Passwort gesetzt
    role = Column(String(50), nullable=False)  # admin, mitarbeiter, self_control_business, self_control_private
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    recall_hours = Column(Integer, default=24, nullable=False)  # Widerruf-Fenster in Stunden
    invite_token = Column(String(255), nullable=True)
    invite_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    locations = relationship("Location", secondary="user_locations", back_populates="users")
    cases_reported = relationship("Case", back_populates="reported_by_user", foreign_keys="Case.reported_by_user_id")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    address = Column(String(500))
    gps_lat = Column(Float)
    gps_lng = Column(Float)
    spots_count = Column(Integer, default=0)
    max_duration_minutes = Column(Integer, default=120)
    client_name = Column(String(255))
    contract_type = Column(String(50), default="standard")  # standard, self_control
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    cases = relationship("Case", back_populates="location", cascade="all, delete-orphan")
    users = relationship("User", secondary="user_locations", back_populates="locations")


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    license_plate = Column(String(20), nullable=False)
    reported_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(Text)
    status = Column(String(50), default="new", nullable=False)
    # Statuses: pending, new, in_progress, ticket_issued, ordnungsamt, letter_sent, paid, closed, recalled
    case_type = Column(String(50), default="standard", nullable=False)
    # Types: standard, self_control_ticket, self_control_direct
    ticket_number = Column(String(50))
    payment_deadline = Column(DateTime)
    ordnungsamt_requested_at = Column(DateTime)
    letter_sent_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Widerruf-Felder
    recall_deadline = Column(DateTime, nullable=True)   # Bis wann kann widerrufen werden
    recalled_at = Column(DateTime, nullable=True)        # Wann wurde widerrufen

    # Wer hat den Fall gemeldet
    reported_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    location = relationship("Location", back_populates="cases")
    images = relationship("CaseImage", back_populates="case", cascade="all, delete-orphan")
    reported_by_user = relationship("User", back_populates="cases_reported", foreign_keys=[reported_by_user_id])


class CaseImage(Base):
    __tablename__ = "case_images"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    filename = Column(String(500), nullable=False)
    original_filename = Column(String(500))
    image_type = Column(String(50), default="additional")  # front, rear, sign, additional
    gps_lat = Column(Float)
    gps_lng = Column(Float)
    captured_at = Column(DateTime)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="images")
