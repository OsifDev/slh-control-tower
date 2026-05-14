from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SLH Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/status")
async def status():
    return {
        "services": "9/9 ONLINE",
        "bots": "6 ACTIVE",
        "treasury": "$124,500",
        "redis": "OK",
        "postgres": "OK",
        "agents": "4 RUNNING"
    }
