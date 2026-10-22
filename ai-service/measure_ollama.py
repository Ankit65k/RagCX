import time
import httpx
import json

def measure_generation(label, is_cold_start=False):
    print(f"\n{'='*60}")
    print(f"{label}")
    print('='*60)
    
    # Check model status before
    ps_response = httpx.get("http://localhost:11434/api/ps")
    models_before = ps_response.json().get("models", [])
    print(f"Models loaded before: {len(models_before)}")
    if models_before:
        print(f"  - {models_before[0]['name']}")
    
    # Simple prompt for testing
    prompt = """Based on the following document content, generate 5 relevant questions:

Document content:
This is an application form for admission. The candidate must fill all required fields including name, address, contact details, and educational qualifications. Submit the form with required documents by the deadline.

Generate exactly 5 questions as JSON array."""
    
    payload = {
        "model": "llama3.1:8b",
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 300
        }
    }
    
    print(f"\nStarting generation at {time.strftime('%H:%M:%S')}")
    start_time = time.time()
    
    try:
        response = httpx.post(
            "http://localhost:11434/api/chat",
            json=payload,
            timeout=180.0
        )
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            content = result.get("message", {}).get("content", "")
            print(f"\n✅ Generation completed in {elapsed:.2f} seconds")
            print(f"Response length: {len(content)} characters")
            print(f"Response preview: {content[:200]}...")
            
            # Check model status after
            ps_response_after = httpx.get("http://localhost:11434/api/ps")
            models_after = ps_response_after.json().get("models", [])
            print(f"\nModels loaded after: {len(models_after)}")
            if models_after:
                print(f"  - {models_after[0]['name']}")
                print(f"  - size_vram: {models_after[0].get('size_vram', 0) / 1024 / 1024:.1f} MB")
            
            return elapsed
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ Exception after {elapsed:.2f}s: {e}")
        return None

# Test 1: WARM START (model should already be loaded or load quickly)
warm_time = measure_generation("TEST 1: WARM START MEASUREMENT")

if warm_time:
    print(f"\n\n{'='*60}")
    print("Waiting for model to unload (checking every 30s)...")
    print('='*60)
    
    # Wait for model to unload
    unloaded = False
    wait_count = 0
    while not unloaded and wait_count < 20:  # Max 10 minutes
        time.sleep(30)
        wait_count += 1
        ps_response = httpx.get("http://localhost:11434/api/ps")
        models = ps_response.json().get("models", [])
        
        if len(models) == 0:
            print(f"\n✅ Model unloaded after {wait_count * 30} seconds")
            unloaded = True
        else:
            expires_at = models[0].get("expires_at", "")
            print(f"  [{wait_count * 30}s] Still loaded, expires at: {expires_at}")
    
    if unloaded:
        # Test 2: COLD START
        cold_time = measure_generation("TEST 2: COLD START MEASUREMENT (after unload)", is_cold_start=True)
        
        print(f"\n\n{'='*60}")
        print("MEASUREMENT SUMMARY")
        print('='*60)
        print(f"WARM START: {warm_time:.2f} seconds")
        print(f"COLD START: {cold_time:.2f} seconds" if cold_time else "COLD START: FAILED")
        print(f"DIFFERENCE: {cold_time - warm_time:.2f} seconds" if cold_time else "N/A")
    else:
        print("\n⚠️  Model did not unload within 10 minutes. Skipping cold start test.")

