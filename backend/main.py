from dotenv import load_dotenv
load_dotenv()

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from firebase import init_firebase
from routers import projects, community, communities, users, chat, vetting, presence, compatibility_exam
app = FastAPI(title="Uni-Verse API", description="Backend for Uni-Verse team formation system")

# Initialize Firebase on startup (gracefully falls back to Local JSON persist)
init_firebase()

# Configure CORS — no credentials (we use JSON not cookies) so wildcard is valid.
# ALLOWED_ORIGINS (comma-separated) locks this down in production without a
# code change; it still defaults to "*" so local dev and previews keep working.
allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(community.router)
app.include_router(communities.router)
app.include_router(users.router)
app.include_router(chat.router)
app.include_router(vetting.router)
app.include_router(presence.router)
app.include_router(compatibility_exam.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Uni-Verse API!"}
