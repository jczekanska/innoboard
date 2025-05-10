import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from . import models, schemas, crud, auth
from .database import async_session

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_db():
    async with async_session() as session:
        yield session

@app.post("/signup", response_model=schemas.Token)
async def signup(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    if await crud.get_user_by_email(db, user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered",
        )
    # Create user
    new_user = await crud.create_user(db, user.email, user.password)
    if not new_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create user",
        )
    # Generate JWT
    token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": token}

@app.get("/dashboard")
async def dashboard():
    return {"message": "Welcome to your dashboard!"}