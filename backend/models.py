from sqlalchemy import Column, Integer, String, DateTime, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


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


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    license_plate = Column(String(20), nullable=False)
    reported_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(Text)
    status = Column(String(50), default="new", nullable=False)
    case_type = Column(String(50), default="standard", nullable=False)
    ticket_number = Column(String(50))
    payment_deadline = Column(DateTime)
    ordnungsamt_requested_at = Column(DateTime)
    letter_sent_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    location = relationship("Location", back_populates="cases")
    images = relationship("CaseImage", back_populates="case", cascade="all, delete-orphan")


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
