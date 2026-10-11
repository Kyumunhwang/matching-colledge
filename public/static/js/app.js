/**
 * Matching College - 5D Holistic Admissions & Financial Aid Web Service
 * Frontend Application Controller
 * Lead Counsellor: Mr. David Nah (Seoul Foreign School - SFS)
 */

// Global Application State
let currentMainTab = 'counselor';
let currentCounselorTab = 'form';
let currentRosterTab = 'active'; // 'active' | 'alumni' | 'withdrawn'
let currentLanguage = 'en';

let activeStudentsData = [];
let alumniStudentsData = [];
let withdrawnStudentsData = [];
let collegesData = [];
let activeStudent = null;

let currentMatrixCategoryFilter = 'ALL';
let currentPortalCategoryFilter = 'ALL';

// Multilingual Translations Dictionary for Portal
const i18n = {
  en: {
    dossierSub: "CLASS OF 2026 ADMISSIONS DOSSIER",
    counselorVerified: "Counselor Curated • Verified",
    counselorLabel: "College Counsellor:",
    scheduleBtn: "Schedule Consultation",
    kpi1: "Curated Colleges",
    kpi1Sub: "Across Reach/Match/Safety",
    kpi2: "Max Predicted Aid",
    kpi2Sub: "Need-Blind Package",
    kpi3: "Family Budget Target",
    kpi4: "Admissions Track",
    kpi4Sub: "TOEFL Waiver Verified",
    strategyTitle: "Counselor Admissions Strategy & Recommendation",
    curatedTitle: "Counselor-Curated University List",
    curatedSub: "Evaluated against academic standing, international aid policy, and family affordability",
    cardWhyTitle: "AI Admissions Justification",
    cardCounselorNote: "Counselor's Clinical Note",
    estCoa: "Est. Total COA:",
    predAid: "Predicted Aid Grant:",
    netPrice: "Family Net Out-of-Pocket:"
  },
  ko: {
    dossierSub: "2026학년도 대학 입시 전략 심층 보고서",
    counselorVerified: "전담 카운셀러 승인 • 실시간 검증 완료",
    counselorLabel: "진학 총괄 카운셀러:",
    scheduleBtn: "카운셀러 면담 예약",
    kpi1: "최종 추천 대학 수",
    kpi1Sub: "상향/적정/안정 종합 매칭",
    kpi2: "최대 예측 장학금",
    kpi2Sub: "Need-Blind 패키지 기준",
    kpi3: "가구 연간 예산 상한선",
    kpi4: "지원 전형 트랙",
    kpi4Sub: "TOEFL 면제 확인 완료",
    strategyTitle: "카운셀러 입시 총괄 전략 및 제언",
    curatedTitle: "카운셀러 공인 추천 대학 리스트",
    curatedSub: "학업 역량, 국제학생 장학금 수령 가능성, 가정 실부담금을 종합 검증한 대학",
    cardWhyTitle: "AI 5차원 매칭 사유",
    cardCounselorNote: "카운셀러 전문 조언",
    estCoa: "연간 총비용 (COA):",
    predAid: "예측 장학금 (Grant):",
    netPrice: "가정 실부담금 (Net Price):"
  },
  zh: {
    dossierSub: "2026届大学录取策略综合报告",
    counselorVerified: "升学顾问已核实 • 实时验证",
    counselorLabel: "升学指导顾问:",
    scheduleBtn: "预约升学面谈",
    kpi1: "最终推荐大学数",
    kpi1Sub: "冲刺/匹配/保底综合匹配",
    kpi2: "最高预测助学金",
    kpi2Sub: "无视需求政策基准",
    kpi3: "家庭年度预算上限",
    kpi4: "录取评估通道",
    kpi4Sub: "托福免除资格已认证",
    strategyTitle: "升学顾问总体战略与建议",
    curatedTitle: "升学顾问核准推荐大学名单",
    curatedSub: "综合评估学术实力、国际生助学金政策与家庭实际负担",
    cardWhyTitle: "AI 5维综合匹配依据",
    cardCounselorNote: "升学顾问专业批注",
    estCoa: "年度总费用 (COA):",
    predAid: "预计助学金 (Grant):",
    netPrice: "家庭净负担 (Net Price):"
  }
};

// ==========================================
// DYNAMIC ACADEMIC YEAR (AY) CALCULATION
// ==========================================
function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  // August(8) or later is the start of the new academic year
  return month >= 8 ? `AY ${year}-${year + 1}` : `AY ${year - 1}-${year}`;
}

function updateAcademicYearDisplay() {
  const ay = getCurrentAcademicYear();
  const headerBadge = document.getElementById('academicYearBadge');
  if (headerBadge) headerBadge.textContent = ay;
  const portalSync = document.getElementById('portalSyncTime');
  if (portalSync) portalSync.textContent = `Synchronized ${ay}`;
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  updateAcademicYearDisplay();
  await fetchInitialData();
  setupEventListeners();
});

async function fetchInitialData() {
  try {
    const [resActive, resColleges, resGrad, resWith] = await Promise.all([
      fetch('/api/students'),
      fetch('/api/colleges'),
      fetch('/api/students/archives/graduated'),
      fetch('/api/students/archives/withdrawn')
    ]);

    activeStudentsData = await resActive.json();
    collegesData = await resColleges.json();
    alumniStudentsData = await resGrad.json();
    withdrawnStudentsData = await resWith.json();

    updateRosterCountBadges();

    if (activeStudentsData.length > 0) {
      activeStudent = activeStudentsData[0]; // David Kim default
    }

    renderStudentRoster();
    renderActiveStudentForm();
    renderMatchMatrix();
    renderPortalView();
    renderCollegesTable();

    document.getElementById('totalCollegesCountBadge').textContent = `${collegesData.length} Active`;
  } catch (err) {
    showToast('Failed to load initial server data', 'error');
    console.error(err);
  }
}

function updateRosterCountBadges() {
  document.getElementById('countActiveBadge').textContent = activeStudentsData.length;
  document.getElementById('countAlumniBadge').textContent = alumniStudentsData.length;
  document.getElementById('countWithdrawnBadge').textContent = withdrawnStudentsData.length;
}

// ==========================================
// NAVIGATION & MAIN TAB SWITCHING
// ==========================================
function switchMainTab(tab) {
  currentMainTab = tab;
  
  // Views
  document.getElementById('view-counselor').classList.toggle('hidden', tab !== 'counselor');
  document.getElementById('view-portal').classList.toggle('hidden', tab !== 'portal');
  document.getElementById('view-masterdb').classList.toggle('hidden', tab !== 'masterdb');

  // Nav buttons
  ['counselor', 'portal', 'masterdb'].forEach(t => {
    const btn = document.getElementById(`nav-${t}`);
    if (t === tab) {
      btn.className = "h-16 inline-flex items-center px-1 font-body-md text-sm border-b-2 border-secondary text-secondary font-semibold transition-colors";
    } else {
      btn.className = "h-16 inline-flex items-center px-1 font-body-md text-sm border-b-2 border-transparent text-on-surface-variant hover:text-navy-deep transition-colors";
    }
  });

  if (tab === 'portal') {
    renderPortalView();
  }
}

function switchCounselorTab(subTab) {
  currentCounselorTab = subTab;
  document.getElementById('counselor-section-form').classList.toggle('hidden', subTab !== 'form');
  document.getElementById('counselor-section-matrix').classList.toggle('hidden', subTab !== 'matrix');

  const btnForm = document.getElementById('counselor-tab-form');
  const btnMatrix = document.getElementById('counselor-tab-matrix');

  if (subTab === 'form') {
    btnForm.className = "px-4 py-2.5 border-b-2 border-secondary font-headline-sm text-sm text-secondary font-semibold flex items-center gap-2 bg-sapphire-subtle/50 rounded-t-lg";
    btnMatrix.className = "px-4 py-2.5 border-b-2 border-transparent font-body-md text-sm text-on-surface-variant hover:text-navy-deep flex items-center gap-2 transition-colors";
  } else {
    btnMatrix.className = "px-4 py-2.5 border-b-2 border-secondary font-headline-sm text-sm text-secondary font-semibold flex items-center gap-2 bg-sapphire-subtle/50 rounded-t-lg";
    btnForm.className = "px-4 py-2.5 border-b-2 border-transparent font-body-md text-sm text-on-surface-variant hover:text-navy-deep flex items-center gap-2 transition-colors";
    renderMatchMatrix();
  }
}

// ==========================================
// STUDENT ROSTER CONTROLLER & LIFECYCLE
// ==========================================
function switchRosterFilter(filterTab) {
  currentRosterTab = filterTab;

  ['active', 'alumni', 'withdrawn'].forEach(t => {
    const btn = document.getElementById(`tab-roster-${t}`);
    if (t === filterTab) {
      btn.className = "flex-1 py-1.5 rounded-lg bg-slate-card text-secondary shadow-sm text-center transition-all font-bold";
    } else {
      btn.className = "flex-1 py-1.5 rounded-lg text-on-surface-variant hover:text-navy-deep text-center transition-all font-semibold";
    }
  });

  renderStudentRoster();
}

function getRosterCurrentList() {
  if (currentRosterTab === 'alumni') return alumniStudentsData;
  if (currentRosterTab === 'withdrawn') return withdrawnStudentsData;
  return activeStudentsData;
}

function renderStudentRoster() {
  const container = document.getElementById('studentListContainer');
  container.innerHTML = '';

  const filterText = (document.getElementById('studentSearchInput').value || '').toLowerCase();
  const currentList = getRosterCurrentList();

  if (currentList.length === 0) {
    const emptyMsg = currentRosterTab === 'active' ? 'No active students in roster.' :
      currentRosterTab === 'alumni' ? 'No archived alumni records yet.' : 'No withdrawn student records.';
    container.innerHTML = `<div class="p-4 text-center text-xs text-on-surface-variant">${emptyMsg}</div>`;
    return;
  }

  currentList.forEach(student => {
    if (filterText && !student.name.toLowerCase().includes(filterText) && !student.korean_name.toLowerCase().includes(filterText)) {
      return;
    }

    const isActive = activeStudent && activeStudent.id === student.id;
    const item = document.createElement('div');
    item.className = `p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
      isActive
        ? 'bg-sapphire-subtle/70 border-secondary shadow-sm'
        : 'bg-slate-card border-slate-border hover:border-slate-border-strong hover:bg-slate-surface'
    }`;

    // Tag badge depending on tab
    let statusBadge = '';
    if (currentRosterTab === 'active') {
      const isPublished = student.simulation && student.simulation.is_published;
      statusBadge = isPublished
        ? '<span class="px-1.5 py-0.5 rounded text-[10px] bg-aid-grant-surface text-aid-grant-green font-semibold">Published</span>'
        : '<span class="px-1.5 py-0.5 rounded text-[10px] bg-caution-amber-surface text-amber-700 font-semibold">Draft Muted</span>';
    } else if (currentRosterTab === 'alumni') {
      statusBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold font-mono-num">Alumni '${student.graduation_year || 2026}</span>`;
    } else if (currentRosterTab === 'withdrawn') {
      statusBadge = `<span class="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 font-bold font-mono-num">Withdrawn '${student.withdrawn_year || 2026}</span>`;
    }

    item.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-headline-sm text-xs font-bold text-navy-deep">${student.name} <span class="text-on-surface-variant font-normal">(${student.korean_name})</span></span>
        ${statusBadge}
      </div>
      <div class="flex items-center justify-between text-[11px] text-on-surface-variant font-mono-num">
        <span>${student.cohort || 'IBDP Cohort Alpha'}</span>
        <span>${student.academic_profile?.curriculum_type || 'IB'} • SAT ${student.academic_profile?.standardized_tests?.SAT || '-'}</span>
      </div>
    `;

    item.onclick = () => {
      activeStudent = student;
      renderStudentRoster();
      renderActiveStudentForm();
      renderMatchMatrix();
      renderPortalView();
    };

    container.appendChild(item);
  });
}

// ==========================================
// 5D FORM RENDERING & LIVE BINDING
// ==========================================
function renderActiveStudentForm() {
  if (!activeStudent) return;

  const acad = activeStudent.academic_profile || {};
  const fin = activeStudent.financial_profile || {};
  const pref = activeStudent.preferences || {};
  const sim = activeStudent.simulation || {};

  // Header badges
  document.getElementById('studentAvatarInitials').textContent = activeStudent.name.split(' ').map(n => n[0]).join('');
  document.getElementById('studentDisplayName').innerHTML = `${activeStudent.name} <span class="text-on-surface-variant font-medium text-sm" id="studentKoreanName">(${activeStudent.korean_name})</span>`;
  document.getElementById('studentIdBadge').textContent = `ID #${activeStudent.id}`;
  document.getElementById('studentCohortBadge').innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>${activeStudent.cohort || 'IBDP Cohort Alpha'}`;
  document.getElementById('studentSchool').textContent = activeStudent.school || 'Seoul Foreign School (SFS)';
  document.getElementById('studentGrade').textContent = `Grade ${activeStudent.grade || 12} (Class of 2026)`;
  
  const isIntl = (activeStudent.citizenship_status || '').toLowerCase().includes('international');
  document.getElementById('studentCitizenshipBadge').textContent = isIntl ? 'International Track' : 'US Domestic Track';
  document.getElementById('studentCitizenshipBadge').className = isIntl ? 'font-medium text-amber-600' : 'font-medium text-secondary';

  // Firewall State
  const isPublished = sim.is_published === true;
  const firewallBadge = document.getElementById('studentFirewallBadge');
  const headerFirewallStatus = document.getElementById('headerFirewallStatus');
  const firewallStatusText = document.getElementById('firewallStatusText');
  const firewallIconBox = document.getElementById('firewallIconBox');

  if (activeStudent.status === 'WITHDRAWN') {
    firewallBadge.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold";
    firewallBadge.innerHTML = `<span class="material-symbols-outlined text-[14px]">archive</span>Withdrawn in ${activeStudent.withdrawn_year || 2026}`;
  } else if (activeStudent.status === 'GRADUATED') {
    firewallBadge.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold";
    firewallBadge.innerHTML = `<span class="material-symbols-outlined text-[14px]">workspace_premium</span>Alumni (${activeStudent.graduation_year || 2026})`;
  } else if (isPublished) {
    firewallBadge.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-aid-grant-surface text-aid-grant-green text-xs font-semibold";
    firewallBadge.innerHTML = '<span class="material-symbols-outlined text-[14px]">verified</span>Published to Client';
    headerFirewallStatus.textContent = "VERIFIED (CLIENT LIVE)";
    headerFirewallStatus.className = "text-aid-grant-green";
    firewallStatusText.textContent = "PUBLISHED TO CLIENT PORTAL";
    firewallStatusText.className = "text-xs font-mono-num font-bold tracking-wider text-aid-grant-green";
    firewallIconBox.className = "w-10 h-10 rounded-xl bg-aid-grant-surface text-aid-grant-green flex items-center justify-center";
    firewallIconBox.innerHTML = '<span class="material-symbols-outlined text-[24px]">verified_user</span>';
  } else {
    firewallBadge.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-caution-amber-surface text-amber-700 text-xs font-semibold";
    firewallBadge.innerHTML = '<span class="material-symbols-outlined text-[14px]">lock_clock</span>Firewall Active (Draft Muted)';
    headerFirewallStatus.textContent = "ACTIVE (CLIENT MUTED)";
    headerFirewallStatus.className = "text-amber-600";
    firewallStatusText.textContent = "SECURITY FIREWALL ACTIVE : CLIENT MUTED";
    firewallStatusText.className = "text-xs font-mono-num font-bold tracking-wider text-amber-600";
    firewallIconBox.className = "w-10 h-10 rounded-xl bg-caution-amber-surface text-amber-600 flex items-center justify-center";
    firewallIconBox.innerHTML = '<span class="material-symbols-outlined text-[24px]">lock_clock</span>';
  }

  // Academic inputs
  document.getElementById('inpCurriculumType').value = acad.curriculum_type || 'IB DP';
  document.getElementById('inpIbPredicted').value = acad.ib_predicted_score || 40;
  document.getElementById('inpUnweightedGpa').value = acad.unweighted_gpa || 3.9;
  document.getElementById('inpWeightedGpa').value = acad.weighted_gpa || 4.3;
  document.getElementById('inpSatTotal').value = acad.standardized_tests?.SAT || 1500;
  document.getElementById('inpSatRw').value = acad.standardized_tests?.SAT_RW || 730;
  document.getElementById('inpEnglishYears').value = acad.years_in_english_school || 4;
  
  const toeflOk = (acad.years_in_english_school >= 3) || (acad.standardized_tests?.SAT_RW >= 650);
  const englishWaiverBadge = document.getElementById('englishWaiverBadge');
  englishWaiverBadge.textContent = toeflOk ? "QUALIFIED (>= 3 Yrs / SAT RW >= 650)" : "REQUIRED (TOEFL / IELTS Needed)";
  englishWaiverBadge.className = toeflOk ? "font-bold text-aid-grant-green" : "font-bold text-amber-600";

  // Financial inputs
  document.getElementById('inpCitizenship').value = activeStudent.citizenship_status || "International (No Green Card)";
  document.getElementById('inpIncome').value = fin.household_income_usd || 75000;
  document.getElementById('inpAssets').value = fin.household_assets_usd || 150000;
  document.getElementById('inpBudget').value = fin.max_annual_budget_usd || 25000;
  updateBudgetDisplay();
  recalcSai();

  // Activities
  renderActivitiesList(activeStudent.extracurricular_profile || []);

  // Preferences
  document.getElementById('inpMajor').value = acad.intended_major || "Computer Science";
  document.getElementById('inpPrefSetting').value = pref.campus_setting || "Suburban or Urban";

  // Counselor Notes
  document.getElementById('inpCounselorMasterNote').value = sim.counselor_override_note || "";
}

function renderActivitiesList(activities) {
  const container = document.getElementById('ecActivitiesContainer');
  container.innerHTML = '';

  activities.forEach((act) => {
    const card = document.createElement('div');
    card.className = "p-3 rounded-lg border border-slate-border bg-slate-surface text-xs flex flex-col gap-1.5";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-bold text-navy-deep">${act.activity_name}</span>
        <span class="px-2 py-0.5 rounded text-[10px] font-mono-num font-semibold ${
          (act.spike_classification || '').includes('Spike') ? 'bg-sapphire-subtle text-secondary' : 'bg-gray-200 text-gray-700'
        }">${act.spike_classification || 'Activity'}</span>
      </div>
      <div class="text-on-surface-variant font-mono-num text-[11px]">
        Role: <strong class="text-navy-deep">${act.role}</strong> • ${act.duration_years} yrs • ${act.hours_per_week} hrs/wk
      </div>
      <p class="text-[11px] text-on-surface-variant leading-tight">${act.impact}</p>
    `;
    container.appendChild(card);
  });
}

function updateBudgetDisplay() {
  const val = document.getElementById('inpBudget').value;
  document.getElementById('budgetValDisplay').textContent = `$${Number(val).toLocaleString()} / yr`;
}

function recalcSai() {
  const income = parseFloat(document.getElementById('inpIncome').value) || 0;
  const assets = parseFloat(document.getElementById('inpAssets').value) || 0;
  let sai = 0;
  if (income <= 35000) sai = 0;
  else if (income <= 65000) sai = Math.round(income * 0.08 + assets * 0.02);
  else if (income <= 100000) sai = Math.round(income * 0.18 + assets * 0.04);
  else sai = Math.round(income * 0.30 + assets * 0.05);

  document.getElementById('saiDisplay').textContent = `Est. SAI: $${sai.toLocaleString()}`;

  const isIntl = (document.getElementById('inpCitizenship').value).includes('International');
  const qbStatus = document.getElementById('questbridgeStatusBadge');
  if (!isIntl && income <= 65000) {
    qbStatus.textContent = "ELIGIBLE (Income <= $65k & US Citizen)";
    qbStatus.className = "font-bold text-aid-grant-green";
  } else {
    qbStatus.textContent = isIntl ? "Not Eligible (International Student)" : "Not Eligible (Income > $65k)";
    qbStatus.className = "font-bold text-gray-500";
  }
}

function handleCitizenshipChange() {
  recalcSai();
  const isIntl = (document.getElementById('inpCitizenship').value).includes('International');
  document.getElementById('studentCitizenshipBadge').textContent = isIntl ? 'International Track' : 'US Domestic Track';
  document.getElementById('studentCitizenshipBadge').className = isIntl ? 'font-medium text-amber-600' : 'font-medium text-secondary';
}

// ==========================================
// MODAL: REGISTER NEW STUDENT
// ==========================================
function openNewStudentModal() {
  document.getElementById('modalNewStudent').classList.remove('hidden');
}

function closeNewStudentModal() {
  document.getElementById('modalNewStudent').classList.add('hidden');
}

async function submitNewStudent() {
  const name = document.getElementById('addStudentName').value.trim();
  const koreanName = document.getElementById('addStudentKoreanName').value.trim();

  if (!name || !koreanName) {
    showToast('Student English Name and Korean Name are required.', 'error');
    return;
  }

  const payload = {
    name: name,
    korean_name: koreanName,
    school: document.getElementById('addStudentSchool').value.trim() || 'Seoul Foreign School (SFS)',
    grade: parseInt(document.getElementById('addStudentGrade').value) || 12,
    cohort: document.getElementById('addStudentCohort').value.trim() || 'IBDP Cohort Alpha',
    citizenship_status: document.getElementById('addStudentCitizenship').value,
    curriculum_type: document.getElementById('addStudentCurriculum').value,
    ib_predicted_score: parseInt(document.getElementById('addStudentIb').value) || 40,
    unweighted_gpa: parseFloat(document.getElementById('addStudentGpa').value) || 3.90,
    sat_score: parseInt(document.getElementById('addStudentSat').value) || 1500,
    household_income_usd: parseFloat(document.getElementById('addStudentIncome').value) || 85000,
    max_annual_budget_usd: parseFloat(document.getElementById('addStudentBudget').value) || 25000,
    intended_major: document.getElementById('addStudentMajor').value.trim() || 'Computer Science'
  };

  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.status === 'success') {
      activeStudentsData.push(data.student);
      activeStudent = data.student;
      closeNewStudentModal();
      updateRosterCountBadges();
      switchRosterFilter('active');
      renderActiveStudentForm();
      showToast(`Student ${name} successfully registered to SFS roster!`, 'success');
    }
  } catch (err) {
    showToast('Failed to register student.', 'error');
  }
}

// ==========================================
// MODAL: WITHDRAW STUDENT (자퇴 처리)
// ==========================================
function openWithdrawModal() {
  if (!activeStudent) return;
  document.getElementById('withdrawStudentTargetName').textContent = `${activeStudent.name} (${activeStudent.korean_name})`;
  document.getElementById('withdrawYearInput').value = new Date().getFullYear();
  document.getElementById('modalWithdrawStudent').classList.remove('hidden');
}

function closeWithdrawModal() {
  document.getElementById('modalWithdrawStudent').classList.add('hidden');
}

async function confirmWithdrawStudent() {
  if (!activeStudent) return;
  const year = parseInt(document.getElementById('withdrawYearInput').value) || new Date().getFullYear();
  const reason = document.getElementById('withdrawReasonInput').value.trim() || 'Transfer to overseas school';

  try {
    const res = await fetch(`/api/students/${activeStudent.id}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ withdrawn_year: year, reason: reason })
    });
    const data = await res.json();
    if (data.status === 'success') {
      // Move student locally
      const archivedStudent = { ...activeStudent, status: 'WITHDRAWN', withdrawn_year: year, withdrawn_reason: reason };
      activeStudentsData = activeStudentsData.filter(s => s.id !== activeStudent.id);
      withdrawnStudentsData.push(archivedStudent);

      closeWithdrawModal();
      updateRosterCountBadges();

      activeStudent = activeStudentsData.length > 0 ? activeStudentsData[0] : null;
      renderStudentRoster();
      renderActiveStudentForm();
      showToast(`Student successfully archived to Withdrawn repository (${year}).`, 'success');
    }
  } catch (err) {
    showToast('Withdrawal process failed.', 'error');
  }
}

// ==========================================
// MODAL: GRADUATE STUDENT (졸업 처리)
// ==========================================
function openGraduateModal() {
  if (!activeStudent) return;
  document.getElementById('graduateStudentTargetName').textContent = `${activeStudent.name} (${activeStudent.korean_name})`;
  document.getElementById('graduateYearInput').value = new Date().getFullYear();
  document.getElementById('modalGraduateStudent').classList.remove('hidden');
}

function closeGraduateModal() {
  document.getElementById('modalGraduateStudent').classList.add('hidden');
}

async function confirmGraduateStudent() {
  if (!activeStudent) return;
  const year = parseInt(document.getElementById('graduateYearInput').value) || new Date().getFullYear();
  const matriculation = document.getElementById('graduateMatriculationInput').value.trim() || 'Harvard University';

  try {
    const res = await fetch(`/api/students/${activeStudent.id}/graduate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graduation_year: year, final_matriculation: matriculation })
    });
    const data = await res.json();
    if (data.status === 'success') {
      // Move student locally
      const archivedStudent = { ...activeStudent, status: 'GRADUATED', graduation_year: year, final_matriculation: matriculation };
      activeStudentsData = activeStudentsData.filter(s => s.id !== activeStudent.id);
      alumniStudentsData.push(archivedStudent);

      closeGraduateModal();
      updateRosterCountBadges();

      activeStudent = activeStudentsData.length > 0 ? activeStudentsData[0] : null;
      renderStudentRoster();
      renderActiveStudentForm();
      showToast(`Student successfully recorded as graduated alumni (${year}).`, 'success');
    }
  } catch (err) {
    showToast('Graduation process failed.', 'error');
  }
}

// ==========================================
// SIMULATION & API EXECUTION
// ==========================================
async function saveStudentProfile() {
  if (!activeStudent) return;

  const updatedPayload = {
    citizenship_status: document.getElementById('inpCitizenship').value,
    academic_profile: {
      ...activeStudent.academic_profile,
      curriculum_type: document.getElementById('inpCurriculumType').value,
      ib_predicted_score: parseInt(document.getElementById('inpIbPredicted').value) || 40,
      unweighted_gpa: parseFloat(document.getElementById('inpUnweightedGpa').value) || 3.9,
      weighted_gpa: parseFloat(document.getElementById('inpWeightedGpa').value) || 4.3,
      standardized_tests: {
        ...activeStudent.academic_profile?.standardized_tests,
        SAT: parseInt(document.getElementById('inpSatTotal').value) || 1500,
        SAT_RW: parseInt(document.getElementById('inpSatRw').value) || 720
      },
      years_in_english_school: parseInt(document.getElementById('inpEnglishYears').value) || 4,
      intended_major: document.getElementById('inpMajor').value
    },
    financial_profile: {
      ...activeStudent.financial_profile,
      household_income_usd: parseFloat(document.getElementById('inpIncome').value) || 80000,
      household_assets_usd: parseFloat(document.getElementById('inpAssets').value) || 150000,
      max_annual_budget_usd: parseFloat(document.getElementById('inpBudget').value) || 25000
    },
    preferences: {
      ...activeStudent.preferences,
      campus_setting: document.getElementById('inpPrefSetting').value
    }
  };

  try {
    const res = await fetch(`/api/students/${activeStudent.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPayload)
    });
    const data = await res.json();
    if (data.status === 'success') {
      activeStudent = data.student;
      showToast('Student profile successfully saved.', 'success');
      renderStudentRoster();
    }
  } catch (err) {
    showToast('Failed to save student profile.', 'error');
    console.error(err);
  }
}

async function triggerSimulation() {
  if (!activeStudent) return;

  const btn = document.getElementById('btnRunSim');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined text-[16px] animate-spin">refresh</span><span>Running 5D Engine...</span>`;

  showToast('Executing 5-Dimensional admissions & financial simulation...', 'info');

  try {
    await saveStudentProfile();

    const res = await fetch(`/api/simulation/run/${activeStudent.id}`, {
      method: 'POST'
    });
    const result = await res.json();

    if (result.status === 'success') {
      activeStudent.simulation = result.simulation;
      showToast('5D Simulation completed! Results loaded into Match Matrix.', 'success');
      switchCounselorTab('matrix');
      renderActiveStudentForm();
      renderMatchMatrix();
    } else {
      showToast('Simulation failed to complete.', 'error');
    }
  } catch (err) {
    showToast('Simulation request error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// ==========================================
// MATCH MATRIX & COUNSELOR OVERRIDES
// ==========================================
function filterMatrixCategory(cat) {
  currentMatrixCategoryFilter = cat;
  renderMatchMatrix();
}

function renderMatchMatrix() {
  const tbody = document.getElementById('matrixTableBody');
  tbody.innerHTML = '';

  const sim = activeStudent?.simulation || {};
  const list = sim.matched_universities || [];

  document.getElementById('matchMatrixCountBadge').textContent = list.length;

  const filtered = list.filter(u => {
    if (currentMatrixCategoryFilter === 'ALL') return true;
    return u.matching_category === currentMatrixCategoryFilter || u.counselor_override_category === currentMatrixCategoryFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-on-surface-variant font-medium">No institution matches found. Run simulation to populate.</td></tr>`;
    return;
  }

  filtered.forEach(u => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-surface transition-colors";

    const catBadgeClass = {
      'Reach': 'bg-badge-reach-bg text-badge-reach-text',
      'Match': 'bg-badge-match-bg text-badge-match-text',
      'Safety': 'bg-badge-safety-bg text-badge-safety-text'
    }[u.matching_category] || 'bg-gray-100 text-gray-800';

    const netPrice = u.financial_analysis?.net_price_for_student || 0;
    const estCoa = u.financial_analysis?.estimated_coa || 0;
    const grant = u.financial_analysis?.expected_financial_aid_grant || 0;

    tr.innerHTML = `
      <td class="py-3 px-4">
        <input type="checkbox" ${u.is_approved ? 'checked' : ''} onchange="toggleUniversityApproval('${u.ipeds_id}', this.checked)" class="w-4 h-4 rounded text-secondary cursor-pointer"/>
      </td>
      <td class="py-3 px-4 font-semibold text-navy-deep">
        ${u.university_name}
        <div class="text-[10px] text-on-surface-variant font-mono-num">${u.financial_analysis?.policy_type || 'Need-Aware'} • IPEDS #${u.ipeds_id}</div>
      </td>
      <td class="py-3 px-4 font-mono-num font-bold text-secondary">${u.matching_score}%</td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${catBadgeClass}">${u.matching_category}</span>
      </td>
      <td class="py-3 px-4">
        <select onchange="overrideCategory('${u.ipeds_id}', this.value)" class="px-2 py-1 rounded border border-slate-border text-xs bg-slate-card text-navy-deep font-semibold">
          <option value="Reach" ${u.matching_category === 'Reach' ? 'selected' : ''}>Reach</option>
          <option value="Match" ${u.matching_category === 'Match' ? 'selected' : ''}>Match</option>
          <option value="Safety" ${u.matching_category === 'Safety' ? 'selected' : ''}>Safety</option>
        </select>
      </td>
      <td class="py-3 px-4 font-mono-num">$${estCoa.toLocaleString()}</td>
      <td class="py-3 px-4 font-mono-num text-aid-grant-green font-semibold">$${grant.toLocaleString()}</td>
      <td class="py-3 px-4 font-mono-num text-cost-alert-red font-semibold">$${netPrice.toLocaleString()}</td>
      <td class="py-3 px-4">
        <input type="text" value="${u.counselor_comment || ''}" onchange="overrideComment('${u.ipeds_id}', this.value)" class="w-full px-2 py-1 rounded border border-slate-border text-xs bg-slate-surface text-navy-deep" placeholder="Add counselor clinical note..."/>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function overrideCategory(ipedsId, newCat) {
  try {
    const res = await fetch(`/api/simulation/override/${activeStudent.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipeds_id: ipedsId, category: newCat })
    });
    const data = await res.json();
    if (data.status === 'success') {
      activeStudent.simulation = data.simulation;
      showToast(`Category updated to ${newCat}`, 'info');
      renderMatchMatrix();
    }
  } catch (err) {
    showToast('Failed to update category.', 'error');
  }
}

async function overrideComment(ipedsId, comment) {
  try {
    await fetch(`/api/simulation/override/${activeStudent.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipeds_id: ipedsId, comment: comment })
    });
    showToast('Comment saved.', 'info');
  } catch (err) {
    showToast('Failed to save comment.', 'error');
  }
}

async function toggleUniversityApproval(ipedsId, isApproved) {
  try {
    const res = await fetch(`/api/simulation/override/${activeStudent.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ipeds_id: ipedsId, is_approved: isApproved })
    });
    const data = await res.json();
    if (data.status === 'success') {
      activeStudent.simulation = data.simulation;
      showToast(`Visibility updated`, 'info');
    }
  } catch (err) {
    showToast('Failed to toggle approval state.', 'error');
  }
}

async function saveCounselorNote() {
  const note = document.getElementById('inpCounselorMasterNote').value;
  try {
    const res = await fetch(`/api/simulation/override/${activeStudent.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ general_note: note })
    });
    const data = await res.json();
    if (data.status === 'success') {
      activeStudent.simulation = data.simulation;
      showToast('Master Counselor Strategy Note saved.', 'success');
    }
  } catch (err) {
    showToast('Failed to save note.', 'error');
  }
}

async function publishToPortal() {
  if (!activeStudent) return;
  try {
    const res = await fetch(`/api/simulation/publish/${activeStudent.id}`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data.status === 'success') {
      activeStudent.simulation.is_published = true;
      activeStudent.simulation.firewall_status = "PUBLISHED_TO_CLIENT";
      showToast('Dossier successfully published to Client Portal!', 'success');
      renderActiveStudentForm();
      renderPortalView();
    }
  } catch (err) {
    showToast('Failed to publish dossier.', 'error');
  }
}

// ==========================================
// STUDENT & PARENT PORTAL CONTROLLER
// ==========================================
function setPortalLanguage(lang) {
  currentLanguage = lang;
  ['en', 'ko', 'zh'].forEach(l => {
    const b = document.getElementById(`lang-${l}`);
    if (l === lang) {
      b.className = "px-3 py-1.5 rounded-lg bg-slate-card text-navy-deep font-semibold shadow-sm text-xs transition-colors";
    } else {
      b.className = "px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-navy-deep text-xs transition-colors";
    }
  });
  renderPortalView();
}

function renderPortalCards(cat) {
  currentPortalCategoryFilter = cat;
  renderPortalView();
}

function renderPortalView() {
  if (!activeStudent) return;

  const t = i18n[currentLanguage] || i18n.en;
  const sim = activeStudent.simulation || {};
  const list = (sim.matched_universities || []).filter(u => u.is_approved !== false);

  // Text translations
  document.getElementById('portalStudentName').innerHTML = `${activeStudent.name} <span class="text-on-surface-variant font-normal text-lg" id="portalStudentKoreanName">(${activeStudent.korean_name} • Grade ${activeStudent.grade || 12})</span>`;
  document.getElementById('portalSchoolName').textContent = activeStudent.school || 'Seoul Foreign School (SFS)';
  document.getElementById('txtCounselorSchedule').textContent = t.scheduleBtn;
  document.getElementById('kpiLabel1').textContent = t.kpi1;
  document.getElementById('kpiLabel2').textContent = t.kpi2;
  document.getElementById('kpiLabel3').textContent = t.kpi3;
  document.getElementById('kpiLabel4').textContent = t.kpi4;
  document.getElementById('txtCounselorAdviceTitle').textContent = t.strategyTitle;
  document.getElementById('txtApprovedHeader').textContent = t.curatedTitle;
  document.getElementById('txtApprovedSubheader').textContent = t.curatedSub;

  document.getElementById('portalApprovedCount').textContent = list.length;
  document.getElementById('portalBudgetTarget').textContent = `$${(activeStudent.financial_profile?.max_annual_budget_usd || 25000).toLocaleString()}`;
  document.getElementById('portalSaiText').textContent = `Est. Family SAI: $${(activeStudent.financial_profile?.estimated_sai_usd || 18500).toLocaleString()}`;

  const maxGrant = list.reduce((m, u) => Math.max(m, u.financial_analysis?.expected_financial_aid_grant || 0), 0);
  document.getElementById('portalMaxAid').textContent = `$${maxGrant.toLocaleString()}`;

  document.getElementById('portalCounselorNote').textContent = sim.counselor_override_note || "Counselor evaluation in progress.";

  const cardsContainer = document.getElementById('portalCardsContainer');
  cardsContainer.innerHTML = '';

  const filtered = list.filter(u => {
    if (currentPortalCategoryFilter === 'ALL') return true;
    return u.matching_category === currentPortalCategoryFilter;
  });

  if (filtered.length === 0) {
    cardsContainer.innerHTML = `<div class="col-span-3 text-center py-12 text-on-surface-variant font-medium">No verified matches in this category.</div>`;
    return;
  }

  filtered.forEach(u => {
    const fin = u.financial_analysis || {};
    const coa = fin.estimated_coa || 85000;
    const grant = fin.expected_financial_aid_grant || 0;
    const net = fin.net_price_for_student || coa;

    const grantPct = Math.min(100, Math.round((grant / coa) * 100));
    const netPct = Math.max(0, 100 - grantPct);

    const catBadgeClass = {
      'Reach': 'bg-badge-reach-bg text-badge-reach-text',
      'Match': 'bg-badge-match-bg text-badge-match-text',
      'Safety': 'bg-badge-safety-bg text-badge-safety-text'
    }[u.matching_category] || 'bg-gray-100 text-gray-800';

    const card = document.createElement('div');
    card.className = "bg-slate-card rounded-2xl p-6 shadow-sm border border-slate-border flex flex-col justify-between hover:shadow-md transition-shadow";

    card.innerHTML = `
      <div class="flex flex-col gap-4">
        <!-- HEADER -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center font-bold text-secondary text-sm font-headline-md">
              ${u.university_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 class="font-headline-sm text-sm font-bold text-navy-deep leading-tight">${u.university_name}</h3>
              <span class="text-[11px] text-on-surface-variant font-mono-num">${fin.policy_type || 'Need-Aware'}</span>
            </div>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${catBadgeClass}">${u.matching_category}</span>
        </div>

        <!-- 3-METRIC SUMMARY -->
        <div class="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-surface border border-slate-border text-center text-xs">
          <div>
            <span class="text-[10px] text-on-surface-variant uppercase font-mono-num">Admit Rate</span>
            <div class="font-bold font-mono-num text-navy-deep mt-0.5">${u.acceptance_rate || 5.0}%</div>
          </div>
          <div>
            <span class="text-[10px] text-on-surface-variant uppercase font-mono-num">5D Score</span>
            <div class="font-bold font-mono-num text-secondary mt-0.5">${u.matching_score || 90}%</div>
          </div>
          <div>
            <span class="text-[10px] text-on-surface-variant uppercase font-mono-num">Need-Met</span>
            <div class="font-bold font-mono-num text-aid-grant-green mt-0.5">100%</div>
          </div>
        </div>

        <!-- DUAL-FILL FINANCIAL AFFORDABILITY GAUGE -->
        <div class="flex flex-col gap-1.5 pt-1">
          <div class="flex items-center justify-between text-xs font-mono-num">
            <span class="text-on-surface-variant">${t.estCoa} <strong class="text-navy-deep">$${coa.toLocaleString()}</strong></span>
            <span class="text-aid-grant-green font-semibold">${grantPct}% Aid Covered</span>
          </div>

          <div class="w-full h-3 rounded-full bg-slate-border overflow-hidden flex shadow-inner">
            <div style="width: ${grantPct}%" class="bg-aid-grant-green h-full transition-all" title="Grant: $${grant.toLocaleString()}"></div>
            <div style="width: ${netPct}%" class="bg-cost-alert-red h-full transition-all" title="Family Net Price: $${net.toLocaleString()}"></div>
          </div>

          <div class="flex items-center justify-between text-[11px] font-mono-num mt-0.5">
            <span class="text-aid-grant-green font-semibold flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-aid-grant-green"></span>${t.predAid} $${grant.toLocaleString()}
            </span>
            <span class="text-cost-alert-red font-semibold flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-cost-alert-red"></span>${t.netPrice} $${net.toLocaleString()}
            </span>
          </div>
        </div>

        <!-- AI JUSTIFICATION BOX -->
        <div class="p-3 rounded-xl bg-surface-container-low border border-slate-border text-xs flex flex-col gap-1">
          <span class="font-bold text-secondary text-[11px] flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">auto_awesome</span>${t.cardWhyTitle}
          </span>
          <p class="text-[11px] text-on-surface-variant leading-relaxed">${u.matching_reason?.academic_fit || ''}</p>
          <p class="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">${u.matching_reason?.financial_fit || ''}</p>
        </div>

        <!-- COUNSELOR NOTE -->
        <div class="p-3 rounded-xl bg-caution-amber-surface/60 border border-caution-amber/30 text-xs flex flex-col gap-0.5">
          <span class="font-bold text-amber-800 text-[11px] flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">fact_check</span>${t.cardCounselorNote}
          </span>
          <p class="text-[11px] text-on-surface-variant leading-relaxed">${u.counselor_comment || 'Verified under holistic review criteria.'}</p>
        </div>
      </div>

      <div class="pt-4 border-t border-slate-border mt-4 flex items-center justify-between text-xs">
        <span class="text-on-surface-variant font-mono-num text-[11px]">Counselor Verified ✓</span>
        <a href="${u.website || '#'}" target="_blank" class="text-secondary hover:underline font-semibold flex items-center gap-1">
          <span>Official Portal</span>
          <span class="material-symbols-outlined text-[14px]">open_in_new</span>
        </a>
      </div>
    `;

    cardsContainer.appendChild(card);
  });
}

// ==========================================
// COLLEGE MASTER DB CONTROLLER
// ==========================================
function filterCollegesTable() {
  const query = (document.getElementById('collegeSearchInput').value || '').toLowerCase();
  const policyFilter = document.getElementById('colFilterPolicy').value;
  const typeFilter = document.getElementById('colFilterType').value;

  const filtered = collegesData.filter(col => {
    const matchesQuery = !query || col.name.toLowerCase().includes(query) || (col.state && col.state.toLowerCase().includes(query)) || col.ipeds_id.includes(query);
    const matchesPolicy = policyFilter === 'ALL' || (col.aid_policy_type || '').includes(policyFilter);
    const matchesType = typeFilter === 'ALL' || col.type === typeFilter;
    return matchesQuery && matchesPolicy && matchesType;
  });

  renderFilteredColleges(filtered);
}

function renderCollegesTable() {
  renderFilteredColleges(collegesData);
}

function renderFilteredColleges(colleges) {
  const tbody = document.getElementById('collegesTableBody');
  tbody.innerHTML = '';

  if (colleges.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-on-surface-variant font-medium">No institutions match the current filter.</td></tr>`;
    return;
  }

  colleges.forEach(col => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-surface transition-colors";

    const isNeedBlind = (col.aid_policy_type || '').includes('Need-Blind');
    const policyClass = isNeedBlind ? 'bg-badge-need-blind-bg text-badge-need-blind-text' : 'bg-badge-need-aware-bg text-badge-need-aware-text';

    tr.innerHTML = `
      <td class="py-3 px-4 font-mono-num font-semibold text-secondary">${col.ipeds_id}</td>
      <td class="py-3 px-4 font-semibold text-navy-deep">${col.name}</td>
      <td class="py-3 px-4 font-mono-num">${col.state}</td>
      <td class="py-3 px-4">${col.type}</td>
      <td class="py-3 px-4 font-mono-num font-semibold">${col.acceptance_rate}%</td>
      <td class="py-3 px-4 font-mono-num">${col.median_sat}</td>
      <td class="py-3 px-4 font-mono-num">$${(col.out_of_state_coa || col.annual_coa || 0).toLocaleString()}</td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${policyClass}">${col.aid_policy_type || 'Need-Aware'}</span>
      </td>
      <td class="py-3 px-4">
        ${col.need_met_100 ? '<span class="text-aid-grant-green font-bold">100% Guaranteed</span>' : '<span class="text-gray-400">Partial / Gap</span>'}
      </td>
      <td class="py-3 px-4">
        ${col.questbridge_partner ? '<span class="text-secondary font-bold font-mono-num">Partner ✓</span>' : '<span class="text-gray-400">-</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openRegisterCollegeModal() {
  document.getElementById('modalRegisterCollege').classList.remove('hidden');
}

function closeRegisterCollegeModal() {
  document.getElementById('modalRegisterCollege').classList.add('hidden');
}

async function submitNewCollege() {
  const ipeds = document.getElementById('newColIpeds').value.trim();
  const name = document.getElementById('newColName').value.trim();
  if (!ipeds || !name) {
    showToast('IPEDS Code and University Name are required.', 'error');
    return;
  }

  const newCol = {
    ipeds_id: ipeds,
    name: name,
    state: document.getElementById('newColState').value.trim() || 'US',
    type: document.getElementById('newColType').value,
    acceptance_rate: parseFloat(document.getElementById('newColAdmitRate').value) || 15.0,
    median_sat: parseInt(document.getElementById('newColMedianSat').value) || 1480,
    annual_coa: parseInt(document.getElementById('newColCoa').value) || 85000,
    out_of_state_coa: parseInt(document.getElementById('newColCoa').value) || 85000,
    international_financial_aid: document.getElementById('newColAidPolicy').value !== 'No Need-Based Aid for Int\'l',
    aid_policy_type: document.getElementById('newColAidPolicy').value,
    need_met_100: document.getElementById('newColNeedMet').checked,
    questbridge_partner: false
  };

  try {
    const res = await fetch('/api/colleges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCol)
    });
    const data = await res.json();
    if (data.status === 'success') {
      collegesData.push(newCol);
      closeRegisterCollegeModal();
      renderCollegesTable();
      showToast(`${name} registered to Master DB!`, 'success');
    }
  } catch (err) {
    showToast('Failed to register college.', 'error');
  }
}

async function triggerContextSync() {
  const btn = document.getElementById('btnSyncEngine');
  const icon = document.getElementById('syncIcon');
  icon.classList.add('animate-spin');

  try {
    const res = await fetch('/api/colleges/sync', { method: 'POST' });
    const data = await res.json();
    showToast(`Context Synced: ${data.total_institutions} institutions loaded into Gemini Window.`, 'success');
  } catch (err) {
    showToast('Context sync failed.', 'error');
  } finally {
    icon.classList.remove('animate-spin');
  }
}

// ==========================================
// TOAST NOTIFICATION UTILITY
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');

  const bgStyles = {
    'info': 'bg-navy-deep text-white border-slate-border',
    'success': 'bg-aid-grant-green text-white border-emerald-600',
    'error': 'bg-cost-alert-red text-white border-rose-600'
  }[type] || 'bg-navy-deep text-white';

  toast.className = `${bgStyles} px-4 py-3 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[16px]">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function setupEventListeners() {
  document.getElementById('studentSearchInput').addEventListener('input', () => {
    renderStudentRoster();
  });
}
