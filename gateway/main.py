from fastapi import FastAPI, HTTPException, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import asyncio
import redis.asyncio as redis

SECRET_KEY = "dev-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

fake_users_db = {
    "admin": {"username": "admin", "password": "secret"}
}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str

def verify_password(p, s): return p.strip() == s.strip()
def get_user(db, u): return db.get(u.strip())
def authenticate_user(db, u, p):
    user = get_user(db, u)
    return user if user and verify_password(p, user["password"]) else False

def create_access_token(data, expires_delta=None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

app = FastAPI(title="SLH Gateway")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_redis = None
async def get_redis():
    global _redis
    if _redis is None:
        _redis = redis.Redis(host='redis', port=6379, db=0)
    return _redis

@app.get("/status")
async def status():
    return {"services":"9/9 ONLINE","bots":"6 ACTIVE","treasury":"$124,500","redis":"OK","postgres":"OK","agents":"4 RUNNING"}

@app.post("/login", response_model=Token)
async def login(username: str, password: str):
    user = authenticate_user(fake_users_db, username, password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me", response_model=User)
async def read_users_me(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username: raise HTTPException(status_code=401)
    except JWTError:
        raise HTTPException(status_code=401)
    return {"username": username}

@app.post("/event")
async def publish_event(event_type: str, payload: str = ""):
    r = await get_redis()
    await r.xadd("slh:events", {"event_type": event_type, "payload": payload, "timestamp": datetime.utcnow().isoformat()})
    return {"status": "published"}

@app.websocket("/ws/events")
async def event_stream(websocket: WebSocket):
    await websocket.accept()
    r = await get_redis()
    last_id = "0"
    while True:
        try:
            events = await r.xread({"slh:events": last_id}, block=5000)
            for stream, messages in events:
                for msg_id, msg in messages:
                    await websocket.send_json({k.decode(): v.decode() for k, v in msg.items()})
                    last_id = msg_id
        except Exception:
            break

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.send_json({"services":"9/9 ONLINE","bots":"6 ACTIVE","treasury":"$124,500","redis":"OK","postgres":"OK","agents":"4 RUNNING"})
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        pass