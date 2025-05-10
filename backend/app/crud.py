from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from .models import User
from .auth import get_password_hash

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