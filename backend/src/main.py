from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router
from src.api.scout_routes import router as scout_router

app = FastAPI(title="C9 Oracle: VALORANT Scouting and Coaching API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(scout_router)


@app.get("/health")
def health():
    return {"status": "ok"}
