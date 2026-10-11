# Matching College (5D Admissions & Financial Aid Engine)

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

> **Senior Full-Stack 5D College Admissions & Financial Aid Matching Service**  
> Tailored for International Students vs. Domestic (US Citizens) Applicants.  
> Designed with Stitch UI/UX Design System and powered by Google Gemini AI & Deterministic 5D Matching Engine.

---

## 🌟 Key Architecture & Highlights

- **5-Dimensional Holistic Admissions & Aid Model:**
  1. **Academic Rigor & Standardized Profiles:** IB Predicted (40~45) / GPA / SAT (1500+) / AP Calculus & Physics.
  2. **Institutional Financial Aid Engine:** Need-Blind vs. Need-Aware classification, SAI/EFC calculation, Out-of-State penalties for international students.
  3. **Qualitative Spike Classification:** Extracurricular Spike depth (Tier 1~4), National leadership, and LoR strength.
  4. **Institutional Nuances:** English proficiency waiver eligibility (4+ years at English medium schools), QuestBridge eligibility gating.
  5. **Campus & Cultural Fit:** Geographic preferences, cohort size, and major competitiveness.
- **Dynamic Academic Year (AY):** Automatically computes Academic Year based on current date (e.g., `AY 2026-2027`).
- **Student Lifecycle Management:**
  - **New Student Registration:** Real-time applicant dossier creation.
  - **Graduation Workflow:** Archives alumni into `app/data/graduated/graduated_{year}.json`.
  - **Withdrawal Workflow:** Archives withdrawn applicants into `app/data/withdrawn/withdrawn_{year}.json`.
- **Integrated US College Master Database:** 1,504 accredited US 4-year institutions ingested via US Department of Education College Scorecard API across all 52 jurisdictions.

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Python 3.11+
- Node.js (Optional, for npm scripts)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Kyumunhwang/matching-colledge.git
cd matching-colledge

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Environment Variables (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
- `GEMINI_API_KEY`: Google Gemini API key (optional - falls back to the deterministic 5D heuristic engine if empty).
- `DATA_GOV_API_KEY`: US Dept of Education College Scorecard API key.

### 4. Running the Local Dev Server
```bash
# Using npm
npm run dev:matching-college-api

# Or directly using uvicorn
python -m uvicorn app.main:app --host 127.0.0.1 --port 3088
```
Open **[http://127.0.0.1:3088](http://127.0.0.1:3088)** in your browser.

---

## ☁️ Deploying to Vercel (클라우드 배포 가이드)

본 프로젝트는 Vercel Serverless Function(Python FastAPI)과 Edge Static CDN에 최적화되어 있습니다 (`vercel.json` 및 `api/index.py` 기본 제공).

### 1단계: Vercel 로그인 및 GitHub 연동
1. [Vercel](https://vercel.com)에 접속하여 로그인합니다. (GitHub 계정 연동 권장)
2. 상단 대시보드에서 **`Add New...`** -> **`Project`**를 클릭합니다.

### 2단계: 저장소(Repository) Import
1. GitHub 리포지토리 목록에서 **`matching-colledge`** (`Kyumunhwang/matching-colledge`)를 찾아 **`Import`** 버튼을 클릭합니다.

### 3단계: 프로젝트 설정 및 환경 변수 (Environment Variables)
- **Framework Preset:** `Other` (자동 감지)
- **Root Directory:** `./` (기본값 그대로 유지)
- **Environment Variables (환경 변수):**
  - `GEMINI_API_KEY`: *(선택사항)* Google Gemini API Key 입력 (미입력 시 자체 5D 휴리스틱 매칭 엔진으로 안전하게 동작)

### 4단계: 배포 (Deploy)
1. **`Deploy`** 버튼을 클릭합니다.
2. 약 1~2분 후 배포가 완료되면 부여된 Vercel 도메인 (예: `https://matching-colledge.vercel.app`)을 통해 전 세계 어디서든 서비스에 접속할 수 있습니다.

---

## 📁 Directory Structure

```
├── app/
│   ├── api/
│   │   ├── colleges_router.py     # College Master DB APIs
│   │   ├── matching_router.py     # 5D Simulation & Override APIs
│   │   └── students_router.py     # Applicant CRUD & Lifecycle APIs
│   ├── core/
│   │   ├── ai_engine.py           # Gemini SDK Integration & Fallback
│   │   ├── config.py              # Configuration & Settings
│   │   └── matching_engine.py     # Deterministic 5D Admissions Engine
│   └── data/
│       ├── colleges.json          # Ingested 1,504 US Colleges
│       ├── students.json          # Active applicant profiles
│       ├── graduated/             # Archived alumni by graduation year
│       └── withdrawn/             # Archived students by withdrawal year
├── api/
│   └── index.py                   # Vercel Serverless ASGI Entrypoint
├── static/
│   ├── index.html                 # Stitch Tailwind Single Page App
│   ├── js/app.js                  # Frontend Controller & i18n
│   └── images/                    # UI Assets (lis-logo.png)
├── fetch_by_state.py              # US Dept of Education Ingestion Script
├── package.json                   # Port 3088 development scripts
├── requirements.txt               # Production Python dependencies
├── vercel.json                    # Vercel CDN & Serverless Rewrites
└── README.md
```
