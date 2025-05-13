from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Dict, Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class CanvasBase(BaseModel):
    name: str

class CanvasCreate(CanvasBase):
    pass

class Canvas(CanvasBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CanvasData(BaseModel):
    content: Dict

    model_config = ConfigDict(from_attributes=True)

class InvitationBase(BaseModel):
    invitee_email: Optional[EmailStr] = None

class InvitationCreate(InvitationBase):
    pass

class Invitation(InvitationBase):
    id: int
    canvas_id: int
    token: str
    expires_at: Optional[datetime]
    disabled: bool

    model_config = ConfigDict(from_attributes=True)
