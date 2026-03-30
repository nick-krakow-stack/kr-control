from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List


class Token(BaseModel):
    access_token: str
    token_type: str


# --- User ---

class UserCreate(BaseModel):
    username: str
    email: str
    role: str  # admin, mitarbeiter, self_control_business, self_control_private
    recall_hours: Optional[int] = 24


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    recall_hours: Optional[int] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    email_verified: bool
    recall_hours: int
    created_at: datetime
    location_ids: List[int] = []

    class Config:
        from_attributes = True


class UserMeResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    recall_hours: int

    class Config:
        from_attributes = True


class SetupPasswordRequest(BaseModel):
    token: str
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class AssignLocationsRequest(BaseModel):
    location_ids: List[int]


# --- Location ---

class LocationCreate(BaseModel):
    name: str
    address: Optional[str] = None
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None
    spots_count: Optional[int] = 0
    max_duration_minutes: Optional[int] = 120
    client_name: Optional[str] = None
    contract_type: Optional[str] = "standard"
    notes: Optional[str] = None


class LocationResponse(BaseModel):
    id: int
    name: str
    address: Optional[str]
    gps_lat: Optional[float]
    gps_lng: Optional[float]
    spots_count: Optional[int]
    max_duration_minutes: Optional[int]
    client_name: Optional[str]
    contract_type: Optional[str]
    notes: Optional[str]
    created_at: datetime
    cases_count: Optional[int] = 0

    class Config:
        from_attributes = True


# --- Images ---

class CaseImageResponse(BaseModel):
    id: int
    filename: str
    original_filename: Optional[str]
    image_type: str
    gps_lat: Optional[float]
    gps_lng: Optional[float]
    captured_at: Optional[datetime]
    uploaded_at: datetime

    class Config:
        from_attributes = True


# --- Cases ---

class CaseResponse(BaseModel):
    id: int
    location_id: int
    license_plate: str
    reported_at: datetime
    notes: Optional[str]
    status: str
    case_type: str
    ticket_number: Optional[str]
    payment_deadline: Optional[datetime]
    ordnungsamt_requested_at: Optional[datetime]
    letter_sent_at: Optional[datetime]
    created_at: datetime
    recall_deadline: Optional[datetime]
    recalled_at: Optional[datetime]
    reported_by_user_id: Optional[int]
    images: List[CaseImageResponse] = []
    location: Optional[LocationResponse] = None

    class Config:
        from_attributes = True


class StatusUpdate(BaseModel):
    status: str
    ticket_number: Optional[str] = None
    notes: Optional[str] = None
