"""
scripts/fetch_by_state.py
미국 교육부 공식 API를 사용해 주별 4년제 대학을 검색하고 colleges.json에 일괄 적재하는 스크립트
"""
import os
import requests
import json
from pathlib import Path

# Load .env if present
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

DATA_FILE = Path("app/data/colleges.json")
API_KEY = os.getenv("DATA_GOV_API_KEY", "YOUR_API_KEY_HERE")

def fetch_and_bulk_upload_by_state(state_code: str):
    print(f"[*] {state_code} 주 대학 데이터 검색 시작...")
    
    url = "https://api.data.gov/ed/collegescorecard/v1/schools"
    params = {
        "api_key": API_KEY,
        "school.state": state_code.upper(),           # 주(State) 필터 (예: MA, CA, NY)
        "school.degrees_awarded.predominant": 3,      # 4년제 학사 학위 중심 대학
        "_fields": "id,school.name,school.state,school.city,school.degrees_awarded.predominant,latest.admissions.admission_rate.overall,latest.admissions.sat_scores.average.overall,latest.cost.attendance.academic_year",
        "per_page": 50,
        "page": 0
    }
    
    response = requests.get(url, params=params)
    if response.status_code != 200:
        print(f"[!] API 호출 실패: {response.status_code}")
        return

    data = response.json().get("results", [])
    print(f"[+] {len(data)}개 대학 정보 조회 완료. 데이터 정제 중...")

    # 기존 DB 로드
    existing_colleges = []
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            existing_colleges = json.load(f)

    existing_ids = {c["ipeds_id"] for c in existing_colleges}
    new_added = 0

    for item in data:
        ipeds_id = str(item.get("id"))
        if ipeds_id in existing_ids:
            continue

        admit_rate = item.get("latest.admissions.admission_rate.overall")
        admit_rate_pct = round(admit_rate * 100, 1) if admit_rate else 15.0

        sat_avg = item.get("latest.admissions.sat_scores.average.overall") or 1450
        coa = item.get("latest.cost.attendance.academic_year") or 82000

        college_entry = {
            "ipeds_id": ipeds_id,
            "name": item.get("school.name"),
            "state": item.get("school.state"),
            "city": item.get("school.city", ""),
            "type": "National University",
            "acceptance_rate": admit_rate_pct,
            "median_sat": int(sat_avg),
            "median_gpa": 3.85,
            "annual_coa": int(coa),
            "out_of_state_coa": int(coa),
            "international_financial_aid": True,
            "aid_policy_type": "Need-Aware",
            "need_met_100": False,
            "questbridge_partner": False,
            "avg_intl_grant_usd": 35000,
            "culture_profile": f"Located in {item.get('school.city')}, {item.get('school.state')}."
        }
        existing_colleges.append(college_entry)
        new_added += 1

    # colleges.json에 일괄 저장
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(existing_colleges, f, ensure_ascii=False, indent=2)

    print(f"[성공] {new_added}개 대학이 colleges.json에 한 번에 등록되었습니다! (총 {len(existing_colleges)}개)")

if __name__ == "__main__":
    import sys
    import time
    targets = sys.argv[1:] if len(sys.argv) > 1 else ["CA", "NY", "MA"]
    for idx, st in enumerate(targets, 1):
        print(f"\n--- [{idx}/{len(targets)}] Processing {st} ---")
        fetch_and_bulk_upload_by_state(st)
        time.sleep(0.3)