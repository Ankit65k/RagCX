import os
import path

# Test the extractSafeExtension logic from filename.util.ts
def extractSafeExtension(originalFilename):
    """Simulates TypeScript extractSafeExtension function"""
    # Strip directory traversal fragments before extraction.
    basename = os.path.basename(originalFilename)

    # Extract the final extension (e.g., "script.md.pdf" → "pdf")
    ext = os.path.splitext(basename)[1].lower().replace('.', '')

    # Check if extension contains unsafe characters
    import re
    UNSAFE_FILENAME_PATTERN = r'[^a-z0-9_\-\.]'
    if re.search(UNSAFE_FILENAME_PATTERN, ext, re.IGNORECASE):
        return ''

    # Check if extension is in SAFE_EXTENSIONS
    SAFE_EXTENSIONS = {'pdf'}
    return ext if ext in SAFE_EXTENSIONS else ''

# Test cases
test_files = [
    "AnkitResume.pdf.pdf",
    "ApplicationForm (1).pdf",
    "test.pdf",
    "malware.pdf.exe",
    "script.md.pdf",
    "document.PDF",
    "file with spaces.pdf",
    "file_with_underscores.pdf",
]

print("Testing extractSafeExtension:")
print("-" * 40)
for filename in test_files:
    result = extractSafeExtension(filename)
    print(f"{filename:30} → '{result}'")

print("\n" + "=" * 40)
print("Key observations:")
print("1. 'AnkitResume.pdf.pdf' → 'pdf' ✓")
print("2. 'ApplicationForm (1).pdf' → 'pdf' ✓")
print("3. Both should pass extension validation")