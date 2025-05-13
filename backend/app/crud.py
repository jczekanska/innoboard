import secrets
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from .models import User, Canvas, Invitation
from .auth import get_password_hash
from datetime import datetime, timedelta

async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(User).where(User.email == email))
    return result.scalars().first()

async def create_user(db: AsyncSession, email: str, password: str):
    user = User(email=email, hashed_password=get_password_hash(password))
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
        return user
    except IntegrityError:
        await db.rollback()
        return None
    
async def get_canvases_by_owner(db: AsyncSession, owner_id: int):
    result = await db.execute(select(Canvas).where(Canvas.owner_id == owner_id))
    return result.scalars().all()

async def get_canvas(db: AsyncSession, canvas_id: int):
    result = await db.execute(select(Canvas).where(Canvas.id == canvas_id))
    return result.scalars().first()

async def create_canvas(db: AsyncSession, owner_id: int, name: str):
    canvas = Canvas(name=name, owner_id=owner_id, content={})
    db.add(canvas)
    await db.commit()
    await db.refresh(canvas)
    return canvas

async def update_canvas(db: AsyncSession, canvas_id: int, name: str):
    canvas = await get_canvas(db, canvas_id)
    if canvas:
        canvas.name = name
        await db.commit()
        await db.refresh(canvas)
    return canvas

async def delete_canvas(db: AsyncSession, canvas_id: int):
    canvas = await get_canvas(db, canvas_id)
    if canvas:
        await db.delete(canvas)
        await db.commit()
    return canvas

async def create_invitation(
    db: AsyncSession,
    canvas_id: int,
    invitee_email: str | None,
    expires_delta: timedelta | None = None,
):
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + expires_delta if expires_delta else None
    inv = Invitation(
        canvas_id=canvas_id,
        invitee_email=invitee_email,
        token=token,
        expires_at=expires_at,
        disabled=False,
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    return inv

async def get_invitations_by_canvas(db: AsyncSession, canvas_id: int):
    result = await db.execute(
        select(Invitation).where(Invitation.canvas_id == canvas_id)
    )
    return result.scalars().all()

async def validate_token(db: AsyncSession, token: str):
    result = await db.execute(
        select(Invitation).where(Invitation.token == token)
    )
    inv = result.scalars().first()
    if not inv or inv.disabled:
        return None
    if inv.expires_at and inv.expires_at < datetime.utcnow():
        return None
    return inv

async def get_invitation_by_token(db: AsyncSession, token: str):
    result = await db.execute(
        select(Invitation).where(Invitation.token == token)
    )
    return result.scalars().first()

async def accept_invitation(db: AsyncSession, token: str, email: str):
    inv = await get_invitation_by_token(db, token)
    if not inv:
        return None
    if inv.invitee_email is None:
        inv.invitee_email = email
        await db.commit()
        await db.refresh(inv)
    return inv

async def get_invitations_for_user(db: AsyncSession, email: str):
    result = await db.execute(
        select(Invitation).where(Invitation.invitee_email == email)
    )
    return result.scalars().all()

async def get_canvas_data(db: AsyncSession, canvas_id: int):
    canvas = await get_canvas(db, canvas_id)
    return canvas.content if canvas else None

async def save_canvas_data(db: AsyncSession, canvas_id: int, data: dict):
    canvas = await get_canvas(db, canvas_id)
    if not canvas:
        return None
    canvas.content = data
    await db.commit()
    await db.refresh(canvas)
    return canvas