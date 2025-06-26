from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, func, JSON, Boolean, text
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(256), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    canvases = relationship("Canvas", back_populates="owner", cascade="all, delete-orphan")

class Canvas(Base):
    __tablename__ = "canvases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(256), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
 
    content = Column(JSON, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        server_default=func.now(),
    )

    owner = relationship("User", back_populates="canvases")
    invitations = relationship(
        "Invitation", back_populates="canvas", cascade="all, delete-orphan"
    )

class Invitation(Base):
    __tablename__ = "invitations"
    id = Column(Integer, primary_key=True, index=True)
    canvas_id = Column(Integer, ForeignKey("canvases.id"), nullable=False)
    invitee_email = Column(String(256), nullable=False)
    token = Column(String(64), unique=True, nullable=False)
    expires_at   = Column(DateTime, nullable=True)
    disabled       = Column(
        Boolean,
        nullable=False,
        default=False,            
        server_default=text("FALSE")  
    )
    join_count     = Column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0")
    )

    canvas = relationship("Canvas", back_populates="invitations")


User.canvases = relationship("Canvas", back_populates="owner", cascade="all, delete-orphan")

Canvas.invitations = relationship("Invitation", back_populates="canvas", cascade="all, delete-orphan")