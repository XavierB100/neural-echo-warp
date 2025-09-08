#!/usr/bin/env python
"""
Test script to launch Neural Echo app and test visualizations
"""
import subprocess
import time
import webbrowser
import os
import signal
import sys

def main():
    print("🚀 Starting Neural Echo application...")
    print("=" * 50)
    
    # Start Flask app in background
    process = subprocess.Popen(
        [sys.executable, "app.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    try:
        # Wait for server to start
        print("⏳ Waiting for server to start...")
        time.sleep(3)
        
        # Read output to check if server started
        for _ in range(10):
            line = process.stdout.readline()
            if line:
                print(line.strip())
                if "Running on" in line or "Model loaded successfully" in line:
                    break
            time.sleep(0.5)
        
        # Open browser
        print("\n📊 Opening browser to http://localhost:5000")
        webbrowser.open("http://localhost:5000")
        
        print("\n✅ Server is running!")
        print("=" * 50)
        print("\n📝 Test Instructions:")
        print("1. Enter some text in the input field")
        print("2. Click 'Process Text' to analyze")
        print("3. Switch between 'Network' and 'Attention' visualization modes")
        print("4. Use zoom/pan controls to explore the visualizations")
        print("\nPress Ctrl+C to stop the server...")
        
        # Keep reading output
        while True:
            line = process.stdout.readline()
            if line:
                print(line.strip())
            time.sleep(0.1)
                
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping server...")
        process.terminate()
        time.sleep(1)
        if process.poll() is None:
            process.kill()
        print("✅ Server stopped.")
    except Exception as e:
        print(f"❌ Error: {e}")
        process.terminate()

if __name__ == "__main__":
    main()
