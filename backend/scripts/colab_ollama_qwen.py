"""
GymSync - Google Colab GPU Ollama Runner (Qwen 2.5)
===================================================
Run this in Google Colab (Runtime -> Change runtime type -> T4 GPU).

It will:
1. Install Ollama and Cloudflared Tunnel
2. Kill old Ollama process and launch with OLLAMA_ORIGINS="*" & OLLAMA_HOST="0.0.0.0:11434"
3. Pull qwen2.5:7b onto GPU VRAM (16GB)
4. Expose public HTTPS tunnel with host-header rewrite (prevents HTTP 403)
5. Print the exact .env variables for GymSync backend/.env
"""

# Cell 1: Install Ollama & Cloudflared
# !curl -fsSL https://ollama.com/install.sh | sh
# !wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
# !dpkg -i cloudflared-linux-amd64.deb

# Cell 2: Start Ollama & Pull Model & Launch Tunnel
import os
import subprocess
import time
import re

print("1. Terminating any old Ollama processes...")
subprocess.run(["pkill", "-f", "ollama"], check=False)
time.sleep(2)

print("2. Starting Ollama daemon with open CORS & 0.0.0.0 binding...")
env = os.environ.copy()
env["OLLAMA_HOST"] = "0.0.0.0:11434"
env["OLLAMA_ORIGINS"] = "*"

ollama_proc = subprocess.Popen(["ollama", "serve"], env=env)
time.sleep(4)

print("3. Ensuring Qwen 2.5 (7B) is loaded in GPU VRAM...")
subprocess.run(["ollama", "pull", "qwen2.5:7b"], check=True)

print("4. Starting Cloudflare Tunnel with host header rewrite...")
tunnel_proc = subprocess.Popen(
    ["cloudflared", "tunnel", "--url", "http://127.0.0.1:11434", "--http-host-header", "127.0.0.1:11434"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

public_url = None
for _ in range(40):
    line = tunnel_proc.stderr.readline()
    print(line, end="")
    match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
    if match:
        public_url = match.group(0)
        break
    time.sleep(0.5)

if public_url:
    print("\n" + "="*70)
    print("🎉 SUCCESS! YOUR OLLAMA GPU INSTANCE IS LIVE AND OPEN!")
    print(f"🔗 Public URL: {public_url}")
    print("="*70)
    print("\n📋 Paste this into your GymSync backend/.env file:")
    print("--------------------------------------------------")
    print("ENABLE_OLLAMA=true")
    print(f"OLLAMA_HOST={public_url}")
    print("OLLAMA_MODEL=qwen2.5:7b")
    print("OLLAMA_NUM_CTX=2048")
    print("--------------------------------------------------")
    print("\n💡 Test connection on your local machine by visiting:")
    print("http://localhost:5000/api/ai/ollama-status")
    print("="*70)
else:
    print("⚠️ Could not automatically detect tunnel URL. Check logs above.")

# Keep cell active
try:
    while True:
        time.sleep(60)
except KeyboardInterrupt:
    print("Tunnel stopped.")
