# GymSync - Smart Fitness & Athlete Trading Card Platform

GymSync is a full-stack gym management, fitness tracking, and social platform featuring authentic 3D Athlete Trading Cards, periodized workout planning, meal tracking, and an AI Workout Coach & Nutritionist powered by Qwen 2.5 on Ollama.

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/butoameerali/GymSync.git
cd GymSync
```

### 2. Setup Backend
```bash
cd backend
npm install
# Configure backend/.env (refer to OLLAMA_COLAB_SETUP_GUIDE.md)
npm run dev
```

### 3. Setup Frontend
```bash
cd ../frontend
npm install
npm run dev
```

---

## 🤖 Running Ollama AI (Google Colab GPU)
GymSync supports running **Ollama (Qwen 2.5 7B)** on **Google Colab's Free T4 GPU (16 GB VRAM)**.

👉 **Full Step-by-Step Instructions:** [OLLAMA_COLAB_SETUP_GUIDE.md](./OLLAMA_COLAB_SETUP_GUIDE.md)

1. Open Google Colab and set Runtime to **T4 GPU**.
2. Run `backend/scripts/colab_ollama_qwen.py` or `.ipynb`.
3. Copy the generated Cloudflare URL into `backend/.env`:
   ```env
   ENABLE_OLLAMA=true
   OLLAMA_HOST=https://your-tunnel.trycloudflare.com
   OLLAMA_MODEL=qwen2.5:7b
   ```
4. Check status at `http://localhost:5000/api/ai/ollama-status`.
