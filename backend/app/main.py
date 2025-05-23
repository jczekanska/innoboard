import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import OperationalError
from sqlalchemy import text
from datetime import datetime
from typing import List
from . import models, schemas, crud, auth
from .database import async_session, sync_engine, Base
from .auth import oauth2_scheme, decode_token
from .schemas import InvitationCreate, Invitation, CanvasData
from .crud import create_invitation, get_invitations_for_user, get_canvas_data, save_canvas_data

Base.metadata.create_all(bind=sync_engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    for _ in range(10):
        try:
            with sync_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            break
        except OperationalError:
            time.sleep(2)
    Base.metadata.create_all(bind=sync_engine)

    yield
    sync_engine.dispose()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_db():
    async with async_session() as session:
        yield session

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    email = decode_token(token)
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = await crud.get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    return user

@app.post("/signup", response_model=schemas.Token)
async def signup(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    if await crud.get_user_by_email(db, user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is already registered",
        )
    new_user = await crud.create_user(db, user.email, user.password)
    if not new_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create user",
        )
    token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": token}

@app.post("/login", response_model=schemas.Token)
async def login(user: schemas.UserLogin, db: AsyncSession = Depends(get_db)):
    existing = await crud.get_user_by_email(db, user.email)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No account found with this email",
        )
    if not auth.verify_password(user.password, existing.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password",
        )
    token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": token}

@app.get("/dashboard")
async def dashboard():
    return {"message": "Welcome to your dashboard!"}

@app.post("/canvases", response_model=schemas.Canvas)
async def api_create_canvas(
    payload: schemas.CanvasCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    name = payload.name or datetime.utcnow().isoformat()
    return await crud.create_canvas(db, current_user.id, name)

@app.get("/canvases/{canvas_id}", response_model=schemas.Canvas)
async def api_get_canvas(
    canvas_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    canvas = await crud.get_canvas(db, canvas_id)
    if not canvas or canvas.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    return canvas

@app.get("/canvases", response_model=List[schemas.Canvas])
async def api_list_canvases(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return await crud.get_canvases_by_owner(db, current_user.id)

@app.patch("/canvases/{canvas_id}", response_model=schemas.Canvas)
async def api_update_canvas(
    canvas_id: int,
    payload: schemas.CanvasBase,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    canvas = await crud.get_canvas(db, canvas_id)
    if not canvas or canvas.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Canvas not found or unauthorized")
    return await crud.update_canvas(db, canvas_id, payload.name)

@app.delete("/canvases/{canvas_id}", status_code=204)
async def api_delete_canvas(
    canvas_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    canvas = await crud.get_canvas(db, canvas_id)
    if not canvas or canvas.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Canvas not found or unauthorized")
    await crud.delete_canvas(db, canvas_id)
    return

@app.post("/canvases/{canvas_id}/invite", response_model=schemas.Invitation)
async def invite_user(
    canvas_id: int,
    payload: InvitationCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # ensure owner
    canvas = await crud.get_canvas(db, canvas_id)
    if canvas.owner_id != current_user.id:
        raise HTTPException(403)
    return await create_invitation(db, canvas_id, payload.invitee_email)

@app.get(
    "/canvases/{canvas_id}/data",
    response_model=CanvasData,
)
async def api_get_canvas_data(
    canvas_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # ensure owner or invitee
    canvas = await crud.get_canvas(db, canvas_id)
    if not canvas or (
        canvas.owner_id != current_user.id
        and current_user.email not in [inv.invitee_email for inv in canvas.invitations]
    ):
        raise HTTPException(status_code=404, detail="Not found")
    content = await get_canvas_data(db, canvas_id)
    return {"content": content}


@app.post(
    "/canvases/{canvas_id}/data",
    response_model=CanvasData,
)
async def api_save_canvas_data(
    canvas_id: int,
    payload: CanvasData,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # only owner can overwrite
    canvas = await crud.get_canvas(db, canvas_id)
    if not canvas or canvas.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    updated = await save_canvas_data(db, canvas_id, payload.content)
    return {"content": updated.content}

@app.get("/invitations", response_model=List[schemas.Invitation])
async def list_invitations(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return await crud.get_invitations_for_user(db, current_user.email)

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, canvas_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[canvas_id].append(websocket)

    def disconnect(self, canvas_id: int, websocket: WebSocket):
        self.active_connections[canvas_id].remove(websocket)

    async def broadcast(self, canvas_id: int, message: str):
        for connection in self.active_connections[canvas_id]:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/canvas/{canvas_id}")
async def websocket_endpoint(websocket: WebSocket, canvas_id: int, token: str):
    user_email = decode_token(token)
    if not user_email:
        await websocket.close(code=1008)
        return

    await manager.connect(canvas_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(canvas_id, data)
    except WebSocketDisconnect:
        manager.disconnect(canvas_id, websocket)