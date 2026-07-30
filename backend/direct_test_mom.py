from fastapi.testclient import TestClient
from main import app
import traceback

client = TestClient(app)

try:
    response = client.post("/api/projects/IKmrEm9xTF0tE9FTY2AR/generate_mom", json={"transcripts": ["Alice: Hi", "Bob: Hello"]})
    print("Status:", response.status_code)
    print("Body:", response.json())
except Exception as e:
    with open("tb.txt", "w") as f:
        f.write(traceback.format_exc())
