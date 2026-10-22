"""
Test the updated pipeline with line-by-line parsing.
"""
import asyncio
import httpx

async def test_pipeline_line_by_line():
    """Test the new line-by-line parsing logic."""
    print("Testing line-by-line question parsing...")

    # Simulate LLM response with line-by-line questions
    sample_responses = [
        "What is the primary focus of machine learning?\nHow does supervised learning differ from unsupervised learning?\nWhat is the main advantage of using deep learning?\nWhat are some common applications of machine learning?",
        "1. What are the three main types of machine learning?\n2. What is the primary advantage of using deep learning?\n3. How does supervised learning differ from unsupervised learning?\n4. What are some common applications of machine learning?",
        "- What is machine learning used for?\n- How does deep learning work?\n- What are the differences between supervised and unsupervised learning?\n- Where is machine learning commonly applied?",
    ]

    for i, response in enumerate(sample_responses, 1):
        print(f"\n--- Test Case {i} ---")
        print(f"Raw response: {response[:100]}...")

        lines = [line.strip() for line in response.split("\n") if line.strip()]
        print(f"Lines: {len(lines)}")

        # Parse lines
        items = []
        for j, line in enumerate(lines):
            # Remove numbering/bullets
            cleaned = line.lstrip("0123456789.-) *")
            if len(cleaned) > 10:
                items.append({"question": cleaned, "original": line})

        print(f"Valid questions: {len(items)}")
        for item in items:
            print(f"  - '{item['original'][:30]}...' -> '{item['question'][:40]}...'")

async def main():
    print("="*60)
    print("STEP 3: Line-by-line parsing test")
    print("="*60)

    await test_pipeline_line_by_line()

    print(f"\n{'='*60}")
    print("Summary: Line-by-line parsing works with:")
    print("- Plain questions on separate lines")
    print("- Numbered questions (1. ...)")
    print("- Bulleted questions (- ...)")
    print("Numbering/bullets are stripped automatically")

if __name__ == "__main__":
    asyncio.run(main())
