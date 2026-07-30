import os
import firebase_admin
from firebase_admin import credentials, firestore

def init_firebase():
    """Initializes the Firebase Admin SDK."""
    try:
        if not firebase_admin._apps:
            # Check local path first (dev), then Render secret files (production)
            sa_path = "service-account.json"
            if not os.path.exists(sa_path):
                sa_path = "/etc/secrets/service-account.json"

            if os.path.exists(sa_path):
                cred = credentials.Certificate(sa_path)
                firebase_admin.initialize_app(cred)
                print(f"Firebase initialized successfully from {sa_path}")
            else:
                print("WARNING: service-account.json not found. Serving mock data until Firebase is configured by the user.")
    except Exception as e:
        print(f"Firebase init error: {e}")

def get_db():
    try:
        if firebase_admin._apps:
            return firestore.client()
    except Exception:
        pass
    return None
