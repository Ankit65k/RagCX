#!/usr/bin/env python3
"""
Run ensure_model_loaded.py --keep-alive for exactly 30 seconds and show output.
"""
import subprocess
import sys
import time

print("=" * 60)
print("TEST: Running model loader with --keep-alive for 30 seconds")
print("=" * 60)

# Start the keep-alive process
proc = subprocess.Popen(
    [sys.executable, "scripts/ensure_model_loaded.py", "--keep-alive"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    cwd="C:\\Users\\Ankit Tiwari\\RagCX\\ai-service"
)

# Capture output for 30 seconds
start_time = time.time()
output_lines = []

while time.time() - start_time < 30:
    line = proc.stdout.readline()
    if line:
        output_lines.append(line.rstrip())
        print(line.rstrip())
    time.sleep(0.1)

# Stop
proc.terminate()
try:
    proc.wait(timeout=3)
except subprocess.TimeoutExpired:
    proc.kill()

print("\n" + "=" * 60)
print(f"TEST COMPLETED: Ran for {time.time() - start_time:.1f} seconds")
print(f"Output lines captured: {len(output_lines)}")
print("=" * 60)