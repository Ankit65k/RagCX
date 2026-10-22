import requests
import json
import time

BASE_URL = "http://localhost:4000/api/v1"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMTA0MDc3Zi1kZjg0LTQwOTctOGIzYS04NGQ2ZTUxMDVhM2EiLCJyb2xlIjoiVVNFUiIsInNlc3Npb25JZCI6Ijg5ZDI3NDZiLThlMGItNGM2ZC1hYTZkLWU2MjYxZmM3MjNmYSIsInRva2VuVmVyc2lvbiI6MSwianRpIjoiODY5YWIyOWMtZTM3Yy00NzAzLWI3YjktYzEzMGRhMWRjMmU3IiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTc5MDg0OTE2OSwiZXhwIjoxNzkxNDUzOTY5fQ.BzwWR2vw3Wh5AL8rHCXG07jgvUKMc01YTmb5aV1J2Ps"

headers = {"Authorization": f"Bearer {TOKEN}"}

print("Testing suggested questions with detailed response...")
print("Document: 40a0f874-26b8-4701-abd2-25561be51ab9")
print()

doc_id = "40a0f874-26b8-4701-abd2-25561be51ab9"
start = time.time()

response = requests.get(
    f"{BASE_URL}/suggested-questions",
    params={"documentId": doc_id},
    headers=headers,
    timeout=180
)

elapsed = time.time() - start

print(f"Status Code: {response.status_code}")
print(f"Response Time: {elapsed:.2f} seconds")
print()
print("Response Headers:")
for k, v in response.headers.items():
    if 'content' in k.lower() or 'request' in k.lower():
        print(f"  {k}: {v}")
print()
print("Response Body:")
print(json.dumps(response.json(), indent=2))

