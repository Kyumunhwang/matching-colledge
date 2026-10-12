"""
5D Matching Engine implementing holistic admissions and financial aid simulation.
Based on the 5-Dimensional admissions architecture defined in College Matching Program.md.
"""
from typing import Dict, Any, List


class MatchingEngine:
    """
    Deterministic rule-based & heuristic 5-Dimensional college admissions
    and international financial aid matching engine.
    """

    @staticmethod
    def evaluate_academic_rigor(academic_profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Skill 1: Evaluates course rigor, standardized test standing, and grade momentum.
        Supports Test-Optional policies when SAT score is not submitted.
        """
        curr_type = academic_profile.get("curriculum_type", "AP")
        ib_pred = int(academic_profile.get("ib_predicted_score", 0) or 0)
        unweighted_gpa = float(academic_profile.get("unweighted_gpa", 3.8) or 3.8)
        weighted_gpa = float(academic_profile.get("weighted_gpa", 4.0) or 4.0)
        tests = academic_profile.get("standardized_tests", {})
        
        sat_val = tests.get("SAT") if isinstance(tests, dict) else None
        sat_score = int(sat_val) if sat_val is not None and str(sat_val).isdigit() and int(sat_val) > 0 else None

        # Tier classification (with Test-Optional support)
        if sat_score is not None:
            if (curr_type == "IB DP" and ib_pred >= 40) or (unweighted_gpa >= 3.9 and sat_score >= 1520):
                tier = "Tier 1 (Elite / Upper 1%)"
                rigor_score = 96
            elif (curr_type == "IB DP" and ib_pred >= 36) or (unweighted_gpa >= 3.75 and sat_score >= 1440):
                tier = "Tier 2 (High Rigor / Competitive)"
                rigor_score = 88
            else:
                tier = "Tier 3 (Standard Rigor / Foundation)"
                rigor_score = 78
        else:
            # Test-Optional Track
            if (curr_type == "IB DP" and ib_pred >= 40) or (unweighted_gpa >= 3.92):
                tier = "Tier 1 (Elite / Upper 1% - Test Optional)"
                rigor_score = 95
            elif (curr_type == "IB DP" and ib_pred >= 36) or (unweighted_gpa >= 3.75):
                tier = "Tier 2 (High Rigor / Competitive - Test Optional)"
                rigor_score = 87
            else:
                tier = "Tier 3 (Standard Rigor / Foundation - Test Optional)"
                rigor_score = 78

        return {
            "tier": tier,
            "rigor_score": rigor_score,
            "sat_score": sat_score,
            "ib_pred": ib_pred,
            "unweighted_gpa": unweighted_gpa,
            "weighted_gpa": weighted_gpa,
        }

    @staticmethod
    def check_english_waiver(academic_profile: Dict[str, Any]) -> bool:
        """
        Skill 5: Determines whether student qualifies for standardized English proficiency waiver.
        """
        years_in_eng = academic_profile.get("years_in_english_school", 0) or 0
        tests = academic_profile.get("standardized_tests", {})
        sat_rw = tests.get("SAT_RW") if isinstance(tests, dict) else 0
        sat_rw_num = int(sat_rw) if sat_rw and str(sat_rw).isdigit() else 0
        return years_in_eng >= 3 or sat_rw_num >= 650

    @staticmethod
    def classify_portfolio(extracurriculars: List[Dict[str, Any]]) -> str:
        """
        Skill 3: Classifies extracurricular profile into Spike vs Well-rounded.
        """
        if not extracurriculars:
            return "Well-rounded (Balanced)"
        
        spike_count = sum(
            1 for ec in extracurriculars
            if "spike" in str(ec.get("spike_classification", "")).lower() or ec.get("hours_per_week", 0) >= 10
        )
        if spike_count >= 1:
            return "Spike Focus (Specialized Leadership)"
        return "Well-rounded (Holistic Extracurriculars)"

    @staticmethod
    def estimate_sai(income: float, assets: float) -> float:
        """
        Estimates the Student Aid Index (SAI / EFC) based on household income and assets.
        """
        if income <= 35000:
            return 0.0
        if income <= 65000:
            return round(income * 0.08 + assets * 0.02, -2)
        if income <= 100000:
            return round(income * 0.18 + assets * 0.04, -2)
        if income <= 150000:
            return round(income * 0.25 + assets * 0.05, -2)
        return round(income * 0.35 + assets * 0.06, -2)

    @classmethod
    def match_colleges(
        cls,
        student_data: Dict[str, Any],
        colleges: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Full 5D pipeline execution producing structured matching results.
        """
        citizenship = student_data.get("citizenship_status", "International (No Green Card)")
        is_international = "international" in citizenship.lower()
        academic = student_data.get("academic_profile", {})
        financial = student_data.get("financial_profile", {})
        ecs = student_data.get("extracurricular_profile", [])
        
        # 1. Academic analysis
        acad_eval = cls.evaluate_academic_rigor(academic)
        toefl_waiver = cls.check_english_waiver(academic)
        ec_classification = cls.classify_portfolio(ecs)

        # 2. Financial parameters
        income = float(financial.get("household_income_usd", 70000))
        assets = float(financial.get("household_assets_usd", 100000))
        budget = float(financial.get("max_annual_budget_usd", 30000))
        req_aid = financial.get("financial_aid_required", True)
        estimated_sai = cls.estimate_sai(income, assets)

        # QuestBridge eligibility: low income <= 65k and NOT pure international living abroad
        questbridge_eligible = (income <= 65000) and (not is_international or "us high school" in citizenship.lower())

        matched_list: List[Dict[str, Any]] = []

        for col in colleges:
            coa = float(col.get("out_of_state_coa", col.get("annual_coa", 85000)))
            aid_policy = col.get("aid_policy_type", "Need-Aware")
            has_intl_aid = col.get("international_financial_aid", False)
            acceptance_rate = float(col.get("acceptance_rate", 10.0))
            col_median_sat = float(col.get("median_sat", 1500))
            sat_score = acad_eval["sat_score"]
            gpa = acad_eval["unweighted_gpa"]

            # Aid Grant Simulation
            expected_grant = 0.0
            if is_international:
                if not has_intl_aid or "no need-based" in aid_policy.lower() or "no institutional" in aid_policy.lower():
                    expected_grant = 0.0
                else:
                    if col.get("need_met_100", False):
                        expected_grant = max(0.0, coa - estimated_sai)
                    else:
                        expected_grant = float(col.get("avg_intl_grant_usd", 35000))
            else:
                # US Domestic / Citizen
                if questbridge_eligible and col.get("questbridge_partner", False):
                    expected_grant = coa
                elif col.get("need_met_100", False):
                    expected_grant = max(0.0, coa - estimated_sai)
                else:
                    expected_grant = max(0.0, coa * 0.6)

            net_price = max(0.0, coa - expected_grant)
            budget_surplus_deficit = budget - net_price

            # Academic Matching Score (0 - 100)
            if sat_score is not None:
                sat_diff = sat_score - col_median_sat
                acad_subscore = 80 + min(15, max(-20, sat_diff * 0.15)) + (gpa - 3.8) * 30
            else:
                # Test-Optional Assessment
                ib_pred = acad_eval.get("ib_pred", 0)
                rigor_boost = 6 if ib_pred >= 39 else (3 if ib_pred >= 36 else 0)
                acad_subscore = 80 + (gpa - 3.8) * 40 + rigor_boost

            match_score = int(min(98, max(55, acad_subscore)))

            # Category Allocation (Reach / Match / Safety)
            # Rule: Need-aware penalty for internationals requesting aid
            need_aware_penalty = is_international and req_aid and ("need-aware" in aid_policy.lower())
            
            if acceptance_rate <= 10.0 or (need_aware_penalty and acceptance_rate <= 20.0):
                category = "Reach"
            elif acceptance_rate > 35.0 and (sat_score >= col_median_sat if sat_score is not None else gpa >= 3.80):
                category = "Safety"
            else:
                category = "Match"

            # Construct matching reason and AI notes
            if sat_score is not None:
                acad_fit = f"{academic.get('curriculum_type', 'IB/AP')} profile and SAT {sat_score} align with institution's academic threshold."
            else:
                acad_fit = f"{academic.get('curriculum_type', 'IB/AP')} rigor (GPA {gpa}) meets Test-Optional institutional requirements."
            if is_international and req_aid:
                if aid_policy == "Need-Blind":
                    fin_fit = "Institution provides Need-Blind admissions for international students with 100% need met."
                elif has_intl_aid:
                    fin_fit = f"Institution offers aid but reviews international applicants under a Need-Aware policy (estimated net price: ${int(net_price):,})."
                else:
                    fin_fit = f"No institutional need-based aid for international students; out-of-state COA of ${int(coa):,} applies."
            else:
                fin_fit = f"Estimated family net price is ${int(net_price):,}, compared to budget ceiling of ${int(budget):,}."

            matched_list.append({
                "ipeds_id": col.get("ipeds_id", ""),
                "university_name": col.get("name", "University"),
                "matching_category": category,
                "counselor_override_category": category,
                "is_approved": True,
                "matching_score": match_score,
                "acceptance_rate": acceptance_rate,
                "financial_analysis": {
                    "estimated_coa": int(coa),
                    "expected_financial_aid_grant": int(expected_grant),
                    "net_price_for_student": int(net_price),
                    "policy_type": aid_policy,
                    "budget_surplus_deficit": int(budget_surplus_deficit)
                },
                "matching_reason": {
                    "academic_fit": acad_fit,
                    "financial_fit": fin_fit,
                    "cultural_fit": col.get("culture_profile", "Strong academic and student support community.")
                },
                "counselor_comment": "Evaluated under 5D holistic admissions framework."
            })

        # Sort: Reach first, then Match, then Safety, then by score descending
        cat_order = {"Reach": 1, "Match": 2, "Safety": 3}
        matched_list.sort(key=lambda x: (cat_order.get(x["matching_category"], 4), -x["matching_score"]))

        return {
            "student_analysis": {
                "academic_tier": acad_eval["tier"],
                "ec_profile_type": ec_classification,
                "financial_strategy": "Need-Blind Priority for Int'l Aid" if is_international else "FAFSA & Institutional Need-Met",
                "estimated_sai_usd": int(estimated_sai),
                "questbridge_eligible": questbridge_eligible,
                "toefl_waiver": toefl_waiver
            },
            "matched_universities": matched_list
        }
