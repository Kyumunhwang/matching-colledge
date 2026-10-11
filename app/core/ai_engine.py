"""
Gemini AI Integration Engine for 5D College Matching.
Connects to Google GenAI SDK using system prompts and rules defined in College Matching Program.md.
"""
import os
import json
import logging
from typing import Dict, Any, List

from app.core.config import settings
from app.core.matching_engine import MatchingEngine

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
# ROLE (역할)
너는 미국 최상위권 대학 입학사정관이자, 대입 재정 보조(Financial Aid) 시스템을 완벽하게 이해하고 있는 AI 대학 매칭 엔진이다. 입력받은 학생의 5대 핵심 데이터(학업, 재정, 정성 활동, 제도적 변수, 환경 선호도)를 다각도로 분석하여 최적의 대학 매칭 및 합격/장학금 시뮬레이션 결과를 도출하라.

# SYSTEM RULES
1. [RULE: STRICT HOLISTIC REVIEW] 학생을 단 하나의 지표로 판단하지 말고, School Profile 대비 학업 강도(Rigor)와 정성적 활동(Extracurriculars)의 깊이를 연계하여 평가하라.
2. [RULE: INITIAL CITIZENSHIP FORK] 순수 국제학생(International)이면서 재정보조가 필요한 경우, 주립대는 장학금을 지원하지 않으므로 Out-of-State 학비 전액 부담 조건으로만 매칭 가능하며 Safety나 Match로 분류할 때 주의하라.
3. [RULE: THE NEED-AWARE PENALTY RISK] 국제학생 대상 Need-Aware 대학은 학생이 상위 10%에 들지 않는 한 Reach로 보수적 분류하라.
4. [RULE: QUESTBRIDGE EXCLUSION] 순수 국제학생은 퀘스트브리지 지원 대상에서 제외하라.
5. [RULE: STRICT JSON OUTPUT] 모든 응답은 자연어 군더더기 없이 Strict JSON 형식만 반환하라.
"""


class AIEngine:
    """
    Interface for invoking Gemini 3.8 / Pro API or falling back to the 5D heuristic engine.
    """

    @classmethod
    async def run_simulation(
        cls,
        student_data: Dict[str, Any],
        colleges: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Executes 5D Matching simulation using Google GenAI SDK if available,
        falling back to the deterministic MatchingEngine.
        """
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")

        if not api_key:
            logger.info("GEMINI_API_KEY not set. Using audited deterministic 5D heuristic engine.")
            return MatchingEngine.match_colleges(student_data, colleges)

        try:
            # Try google.genai first
            import google.genai as genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            prompt = (
                f"{SYSTEM_PROMPT}\n\n"
                f"# STUDENT DOSSIER:\n{json.dumps(student_data, ensure_ascii=False, indent=2)}\n\n"
                f"# AVAILABLE COLLEGES DATABASE:\n{json.dumps(colleges[:15], ensure_ascii=False, indent=2)}\n\n"
                f"Analyze the student dossier against the college database and return the matching result in JSON."
            )

            response = client.models.generate_content(
                model=settings.DEFAULT_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                ),
            )
            raw_text = response.text.strip()
            # Clean possible markdown wrap
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            parsed = json.loads(raw_text.strip())
            if "matched_universities" in parsed:
                return parsed
        except Exception as exc:
            logger.warning("Gemini API call failed (%s). Falling back to 5D heuristic engine.", exc)

        # Fallback to high-accuracy deterministic engine
        return MatchingEngine.match_colleges(student_data, colleges)
