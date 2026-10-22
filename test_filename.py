import os

# Simulate the _resolve_storage_path logic
def test_basename_extraction():
    # Test case 1: UUID filename (what's stored on disk)
    storage_path_1 = r"C:\backend\uploads\a34fd1d2-4e7c-4b2a-9f8e-1c0d6b3e7f9a-1722700800000.pdf"
    filename_1 = os.path.basename(storage_path_1)
    print(f"UUID stored file:")
    print(f"  Full path: {storage_path_1}")
    print(f"  Basename: {filename_1}")
    print()

    # Test case 2: Original filename with spaces and parentheses
    storage_path_2 = "ApplicationForm (1).pdf"
    filename_2 = os.path.basename(storage_path_2)
    print(f"Original filename with spaces/parens:")
    print(f"  Full path: {storage_path_2}")
    print(f"  Basename: {filename_2}")
    print()

    # Test case 3: Original filename with double extension
    storage_path_3 = "AnkitResume.pdf.pdf"
    filename_3 = os.path.basename(storage_path_3)
    print(f"Original filename with double extension:")
    print(f"  Full path: {storage_path_3}")
    print(f"  Basename: {filename_3}")

    # Test case 4: Search for filename with spaces in directory
    print()
    print("Testing search with spaces in basename...")
    from pathlib import Path
    search_dir = Path.cwd()
    print(f"Search dir: {search_dir}")

    # Try to search for a file with spaces and parentheses
    search_filename = "ApplicationForm (1).pdf"
    print(f"Searching for: {search_filename}")

    # This simulates the AI service search logic
    for root, dirs, files in os.walk(search_dir):
        if search_filename in files:
            resolved = os.path.join(root, search_filename)
            print(f"FOUND: {resolved}")
            break
    else:
        print(f"NOT FOUND: {search_filename}")

test_basename_extraction()