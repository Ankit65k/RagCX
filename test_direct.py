import requests
import json
import time

# Test Redis event publishing directly to AI service
# First, let's check what the AI service sees

BASE_URL = "http://localhost:8000"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMTA0MDc3Zi1kZjg0LTQwOTctOGIzYS04NGQ2ZTUxMDVhM2EiLCJyb2xlIjoiVVNFUiIsInNlc3Npb25JZCI6Ijg5ZDI3NDZiLThlMGItNGM2ZC1hYTZkLWU2MjYxZmM3MjNmYSIsInRva2VuVmVyc2lvbiI6MSwianRpIjoiODY5YWIyOWMtZTM3Yy00NzAzLWI3YjktYzEzMGRhMWRjMmU3IiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTc5MDg0OTE2OSwiZXhwIjoxNzkxNDUzOTY5fQ.BzwWR2vw3Wh5AL8rHCXG07jgvUKMc01YTmb5aV1J2Ps"

headers = {"Authorization": f"Bearer {TOKEN}"}

# Test 1: Check AI service health
print("=== AI Service Health ===")
try:
    resp = requests.get(f"{BASE_URL}/api/v1/health", timeout=10)
    print(f"Status: {resp.status_code}")
    print(f"Response: {json.dumps(resp.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")

# Test 2: Check what questions endpoint returns
print("\n=== Testing suggested-questions endpoint ===")
doc_id = "40a0f874-26b8-4701-abd2-25561be51ab9"
start = time.time()
try:
    resp = requests.get(
        f"{BASE_URL}/api/v1/suggested-questions",
        params={"documentId": doc_id},
        headers=headers,
        timeout=120
    )
    elapsed = time.time() - start
    print(f"Status: {resp.status_code}")
    print(f"Time: {elapsed:.2f}s")
    print(f"Response: {json.dumps(resp.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")

