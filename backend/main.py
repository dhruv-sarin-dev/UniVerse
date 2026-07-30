from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from firebase import init_firebase
from routers import projects, community, communities, users, chat, vetting, presence, compatibility_exam
app = FastAPI(title="Uni-Verse API", description="Backend for Uni-Verse team formation system")

# Initialize Firebase on startup (gracefully falls back to Local JSON persist)
init_firebase()

# Configure CORS — no credentials (we use JSON not cookies) so wildcard is valid
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
