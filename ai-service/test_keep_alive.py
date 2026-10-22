#!/usr/bin/env python3
"""
Temporary test script to run keep-alive for exactly 30 seconds
"""
import subprocess
import time
import signal
import sys

print("Starting model loader with keep-alive for 30 seconds...")
print("=" * 60)

# Start the process
proc = subprocess.Popen(
    [sys.executable, "scripts/ensure_model_loaded.py", "--keep-alive"],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1
)

# Run for 30 seconds
start = time.time()
while time.time() - start < 30:
    line = proc.stdout.readline()
    if line:
        print(line.rstrip())
    time.sleep(0.1)

# Stop the process
proc.terminate()
try:
    proc.wait(timeout=2)
except subprocess.TimeoutExpired:
    proc.kill()
    proc.wait()

print("=" * 60)
print("Test completed - stopped after 30 seconds")
