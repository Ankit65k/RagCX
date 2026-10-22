import requests
import json
import time

BASE_URL = "http://localhost:4000/api/v1"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMTA0MDc3Zi1kZjg0LTQwOTctOGIzYS04NGQ2ZTUxMDVhM2EiLCJyb2xlIjoiVVNFUiIsInNlc3Npb25JZCI6Ijg5ZDI3NDZiLThlMGItNGM2ZC1hYTZkLWU2MjYxZmM3MjNmYSIsInRva2VuVmVyc2lvbiI6MSwianRpIjoiODY5YWIyOWMtZTM3Yy00NzAzLWI3YjktYzEzMGRhMWRjMmU3IiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTc5MDg0OTE2OSwiZXhwIjoxNzkxNDUzOTY5fQ.BzwWR2vw3Wh5AL8rHCXG07jgvUKMc01YTmb5aV1J2Ps"

headers = {"Authorization": f"Bearer {TOKEN}"}

def test_suggested_questions(document_id, label):
    print(f"\n{'='*60}")
    print(f"TESTING: {label}")
    print(f"Document ID: {document_id}")
    print('='*60)
    
    start_time = time.time()
    try:
        response = requests.get(
            f"{BASE_URL}/suggested-questions",
            params={"documentId": document_id},
            headers=headers,
            timeout=180  # 180 second timeout for testing
        )
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            questions = response.json()
            print(f"✅ SUCCESS in {elapsed:.2f} seconds")
            print(f"Number of questions: {len(questions)}")
            
            for i, q in enumerate(questions[:3], 1):  # Show first 3
                print(f"  {i}. {q.get('question', 'N/A')[:80]}...")
            
            if questions:
                first_question = questions[0].get('question', '')
                return first_question, elapsed
            else:
                print("⚠️ No questions returned")
                return None, elapsed
                
        elif response.status_code == 504:
            print(f"❌ TIMEOUT after {elapsed:.2f} seconds")
            print("Backend timeout (150s) triggered")
            return None, elapsed
        else:
            print(f"❌ ERROR {response.status_code} after {elapsed:.2f}s")
            print(f"Response: {response.text[:200]}")
            return None, elapsed
            
    except requests.Timeout:
        elapsed = time.time() - start_time
        print(f"❌ REQUEST TIMEOUT after {elapsed:.2f} seconds")
        return None, elapsed
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ EXCEPTION after {elapsed:.2f}s: {e}")
        return None, elapsed

# Test Document A: ApplicationForm
doc_a = "40a0f874-26b8-4701-abd2-25561be51ab9"
question_a, time_a = test_suggested_questions(doc_a, "ApplicationForm PDF")

print("\n" + "-"*60)
print("Waiting 30 seconds before testing next document...")
print("-"*60)
time.sleep(30)

# Test Document B: AnkitResume.pdf
doc_b = "a2c4575e-686e-41a2-8e3e-9893118ef4d2"
question_b, time_b = test_suggested_questions(doc_b, "Resume PDF")

# Summary
print(f"\n{'='*60}")
print("TEST SUMMARY")
print('='*60)
print(f"Document A (ApplicationForm):")
print(f"  Time: {time_a:.2f}s")
print(f"  First question: {question_a[:80] if question_a else 'No question'}")
print()
print(f"Document B (Resume):")
print(f"  Time: {time_b:.2f}s")
print(f"  First question: {question_b[:80] if question_b else 'No question'}")
print()

# Check if questions are different
if question_a and question_b:
    if question_a != question_b:
        print("✅ SUCCESS: Different questions generated for different documents")
        print(f"  Document A: {question_a[:60]}...")
        print(f"  Document B: {question_b[:60]}...")
    else:
        print("⚠️ WARNING: Same questions for different documents")
        print(f"  Both documents: {question_a[:60]}...")
else:
    print("⚠️ WARNING: Could not compare questions (one or both failed)")

