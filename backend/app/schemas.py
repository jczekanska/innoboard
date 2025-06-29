from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Dict, Optional, Literal

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
    name: Optional[str] = None

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
    invitee_email: str

class InvitationCreate(InvitationBase):
    expiry_hours: Optional[int] = None

class Invitation(InvitationBase):
    id: int
    canvas_id: int
    token: str

    model_config = ConfigDict(from_attributes=True)


class InviteOut(BaseModel):
    token: str
    invitee_email: str
    expires_at: Optional[datetime]
    disabled: bool
    join_count: int

    class Config:
        orm_mode = True


class MemberOut(BaseModel):
    email: EmailStr
    role: Literal["owner", "editor"]
    
class ChangeEmail(BaseModel):
    current_password: str
    new_email: EmailStr

    model_config = ConfigDict(from_attributes=True)

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

    model_config = ConfigDict(from_attributes=True)
