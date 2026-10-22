import asyncio
import httpx
import time

async def test_model(model_name, prompt):
    print(f"\nTesting {model_name}...")
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_ctx": 4096,
                        "num_predict": 300
                    }
                }
            )
            elapsed = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                answer = data.get("response", "")
                print(f"  Success ({elapsed:.1f}s)")
                print(f"  Answer: {answer[:300]}")
                return {"model": model_name, "success": True, "time": elapsed}
            else:
                print(f"  HTTP {response.status_code}")
                return {"model": model_name, "success": False, "time": elapsed}
    except Exception as e:
        elapsed = time.time() - start
        print(f"  Error ({elapsed:.1f}s): {str(e)[:100]}")
        return {"model": model_name, "success": False, "time": elapsed}

async def main():
    context = """Provisional Appointment for Driving Skill Test
Application Number: 3905169026
Name: ANKIT VINOD TIWARI
Test Date: 08-09-2026
Time: 13.45-14.30
Location: RTO NAGPUR CITY MH31"""

    prompt = f"""Answer using ONLY the context. If not mentioned, say: This is not mentioned in the document.

Context:
{context}

Question: What is the application number?

Answer:"""

    models_to_test = []
    
    # Check which models are available
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get("http://localhost:11434/api/tags")
            if response.status_code == 200:
                available = [m["name"] for m in response.json().get("models", [])]
                print(f"Available models: {available}")
                
                # Test models that are available
                if "llama3.2:3b" in [m.split(":")[0] for m in available]:
                    models_to_test.append("llama3.2:3b")
                if "qwen2.5:3b" in [m.split(":")[0] for m in available]:
                    models_to_test.append("qwen2.5:3b")
                if "llama3.1:8b" in [m.split(":")[0] for m in available]:
                    models_to_test.append("llama3.1:8b")
    except Exception as e:
        print(f"Could not check available models: {e}")
        models_to_test = ["llama3.1:8b"]  # Default
    
    print(f"\nTesting models: {models_to_test}")
    results = {}
    
    for model in models_to_test:
        result = await test_model(model, prompt)
        results[model] = result
        await asyncio.sleep(1)

    print("\n" + "="*60)
    print("RESULTS SUMMARY")
    print("="*60)
    for model, result in results.items():
        if result["success"]:
            print(f"{model}: {result['time']:.1f}s")
        else:
            print(f"{model}: FAILED")

if __name__ == "__main__":
    asyncio.run(main())
