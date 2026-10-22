import requests
import json
import time

BASE_URL = "http://localhost:4000/api/v1"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMTA0MDc3Zi1kZjg0LTQwOTctOGIzYS04NGQ2ZTUxMDVhM2EiLCJyb2xlIjoiVVNFUiIsInNlc3Npb25JZCI6Ijg5ZDI3NDZiLThlMGItNGM2ZC1hYTZkLWU2MjYxZmM3MjNmYSIsInRva2VuVmVyc2lvbiI6MSwianRpIjoiODY5YWIyOWMtZTM3Yy00NzAzLWI3YjktYzEzMGRhMWRjMmU3IiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTc5MDg0OTE2OSwiZXhwIjoxNzkxNDUzOTY5fQ.BzwWR2vw3Wh5AL8rHCXG07jgvUKMc01YTmb5aV1J2Ps"
headers = {"Authorization": f"Bearer {TOKEN}"}

def test_doc(doc_id, label):
    print(f"\n{label}")
    print("-" * 60)
    start = time.time()
    resp = requests.get(
        f"{BASE_URL}/suggested-questions",
        params={"documentId": doc_id},
        headers=headers,
        timeout=180
    )
    elapsed = time.time() - start
    
    questions = resp.json()
    print(f"Time: {elapsed:.2f}s, Questions: {len(questions)}")
    
    if questions:
        for q in questions[:2]:
            print(f"  - {q['question'][:70]}")
    return questions

# Test 1: ApplicationForm (6 chunks)
q1 = test_doc("40a0f874-26b8-4701-abd2-25561be51ab9", "TEST 1: ApplicationForm PDF")

time.sleep(5)

# Test 2: Resume (9 chunks)
q2 = test_doc("a2c4575e-686e-41a2-8e3e-9893118ef4d2", "TEST 2: Resume PDF")

time.sleep(5)

# Test 3: GATE PDF (2 chunks)
q3 = test_doc("29513a52-e1ab-421f-8b09-e9add15e9e00", "TEST 3: GATE PDF")

# Summary
print(f"\n{'='*60}")
print("FINAL SUMMARY")
print('='*60)
print(f"ApplicationForm: {len(q1)} questions")
print(f"Resume:         {len(q2)} questions")
print(f"GATE:           {len(q3)} questions")

if q1 and q2:
    if q1[0]['question'] != q2[0]['question']:
        print("\nSUCCESS: Different documents generate different questions")
    else:
        print("\nWARNING: Same questions for different documents")
elif q1 or q2:
    print("\nPARTIAL: Some documents returned questions")
else:
    print("\nFAILED: No questions returned")

