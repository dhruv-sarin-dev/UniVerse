import os
from dotenv import load_dotenv
load_dotenv()
from services.email_service import send_email_notification

print("Testing mail sending...")
success = send_email_notification("dhruvsarin7@gmail.com", "Test from UniVerse", "This is a test mail.")
print(f"Success: {success}")
