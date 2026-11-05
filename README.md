# 🎓 College Admission Agent — IBM Granite RAG

> **AICTE / IBM SkillsBuild Internship 2025**  
> A production-grade, enterprise-ready RAG-powered college admission counsellor built on IBM Granite + ChromaDB + Next.js.

---

## ✨ Features

| Module | Description |
|--------|-------------|
| **AI Chat** | Streaming RAG answers from official college documents using IBM Granite |
| **Voice I/O** | Web Speech API — speak your question, hear the answer read aloud |
| **Source Citations** | Every AI answer shows the exact PDF page + confidence score |
| **Auth & RBAC** | JWT-based login with Student and Admin roles |
| **Admin Dashboard** | Drag-and-drop PDF upload, re-index, usage stats, Granite health indicator |
| **Neural UI** | Framer Motion animations, Aurora canvas bg (auth), Neural mesh bg (chat) |
| **Guardrails** | If no verified document found → politely redirects to admissions office |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Next.js Frontend (Port 3000)             │
│   Login / Signup  ·  Chat UI  ·  Admin Dashboard             │
└──────────────────────┬───────────────────────────────────────┘
                       │  /api proxy rewrite  (Next.js)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (Port 8000)                 │
│   /api/auth  ·  /api/chat  ·  /api/admin  ·  /api/health    │
│                                                              │
│   RAG Pipeline:                                              │
│   PDF Upload → PyMuPDF → Chunker (500t/50 overlap)          │
│   → all-MiniLM-L6-v2 Embeddings → ChromaDB (cosine)        │
│   → Vector Retrieval (top-5) → Prompt Builder               │
│   → IBM Granite LLM → SSE Streaming → Chat UI               │
└──────────────────────────────────────────────────────────────┘
```

See [`rag_diagram.html`](./rag_diagram.html) for the interactive LangFlow-style node diagram.

---

## 🗂️ Project Structure

```
college-admission-agent/
├── rag_diagram.html            ← Interactive RAG node-canvas diagram
├── docker-compose.yml          ← Local Docker Compose (both services)
├── deploy.sh                   ← IBM Cloud Code Engine deploy script
├── ibmcloud-deploy.yml         ← Code Engine manifest reference
│
├── backend/
│   ├── .env.example            ← Copy to .env and fill in IBM credentials
│   ├── requirements.txt
│   ├── seed_admin.py           ← Seeds admin@college.edu / Admin1234
│   ├── ingest_knowledge_base.py ← Indexes data/knowledge_base/*.md
│   ├── data/
│   │   ├── knowledge_base/     ← Pre-loaded college docs (markdown)
│   │   ├── chroma_db/          ← Persistent ChromaDB vector store
│   │   ├── uploaded_pdfs/      ← Admin-uploaded PDFs
│   │   └── admission_agent.db  ← SQLite (auto-created)
│   └── app/
│       ├── main.py             ← FastAPI + CORS + lifespan
│       ├── core/config.py      ← Pydantic settings (env vars)
│       ├── core/security.py    ← JWT + bcrypt
│       ├── models/database.py  ← SQLAlchemy async models
│       ├── rag/ingestion.py    ← PDF → chunk → embed → ChromaDB
│       ├── rag/granite_client.py ← IBM watsonx.ai SDK + mock fallback
│       ├── api/auth.py         ← Register, login, /me
│       ├── api/chat.py         ← Sessions, /query, /query/stream (SSE)
│       └── api/admin.py        ← Upload, delete, reindex, stats
│
└── frontend/
    ├── .env.local              ← NEXT_PUBLIC_API_URL= (leave empty for dev)
    ├── next.config.js          ← API rewrite proxy, standalone output
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/login/   ← Aurora animation + glassmorphism card
    │   │   ├── (auth)/signup/  ← Password strength meter
    │   │   └── (dashboard)/
    │   │       ├── chat/       ← Neural mesh bg, voice STT/TTS, streaming
    │   │       └── admin/      ← Drag-drop upload, stats, health cards
    │   ├── components/ui/
    │   │   ├── AuroraBackground.tsx
    │   │   └── NeuralBackground.tsx
    │   ├── lib/api.ts          ← Typed API client
    │   └── types/index.ts      ← Shared TypeScript types
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10 (tested on 3.13)
- **Git**

### 1. Clone & enter project

```bash
git clone https://github.com/shivampathak-dev/Shivam-Pathak-Admission-Support-Agent-AICTE-INTERNSHIP-Project.git
cd Shivam-Pathak-Admission-Support-Agent-AICTE-INTERNSHIP-Project/college-admission-agent
```

### 2. Install dependencies

```bash
# Python (backend)
pip install -r backend/requirements.txt

# Node.js (frontend)
cd frontend && npm install && cd ..
```

### 3. Configure environment

```bash
cp backend/.env.example backend/.env
# Open backend/.env and set:
#   IBM_WATSONX_API_KEY=<your key>
#   IBM_WATSONX_PROJECT_ID=<your project id>
# (Leave blank to use built-in mock RAG fallback for local testing)
```

### 4. First-time setup (run once)

```bash
cd backend

# Create admin account  →  admin@college.edu / Admin1234
python seed_admin.py

# Index pre-loaded college knowledge base into ChromaDB
python ingest_knowledge_base.py

cd ..
```

---

## ▶️ Running the Project

### Option 1 — One-command launcher *(starts backend + frontend together)*

```bash
cd backend
python3 app/main.py
```

- **Frontend** opens automatically at → http://localhost:3000
- **Backend API** runs at → http://localhost:8000/api/docs

---

### Option 2 — Run backend and frontend separately

**Terminal 1 — Backend:**
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend (dev):**
```bash
cd frontend
npm run dev
```

**Terminal 2 — Frontend (production build):**
```bash
cd frontend
npm run build
npm run start
```

---

### Option 3 — Docker Compose *(both services in one command)*

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000/api/docs

---

### Login credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@college.edu | Admin1234 |
| Student | Register on /signup | your choice |

---

## 🔑 Environment Variables

Copy `backend/.env.example` → `backend/.env`:

```env
# App
APP_NAME="College Admission Agent"
SECRET_KEY="change-me-to-a-random-256bit-secret"
DEBUG=true

# IBM watsonx.ai (leave blank to use mock RAG fallback)
IBM_WATSONX_API_KEY=
IBM_WATSONX_PROJECT_ID=
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com
IBM_GRANITE_MODEL_ID=ibm/granite-13b-chat-v2

# Storage
UPLOAD_DIR=data/uploaded_pdfs
CHROMA_PERSIST_DIR=data/chroma_db

# Chunking
CHUNK_SIZE=500
CHUNK_OVERLAP=50
RETRIEVER_TOP_K=5
```

---

## 🐳 Docker Compose

Run both services with one command:

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000  
- Backend:  http://localhost:8000/api/docs

---

## ☁️ IBM Cloud Deployment

```bash
# 1. Install IBM Cloud CLI (requires sudo)
curl -fsSL https://clis.cloud.ibm.com/install/osx | sh

# 2. Configure credentials
cp backend/.env.example backend/.env
# → Fill in IBM_WATSONX_API_KEY and IBM_WATSONX_PROJECT_ID

# 3. Deploy to Code Engine
chmod +x deploy.sh
./deploy.sh
```

---

## 🧪 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Get JWT token |
| GET  | /api/auth/me | Current user |
| GET  | /api/chat/sessions | List conversations |
| POST | /api/chat/sessions | Create session |
| GET  | /api/chat/sessions/{id}/messages | Load history |
| POST | /api/chat/query | RAG query (sync) |
| POST | /api/chat/query/stream | RAG query (SSE streaming) |
| GET  | /api/admin/documents | List indexed docs |
| POST | /api/admin/documents/upload | Upload + ingest PDF |
| DELETE | /api/admin/documents/{id} | Remove document |
| POST | /api/admin/documents/{id}/reindex | Re-embed document |
| GET  | /api/admin/stats | System usage + Granite health |
| GET  | /api/health | Service health check |

---

## 🤖 IBM Granite Integration

The app connects to `ibm/granite-13b-chat-v2` via the official **ibm-watsonx-ai** Python SDK.

**With API credentials** (`.env` configured):
- Real IBM Granite LLM generates answers
- Strict document-grounded responses with hallucination guardrails
- Streaming token output via watsonx `generate_text_stream()`

**Without API credentials** (mock mode):
- Top-scoring retrieved chunks are formatted as a clean Markdown answer
- Identical source citations and UI experience
- Perfect for local testing and demos

---

## 📚 Pre-loaded Knowledge Base

Three markdown documents are ingested into ChromaDB on first run:

| Document | Content |
|----------|---------|
| `college_prospectus.md` | B.Tech/M.Tech programmes, fee structure, eligibility, hostel, important dates |
| `placement_guide.md` | Placement statistics, top recruiters, internship policy, salary data |
| `campus_life.md` | Labs, sports, clubs, transport, health centre, library |

Upload additional PDFs via the Admin Dashboard to expand the knowledge base.

---

## 🛡️ Security Notes

- Passwords hashed with **bcrypt** (cost factor 12)
- JWT tokens expire in 7 days (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- Role-based access: admin endpoints return 403 for student accounts
- CORS locked to `localhost:3000` in development; configure `CORS_ORIGINS` for production

---

## 📊 Architecture Diagrams

| File | Description |
|------|-------------|
| `rag_diagram.html` | Interactive LangFlow-style node-canvas RAG pipeline (open in browser) |

For PPT-ready static diagrams, see `Shivam_CollegeAdmissionAgent_Presentation.pptx` (18 slides).

---

## 👨‍💻 Author

**Shivam Pathak**  
AICTE / IBM SkillsBuild Internship — Cohort 2025  
shivampathak1020@gmail.com

---

*Built with ❤️ using IBM Granite · ChromaDB · FastAPI · Next.js 16 · Framer Motion*
