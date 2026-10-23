# GymSync - Complete Setup Guide & Google Colab GPU Ollama Runner

This comprehensive guide covers everything from cloning the repository to setting up the database, running the application locally, and hosting **Ollama (Qwen 2.5 7B)** on **Google Colab (Free T4 GPU)** with a public HTTPS tunnel connected to your local GymSync backend.

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Cloning the Repository](#2-cloning-the-repository)
3. [Backend Setup (.env & Dependencies)](#3-backend-setup)
4. [Frontend Setup (Dependencies & Run)](#4-frontend-setup)
5. [Running Ollama AI on Google Colab (Free T4 GPU)](#5-running-ollama-ai-on-google-colab-free-t4-gpu)
   - [Step 5.1: Open Google Colab](#step-51-open-google-colab)
   - [Step 5.2: Enable Free T4 GPU](#step-52-enable-free-t4-gpu)
   - [Step 5.3: Run the Colab Setup Script](#step-53-run-the-colab-setup-script)
   - [Step 5.4: Copy the Cloudflare Public URL into Backend .env](#step-54-copy-the-cloudflare-public-url-into-backend-env)
   - [Step 5.5: Test the AI Connection](#step-55-test-the-ai-connection)
6. [Testing the AI Workout Coach & Nutritionist](#6-testing-the-ai-workout-coach--nutritionist)
7. [Troubleshooting & FAQs](#7-troubleshooting--faqs)

---

## 1. Prerequisites
Before starting, ensure you have the following installed on your machine:
- **Node.js**: v18.x or v20.x ([Download Node.js](https://nodejs.org/))
- **Git**: ([Download Git](https://git-scm.com/))
- **MongoDB**: Local MongoDB instance or free cloud database on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Google Account**: For running Google Colab with free GPU access

---

## 2. Cloning the Repository
Open your terminal or command prompt and clone the repository:

```bash
git clone https://github.com/butoameerali/GymSync.git
cd GymSync
```

---

## 3. Backend Setup

### Step 3.1: Install Backend Dependencies
Navigate to the `backend` folder and install all required packages:

```bash
cd backend
npm install
```

### Step 3.2: Configure Environment Variables (`backend/.env`)
Create a `.env` file in the `backend/` directory:

```bash
touch .env
```

Add the following configuration into `backend/.env`:

```env
PORT=5000
NODE_ENV=development

# Database Connection (Local MongoDB or MongoDB Atlas)
MONGO_URI=mongodb://127.0.0.1:27017/gymsync
# If using MongoDB Atlas:
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/gymsync?retryWrites=true&w=majority

# JWT Authentication Secret
JWT_SECRET=gymsync_super_secret_jwt_key_2026_xyz

# Frontend Origin URL
FRONTEND_URL=http://localhost:5173

# Ollama Configuration (Leave default until Colab is running)
ENABLE_OLLAMA=false
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_NUM_CTX=2048
```

### Step 3.3: Start the Backend Server
Run the backend in development mode:

```bash
npm run dev
```

You should see:
```
Server running on port 5000
MongoDB Connected Successfully!
```

---

## 4. Frontend Setup

### Step 4.1: Install Frontend Dependencies
Open a new terminal window, navigate to the `frontend/` folder, and install dependencies:

```bash
cd GymSync/frontend
npm install
```

### Step 4.2: Start the Frontend Vite Development Server
Run:

```bash
npm run dev
```

Open your browser at `http://localhost:5173`. You can now sign up or log in.

---

## 5. Running Ollama AI on Google Colab (Free T4 GPU)

Instead of overloading your local CPU/GPU, you can run Ollama with the **Qwen 2.5 7B** model on Google Colab's high-speed **T4 GPU (16 GB VRAM)** completely free.

### Step 5.1: Open Google Colab
1. Go to [Google Colab](https://colab.research.google.com).
2. Click **File** -> **Upload Notebook** and choose `backend/scripts/colab_ollama_qwen.ipynb` from the repository, **OR** click **New Notebook**.

### Step 5.2: Enable Free T4 GPU
1. In the Colab menu, click **Runtime** -> **Change runtime type**.
2. Under **Hardware accelerator**, select **T4 GPU**.
3. Click **Save**.

### Step 5.3: Run the Colab Setup Script
Paste and run the following code in a Colab code cell:

```python
# ===================================================
# 1. Install Ollama and Cloudflared Tunnel
# ===================================================
!curl -fsSL https://ollama.com/install.sh | sh
!wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
!dpkg -i cloudflared-linux-amd64.deb

# ===================================================
# 2. Launch Ollama & Expose Cloudflare HTTPS Tunnel
# ===================================================
import os
import subprocess
import time
import re

print("1. Terminating any old Ollama processes...")
subprocess.run(["pkill", "-f", "ollama"], check=False)
time.sleep(2)

print("2. Starting Ollama daemon on 0.0.0.0 with open CORS...")
env = os.environ.copy()
env["OLLAMA_HOST"] = "0.0.0.0:11434"
env["OLLAMA_ORIGINS"] = "*"
ollama_proc = subprocess.Popen(["ollama", "serve"], env=env)
time.sleep(4)

print("3. Pulling Qwen 2.5 (7B) into GPU VRAM (takes ~2 minutes)...")
subprocess.run(["ollama", "pull", "qwen2.5:7b"], check=True)

print("4. Launching Cloudflare HTTPS Tunnel...")
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
    print("🎉 SUCCESS! YOUR OLLAMA GPU INSTANCE IS LIVE!")
    print(f"🔗 Public URL: {public_url}")
    print("="*70)
    print("\n📋 Copy these lines and update your backend/.env file:")
    print("--------------------------------------------------")
    print("ENABLE_OLLAMA=true")
    print(f"OLLAMA_HOST={public_url}")
    print("OLLAMA_MODEL=qwen2.5:7b")
    print("OLLAMA_NUM_CTX=2048")
    print("--------------------------------------------------")
else:
    print("⚠️ Could not automatically detect tunnel URL. Check logs above.")

# Keep the cell alive so the server doesn't shut down
try:
    while True:
        time.sleep(60)
except KeyboardInterrupt:
    print("Tunnel stopped.")
```

### Step 5.4: Copy the Cloudflare Public URL into Backend `.env`
Once the cell finishes running, it will print a public URL like:
`https://random-words-here.trycloudflare.com`

Update your `backend/.env` file:

```env
ENABLE_OLLAMA=true
OLLAMA_HOST=https://random-words-here.trycloudflare.com
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_NUM_CTX=2048
```

Save `backend/.env` and restart the backend:
```bash
# In the terminal running backend:
# Press Ctrl + C and run:
npm run dev
```

### Step 5.5: Test the AI Connection
Open your browser and visit:
`http://localhost:5000/api/ai/ollama-status`

You should get a JSON response:
```json
{
  "enabled": true,
  "status": "online",
  "model": "qwen2.5:7b",
  "latencyMs": 142,
  "message": "Connected to Ollama on Google Colab (Qwen 2.5 7B loaded)"
}
```

---

## 6. Testing the AI Workout Coach & Nutritionist
1. Go to `http://localhost:5173/messages`.
2. Tap on **AI Workout Coach** or **AI Nutritionist**.
3. Send a message, e.g.:
   - *"I want to lose 5kg in 12 weeks, create a routine for me"*
   - *"What should my daily calorie and protein intake be for 70kg weight?"*
4. The response will be generated in real-time by **Qwen 2.5 7B** running on Google Colab's T4 GPU!

---

## 7. Troubleshooting & FAQs

### Q1: Colab notebook disconnected or timed out?
- Free Google Colab notebooks stay active as long as the browser tab remains open. If it disconnects, simply click **Runtime** -> **Restart session and run all**, copy the new Cloudflare URL into `backend/.env`, and restart the backend.

### Q2: HTTP 403 Forbidden Error from Ollama?
- This occurs if `--http-host-header 127.0.0.1:11434` is omitted in Cloudflared. The provided script already includes this flag to bypass Ollama's local-origin restriction.

### Q3: Model responds slowly or fallback triggered?
- If the Colab notebook is paused or Ollama takes longer than 15 seconds, GymSync automatically falls back to its deterministic fitness algorithm without crashing, ensuring zero downtime for users.
