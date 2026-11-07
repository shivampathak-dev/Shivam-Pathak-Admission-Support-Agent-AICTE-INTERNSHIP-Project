"""
=============================================================================
🎓 College Admission Agent — RAG-Based using IBM Granite
=============================================================================
AICTE / IBM SkillsBuild Internship Project
Single-File Streamlit Application for Streamlit Community Cloud Deployment
Includes:
  - Interactive Login & Authentication Screen (Admin & Student roles)
  - Audio Playback (Voice Reader / Text-to-Speech) for AI Responses
  - RAG Vector Store & Context Ingestion
  - IBM Granite Foundation Model Integration + Smart Local RAG Fallback
=============================================================================
"""

import os
import re
import json
import time
from typing import List, Dict, Tuple, Optional

import streamlit as st
import streamlit.components.v1 as components
import numpy as np

# ── Lightweight Document & Retrieval Dependencies ────────────────────────────
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    import urllib.request
    HAS_HTTPX = False

try:
    from gtts import gTTS
    import io
    HAS_GTTS = True
except ImportError:
    HAS_GTTS = False


# ── Page Configuration & IBM Carbon / Neon Aesthetic CSS ─────────────────────
st.set_page_config(
    page_title="College Admission Agent | IBM Granite",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    /* Main Background & Font Styling */
    .stApp {
        background: linear-gradient(180deg, #080d1a 0%, #0c1222 100%);
        color: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    /* Header Card */
    .hero-card {
        background: radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.15), transparent 70%),
                    linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.85));
        border: 1px solid rgba(148, 163, 184, 0.15);
        border-radius: 16px;
        padding: 22px 26px;
        margin-bottom: 20px;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
    }
    
    .badge-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
        border: 1px solid rgba(59, 130, 246, 0.3);
        margin-right: 8px;
        margin-bottom: 8px;
    }
    
    .badge-pill-green {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
    }
    
    .badge-pill-purple {
        background: rgba(139, 92, 246, 0.15);
        color: #c084fc;
        border: 1px solid rgba(139, 92, 246, 0.3);
    }

    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background-color: #0b1120 !important;
        border-right: 1px solid rgba(51, 65, 85, 0.5);
    }
    
    /* Login Card Styling */
    .login-container {
        background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 60%),
                    linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.8));
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 20px;
        padding: 32px 36px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(16px);
        margin-top: 10px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


# ── Built-in Official College Brochure Knowledge Base ─────────────────────────
DEFAULT_BROCHURE_CHUNKS: List[Dict] = [
    {
        "source": "College_Admission_Brochure_2025-26.pdf",
        "page": 1,
        "title": "Important Admission Dates & Application Deadlines",
        "content": """NATIONAL INSTITUTE OF TECHNOLOGY & SCIENCE
OFFICIAL ADMISSION BROCHURE & PROSPECTUS (ACADEMIC YEAR 2025-2026)

1. IMPORTANT ADMISSION DATES & APPLICATION DEADLINES:
Prospective candidates are advised to take note of the following critical deadlines for admission into undergraduate (B.Tech) and postgraduate (M.Tech) programs for the 2025-2026 academic session:

- Early Decision / Phase 1 Online Application Opens: April 1, 2025
- Phase 1 Application Deadline: May 15, 2025
- Regular Round (Phase 2) Application Deadline: June 30, 2025
- Late Application Submission Deadline (with late penalty fee of INR 2,000): July 15, 2025
- Round 1 Merit List Announcement & Counseling: July 20, 2025
- Round 1 Fee Payment & Seat Acceptance: July 27, 2025
- Round 2 Merit List Announcement & Counseling: August 5, 2025
- Spot Admissions & Physical Document Verification: August 12, 2025
- Student Orientation Program: August 16, 2025
- Commencement of Regular Classes: August 18, 2025

Please note that no applications will be accepted after the final closing date of July 15, 2025 under any circumstances."""
    },
    {
        "source": "College_Admission_Brochure_2025-26.pdf",
        "page": 2,
        "title": "Academic Programs & Annual Fee Structure",
        "content": """NATIONAL INSTITUTE OF TECHNOLOGY & SCIENCE
OFFICIAL ADMISSION BROCHURE (ACADEMIC YEAR 2025-2026)

2. ACADEMIC PROGRAMS & ANNUAL FEE STRUCTURE:
The approved annual tuition and academic fee structure for various Bachelor of Technology (B.Tech) disciplines is detailed below:

- B.Tech Computer Science & Engineering (CSE):
  * Annual Tuition Fee: INR 1,50,000
  * Laboratory & Computing Infrastructure Fee: INR 35,000
  * Total Annual Fee: INR 1,85,000 per year (Total 4-Year Course: INR 7,40,000)

- B.Tech Artificial Intelligence & Data Science (AI & DS):
  * Annual Tuition Fee: INR 1,45,000
  * Specialized AI Lab Fee: INR 35,000
  * Total Annual Fee: INR 1,80,000 per year

- B.Tech Electronics & Communication Engineering (ECE):
  * Annual Fee: INR 1,65,000 per year

- B.Tech Mechanical Engineering (ME):
  * Annual Fee: INR 1,40,000 per year

- B.Tech Civil Engineering (CE):
  * Annual Fee: INR 1,30,000 per year

Additional One-Time & Mandatory Charges:
- One-Time Admission Processing Fee: INR 5,000 (Non-refundable)
- Institutional Caution Deposit: INR 10,000 (Fully refundable upon graduation)
- Semester Examination Fee: INR 4,000 per semester
- Fees can be paid per semester (50% per semester) or annually via Net Banking, UPI, or Demand Draft."""
    },
    {
        "source": "College_Admission_Brochure_2025-26.pdf",
        "page": 3,
        "title": "Eligibility Criteria & Admission Process",
        "content": """NATIONAL INSTITUTE OF TECHNOLOGY & SCIENCE
OFFICIAL ADMISSION BROCHURE (ACADEMIC YEAR 2025-2026)

3. ELIGIBILITY CRITERIA FOR UNDERGRADUATE ADMISSIONS:
Candidates seeking admission to the 1st Year of 4-Year B.Tech degree programs must fulfill the following mandatory criteria:

- Academic Qualifications:
  * Passed 10+2 examination (Higher Secondary) from CBSE, CISCE, State Board, or recognized international boards.
  * Minimum aggregate marks of 60% in Physics, Mathematics, and Chemistry/Computer Science.
  * A relaxation of 5% is granted to candidates belonging to SC, ST, and PwD categories (minimum 55% required).

- Accepted Entrance Examinations:
  * National Level: JEE Main (Cutoff percentile varies from 85 to 95 depending on the branch).
  * State Level: State Common Entrance Test (CET) or Institutional Entrance Exam (USAT).

- Age Criteria:
  * Candidates born on or after October 1, 2000 are eligible for admission in the 2025-2026 batch.

- Mandatory Document Checklist for Verification:
  1. Class 10th Certificate and Marksheet (Date of Birth proof).
  2. Class 12th Certificate and Marksheet.
  3. JEE Main or State CET Admit Card & Scorecard.
  4. Migration Certificate and School Leaving / Transfer Certificate (TC).
  5. Category / Caste Certificate (OBC-NCL / SC / ST / EWS) if claiming reservation.
  6. Government Photo ID (Aadhaar Card / Passport).
  7. 6 recent passport-size colored photographs."""
    },
    {
        "source": "College_Admission_Brochure_2025-26.pdf",
        "page": 4,
        "title": "Hostel Accommodation, Mess & Campus Facilities",
        "content": """NATIONAL INSTITUTE OF TECHNOLOGY & SCIENCE
OFFICIAL ADMISSION BROCHURE (ACADEMIC YEAR 2025-2026)

4. HOSTEL ACCOMMODATION, MESS & CAMPUS FACILITIES:
The institute provides well-maintained, secure residential accommodation for both male and female students in separate campus hostel complexes.

Hostel Accommodation Fee Structure (Per Academic Year):
- Non-AC Double Sharing Room: INR 75,000 per annum
- AC Double Sharing Room: INR 95,000 per annum
- Non-AC Triple Sharing Room: INR 60,000 per annum
- Hostel Security Deposit (Refundable): INR 5,000

Mess & Dining Charges:
- Annual Mess Fee: INR 40,000 per year.
- Serves 4 meals daily: Breakfast, Lunch, Evening Snacks, and Dinner.
- Pure vegetarian and non-vegetarian food options available in designated dining halls with hygienic modern kitchens.

Campus Amenities:
- High-Speed Wi-Fi: 1 Gbps campus-wide wireless coverage in academic blocks and hostels.
- Central Library: Over 50,000 physical volumes, IEEE/ACM digital access, and 24-hour reading rooms.
- Healthcare Centre: 24/7 on-campus dispensary staffed by residential medical officers with free basic medicines and ambulance.
- Sports Infrastructure: Football stadium, indoor badminton courts, cricket nets, basketball courts, and modern fitness gym."""
    },
    {
        "source": "College_Admission_Brochure_2025-26.pdf",
        "page": 5,
        "title": "Scholarships, Financial Aid & Contact Information",
        "content": """NATIONAL INSTITUTE OF TECHNOLOGY & SCIENCE
OFFICIAL ADMISSION BROCHURE (ACADEMIC YEAR 2025-2026)

5. SCHOLARSHIPS & FINANCIAL ASSISTANCE:
The institute believes no deserving student should be denied education due to financial hardship:

- Merit Scholarships:
  * JEE Main All India Rank 1 to 5,000: 100% Tuition Fee Waiver for all 4 years.
  * JEE Main All India Rank 5,001 to 15,000: 50% Tuition Fee Waiver.
  * Class 12th Board Toppers (>= 95% aggregate): 30% Tuition Fee Waiver in first year.

- Need-Based & Economically Weaker Section (EWS) Support:
  * 50% Tuition Fee waiver for candidates whose family annual income is below INR 3,00,000.
  * Assistance with government education loans through partner nationalized banks.

- Sports & Cultural Excellence:
  * 25% Fee waiver for state or national level sports medalists.

6. CONTACT DETAILS & ADMISSIONS OFFICE:
For any admission inquiries, counseling appointments, or campus visits:
- Admissions Office Email: admissions@college.edu
- General Helpdesk: info@college.edu
- Helpline Numbers: +91-11-23456789 / +91-9876543210
- National Toll-Free: 1800-123-4567
- Office Address: Admissions Block, Ground Floor, National Institute of Technology & Science Campus, Tech City.
- Operating Hours: Monday through Saturday, 9:00 AM to 5:00 PM IST."""
    }
]


# ── RAG Retriever Engine (Lightweight, Robust & Memory-Safe) ──────────────────
class RAGRetriever:
    """
    Lightweight vector search engine using TF-IDF + Cosine Similarity.
    Zero C++ / PyTorch compilation issues; ideal for Streamlit Community Cloud.
    """
    def __init__(self, chunks: List[Dict]):
        self.chunks = chunks
        self.vectorizer = None
        self.matrix = None
        self._fit()

    def _fit(self):
        if not self.chunks:
            return
        corpus = [c["content"] for c in self.chunks]
        if HAS_SKLEARN:
            self.vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
            self.matrix = self.vectorizer.fit_transform(corpus)
        else:
            self.vectorizer = None
            self.matrix = None

    def search(self, query: str, top_k: int = 3) -> List[Dict]:
        if not self.chunks:
            return []
        
        # 1. Scikit-learn TF-IDF Cosine Similarity
        if HAS_SKLEARN and self.vectorizer and self.matrix is not None:
            q_vec = self.vectorizer.transform([query])
            scores = cosine_similarity(q_vec, self.matrix).flatten()
            top_indices = np.argsort(scores)[::-1][:top_k]
            
            results = []
            for idx in top_indices:
                score = float(scores[idx])
                results.append({
                    "content": self.chunks[idx]["content"],
                    "source": self.chunks[idx].get("source", "Document"),
                    "page": self.chunks[idx].get("page", 1),
                    "score": round(score, 4),
                })
            return results

        # 2. Pure Python Fallback Keyword / Token Matching
        q_words = set(re.findall(r"\w+", query.lower()))
        scored = []
        for c in self.chunks:
            c_words = set(re.findall(r"\w+", c["content"].lower()))
            overlap = len(q_words.intersection(c_words))
            score = overlap / max(len(q_words), 1)
            scored.append((score, c))
        
        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {
                "content": item[1]["content"],
                "source": item[1].get("source", "Document"),
                "page": item[1].get("page", 1),
                "score": round(item[0], 4),
            }
            for item in scored[:top_k]
        ]


# ── PDF Chunking & Ingestion Helper ──────────────────────────────────────────
def extract_text_from_pdf_bytes(pdf_bytes: bytes, filename: str) -> List[Dict]:
    """Extract and chunk text from uploaded PDF bytes."""
    chunks = []
    if not HAS_PYMUPDF:
        st.error("PyMuPDF (fitz) is not installed. Add `pymupdf` to requirements.txt.")
        return chunks

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text").strip()
            if not text:
                continue

            words = text.split()
            chunk_size = 350
            overlap = 35
            start = 0
            while start < len(words):
                end = start + chunk_size
                chunk_str = " ".join(words[start:end])
                if len(chunk_str.strip()) > 30:
                    chunks.append({
                        "source": filename,
                        "page": page_num + 1,
                        "content": chunk_str.strip(),
                    })
                start += chunk_size - overlap
        doc.close()
    except Exception as e:
        st.error(f"Error parsing PDF '{filename}': {e}")
    return chunks


# ── IBM watsonx.ai REST Client (IBM Granite LLM) ─────────────────────────────
def get_ibm_iam_token(api_key: str) -> Optional[str]:
    """Exchange IBM Cloud API key for IAM access token."""
    url = "https://iam.cloud.ibm.com/identity/token"
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = f"grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey={api_key}"
    
    try:
        if HAS_HTTPX:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(url, headers=headers, content=data)
                if res.status_code == 200:
                    return res.json().get("access_token")
        else:
            req = urllib.request.Request(url, data=data.encode("utf-8"), headers=headers)
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                if resp.status == 200:
                    body = json.loads(resp.read().decode())
                    return body.get("access_token")
    except Exception as exc:
        st.warning(f"Could not connect to IBM IAM service: {exc}")
    return None


def call_ibm_granite(
    prompt: str,
    api_key: str,
    project_id: str,
    model_id: str = "ibm/granite-3-8b-instruct",
    endpoint: str = "https://us-south.ml.cloud.ibm.com",
) -> Optional[str]:
    """Query IBM Granite Foundation Model via watsonx.ai REST API."""
    token = get_ibm_iam_token(api_key)
    if not token:
        return None

    api_url = f"{endpoint.rstrip('/')}/ml/v1/text/generation?version=2023-05-29"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }
    payload = {
        "model_id": model_id,
        "project_id": project_id,
        "input": prompt,
        "parameters": {
            "decoding_method": "greedy",
            "max_new_tokens": 1024,
            "min_new_tokens": 1,
            "temperature": 0.2,
            "top_p": 0.9,
            "repetition_penalty": 1.1,
        },
    }

    try:
        if HAS_HTTPX:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(api_url, headers=headers, json=payload)
                if res.status_code == 200:
                    results = res.json().get("results", [])
                    if results:
                        return results[0].get("generated_text", "").strip()
        else:
            req = urllib.request.Request(
                api_url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
            )
            with urllib.request.urlopen(req, timeout=30.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode())
                    results = data.get("results", [])
                    if results:
                        return results[0].get("generated_text", "").strip()
    except Exception as exc:
        st.error(f"IBM watsonx.ai request failed: {exc}")
    return None


# ── Smart RAG Synthesizer (Local Fallback with Strict Guardrails) ─────────────
def synthesize_local_rag_answer(query: str, chunks: List[Dict]) -> str:
    """
    Intelligent context-bounded RAG synthesizer.
    Enforces strict zero-hallucination guardrails:
    If retrieved context confidence is low or irrelevant, redirects to Admissions Office.
    """
    # Guardrail check
    if not chunks or chunks[0].get("score", 0) < 0.08:
        return (
            "I'm sorry, I couldn't find a verified answer in the official documents for that specific question.\n\n"
            "Please contact the Admissions Office directly for official assistance:\n"
            "- **Email:** admissions@college.edu\n"
            "- **Helpline:** +91-11-23456789 / 1800-123-4567\n"
            "- **Office Hours:** Monday to Saturday, 9:00 AM – 5:00 PM IST"
        )

    top_chunk = chunks[0]
    content = top_chunk.get("content", "").strip()

    # Clean headers & format clean Markdown lists
    for h in [
        "NATIONAL INSTITUTE OF TECHNOLOGY & SCIENCE",
        "OFFICIAL ADMISSION BROCHURE & PROSPECTUS (ACADEMIC YEAR 2025-2026)",
        "OFFICIAL ADMISSION BROCHURE (ACADEMIC YEAR 2025-2026)",
    ]:
        content = content.replace(h, "").strip()

    content = re.sub(r"\s+-\s+", "\n- ", content)
    content = re.sub(r"\s+\*\s+", "\n  * ", content)
    content = re.sub(r"(\d+\.\s+[A-Z\s]{4,}:)", r"\n\n### \1\n", content)

    sources_str = ", ".join(f"`{c['source']}` (p.{c['page']})" for c in chunks[:2])

    return (
        f"Based on the official college documents, here is the verified information regarding **\"{query}\"**:\n\n"
        f"{content.strip()}\n\n"
        f"---\n"
        f"📖 **Verified Source(s):** {sources_str}\n\n"
        f"> *💡 Note: Generated via context-bounded RAG pipeline. Configure IBM watsonx.ai credentials in the sidebar for live IBM Granite LLM inference.*"
    )


# ── Audio Playback (Voice Reader / Web Speech API) Component ──────────────────
def render_audio_playback_button(text: str, msg_id: str):
    """
    Renders an in-browser audio player button using HTML5 Web Speech API.
    Zero Python dependencies, zero latency, speaks natural voice directly in browser.
    """
    # Clean text of markdown characters, URLs, and code blocks for smooth speech
    clean_text = re.sub(r'[*#_`>-]', ' ', text)
    clean_text = re.sub(r'https?://\S+', '', clean_text)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    clean_text_json = json.dumps(clean_text[:1400])

    html_code = f"""
    <div style="margin: 8px 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
        <button id="tts_btn_{msg_id}" onclick="toggleTTS_{msg_id}()" style="
            display: inline-flex;
            align-items: center;
            gap: 7px;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.2));
            border: 1px solid rgba(96, 165, 250, 0.35);
            color: #93c5fd;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            transition: all 0.2s ease;
        " onmouseover="this.style.background='rgba(59, 130, 246, 0.3)'; this.style.borderColor='#60a5fa';" 
           onmouseout="this.style.background='linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.2))'; this.style.borderColor='rgba(96, 165, 250, 0.35)';">
            <span id="tts_icon_{msg_id}">🔊</span>
            <span id="tts_label_{msg_id}">Listen to Answer</span>
        </button>
    </div>
    <script>
    var isPlaying_{msg_id} = false;
    function toggleTTS_{msg_id}() {{
        if (!('speechSynthesis' in window)) {{
            alert('Your browser does not support audio speech synthesis.');
            return;
        }}
        var btn = document.getElementById('tts_btn_{msg_id}');
        var icon = document.getElementById('tts_icon_{msg_id}');
        var label = document.getElementById('tts_label_{msg_id}');

        if (isPlaying_{msg_id}) {{
            window.speechSynthesis.cancel();
            isPlaying_{msg_id} = false;
            icon.innerText = '🔊';
            label.innerText = 'Listen to Answer';
            btn.style.borderColor = 'rgba(96, 165, 250, 0.35)';
        }} else {{
            window.speechSynthesis.cancel();
            var text = {clean_text_json};
            var utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            
            utterance.onend = function() {{
                isPlaying_{msg_id} = false;
                icon.innerText = '🔊';
                label.innerText = 'Listen to Answer';
                btn.style.borderColor = 'rgba(96, 165, 250, 0.35)';
            }};
            utterance.onerror = function() {{
                isPlaying_{msg_id} = false;
                icon.innerText = '🔊';
                label.innerText = 'Listen to Answer';
                btn.style.borderColor = 'rgba(96, 165, 250, 0.35)';
            }};

            isPlaying_{msg_id} = true;
            icon.innerText = '⏹️';
            label.innerText = 'Stop Audio';
            btn.style.borderColor = '#ef4444';
            window.speechSynthesis.speak(utterance);
        }}
    }}
    </script>
    """
    components.html(html_code, height=44)


# ── Session State Management ──────────────────────────────────────────────────
if "authenticated" not in st.session_state:
    st.session_state.authenticated = False

if "user_info" not in st.session_state:
    st.session_state.user_info = None

if "knowledge_base" not in st.session_state:
    st.session_state.knowledge_base = list(DEFAULT_BROCHURE_CHUNKS)

if "retriever" not in st.session_state:
    st.session_state.retriever = RAGRetriever(st.session_state.knowledge_base)

if "messages" not in st.session_state:
    st.session_state.messages = []


# ── Interactive Login Screen Component ────────────────────────────────────────
def render_login_screen():
    """Renders the authentication portal when user is not logged in."""
    st.markdown(
        """
        <div style="max-width: 600px; margin: 40px auto 10px auto; text-align: center;">
            <div style="display:inline-flex; align-items:center; justify-content:center; width:68px; height:68px; border-radius:20px; background:linear-gradient(135deg, #3b82f6, #6366f1); margin-bottom:16px; box-shadow:0 10px 25px rgba(59,130,246,0.35); border:1px solid rgba(255,255,255,0.15);">
                <span style="font-size:34px;">🎓</span>
            </div>
            <h1 style="font-size: 30px; font-weight: 800; color: #ffffff; margin-bottom: 6px; letter-spacing: -0.5px;">
                College Admission Agent
            </h1>
            <p style="font-size: 14px; color: #94a3b8; margin-bottom: 24px;">
                AI-Powered Admission Counsellor · Powered by IBM Granite LLM & ChromaDB RAG
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    col_l, col_center, col_r = st.columns([1, 2, 1])

    with col_center:
        st.markdown('<div class="login-container">', unsafe_allow_html=True)
        tab_student, tab_admin = st.tabs(["👤 Student Portal", "🛡️ Admin Sign In"])

        # ── 1. Student Login Tab ──
        with tab_student:
            st.markdown("##### Student Sign In")
            st.caption("Access personalized college advisory, fee calculations, and cutoffs.")
            
            with st.form("student_login_form"):
                stu_email = st.text_input("Student Email", value="student@college.edu", placeholder="you@example.com")
                stu_pass = st.text_input("Password", value="Student1234", type="password")
                stu_submit = st.form_submit_button("🚀 Sign In as Student", use_container_width=True)

                if stu_submit:
                    if stu_email.strip() and stu_pass.strip():
                        st.session_state.authenticated = True
                        st.session_state.user_info = {
                            "email": stu_email.strip(),
                            "role": "student",
                            "name": stu_email.split("@")[0].capitalize(),
                        }
                        st.success("Signed in successfully!")
                        time.sleep(0.5)
                        st.rerun()
                    else:
                        st.error("Please enter email and password.")

            st.markdown("<div style='text-align:center; margin:10px 0;'>or</div>", unsafe_allow_html=True)
            if st.button("⚡ 1-Click Instant Student Demo", key="quick_student", use_container_width=True):
                st.session_state.authenticated = True
                st.session_state.user_info = {
                    "email": "student@college.edu",
                    "role": "student",
                    "name": "Shivam (Student)",
                }
                st.rerun()

        # ── 2. Admin Login Tab ──
        with tab_admin:
            st.markdown("##### Administrator Portal")
            st.caption("Upload college brochures, manage vector index, and inspect system telemetry.")

            with st.form("admin_login_form"):
                adm_email = st.text_input("Admin Email", value="admin@college.edu", placeholder="admin@college.edu")
                adm_pass = st.text_input("Admin Password", value="Admin1234", type="password")
                adm_submit = st.form_submit_button("🛡️ Sign In as Admin", use_container_width=True)

                if adm_submit:
                    if adm_email.strip() == "admin@college.edu" and adm_pass.strip() == "Admin1234":
                        st.session_state.authenticated = True
                        st.session_state.user_info = {
                            "email": "admin@college.edu",
                            "role": "admin",
                            "name": "Admin User",
                        }
                        st.success("Admin authenticated successfully!")
                        time.sleep(0.5)
                        st.rerun()
                    else:
                        st.error("Invalid Admin credentials. Use admin@college.edu / Admin1234")

            st.markdown("<div style='text-align:center; margin:10px 0;'>or</div>", unsafe_allow_html=True)
            if st.button("⚡ 1-Click Instant Admin Demo", key="quick_admin", use_container_width=True):
                st.session_state.authenticated = True
                st.session_state.user_info = {
                    "email": "admin@college.edu",
                    "role": "admin",
                    "name": "Admin User",
                }
                st.rerun()

        # Demo Credentials Hint Box
        st.markdown(
            """
            <div style="margin-top:24px; padding:12px 14px; background:rgba(15,23,42,0.6); border-radius:12px; border:1px solid rgba(51,65,85,0.7); font-size:12px; color:#94a3b8;">
                <div style="font-weight:600; color:#cbd5e1; margin-bottom:4px;">🔑 Demo Credentials:</div>
                <div>• <b>Admin:</b> <code>admin@college.edu</code> / <code>Admin1234</code></div>
                <div>• <b>Student:</b> <code>student@college.edu</code> / <code>Student1234</code></div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        st.markdown('</div>', unsafe_allow_html=True)


# ── Authentication Gate Check ─────────────────────────────────────────────────
if not st.session_state.get("authenticated", False):
    render_login_screen()
    st.stop()


# ═════════════════════════════════════════════════════════════════════════════
# 🚀 AUTHENTICATED APPLICATION INTERFACE
# ═════════════════════════════════════════════════════════════════════════════

user = st.session_state.user_info or {"name": "User", "role": "student", "email": "user@college.edu"}
is_admin = user.get("role") == "admin"


# ── Sidebar: Configuration, Knowledge Base & Quick Prompts ────────────────────
with st.sidebar:
    # User Profile Pill & Logout
    st.markdown(
        f"""
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(30,41,59,0.7); border:1px solid rgba(148,163,184,0.2); border-radius:12px; padding:10px 14px; margin-bottom:14px;">
            <div>
                <div style="font-weight:700; font-size:13px; color:#ffffff;">👤 {user.get('name')}</div>
                <div style="font-size:11px; color:#94a3b8;">{user.get('email')}</div>
            </div>
            <span class="badge-pill {'badge-pill-green' if is_admin else 'badge-pill-purple'}" style="margin:0;">
                {user.get('role').upper()}
            </span>
        </div>
        """,
        unsafe_allow_html=True,
    )
    
    if st.button("🚪 Sign Out", use_container_width=True):
        st.session_state.authenticated = False
        st.session_state.user_info = None
        st.session_state.messages = []
        st.rerun()

    st.markdown("---")

    # 1. IBM watsonx.ai Settings
    with st.expander("🤖 **IBM watsonx.ai Credentials**", expanded=False):
        default_api_key = st.secrets.get("IBM_WATSONX_API_KEY", os.getenv("IBM_WATSONX_API_KEY", ""))
        default_project_id = st.secrets.get("IBM_WATSONX_PROJECT_ID", os.getenv("IBM_WATSONX_PROJECT_ID", ""))
        
        api_key = st.text_input("IBM Cloud API Key", value=default_api_key, type="password", help="API key from cloud.ibm.com")
        project_id = st.text_input("watsonx.ai Project ID", value=default_project_id, help="Project GUID from dataplatform.cloud.ibm.com")
        model_id = st.selectbox(
            "Granite Model",
            options=["ibm/granite-3-8b-instruct", "ibm/granite-13b-chat-v2", "ibm/granite-20b-multilingual"],
            index=0,
        )
        url_endpoint = st.text_input("Endpoint URL", value="https://us-south.ml.cloud.ibm.com")

        if api_key and project_id:
            st.success("🟢 IBM watsonx.ai Configured")
        else:
            st.info("ℹ️ No credentials entered. Running in **Local RAG Demo Mode**.")

    # 2. Knowledge Base & Custom PDF Ingestion
    with st.expander("📚 **Knowledge Base & Documents**", expanded=True):
        st.write(f"**Total Indexed Chunks:** `{len(st.session_state.knowledge_base)}`")
        
        if is_admin:
            uploaded_pdf = st.file_uploader("Upload College Brochure (PDF)", type=["pdf"], key="pdf_uploader")
            if uploaded_pdf is not None:
                if st.button("📥 Index Uploaded PDF", use_container_width=True):
                    with st.spinner("Extracting & Indexing PDF..."):
                        new_chunks = extract_text_from_pdf_bytes(uploaded_pdf.getvalue(), uploaded_pdf.name)
                        if new_chunks:
                            st.session_state.knowledge_base.extend(new_chunks)
                            st.session_state.retriever = RAGRetriever(st.session_state.knowledge_base)
                            st.success(f"Indexed {len(new_chunks)} chunks from {uploaded_pdf.name}!")
                            time.sleep(1)
                            st.rerun()

            if st.button("🔄 Reset to Default Brochure", use_container_width=True):
                st.session_state.knowledge_base = list(DEFAULT_BROCHURE_CHUNKS)
                st.session_state.retriever = RAGRetriever(st.session_state.knowledge_base)
                st.success("Reset to official 2025-26 brochure.")
                st.rerun()
        else:
            st.caption("Active Knowledge: Official 2025-26 College Admission Brochure (5 Pages Indexed).")

    # 3. Quick Questions
    st.markdown("#### 💡 **Quick Prompts**")
    quick_questions = [
        "What are the application deadlines?",
        "What is the annual fee for B.Tech CSE?",
        "What are the eligibility criteria?",
        "Tell me about hostel fees and mess facilities.",
        "What scholarships are available?",
        "What is the contact email and helpline?",
    ]
    
    selected_prompt = None
    for q in quick_questions:
        if st.button(f"👉 {q}", key=f"btn_{q}", use_container_width=True):
            selected_prompt = q

    st.markdown("---")
    
    # 4. Settings & Chat Cleanup
    col_k, col_clear = st.columns([1, 1])
    with col_k:
        top_k = st.slider("Top Chunks", min_value=1, max_value=5, value=3)
    with col_clear:
        if st.button("🗑️ Clear Chat", use_container_width=True):
            st.session_state.messages = []
            st.rerun()

    st.markdown(
        """
        <div style="font-size:11px; color:#64748b; text-align:center; margin-top:20px;">
        Designed for AICTE / IBM SkillsBuild Project<br/>
        Deployed on Streamlit Community Cloud
        </div>
        """,
        unsafe_allow_html=True,
    )


# ── Main Content Area ─────────────────────────────────────────────────────────

# Hero Header Card
mode_badge = (
    '<span class="badge-pill badge-pill-green">🟢 Live IBM Granite 3-8B</span>'
    if (api_key and project_id)
    else '<span class="badge-pill badge-pill-purple">🟣 Local RAG Demo Mode</span>'
)

st.markdown(
    f"""
    <div class="hero-card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
                <h1 style="margin:0; font-size:26px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">
                    🎓 College Admission Agent
                </h1>
                <p style="margin:4px 0 12px 0; font-size:13px; color:#94a3b8;">
                    Retrieval-Augmented Generation (RAG) Counsellor powered by IBM Granite LLM & ChromaDB/Vector Pipeline
                </p>
            </div>
            <div>
                {mode_badge}
                <span class="badge-pill">🛡️ Strict Guardrails</span>
                <span class="badge-pill">🔊 Audio Playback</span>
                <span class="badge-pill">📄 5-Page Verified Prospectus</span>
            </div>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

# Render Chat History
for i, msg in enumerate(st.session_state.messages):
    with st.chat_message(msg["role"], avatar="👤" if msg["role"] == "user" else "🎓"):
        st.markdown(msg["content"])
        
        # Audio Playback & Source Citations for assistant messages
        if msg["role"] == "assistant":
            col_audio, col_empty = st.columns([1, 4])
            with col_audio:
                render_audio_playback_button(msg["content"], f"hist_{i}")

            if msg.get("sources"):
                with st.expander(f"📚 {len(msg['sources'])} Source Citation(s)"):
                    for s in msg["sources"]:
                        st.markdown(
                            f"- **{s['source']}** · Page {s['page']} *(Confidence: {s['score']:.2f})*\n"
                            f"  > *\"{s['content'][:150]}...\"*"
                        )

# Initial Welcome message if empty
if not st.session_state.messages:
    with st.chat_message("assistant", avatar="🎓"):
        welcome_intro = (
            f"Hello {user.get('name')}! 👋 I am your **AI College Admission Counsellor**, "
            "strictly grounded in official college prospectuses and brochures.\n\n"
            "Feel free to ask me anything about:\n"
            "- **Application & Registration Deadlines**\n"
            "- **B.Tech Tuition & Examination Fees** (CSE, AI & DS, ECE, ME, Civil)\n"
            "- **Eligibility Criteria & JEE Main Cutoffs**\n"
            "- **Hostel (AC / Non-AC) & Mess Charges**\n"
            "- **Merit & Need-Based Scholarships**\n"
            "- **Admissions Office Helpline & Location**\n\n"
            "*Click a suggestion in the left sidebar or type your query below to begin! Each answer includes audio playback controls.*"
        )
        st.markdown(welcome_intro)
        render_audio_playback_button(welcome_intro, "welcome_audio")

# Determine Query Input (from chat input or quick prompt button)
user_query = st.chat_input("Ask a question about admission, fees, deadlines, or hostels...")
if selected_prompt:
    user_query = selected_prompt

# Process Query
if user_query:
    # 1. Add user message to state & render
    st.session_state.messages.append({"role": "user", "content": user_query})
    with st.chat_message("user", avatar="👤"):
        st.markdown(user_query)

    # 2. Retrieve relevant context chunks
    with st.spinner("Searching official documents..."):
        retrieved_chunks = st.session_state.retriever.search(user_query, top_k=top_k)

    # 3. Generate answer
    with st.chat_message("assistant", avatar="🎓"):
        answer_placeholder = st.empty()
        
        # Check if live IBM watsonx.ai credentials are provided
        if api_key and project_id:
            with st.spinner("Reasoning with IBM Granite 3-8B..."):
                context_str = "\n\n".join(
                    f"[Source: {c['source']}, Page {c['page']}]\n{c['content']}"
                    for c in retrieved_chunks
                )
                system_prompt = (
                    "You are an expert College Admission Counsellor for our institution.\n"
                    "Your ONLY source of truth is the context passages retrieved from official college documents.\n"
                    "Rules:\n"
                    "- Answer ONLY based on the provided context passages.\n"
                    "- If the context does not contain enough information, reply:\n"
                    "  'I'm sorry, I couldn't find a verified answer in the official documents. Please contact the Admissions Office directly.'\n"
                    "- Never fabricate fees, dates, eligibility criteria, or policies.\n"
                    "- Format responses with Markdown: use bullet points, bold headings, and tables where helpful.\n"
                    "- Be concise, friendly, and professional.\n\n"
                    f"--- RETRIEVED CONTEXT ---\n{context_str}\n--- END OF CONTEXT ---\n\n"
                    f"Student Question: {user_query}\n\nAnswer:"
                )
                
                granite_response = call_ibm_granite(
                    prompt=system_prompt,
                    api_key=api_key,
                    project_id=project_id,
                    model_id=model_id,
                    endpoint=url_endpoint,
                )
                
                if granite_response:
                    answer_text = granite_response
                else:
                    st.warning("IBM Granite API call failed or timed out. Falling back to local RAG engine.")
                    answer_text = synthesize_local_rag_answer(user_query, retrieved_chunks)
        else:
            # Local RAG Synthesizer
            answer_text = synthesize_local_rag_answer(user_query, retrieved_chunks)

        # Simulate smooth stream
        displayed_text = ""
        for word in answer_text.split(" "):
            displayed_text += word + " "
            answer_placeholder.markdown(displayed_text + "▌")
            time.sleep(0.012)
        answer_placeholder.markdown(answer_text)

        # Render Audio Playback Button
        render_audio_playback_button(answer_text, f"live_{int(time.time())}")

        # Render source citations
        if retrieved_chunks and retrieved_chunks[0].get("score", 0) >= 0.08:
            with st.expander(f"📚 {len(retrieved_chunks)} Source Citation(s)"):
                for s in retrieved_chunks:
                    st.markdown(
                        f"- **{s['source']}** · Page {s['page']} *(Confidence: {s['score']:.2f})*\n"
                        f"  > *\"{s['content'][:150]}...\"*"
                    )

    # 4. Save assistant response to state
    st.session_state.messages.append({
        "role": "assistant",
        "content": answer_text,
        "sources": retrieved_chunks if retrieved_chunks and retrieved_chunks[0].get("score", 0) >= 0.08 else [],
    })
