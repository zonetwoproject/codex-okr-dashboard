const ROUTES = {
  '/dashboard/executive': {
    title: 'Dashboard / Executive',
    desc: '조직 전체 성과, 리스크 KR, 기여 실험 상위를 확인합니다.',
    render: renderExecutive
  },
  '/dashboard/domain': {
    title: 'Dashboard / Domain',
    desc: '팀(도메인) 단위 KR 신호/달성률을 비교합니다.',
    render: renderDomain
  },
  '/goals/krs': {
    title: '목표/이니셔티브 / KR/SubKR',
    desc: 'KR/Sub-KR 달성도와 실험 기여도를 상세 분석하고 통합 관리합니다.',
    render: renderKRDetail
  },
  '/dashboard/review': {
    title: 'Dashboard / Review',
    desc: '리스크 우선순위와 리뷰 대상 이슈를 정리합니다.',
    render: renderReview
  },
  '/dashboard/okr-table': {
    title: 'Dashboard / Total Table',
    desc: '모든 OKR/Initiative를 Total Table에서 조회하고 월별 실적 반영 결과를 확인합니다.',
    render: renderOKRTable
  },
  '/goals/objectives': {
    title: '목표/이니셔티브 / Objective',
    desc: 'Objective 상세를 확인하고 Objective를 생성합니다.',
    render: renderObjectives
  },
  '/goals/initiatives': {
    title: '목표/이니셔티브 / Initiative',
    desc: 'Initiative 상세를 확인하고 신규 과제를 레이어 팝업으로 추가합니다.',
    render: renderInitiatives
  },
  '/goals/experiments': {
    title: '목표/이니셔티브 / Experiment',
    desc: 'Experiment List 중심으로 실험 가설, 기간, 결과를 확인합니다.',
    render: renderExperiments
  },
  '/input/sources': {
    title: '인풋 대시보드 / Input',
    desc: '인풋을 수집하고 분류/프로덕트/소스 기준으로 우선순위를 부여해 과제화 처리합니다.',
    render: renderInputSources
  },
  '/admin/presets': {
    title: '관리 / Preset',
    desc: 'OKR/인풋 프리셋을 등록, 수정, 삭제합니다.',
    render: renderAdminPresets
  },
  '/dashboard/notifications': {
    title: 'Dashboard / Notifications',
    desc: 'KR/Sub-KR/Initiative 실적 알림을 월 단위로 관리합니다.',
    render: renderDashboardNotifications
  },
  '/admin/notifications': {
    title: 'Notifications',
    desc: 'KR/Sub-KR/Initiative 실적 알림을 월 단위로 관리합니다.',
    render: renderDashboardNotifications
  },
  '/admin/logs': {
    title: '관리 / Audit Logs',
    desc: 'Decision Logs와 Audit Logs를 통합 조회합니다.',
    render: renderAdminLogs
  }
};

const MENU = [
  {
    group: '대시보드',
    routes: ['/dashboard/executive', '/dashboard/domain', '/dashboard/review', '/dashboard/notifications', '/dashboard/okr-table']
  },
  {
    group: '목표/이니셔티브',
    routes: ['/goals/objectives', '/goals/krs', '/goals/initiatives', '/goals/experiments']
  },
  {
    group: '인풋 대시보드',
    routes: ['/input/sources']
  },
  {
    group: '관리',
    routes: ['/admin/presets', '/admin/logs']
  }
];

const SIDEBAR_COLLAPSE_KEY = 'okr_sidebar_collapsed';
const INPUT_REGISTRANT = {
  actor: '',
  name: '',
  team: ''
};

const state = {
  route: '/dashboard/executive',
  filters: {
    division: '',
    domain: '',
    team: '',
    aarrrTag: '',
    status: ''
  },
  experimentFilters: {
    owner: '',
    startMonth: '',
    endMonth: ''
  },
  selectedKrId: null,
  selectedSubKrId: null,
  selectedObjectiveId: null,
  selectedInitiativeId: null,
  searchQuery: '',
  notificationMonthFilter: '',
  notificationStatusFilter: 'all',
  notificationRange: {
    preset: 'all',
    from: '',
    to: ''
  },
  experimentRange: {
    preset: 'all',
    from: '',
    to: ''
  },
  _notificationFiltersBackup: null,
  tablePage: 1,
  tablePageSize: 20,
  experimentPage: 1,
  experimentPageSize: 20,
  selectedInputSourceId: null,
  inputSortBy: 'priority_desc',
  inputShowUndecidedOnly: false
};

const el = {
  appShell: document.querySelector('.app-shell'),
  sidebar: document.querySelector('.sidebar'),
  btnBrandHome: document.getElementById('btnBrandHome'),
  brandEyebrow: document.getElementById('brandEyebrow'),
  brandSub: document.getElementById('brandSub'),
  navTree: document.getElementById('navTree'),
  btnSidebarToggle: document.getElementById('btnSidebarToggle'),
  pageBreadcrumb: document.getElementById('pageBreadcrumb'),
  pageTitle: document.getElementById('pageTitle'),
  pageDesc: document.getElementById('pageDesc'),
  topbarActions: document.getElementById('topbarActions'),
  filterChipRows: document.getElementById('filterChipRows'),
  pageContent: document.getElementById('pageContent'),
  searchKeyword: document.getElementById('searchKeyword'),
  btnSearch: document.getElementById('btnSearch'),
  filterDivision: document.getElementById('filterDivision'),
  filterDomain: document.getElementById('filterDomain'),
  filterTeam: document.getElementById('filterTeam'),
  filterAarrr: document.getElementById('filterAarrr'),
  filterStatus: document.getElementById('filterStatus'),
  filterOwner: document.getElementById('filterOwner'),
  filterExperimentStartMonth: document.getElementById('filterExperimentStartMonth'),
  filterExperimentEndMonth: document.getElementById('filterExperimentEndMonth'),
  filterNotificationMonth: document.getElementById('filterNotificationMonth'),
  filterNotificationStatus: document.getElementById('filterNotificationStatus'),
  btnApplyFilters: document.getElementById('btnApplyFilters'),
  btnResetFilters: document.getElementById('btnResetFilters'),
  layerModal: document.getElementById('layerModal'),
  toast: document.getElementById('toast')
};

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fmtNumber(value, digit = 2) {
  return Number(value || 0).toFixed(digit);
}

function fmtDateTime(value) {
  if (!value) return '-';
  return String(value).slice(0, 19).replace('T', ' ');
}

const SIGNAL_META = {
  green: { emoji: '🟢', label: '정상' },
  yellow: { emoji: '🟡', label: '주의' },
  red: { emoji: '🔴', label: '위험' }
};

const OKR_STATUS_META = {
  planned: { label: 'planned', tone: 'planned' },
  in_progress: { label: 'in progress', tone: 'in-progress' },
  production_released: { label: 'production released', tone: 'released' },
  spec_out: { label: 'spec out', tone: 'spec-out' },
  dropped: { label: 'dropped', tone: 'dropped' },
  holding: { label: 'holding', tone: 'holding' }
};

const EXPERIMENT_STATUS_META = {
  before_start: { label: 'Ready to Start', tone: 'before-start' },
  in_progress: { label: 'Running', tone: 'in-progress' },
  winner_selected: { label: 'Ready to Review', tone: 'winner' },
  ended: { label: 'Concluded', tone: 'ended' },
  discarded: { label: 'Closed', tone: 'discarded' }
};

const STATUS_META = {
  ...OKR_STATUS_META,
  ...EXPERIMENT_STATUS_META,
  manual: { label: 'manual', tone: 'neutral' },
  synced: { label: 'synced', tone: 'info' },
  calculated: { label: 'calculated', tone: 'neutral' },
  candidate: { label: 'candidate', tone: 'planned' },
  in_review: { label: 'in review', tone: 'holding' },
  reviewing: { label: 'reviewing', tone: 'holding' },
  approved: { label: 'approved', tone: 'released' },
  rejected: { label: 'rejected', tone: 'dropped' },
  registered: { label: 'registered', tone: 'planned' },
  converted: { label: 'converted', tone: 'released' },
  active: { label: 'active', tone: 'in-progress' },
  running: { label: 'running', tone: 'in-progress' },
  completed: { label: 'completed', tone: 'ended' },
  degraded: { label: 'degraded', tone: 'spec-out' }
};

const OKR_STATUS_OPTIONS = Object.keys(OKR_STATUS_META);
const EXPERIMENT_STATUS_OPTIONS = Object.keys(EXPERIMENT_STATUS_META);
const EXPERIMENT_RESULT_OPTIONS = ['위너 선정 전', '대조군(A) 위너 선정', '실험군(B) 위너 선정'];
const INPUT_SOURCE_STATUS_OPTIONS = ['registered', 'converted', 'rejected'];

function uniqueOrdered(values) {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const key = String(value || '').trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(key);
  });
  return result;
}

function statusOptionLabel(value) {
  const key = String(value || '').trim().toLowerCase();
  const meta = STATUS_META[key];
  if (key === 'green' || key === 'yellow' || key === 'red') {
    const signal = SIGNAL_META[key];
    if (signal) return `${signal.emoji} ${signal.label}`;
  }
  if (key === 'before_start') return 'Ready to Start';
  if (key === 'in_progress') return 'Running';
  if (key === 'winner_selected') return 'Ready to Review';
  if (key === 'ended') return 'Concluded';
  if (key === 'discarded') return 'Closed';
  if (meta) return meta.label;
  return String(value || '-').replaceAll('_', ' ');
}

function statusOptionsHtml(options, selectedValue) {
  const selected = String(selectedValue || '').trim().toLowerCase();
  return options
    .map((value) => {
      const key = String(value).trim().toLowerCase();
      const selectedAttr = key === selected ? 'selected' : '';
      return `<option value="${esc(key)}" ${selectedAttr}>${esc(statusOptionLabel(key))}</option>`;
    })
      .join('');
}

function normalizeMonth(value) {
  const text = String(value || '').trim();
  const match = text.match(/(\d{4})-(\d{1,2})/);
  if (!match) return '';
  const year = match[1];
  const month = String(match[2]).padStart(2, '0');
  return `${year}-${month}`;
}

function monthSelectOptions(values, selectedValue) {
  const selected = String(selectedValue || '').trim();
  const options = uniqueOrdered(values.map((value) => normalizeMonth(value)).filter(Boolean))
    .map((month) => {
      const selectedAttr = month === selected ? 'selected' : '';
      return `<option value="${esc(month)}" ${selectedAttr}>${esc(month)}</option>`;
    })
    .join('');
  return `<option value="">전체</option>${options}`;
}

function routeStatusFilterOptions() {
  if (isNotificationRoute()) return [];
  if (isExperimentRoute()) return EXPERIMENT_STATUS_OPTIONS;
  if (state.route === '/input/sources') return INPUT_SOURCE_STATUS_OPTIONS;
  if (state.route === '/dashboard/okr-table') return uniqueOrdered([...OKR_STATUS_OPTIONS, ...Object.keys(SIGNAL_META)]);
  if (state.route === '/dashboard/executive' || state.route === '/dashboard/domain' || state.route === '/dashboard/review') {
    return uniqueOrdered([...OKR_STATUS_OPTIONS, ...Object.keys(SIGNAL_META)]);
  }
  if (
    state.route === '/goals/objectives' ||
    state.route === '/goals/krs' ||
    state.route === '/goals/initiatives'
  ) {
    return OKR_STATUS_OPTIONS;
  }
  return [];
}

function normalizeExperimentResultValue(value, status) {
  const raw = String(value || '').trim();
  if (EXPERIMENT_RESULT_OPTIONS.includes(raw)) return raw;
  if (raw.includes('대조군') && raw.includes('위너')) return '대조군(A) 위너 선정';
  if (raw.includes('실험군') && raw.includes('위너')) return '실험군(B) 위너 선정';
  if (raw.includes('선정 전') || raw.includes('선전 전') || raw.includes('준비') || raw.includes('중간') || raw.includes('폐기')) {
    return '위너 선정 전';
  }
  const normalizedStatus = String(status || '').trim().toLowerCase();
  if (normalizedStatus === 'winner_selected' || normalizedStatus === 'ended') {
    return '실험군(B) 위너 선정';
  }
  return '위너 선정 전';
}

function experimentResultOptionsHtml(selectedValue, selectedStatus) {
  const selected = normalizeExperimentResultValue(selectedValue, selectedStatus);
  return EXPERIMENT_RESULT_OPTIONS
    .map((value) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`)
    .join('');
}

function signalText(signal) {
  const key = String(signal || '').toLowerCase();
  const meta = SIGNAL_META[key];
  return meta ? `${meta.emoji} ${meta.label}` : '⚪ 미정';
}

function signalBadge(signal) {
  const key = String(signal || '').toLowerCase();
  const meta = SIGNAL_META[key];
  if (!meta) return '<span class="badge status">⚪ 미정</span>';
  return `<span class="badge signal-${esc(key)}">${meta.emoji} ${meta.label}</span>`;
}

function signalFromValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'red';
  if (numeric >= 80) return 'green';
  if (numeric >= 50) return 'yellow';
  return 'red';
}

function statusBadge(status) {
  const key = String(status || '').trim().toLowerCase();
  const meta = STATUS_META[key];
  if (!meta) {
    const text = key ? String(status).replaceAll('_', ' ') : '-';
    return `<span class="badge status">${esc(text)}</span>`;
  }
  return `<span class="badge status status-${esc(meta.tone)}">${esc(meta.label)}</span>`;
}

function textOrDash(value) {
  if (value === null || value === undefined) return '-';
  const text = String(value).trim();
  return text || '-';
}

function connectedInfoValue(value, variant) {
  const normalized = textOrDash(value);
  if (variant === 'domain') return `<span class="badge table-meta domain">${esc(normalized)}</span>`;
  if (variant === 'aarrr') return `<span class="badge table-meta aarrr">${esc(normalized)}</span>`;
  if (variant === 'status') return statusBadge(normalized);
  return `<span class="connected-info-text">${esc(normalized)}</span>`;
}

function connectedInfoSection(items) {
  return `
    <section class="connected-info">
      <h3>연결 정보</h3>
      <div class="connected-info-grid">
        ${items
          .map(
            (item) => `<div class="connected-info-item">
              <p class="connected-info-label">${esc(item.label)}</p>
              <div class="connected-info-value">${connectedInfoValue(item.value, item.variant)}</div>
            </div>`
          )
          .join('')}
      </div>
    </section>
  `;
}

function paginationTokens(totalPages, currentPage) {
  const total = Math.max(1, Number(totalPages || 1));
  const current = Math.max(1, Math.min(total, Number(currentPage || 1)));
  if (total <= 9) {
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }
  const tokens = [1];
  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);
  if (start > 2) tokens.push('ellipsis-left');
  for (let page = start; page <= end; page += 1) {
    tokens.push(page);
  }
  if (end < total - 1) tokens.push('ellipsis-right');
  tokens.push(total);
  return tokens;
}

function renderPaginationButtons({ totalPages, currentPage, dataAttr }) {
  return paginationTokens(totalPages, currentPage)
    .map((token) => {
      if (typeof token === 'string' && token.startsWith('ellipsis')) {
        return '<span class="page-ellipsis">…</span>';
      }
      const active = Number(token) === Number(currentPage);
      return `<button class="page-num-btn ${active ? 'active' : ''}" type="button" data-${dataAttr}-page="${token}">${token}</button>`;
    })
    .join('');
}

function globalQuery(extra = {}) {
  const params = new URLSearchParams();
  const source = {
    ...state.filters,
    ...(state.searchQuery ? { q: state.searchQuery } : {}),
    ...(isNotificationRoute()
      ? {
          ...(state.notificationStatusFilter && state.notificationStatusFilter !== 'all'
            ? { status: state.notificationStatusFilter }
            : {}),
          ...(state.notificationMonthFilter ? { yearMonth: state.notificationMonthFilter } : {})
        }
      : {}),
    ...extra
  };

  Object.entries(source).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

function isNotificationRoute() {
  return state.route === '/dashboard/notifications' || state.route === '/admin/notifications';
}

function isExperimentRoute() {
  return state.route === '/goals/experiments';
}

function setFilterStatusOptions() {
  if (!el.filterStatus) return;
  const allowedStatus = routeStatusFilterOptions();
  const current = String(state.filters.status || '').trim().toLowerCase();
  const normalized = allowedStatus.includes(current) ? current : '';
  state.filters.status = normalized;
  el.filterStatus.innerHTML = `<option value="">전체</option>${statusOptionsHtml(allowedStatus, normalized)}`;
  el.filterStatus.value = normalized;
}

function notificationMonthFilterOptions() {
  const now = new Date();
  const options = ['<option value=\"\">전체</option>'];
  for (let i = 0; i < 12; i += 1) {
    const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
    const selected = state.notificationMonthFilter === value ? ' selected' : '';
    options.push(`<option value="${value}"${selected}>${value}</option>`);
  }
  return options.join('');
}

function parseDateOnly(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : raw;
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDateOnly(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildRangeByPreset(preset) {
  const key = String(preset || 'all').trim();
  if (key === 'all') return { from: '', to: '' };
  const today = new Date();
  const to = formatDateOnly(today);
  const fromDate = new Date(today);
  if (key === '1w') {
    fromDate.setDate(fromDate.getDate() - 6);
  } else if (key === '1m') {
    fromDate.setMonth(fromDate.getMonth() - 1);
  } else if (key === '3m') {
    fromDate.setMonth(fromDate.getMonth() - 3);
  } else {
    return { from: '', to: '' };
  }
  return { from: formatDateOnly(fromDate), to };
}

function inDateRange(value, range) {
  const source = parseDateOnly(value);
  if (!source) return true;
  const from = parseDateOnly(range?.from);
  const to = parseDateOnly(range?.to);
  if (from && source < from) return false;
  if (to && source > to) return false;
  return true;
}

function getRouteRangeFilter() {
  if (isNotificationRoute()) return state.notificationRange;
  if (isExperimentRoute()) return state.experimentRange;
  return { preset: 'all', from: '', to: '' };
}

function selectOptions(selectEl) {
  if (!selectEl) return [];
  return Array.from(selectEl.options || [])
    .map((option) => ({
      value: String(option.value || ''),
      label: String(option.textContent || '').trim()
    }))
    .filter((option) => option.label);
}

function renderFilterChipRows() {
  if (!el.filterChipRows) return;

  const notificationRoute = isNotificationRoute();
  const experimentRoute = isExperimentRoute();
  const managementRoute = state.route === '/admin/presets' || state.route === '/admin/logs';

  if (managementRoute) {
    el.filterChipRows.classList.add('hidden');
    el.filterChipRows.innerHTML = '';
    return;
  }

  const rows = [];

  if (!notificationRoute && !experimentRoute) {
    const domainOptions = selectOptions(el.filterDomain).filter((item) => item.value);
    if (domainOptions.length) {
      const activeDomain = String(state.filters.domain || '');
      rows.push(`
        <div class="filter-chip-row category">
          <label>카테고리</label>
          <div class="filter-chip-group">
            <button type="button" class="filter-chip ${activeDomain === '' ? 'active' : ''}" data-chip-kind="domain" data-chip-value="">전체</button>
            ${domainOptions
              .map((item) => `<button type="button" class="filter-chip ${activeDomain === item.value ? 'active' : ''}" data-chip-kind="domain" data-chip-value="${esc(item.value)}">${esc(item.label)}</button>`)
              .join('')}
          </div>
        </div>
      `);
    }
  }

  if (notificationRoute || experimentRoute) {
    const range = getRouteRangeFilter();
    const preset = String(range?.preset || 'all');
    rows.push(`
      <div class="filter-chip-row period">
        <label>기간</label>
        <div class="filter-chip-group period-wrap">
          <div class="filter-chip-group period">
            <button type="button" class="filter-chip period ${preset === 'all' ? 'active' : ''}" data-chip-kind="period" data-chip-value="all">전체</button>
            <button type="button" class="filter-chip period ${preset === '1w' ? 'active' : ''}" data-chip-kind="period" data-chip-value="1w">1주일</button>
            <button type="button" class="filter-chip period ${preset === '1m' ? 'active' : ''}" data-chip-kind="period" data-chip-value="1m">1개월</button>
            <button type="button" class="filter-chip period ${preset === '3m' ? 'active' : ''}" data-chip-kind="period" data-chip-value="3m">3개월</button>
            <button type="button" class="filter-chip period ${preset === 'custom' ? 'active' : ''}" data-chip-kind="period" data-chip-value="custom">직접입력</button>
          </div>
          <div class="filter-date-range ${preset === 'custom' ? '' : 'hidden'}">
            <input id="periodFromDate" type="date" value="${esc(range?.from || '')}" />
            <span>~</span>
            <input id="periodToDate" type="date" value="${esc(range?.to || '')}" />
            <button type="button" class="btn secondary period-apply-btn" data-chip-kind="period-custom-apply">적용</button>
          </div>
        </div>
      </div>
    `);
  }

  if (!rows.length) {
    el.filterChipRows.classList.add('hidden');
    el.filterChipRows.innerHTML = '';
    return;
  }

  el.filterChipRows.classList.remove('hidden');
  el.filterChipRows.innerHTML = rows.join('');

  el.filterChipRows.querySelectorAll('[data-chip-kind="domain"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = String(button.dataset.chipValue || '');
      state.filters.domain = value;
      if (el.filterDomain) el.filterDomain.value = value;
      state.tablePage = 1;
      state.experimentPage = 1;
      await renderCurrentRoute();
    });
  });

  el.filterChipRows.querySelectorAll('[data-chip-kind="period"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = String(button.dataset.chipValue || 'all');
      const targetRange = notificationRoute ? state.notificationRange : state.experimentRange;
      if (value === 'custom') {
        targetRange.preset = 'custom';
        renderFilterChipRows();
        return;
      }
      const range = buildRangeByPreset(value);
      targetRange.preset = value;
      targetRange.from = range.from;
      targetRange.to = range.to;
      if (notificationRoute) {
        if (value === 'all') {
          state.notificationMonthFilter = '';
          if (el.filterNotificationMonth) el.filterNotificationMonth.value = '';
        }
      } else {
        if (value === 'all') {
          state.experimentFilters.startMonth = '';
          state.experimentFilters.endMonth = '';
          if (el.filterExperimentStartMonth) el.filterExperimentStartMonth.value = '';
          if (el.filterExperimentEndMonth) el.filterExperimentEndMonth.value = '';
        }
      }
      state.tablePage = 1;
      state.experimentPage = 1;
      await renderCurrentRoute();
    });
  });

  const customApply = el.filterChipRows.querySelector('[data-chip-kind="period-custom-apply"]');
  if (customApply) {
    customApply.addEventListener('click', async () => {
      const fromValue = String(el.filterChipRows.querySelector('#periodFromDate')?.value || '');
      const toValue = String(el.filterChipRows.querySelector('#periodToDate')?.value || '');
      if (!fromValue || !toValue) {
        showToast('직접입력 기간의 시작일과 종료일을 선택해 주세요.', true);
        return;
      }
      if (fromValue > toValue) {
        showToast('시작일은 종료일보다 늦을 수 없습니다.', true);
        return;
      }
      const targetRange = notificationRoute ? state.notificationRange : state.experimentRange;
      targetRange.preset = 'custom';
      targetRange.from = fromValue;
      targetRange.to = toValue;
      state.tablePage = 1;
      state.experimentPage = 1;
      await renderCurrentRoute();
    });
  }
}

function syncRouteFilterUI() {
  const notificationRoute = isNotificationRoute();
  const experimentRoute = isExperimentRoute();
  const managementRoute = state.route === '/admin/presets' || state.route === '/admin/logs';
  const divisionRow = el.filterDivision?.closest('div');
  const domainRow = el.filterDomain?.closest('div');
  const teamRow = el.filterTeam?.closest('div');
  const aarrrRow = el.filterAarrr?.closest('div');
  const statusRow = el.filterStatus?.closest('div');
  const ownerRow = el.filterOwner?.closest('div');
  const experimentStartRow = el.filterExperimentStartMonth?.closest('div');
  const experimentEndRow = el.filterExperimentEndMonth?.closest('div');
  const notificationMonthRow = el.filterNotificationMonth?.closest('div');
  const notificationStatusRow = el.filterNotificationStatus?.closest('div');
  const filterActionsRow = document.querySelector('.filter-actions');
  const divisionLabel = el.filterDivision?.closest('div')?.querySelector('label');
  const searchToolbar = document.querySelector('.search-toolbar');
  const filterGrid = document.querySelector('.filter-grid');
  const filterPanel = document.querySelector('.filter-panel');

  const show = (node, visible) => {
    if (!node) return;
    node.style.display = visible ? '' : 'none';
  };

  show(filterPanel, !managementRoute);
  show(searchToolbar, !managementRoute);
  show(filterGrid, !managementRoute);
  show(divisionRow, !notificationRoute);
  show(teamRow, !notificationRoute && !experimentRoute);
  show(domainRow, !notificationRoute && !experimentRoute);
  show(aarrrRow, !notificationRoute && !experimentRoute);
  show(statusRow, !notificationRoute);
  show(ownerRow, !notificationRoute && experimentRoute);
  show(experimentStartRow, !notificationRoute && experimentRoute);
  show(experimentEndRow, !notificationRoute && experimentRoute);
  show(notificationMonthRow, false);
  show(notificationStatusRow, notificationRoute);

  if (notificationRoute) {
    if (!state._notificationFiltersBackup) {
      state._notificationFiltersBackup = { ...state.filters };
    }
    state.filters = {
      ...state.filters,
      division: '',
      domain: '',
      team: '',
      aarrrTag: '',
      status: ''
    };
  } else if (state._notificationFiltersBackup) {
    state.filters = { ...state._notificationFiltersBackup };
    state._notificationFiltersBackup = null;
  }

  if (experimentRoute && divisionLabel) {
    divisionLabel.textContent = '조직';
  } else if (divisionLabel) {
    divisionLabel.textContent = '실';
  }

  if (el.filterNotificationMonth) {
    el.filterNotificationMonth.innerHTML = notificationMonthFilterOptions();
  }

  if (el.filterNotificationStatus) {
    el.filterNotificationStatus.innerHTML = `
      <option value="all">전체</option>
      <option value="registered" ${state.notificationStatusFilter === 'registered' ? 'selected' : ''}>실적 등록</option>
      <option value="missing" ${state.notificationStatusFilter === 'missing' ? 'selected' : ''}>미등록</option>
    `;
  }

  if (filterActionsRow) {
    filterActionsRow.style.order = experimentRoute ? '999' : '';
  }

  if (statusRow) {
    statusRow.style.order = experimentRoute ? '998' : '';
  }
  if (ownerRow) {
    ownerRow.style.order = experimentRoute ? '1' : '';
  }
  if (experimentStartRow) {
    experimentStartRow.style.order = experimentRoute ? '2' : '';
  }
  if (experimentEndRow) {
    experimentEndRow.style.order = experimentRoute ? '3' : '';
  }

  setFilterStatusOptions();
  applyStateToFilterInputs();
  renderFilterChipRows();
}

function isSignalStatus(status) {
  return status === 'green' || status === 'yellow' || status === 'red';
}

function entityQuery(extra = {}) {
  const normalizedStatus = isSignalStatus(state.filters.status) ? '' : state.filters.status;
  return globalQuery({ ...extra, status: normalizedStatus });
}

async function fetchJSON(path, options) {
  const res = await fetch(path, options);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || '요청 실패');
  }
  return body;
}

function applyAppVersionBadge(health) {
  const markLabel = String(health?.appMarkLabel || '').trim() || 'Mark1';
  const gitRef = String(health?.gitRef || '').trim();
  const versionText = gitRef ? `Prototype ${markLabel} (${gitRef})` : `Prototype ${markLabel}`;
  if (el.brandEyebrow) {
    el.brandEyebrow.textContent = versionText;
  }
  if (el.brandSub) {
    el.brandSub.textContent = '전사 OKR/Input 대시보드';
  }
}

function showToast(message, isError = false) {
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  el.toast.classList.toggle('error', isError);
  setTimeout(() => {
    el.toast.classList.add('hidden');
  }, 2300);
}

let modalCleanup = null;

function closeLayerModal() {
  if (typeof modalCleanup === 'function') {
    modalCleanup();
  }
}

function optionalText(formData, key) {
  const raw = String(formData.get(key) || '').trim();
  return raw || undefined;
}

function optionalNumber(formData, key) {
  const raw = String(formData.get(key) || '').trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

async function confirmDeleteAndRefresh({ path, label, reason, actor = 'pm.demo', successMessage = '삭제 완료' }) {
  const targetLabel = String(label || '').trim() || '선택 항목';
  const confirmed = window.confirm(`"${targetLabel}" 항목을 삭제할까요?`);
  if (!confirmed) return false;
  await fetchJSON(path, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      actor,
      reason: reason || `delete ${targetLabel} from UI`
    })
  });
  showToast(successMessage);
  await renderCurrentRoute();
  return true;
}

function openLayerModal({ title, description, bodyHtml, submitLabel, onSubmit, showCancel = true, extraAction = null }) {
  if (!el.layerModal) return;
  closeLayerModal();

  el.layerModal.innerHTML = `
    <div class="layer-backdrop" data-layer-close="true"></div>
    <section class="layer-dialog card" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="layer-head">
        <div>
          <h3>${esc(title)}</h3>
          ${description ? `<p>${esc(description)}</p>` : ''}
        </div>
        <button class="btn icon-btn layer-close" type="button" data-layer-close="true" aria-label="닫기" title="닫기">✕</button>
      </header>
      <form id="layerForm" class="form-grid">
        ${bodyHtml}
        <div class="layer-actions">
          ${extraAction ? `<button class="btn ${esc(extraAction.variant || 'ghost')}" type="button" data-layer-extra="true">${esc(extraAction.label || '추가')}</button>` : ''}
          ${showCancel ? '<button class="btn secondary" type="button" data-layer-close="true">취소</button>' : ''}
          <button class="btn" type="submit">${esc(submitLabel || '저장')}</button>
        </div>
      </form>
    </section>
  `;

  el.layerModal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  const closeHandler = (event) => {
    const target = event.target;
    if (target && target.closest('[data-layer-close="true"]')) {
      closeLayerModal();
    }
  };

  const escHandler = (event) => {
    if (event.key === 'Escape') {
      closeLayerModal();
    }
  };

  const form = el.layerModal.querySelector('#layerForm');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;
      try {
        const formData = new FormData(form);
        await onSubmit(formData, form);
        closeLayerModal();
      } catch (err) {
        showToast(err.message, true);
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  const extraButton = el.layerModal.querySelector('[data-layer-extra="true"]');
  if (extraButton && extraAction && typeof extraAction.onClick === 'function') {
    extraButton.addEventListener('click', async () => {
      extraButton.disabled = true;
      try {
        await extraAction.onClick(form);
      } catch (err) {
        showToast(err.message, true);
        extraButton.disabled = false;
      }
    });
  }

  el.layerModal.addEventListener('click', closeHandler);
  window.addEventListener('keydown', escHandler);

  modalCleanup = () => {
    window.removeEventListener('keydown', escHandler);
    el.layerModal.removeEventListener('click', closeHandler);
    el.layerModal.innerHTML = '';
    el.layerModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
    modalCleanup = null;
  };
}

function openCreateObjectiveModal(taxonomy) {
  const divisionItems = Array.isArray(taxonomy.divisions) ? taxonomy.divisions : [];
  const teamItems = Array.isArray(taxonomy.teams) ? taxonomy.teams : [];
  const uniqueTeamItems = teamItems.filter((item) => !divisionItems.includes(item));
  const divisionOptions = divisionItems
    .map((item) => `<option value="division::${esc(item)}">${esc(item)}</option>`)
    .join('');
  const teamOptions = uniqueTeamItems
    .map((item) => `<option value="team::${esc(item)}">${esc(item)}</option>`)
    .join('');
  const organizationOptionSections = [];
  if (divisionOptions) {
    organizationOptionSections.push(`<optgroup label="실">${divisionOptions}</optgroup>`);
  }
  if (teamOptions) {
    organizationOptionSections.push(`<optgroup label="팀">${teamOptions}</optgroup>`);
  }
  const organizationOptions = organizationOptionSections.join('');
  const domainOptions = taxonomy.domains
    .map((item) => `<option value="${esc(item)}">${esc(item)}</option>`)
    .join('');
  const aarrrOptions = taxonomy.aarrrStages
    .map((item) => `<option value="${esc(item)}">${esc(item)}</option>`)
    .join('');

  openLayerModal({
    title: 'Objective 등록',
    description: '핵심 항목만 입력하면 Objective가 추가됩니다.',
    submitLabel: 'Objective 등록',
    bodyHtml: `
      <div class="form-grid cols-2">
        <div class="field-row">
          <label for="layerObjYear">연도 *</label>
          <input id="layerObjYear" name="year" type="number" value="2026" min="2024" max="2035" required />
          <small class="field-help">예: 2026</small>
        </div>
        <div class="field-row">
          <label for="layerObjHalf">반기 *</label>
          <select id="layerObjHalf" name="half">
            <option value="H1">H1</option>
            <option value="H2">H2</option>
          </select>
          <small class="field-help">반기 단위를 선택합니다.</small>
        </div>
        <div class="field-row">
          <label for="layerObjDomain">도메인 *</label>
          <select id="layerObjDomain" name="domain" required>${domainOptions}</select>
          <small class="field-help">대표 도메인을 선택합니다.</small>
        </div>
        <div class="field-row">
          <label for="layerObjAarrr">AARRR</label>
          <select id="layerObjAarrr" name="aarrrTag">${aarrrOptions}</select>
          <small class="field-help">해당 없으면 '-' 유지</small>
        </div>
        <div class="field-row">
          <label for="layerObjOrganization">조직 *</label>
          <select id="layerObjOrganization" name="organization" required>${organizationOptions}</select>
          <small class="field-help">실 또는 팀을 선택합니다.</small>
        </div>
        <div class="field-row">
          <label for="layerObjOwner">Owner</label>
          <input id="layerObjOwner" name="owner" type="text" placeholder="예: lead.food" />
          <small class="field-help">미입력 시 기본 owner 사용</small>
        </div>
        <div class="field-row">
          <label for="layerObjTitle">Objective 제목 *</label>
          <textarea id="layerObjTitle" name="title" placeholder="예: 푸드 성장 가속" required></textarea>
          <small class="field-help">짧게 작성</small>
        </div>
        <div class="field-row">
          <label for="layerObjDefinition">설명</label>
          <textarea id="layerObjDefinition" name="definition" placeholder="간단한 목적/배경"></textarea>
          <small class="field-help">짧게 작성</small>
        </div>
      </div>
    `,
    onSubmit: async (formData) => {
      const rawOrganization = String(formData.get('organization') || '').trim();
      const [organizationTypeRaw, ...organizationValueParts] = rawOrganization.split('::');
      const organizationType = organizationTypeRaw === 'team' ? 'team' : 'division';
      const organizationValue = organizationValueParts.join('::').trim();
      if (!organizationValue) {
        throw new Error('조직을 선택해 주세요.');
      }
      await fetchJSON('/api/objectives', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          half: String(formData.get('half')),
          year: Number(formData.get('year')),
          title: String(formData.get('title') || '').trim(),
          definition: optionalText(formData, 'definition'),
          organizationType,
          division: organizationType === 'division' ? organizationValue : '',
          team: organizationType === 'team' ? organizationValue : '',
          domain: String(formData.get('domain')),
          aarrrTag: String(formData.get('aarrrTag') || '-'),
          owner: optionalText(formData, 'owner') || 'pm.demo',
          actor: 'pm.demo',
          reason: 'objective create from layer modal'
        })
      });
      showToast('Objective 생성 완료');
      await hydrateTaxonomy();
      await renderCurrentRoute();
    }
  });
}

function openCreateKrModal(objectives, krs, taxonomy) {
  const objectiveMap = new Map(objectives.map((obj) => [obj.id, obj]));
  const yearSet = new Set(
    objectives
      .map((obj) => Number(obj.year))
      .filter((year) => Number.isFinite(year))
  );
  if (yearSet.size === 0) {
    yearSet.add(new Date().getFullYear());
  }
  const yearOptions = [...yearSet]
    .sort((a, b) => b - a)
    .map((year) => `<option value="${year}">${year}</option>`)
    .join('');
  const objectiveOptions = objectives
    .map(
      (obj) =>
        `<option value="${esc(obj.id)}">${esc(obj.title)} (${obj.year} ${esc(obj.half)} / ${esc(obj.domain || '-')} / ${esc(obj.division || obj.teamId || '-')})</option>`
    )
    .join('');
  const parentKrOptions = (krs || [])
    .map((kr) => {
      const obj = objectiveMap.get(kr.objectiveId);
      return `<option value="${esc(kr.id)}">${esc(kr.title)} (${esc(obj?.title || '-')} / ${obj ? `${obj.year} ${esc(obj.half)}` : '-'})</option>`;
    })
    .join('');
  const domainOptions = (taxonomy.domains || [])
    .map((item) => `<option value="${esc(item)}">${esc(item)}</option>`)
    .join('');
  const aarrrOptions = taxonomy.aarrrStages
    .map((item) => `<option value="${esc(item)}">${esc(item)}</option>`)
    .join('');
  const divisionOptions = (taxonomy.divisions || [])
    .map((item) => `<option value="division:${esc(item)}">실 · ${esc(item)}</option>`)
    .join('');
  const teamOptions = (taxonomy.teams || [])
    .map((item) => `<option value="team:${esc(item)}">팀 · ${esc(item)}</option>`)
    .join('');
  const organizationOptions = `${divisionOptions}${teamOptions}`;

  openLayerModal({
    title: 'KR 등록',
    description: '한 화면에서 KR/KR(세부)를 통합 등록합니다. 상위 KR을 선택하면 KR(세부)로 등록됩니다.',
    submitLabel: '등록',
    bodyHtml: `
      <div class="form-grid cols-2">
        <div class="field-row">
          <label for="layerKrYear">연도 *</label>
          <select id="layerKrYear" name="year" required>${yearOptions}</select>
          <small class="field-help">목표 연도 선택</small>
        </div>
        <div class="field-row">
          <label for="layerKrHalf">반기 *</label>
          <select id="layerKrHalf" name="half" required>
            <option value="H1">H1</option>
            <option value="H2">H2</option>
          </select>
          <small class="field-help">목표 반기 선택</small>
        </div>
        <div class="field-row">
          <label for="layerKrDomain">도메인 *</label>
          <select id="layerKrDomain" name="domain" required>
            <option value="">선택</option>
            ${domainOptions}
          </select>
          <small class="field-help">도메인 선택</small>
        </div>
        <div class="field-row">
          <label for="layerKrAarrr">AARRR</label>
          <select id="layerKrAarrr" name="aarrrTag">${aarrrOptions}</select>
          <small class="field-help">해당 없으면 '-' 유지</small>
        </div>
        <div class="field-row">
          <label for="layerKrOrganization">조직 *</label>
          <select id="layerKrOrganization" name="organization" required>
            <option value="">선택</option>
            ${organizationOptions}
          </select>
          <small class="field-help">실 또는 팀을 선택합니다.</small>
        </div>
        <div class="field-row">
          <label for="layerKrOwner">Owner</label>
          <input id="layerKrOwner" name="owner" type="text" placeholder="예: lead.recommend" />
          <small class="field-help">미입력 시 기본 owner 사용</small>
        </div>
        <div class="field-row">
          <label for="layerKrObjectiveId">상위 OBJECTIVE</label>
          <select id="layerKrObjectiveId" name="objectiveId">
            <option value="">선택</option>
            ${objectiveOptions}
          </select>
          <small class="field-help">상위 KR 미선택 시 필수</small>
        </div>
        <div class="field-row">
          <label for="layerKrParentId">상위 KR</label>
          <select id="layerKrParentId" name="parentKrId">
            <option value="">없음 (KR로 등록)</option>
            ${parentKrOptions}
          </select>
          <small class="field-help">선택 시 KR(세부)로 등록</small>
        </div>
        <div class="field-row">
          <label for="layerKrTitle">KR 제목 *</label>
          <textarea id="layerKrTitle" name="title" placeholder="예: 전환율 지수 120 달성" required></textarea>
          <small class="field-help">짧게 작성</small>
        </div>
        <div class="field-row">
          <label for="layerKrDefinition">설명</label>
          <textarea id="layerKrDefinition" name="definition" placeholder="KR 정의/범위"></textarea>
          <small class="field-help">선택 입력</small>
        </div>
        <div class="field-row">
          <label for="layerKrUnit">Unit</label>
          <input id="layerKrUnit" name="unit" type="text" placeholder="예: %, 건, 점, 억원" />
          <small class="field-help">선택 입력</small>
        </div>
        <div class="field-row">
          <label for="layerKrBaseline">시작값</label>
          <input id="layerKrBaseline" name="baseline" type="number" step="0.01" />
          <small class="field-help">달성률 계산 기준값</small>
        </div>
        <div class="field-row">
          <label for="layerKrQ1">Q1 목표값</label>
          <input id="layerKrQ1" name="q1Target" type="number" step="0.01" />
          <small class="field-help">선택 입력</small>
        </div>
        <div class="field-row">
          <label for="layerKrQ2">Q2 목표값</label>
          <input id="layerKrQ2" name="q2Target" type="number" step="0.01" />
          <small class="field-help">Q2를 최종 목표(Target)로 사용</small>
        </div>
      </div>
    `,
    onSubmit: async (formData) => {
      const selectedYear = Number(formData.get('year'));
      const selectedHalf = String(formData.get('half') || '');
      const selectedDomain = String(formData.get('domain') || '');
      const parentKrId = optionalText(formData, 'parentKrId');
      const objectiveId = optionalText(formData, 'objectiveId');
      if (!parentKrId && !objectiveId) {
        throw new Error('Objective 또는 상위 KR을 선택해 주세요.');
      }
      if (!selectedDomain) {
        throw new Error('도메인을 선택해 주세요.');
      }

      const organization = String(formData.get('organization') || '');
      if (!organization) {
        throw new Error('조직을 선택해 주세요.');
      }
      let division;
      let team;
      if (organization.startsWith('division:')) {
        division = organization.slice('division:'.length);
      } else if (organization.startsWith('team:')) {
        team = organization.slice('team:'.length);
      } else {
        throw new Error('조직 값이 올바르지 않습니다.');
      }

      const q1Target = optionalNumber(formData, 'q1Target');
      const q2Target = optionalNumber(formData, 'q2Target');
      const targetValue = Number.isFinite(q2Target) ? Number(q2Target) : Number(q1Target);
      if (!Number.isFinite(targetValue) || targetValue <= 0) {
        throw new Error('Q2 목표값(또는 Q1 목표값)을 입력해 주세요.');
      }

      const commonPayload = {
        title: String(formData.get('title') || '').trim(),
        definition: optionalText(formData, 'definition'),
        targetValue,
        division,
        team,
        domain: selectedDomain,
        aarrrTag: String(formData.get('aarrrTag') || '-'),
        baseline: optionalNumber(formData, 'baseline'),
        q1Target,
        q2Target,
        owner: optionalText(formData, 'owner') || 'pm.demo',
        actor: 'pm.demo',
        reason: 'create KR unified modal'
      };

      if (parentKrId) {
        const parentKr = (krs || []).find((item) => item.id === parentKrId);
        if (!parentKr) {
          throw new Error('선택한 상위 KR을 찾을 수 없습니다.');
        }
        const parentObjective = objectiveMap.get(parentKr.objectiveId);
        if (parentObjective && (Number(parentObjective.year) !== selectedYear || String(parentObjective.half) !== selectedHalf)) {
          throw new Error('선택한 상위 KR의 연도/반기가 상단 선택값과 다릅니다.');
        }
        await fetchJSON('/api/sub-krs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...commonPayload,
            krId: parentKrId
          })
        });
      } else {
        const selectedObjective = objectiveMap.get(objectiveId);
        if (!selectedObjective) {
          throw new Error('선택한 Objective를 찾을 수 없습니다.');
        }
        if (Number(selectedObjective.year) !== selectedYear || String(selectedObjective.half) !== selectedHalf) {
          throw new Error('선택한 Objective의 연도/반기가 상단 선택값과 다릅니다.');
        }
        const unit = String(formData.get('unit') || '').trim();
        await fetchJSON('/api/krs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...commonPayload,
            objectiveId,
            unit
          })
        });
      }

      showToast('KR 등록 완료');
      await hydrateTaxonomy();
      await renderCurrentRoute();
    }
  });
}

function openCreateSubKrModal(krs, objectiveMap, taxonomy) {
  const krOptions = krs
    .map((kr) => `<option value="${esc(kr.id)}">${esc(kr.title)} (${esc(objectiveMap.get(kr.objectiveId)?.title || '-')})</option>`)
    .join('');
  const aarrrOptions = taxonomy.aarrrStages
    .map((item) => `<option value="${esc(item)}">${esc(item)}</option>`)
    .join('');

  openLayerModal({
    title: 'KR(세부) 생성',
    description: '상위 KR에 연결되는 세부 KR을 등록합니다.',
    submitLabel: 'KR(세부) 추가',
    bodyHtml: `
      <div class="form-grid cols-2">
        <div class="field-row">
          <label for="layerSubKrId">상위 KR *</label>
          <select id="layerSubKrId" name="krId" required>${krOptions}</select>
          <small class="field-help">어떤 KR에 연결할지 선택합니다.</small>
        </div>
        <div class="field-row">
          <label for="layerSubTitle">KR(세부) 제목 *</label>
          <input id="layerSubTitle" name="title" type="text" placeholder="예: 추천 카드 클릭 지수 80 달성" required />
          <small class="field-help">측정 가능한 문장으로 작성합니다.</small>
        </div>
        <div class="field-row">
          <label for="layerSubTarget">Target Value *</label>
          <input id="layerSubTarget" name="targetValue" type="number" step="0.01" placeholder="예: 80" required />
          <small class="field-help">최종 목표값(양수)</small>
        </div>
        <div class="field-row">
          <label for="layerSubOwnerScope">소유 범위</label>
          <select id="layerSubOwnerScope" name="ownerScope">
            <option value="division">division</option>
            <option value="team">team</option>
          </select>
          <small class="field-help">실/팀 단위 책임 범위</small>
        </div>
        <div class="field-row">
          <label for="layerSubTeam">팀</label>
          <input id="layerSubTeam" name="team" type="text" placeholder="ownerScope가 team이면 입력" />
          <small class="field-help">예: 추천큐레이션팀</small>
        </div>
        <div class="field-row">
          <label for="layerSubAarrr">AARRR</label>
          <select id="layerSubAarrr" name="aarrrTag">${aarrrOptions}</select>
          <small class="field-help">해당 없으면 '-' 유지</small>
        </div>
        <div class="field-row">
          <label for="layerSubBaseline">시작값</label>
          <input id="layerSubBaseline" name="baseline" type="number" step="0.01" />
          <small class="field-help">달성률 계산 기준값</small>
        </div>
        <div class="field-row">
          <label for="layerSubQ1">Q1 목표값</label>
          <input id="layerSubQ1" name="q1Target" type="number" step="0.01" />
          <small class="field-help">선택 입력</small>
        </div>
        <div class="field-row">
          <label for="layerSubQ2">Q2 목표값</label>
          <input id="layerSubQ2" name="q2Target" type="number" step="0.01" />
          <small class="field-help">선택 입력</small>
        </div>
        <div class="field-row">
          <label for="layerSubOwner">Owner</label>
          <input id="layerSubOwner" name="owner" type="text" placeholder="예: pm.recommend" />
          <small class="field-help">미입력 시 기본 owner 사용</small>
        </div>
        <div class="field-row">
          <label for="layerSubStatus">상태</label>
          <select id="layerSubStatus" name="status">
            ${statusOptionsHtml(OKR_STATUS_OPTIONS, 'planned')}
          </select>
          <small class="field-help">현재 상태를 선택합니다.</small>
        </div>
        <div class="field-row">
          <label for="layerSubDefinition">설명</label>
          <textarea id="layerSubDefinition" name="definition" placeholder="세부 KR 정의/범위"></textarea>
          <small class="field-help">선택 입력</small>
        </div>
      </div>
    `,
    onSubmit: async (formData) => {
      await fetchJSON('/api/sub-krs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          krId: String(formData.get('krId')),
          title: String(formData.get('title') || '').trim(),
          definition: optionalText(formData, 'definition'),
          targetValue: Number(formData.get('targetValue')),
          ownerScope: String(formData.get('ownerScope') || 'division'),
          team: optionalText(formData, 'team'),
          aarrrTag: String(formData.get('aarrrTag') || '-'),
          baseline: optionalNumber(formData, 'baseline'),
          q1Target: optionalNumber(formData, 'q1Target'),
          q2Target: optionalNumber(formData, 'q2Target'),
          owner: optionalText(formData, 'owner') || 'pm.demo',
          status: String(formData.get('status') || 'planned'),
          actor: 'pm.demo',
          reason: 'create sub-kr from layer modal'
        })
      });
      showToast('KR(세부) 생성 완료');
      await hydrateTaxonomy();
      await renderCurrentRoute();
    }
  });
}

function openCreateInitiativeModal(objectives, krs, taxonomy) {
  const objectiveMap = new Map((objectives || []).map((obj) => [obj.id, obj]));
  const yearSet = new Set(
    objectives
      .map((obj) => Number(obj.year))
      .filter((year) => Number.isFinite(year))
  );
  if (yearSet.size === 0) {
    yearSet.add(new Date().getFullYear());
  }
  const yearOptions = [...yearSet]
    .sort((a, b) => b - a)
    .map((year) => `<option value="${year}">${year}</option>`)
    .join('');
  const domainOptions = (taxonomy.domains || [])
    .map((item) => `<option value="${esc(item)}">${esc(item)}</option>`)
    .join('');
  const aarrrOptions = (taxonomy.aarrrStages || [])
    .map((item) => `<option value="${esc(item)}">${esc(item)}</option>`)
    .join('');
  const objectiveOptions = (objectives || [])
    .map(
      (obj) =>
        `<option value="${esc(obj.id)}">${esc(obj.title)} (${obj.year} ${esc(obj.half)} / ${esc(obj.domain || '-')} / ${esc(obj.division || obj.teamId || '-')})</option>`
    )
    .join('');
  const krOptions = (krs || [])
    .map((kr) => {
      const obj = objectiveMap.get(kr.objectiveId);
      return `<option value="${esc(kr.id)}">${esc(kr.title)} (${esc(obj?.title || '-')} / ${obj ? `${obj.year} ${esc(obj.half)}` : '-'})</option>`;
    })
    .join('');
  const divisionOptions = (taxonomy.divisions || [])
    .map((item) => `<option value="division:${esc(item)}">실 · ${esc(item)}</option>`)
    .join('');
  const teamOptions = (taxonomy.teams || [])
    .map((item) => `<option value="team:${esc(item)}">팀 · ${esc(item)}</option>`)
    .join('');
  const organizationOptions = `${divisionOptions}${teamOptions}`;

  openLayerModal({
    title: 'Initiative 등록',
    description: 'Initiative 컨텍스트를 먼저 선택한 뒤 제목/설명을 입력합니다.',
    submitLabel: 'Initiative 등록',
    bodyHtml: `
      <div class="form-grid cols-2">
        <div class="field-row">
          <label for="layerInitYear">연도 *</label>
          <select id="layerInitYear" name="year" required>${yearOptions}</select>
          <small class="field-help">목표 연도 선택</small>
        </div>
        <div class="field-row">
          <label for="layerInitHalf">반기 *</label>
          <select id="layerInitHalf" name="half" required>
            <option value="H1">H1</option>
            <option value="H2">H2</option>
          </select>
          <small class="field-help">목표 반기 선택</small>
        </div>
        <div class="field-row">
          <label for="layerInitDomain">도메인 *</label>
          <select id="layerInitDomain" name="domain" required>
            <option value="">선택</option>
            ${domainOptions}
          </select>
          <small class="field-help">도메인 선택</small>
        </div>
        <div class="field-row">
          <label for="layerInitAarrr">AARRR</label>
          <select id="layerInitAarrr" name="aarrrTag">${aarrrOptions}</select>
          <small class="field-help">해당 없으면 '-' 유지</small>
        </div>
        <div class="field-row">
          <label for="layerInitOrganization">조직 *</label>
          <select id="layerInitOrganization" name="organization" required>
            <option value="">선택</option>
            ${organizationOptions}
          </select>
          <small class="field-help">실 또는 팀 선택</small>
        </div>
        <div class="field-row">
          <label for="layerInitOwner">Owner</label>
          <input id="layerInitOwner" name="owner" type="text" placeholder="예: squad.reco" />
          <small class="field-help">미입력 시 기본 owner 사용</small>
        </div>
        <div class="field-row">
          <label for="layerInitObjectiveId">상위 Objective *</label>
          <select id="layerInitObjectiveId" name="objectiveId" required>
            <option value="">선택</option>
            ${objectiveOptions}
          </select>
          <small class="field-help">반드시 선택</small>
        </div>
        <div class="field-row">
          <label for="layerInitKrId">상위 KR</label>
          <select id="layerInitKrId" name="krId">
            <option value="">없음</option>
            ${krOptions}
          </select>
          <small class="field-help">선택 입력</small>
        </div>
        <div class="field-row">
          <label for="layerInitTitle">Initiative 제목 *</label>
          <textarea id="layerInitTitle" name="title" placeholder="예: 추천 카드 UI 개선" required></textarea>
          <small class="field-help">짧게 작성</small>
        </div>
        <div class="field-row">
          <label for="layerInitDefinition">설명</label>
          <textarea id="layerInitDefinition" name="definition" placeholder="과제 목적/범위"></textarea>
          <small class="field-help">선택 입력</small>
        </div>
      </div>
    `,
    onSubmit: async (formData) => {
      const selectedYear = Number(formData.get('year'));
      const selectedHalf = String(formData.get('half') || '');
      const selectedDomain = String(formData.get('domain') || '');
      if (!selectedDomain) {
        throw new Error('도메인을 선택해 주세요.');
      }

      const organization = String(formData.get('organization') || '');
      if (!organization) {
        throw new Error('조직을 선택해 주세요.');
      }
      let division;
      let team;
      if (organization.startsWith('division:')) {
        division = organization.slice('division:'.length);
      } else if (organization.startsWith('team:')) {
        team = organization.slice('team:'.length);
      } else {
        throw new Error('조직 값이 올바르지 않습니다.');
      }

      const objectiveId = String(formData.get('objectiveId') || '');
      const selectedObjective = objectiveMap.get(objectiveId);
      if (!selectedObjective) {
        throw new Error('상위 Objective를 선택해 주세요.');
      }
      if (Number(selectedObjective.year) !== selectedYear || String(selectedObjective.half) !== selectedHalf) {
        throw new Error('선택한 Objective의 연도/반기가 상단 선택값과 다릅니다.');
      }
      if (String(selectedObjective.domain || '') !== selectedDomain) {
        throw new Error('선택한 Objective의 도메인과 상단 도메인이 다릅니다.');
      }

      const krId = optionalText(formData, 'krId');
      if (krId) {
        const selectedKr = (krs || []).find((item) => item.id === krId);
        if (!selectedKr) {
          throw new Error('선택한 상위 KR을 찾을 수 없습니다.');
        }
        if (selectedKr.objectiveId !== objectiveId) {
          throw new Error('선택한 KR이 상위 Objective에 속하지 않습니다.');
        }
      }

      await fetchJSON('/api/initiatives', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          objectiveId,
          krId: krId || undefined,
          title: String(formData.get('title') || '').trim(),
          definition: optionalText(formData, 'definition'),
          division,
          team,
          domain: selectedDomain,
          aarrrTag: String(formData.get('aarrrTag') || '-'),
          owner: optionalText(formData, 'owner') || 'pm.demo',
          actor: 'pm.demo',
          reason: 'create initiative from layer modal'
        })
      });
      showToast('Initiative 생성 완료');
      await hydrateTaxonomy();
      await renderCurrentRoute();
    }
  });
}

function openMonthlyUpdateModal({
  title,
  description,
  targetType,
  targetId,
  valueLabel,
  valuePlaceholder,
  min,
  max,
  defaultYearMonth,
  defaultValue,
  isEdit = false,
  step = '0.01',
  successMessage,
  afterUpsert
}) {
  const now = new Date();
  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const minAttr = min !== undefined ? `min="${esc(min)}"` : '';
  const maxAttr = max !== undefined ? `max="${esc(max)}"` : '';
  const yearMonthValue = /^\d{4}-\d{2}$/.test(String(defaultYearMonth || '').trim())
    ? String(defaultYearMonth).trim()
    : '';
  const yearMonthValueAttr = yearMonthValue ? `value="${esc(yearMonthValue)}"` : '';
  const valueValue = Number.isFinite(Number(defaultValue)) ? String(Number(defaultValue)) : '';
  const valueValueAttr = valueValue ? `value="${esc(valueValue)}"` : '';
  const monthAttr = isEdit ? 'readonly' : '';
  openLayerModal({
    title,
    description: description || '월 단위 실적을 입력하면 즉시 반영됩니다.',
    submitLabel: '저장',
    bodyHtml: `
      <div class="field-row">
        <label for="layerMonthlyYm">월 *</label>
        <input id="layerMonthlyYm" name="yearMonth" type="month" required max="${esc(currentMonth)}" ${monthAttr} ${yearMonthValueAttr} />
      </div>
      <div class="field-row">
        <label for="layerMonthlyValue">${esc(valueLabel || '실적값')} *</label>
        <input id="layerMonthlyValue" name="actualValue" type="number" step="${esc(step)}" ${minAttr} ${maxAttr} placeholder="${esc(valuePlaceholder || '')}" ${valueValueAttr} required />
      </div>
    `,
    onSubmit: async (formData) => {
      const yearMonth = String(formData.get('yearMonth') || '').trim();
      const actualValueRaw = String(formData.get('actualValue') || '').trim();
      if (!yearMonth) throw new Error('월을 선택해 주세요.');
      if (yearMonth > currentMonth) throw new Error('현재 월을 기준으로 과거/현재 월만 입력할 수 있습니다.');
      const actualValue = Number(actualValueRaw);
      if (!Number.isFinite(actualValue)) throw new Error('실적값은 숫자여야 합니다.');
      if (min !== undefined && actualValue < Number(min)) {
        throw new Error(`${valueLabel || '실적값'}은(는) ${min} 이상이어야 합니다.`);
      }
      if (max !== undefined && actualValue > Number(max)) {
        throw new Error(`${valueLabel || '실적값'}은(는) ${max} 이하여야 합니다.`);
      }

      await fetchJSON('/api/monthly-performances/upsert', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          yearMonth,
          actualValue,
          sourceType: 'manual',
          actor: 'pm.demo',
          reason: `${targetType} monthly upsert from layer modal`
        })
      });

      if (typeof afterUpsert === 'function') {
        await afterUpsert(actualValue, yearMonth);
      }

      showToast(successMessage || '월 실적이 저장되었습니다.');
      await renderCurrentRoute();
    }
  });
}

function openExperimentModal({
  mode = 'create',
  krs,
  initiatives,
  platformExperiments,
  experiment,
  selectedTargetType = '',
  selectedTargetId = ''
}) {
  const isEdit = mode === 'edit';
  const normalizedTargetType = String(selectedTargetType || '').trim();
  const normalizedTargetId = String(selectedTargetId || '').trim();
  const targetOptions = [
    ...(Array.isArray(krs) ? krs : []).map((item) => ({ ...item, targetType: 'kr' })),
    ...(Array.isArray(initiatives) ? initiatives : []).map((item) => ({ ...item, targetType: 'initiative' }))
  ];

  const targetOptionHtml = targetOptions
    .map((item) => {
      const valuePrefix = item.targetType === 'kr' ? 'kr' : 'initiative';
      const label = item.targetType === 'kr' ? 'KR' : 'Initiative';
      return `<option value="${esc(valuePrefix)}::${esc(item.id)}" ${normalizedTargetType === valuePrefix && normalizedTargetId === String(item.id) ? 'selected' : ''}>${label} · ${esc(item.title)}</option>`;
    })
    .join('');
  const platformList = Array.isArray(platformExperiments) ? platformExperiments : [];
  let selectedPlatformId = String(experiment?.platformExperimentId || '');
  if (!selectedPlatformId && experiment?.title) {
    const matched = platformList.find((item) => String(item.title || '') === String(experiment.title || ''));
    if (matched) selectedPlatformId = String(matched.id || '');
  }
  const platformOptionsHtml = platformList
    .map(
      (item) =>
        `<option value="${esc(item.id)}" ${String(item.id) === selectedPlatformId ? 'selected' : ''}>${esc(item.title)}</option>`
    )
    .join('');

  openLayerModal({
    title: isEdit ? 'Experiment 수정' : 'Experiment 등록',
    description: '상위 목표를 하나 선택한 뒤 실험 플랫폼에서 제목을 불러옵니다.',
    submitLabel: isEdit ? '수정 저장' : '등록',
    extraAction: isEdit
      ? {
          label: '삭제',
          variant: 'ghost',
          onClick: async () => {
            const deleted = await confirmDeleteAndRefresh({
              path: `/api/experiments/${encodeURIComponent(experiment.id)}`,
              label: experiment.title || 'Experiment',
              reason: 'delete experiment from edit modal'
            });
            if (deleted) {
              closeLayerModal();
            }
          }
        }
      : null,
    bodyHtml: `
      <div class="field-row">
        <label for="layerExperimentTargetRef">상위 목표</label>
        <select id="layerExperimentTargetRef" name="targetRef" required>
          <option value="">상위 목표 선택</option>
          ${targetOptionHtml || '<option value="" disabled>연결 가능한 상위 목표가 없습니다.</option>'}
        </select>
        <small class="field-help">실험은 상위 목표 하나에만 연결됩니다.</small>
      </div>
      <div class="field-row">
        <label for="layerPlatformExperimentId">실험 제목 *</label>
        <select id="layerPlatformExperimentId" name="platformExperimentId" required>
          <option value="">실험 플랫폼 제목 선택</option>
          ${platformOptionsHtml}
        </select>
        <small class="field-help">상태/AARRR/담당자/기간/가설/결과는 실험 플랫폼 데이터로 자동 반영됩니다.</small>
      </div>
    `,
    onSubmit: async (formData) => {
      const targetRef = String(formData.get('targetRef') || '').trim();
      const [targetType, targetId] = targetRef.split('::');
      if (!targetId || !['kr', 'initiative'].includes(String(targetType || '').trim())) {
        throw new Error('상위 목표를 하나 선택해 주세요.');
      }
      const platformExperimentId = String(formData.get('platformExperimentId') || '').trim();
      if (!platformExperimentId) {
        throw new Error('실험 제목을 선택해 주세요.');
      }

      const payload = {
        platformExperimentId,
        actor: 'analyst.demo',
        reason: isEdit ? 'update experiment from layer modal' : 'create experiment from layer modal'
      };

      let experimentId = experiment?.id;
      if (isEdit) {
        await fetchJSON(`/api/experiments/${encodeURIComponent(experimentId)}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        const created = await fetchJSON('/api/experiments', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        experimentId = created.id;
      }

      await fetchJSON(`/api/experiments/${encodeURIComponent(experimentId)}/mappings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          actor: 'analyst.demo',
          reason: isEdit ? 'replace experiment mappings from layer modal' : 'create experiment mappings from layer modal'
        })
      });

      showToast(isEdit ? 'Experiment 수정 완료' : 'Experiment 등록 완료');
      await renderCurrentRoute();
    }
  });
}

function setSidebarCollapsed(collapsed, persist = true) {
  if (!el.appShell || !el.btnSidebarToggle) return;
  el.appShell.classList.toggle('sidebar-collapsed', collapsed);

  const label = collapsed ? '☰' : '⟨';
  const title = collapsed ? '왼쪽 메뉴 펼치기' : '왼쪽 메뉴 접기';
  el.btnSidebarToggle.textContent = label;
  el.btnSidebarToggle.setAttribute('title', title);
  el.btnSidebarToggle.setAttribute('aria-label', title);
  el.btnSidebarToggle.setAttribute('aria-expanded', String(!collapsed));

  if (!persist) return;
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0');
  } catch (_err) {
    // ignore storage write failures
  }
}

function bindSidebarToggle() {
  if (!el.btnSidebarToggle) return;
  el.btnSidebarToggle.addEventListener('click', () => {
    const collapsed = el.appShell?.classList.contains('sidebar-collapsed');
    setSidebarCollapsed(!collapsed);
  });
}

function bindBrandHome() {
  if (!el.btnBrandHome) return;
  const goExecutive = () => navigate('/dashboard/executive');
  el.btnBrandHome.addEventListener('click', goExecutive);
  el.btnBrandHome.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    goExecutive();
  });
}

function restoreSidebarState() {
  let collapsed = false;
  try {
    collapsed = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1';
  } catch (_err) {
    collapsed = false;
  }
  setSidebarCollapsed(collapsed, false);
}

function applyFilterInputsToState() {
  state.searchQuery = String(el.searchKeyword?.value || '').trim();
  state.filters.division = el.filterDivision.value;
  state.filters.domain = el.filterDomain.value;
  state.filters.team = isExperimentRoute() ? state.filters.team || '' : el.filterTeam.value;
  state.filters.aarrrTag = el.filterAarrr.value;
  state.filters.status = el.filterStatus.value;
  state.experimentFilters.owner = isExperimentRoute() ? el.filterOwner.value : '';
  state.experimentFilters.startMonth = isExperimentRoute() ? el.filterExperimentStartMonth.value : '';
  state.experimentFilters.endMonth = isExperimentRoute() ? el.filterExperimentEndMonth.value : '';
  if (isNotificationRoute() && el.filterNotificationMonth) {
    state.notificationMonthFilter = String(el.filterNotificationMonth.value || '').trim();
    state.notificationStatusFilter = String(el.filterNotificationStatus?.value || 'all').trim();
  }
}

function applyStateToFilterInputs() {
  if (el.searchKeyword) el.searchKeyword.value = state.searchQuery;
  el.filterDivision.value = state.filters.division;
  el.filterDomain.value = state.filters.domain;
  if (!isExperimentRoute()) {
    el.filterTeam.value = state.filters.team;
  }
  el.filterAarrr.value = state.filters.aarrrTag;
  el.filterStatus.value = state.filters.status;
  if (el.filterOwner) {
    el.filterOwner.value = isExperimentRoute() ? state.experimentFilters.owner : '';
  }
  if (el.filterExperimentStartMonth) {
    el.filterExperimentStartMonth.value = isExperimentRoute() ? state.experimentFilters.startMonth : '';
  }
  if (el.filterExperimentEndMonth) {
    el.filterExperimentEndMonth.value = isExperimentRoute() ? state.experimentFilters.endMonth : '';
  }
  if (el.filterNotificationMonth) {
    el.filterNotificationMonth.value = state.notificationMonthFilter || '';
  }
  if (el.filterNotificationStatus) {
    el.filterNotificationStatus.value = state.notificationStatusFilter || 'all';
  }
  renderFilterChipRows();
}

function currentRoute() {
  const hash = (window.location.hash || '').replace(/^#/, '');
  if (hash === '/goals/kr-subkr' || hash === '/dashboard/kr-detail') return '/goals/krs';
  if (hash === '/input/rice') return '/input/sources';
  if (hash === '/integration/experiment' || hash === '/integration/dwh') return '/goals/experiments';
  if (ROUTES[hash]) return hash;
  return '/dashboard/executive';
}

function navigate(route) {
  if (!ROUTES[route]) return;
  window.location.hash = route;
}

function renderNav() {
  const chunks = MENU.map((group) => {
    const items = group.routes
      .map((route) => {
        const meta = ROUTES[route];
        const active = route === state.route ? 'active' : '';
        return `<button class="nav-item ${active}" data-route="${esc(route)}">${esc(meta.title.split(' / ').slice(-1)[0])}</button>`;
      })
      .join('');

    return `
      <section class="nav-group">
        <h3 class="nav-group-title">${esc(group.group)}</h3>
        ${items}
      </section>
    `;
  });

  el.navTree.innerHTML = chunks.join('');

  el.navTree.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => {
      navigate(button.dataset.route);
    });
  });
}

async function hydrateTaxonomy() {
  try {
    const selectedDivision = state.filters.division;
    const selectedDomain = state.filters.domain;
    const selectedTeam = state.filters.team;
    const selectedAarrr = state.filters.aarrrTag;
    const selectedOwner = state.experimentFilters.owner;
    const selectedStartMonth = state.experimentFilters.startMonth;
    const selectedEndMonth = state.experimentFilters.endMonth;

    if (isExperimentRoute()) {
      const [experiments, krLinks, initiativeLinks, krs, initiatives, platformExperiments] = await Promise.all([
        fetchJSON('/api/experiments').catch(() => []),
        fetchJSON('/api/kr-experiment-links').catch(() => []),
        fetchJSON('/api/initiative-experiment-links').catch(() => []),
        fetchJSON('/api/krs').catch(() => []),
        fetchJSON('/api/initiatives').catch(() => []),
        fetchJSON('/api/experiment-platform/experiments').catch(() => [])
      ]);

      const krMap = new Map(krs.map((item) => [item.id, item]));
      const initiativeMap = new Map(initiatives.map((item) => [item.id, item]));
      const krByExperiment = new Map();
      const initiativeByExperiment = new Map();
      const divisionSet = new Set();
      const teamSet = new Set();
      const ownerSet = new Set();
      const startMonthSet = new Set();
      const endMonthSet = new Set();
      const platformById = new Map((platformExperiments || []).map((item) => [String(item.id || ''), item]));
      const findPlatformOwner = (experiment) => {
        if (!experiment || !platformById.size) return '';
        const byId = platformById.get(String(experiment.platformExperimentId || ''));
        const candidate = byId || (platformExperiments || []).find((item) => String(item.title || '') === String(experiment.title || ''));
        if (!candidate) return '';
        return String(candidate.owner || candidate.assignee || candidate.manager || '').trim();
      };

      krLinks.forEach((link) => {
        const list = krByExperiment.get(link.experimentId) || [];
        list.push(link);
        krByExperiment.set(link.experimentId, list);

        const kr = krMap.get(link.krId);
        if (kr) {
          if (kr.division) divisionSet.add(String(kr.division).trim());
          if (kr.team) teamSet.add(String(kr.team).trim());
          if (kr.owner) ownerSet.add(String(kr.owner).trim());
        }
      });

      initiativeLinks.forEach((link) => {
        const list = initiativeByExperiment.get(link.experimentId) || [];
        list.push(link);
        initiativeByExperiment.set(link.experimentId, list);

        const initiative = initiativeMap.get(link.initiativeId);
        if (initiative) {
          if (initiative.division) divisionSet.add(String(initiative.division).trim());
          if (initiative.team) teamSet.add(String(initiative.team).trim());
          if (initiative.owner) ownerSet.add(String(initiative.owner).trim());
        }
      });

      experiments.forEach((experiment) => {
        if (experiment.owner) ownerSet.add(String(experiment.owner).trim());
        const platformOwner = findPlatformOwner(experiment);
        if (platformOwner) ownerSet.add(platformOwner);
        const month = normalizeMonth(experiment.startDate);
        if (month) startMonthSet.add(month);
        const endMonth = normalizeMonth(experiment.endDate);
        if (endMonth) endMonthSet.add(endMonth);
      });

      const divisionOptions = [...divisionSet]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map((item) => `<option value="division::${esc(item)}">실 · ${esc(item)}</option>`)
        .join('');
      const teamOptions = [...teamSet]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map((item) => `<option value="team::${esc(item)}">팀 · ${esc(item)}</option>`)
        .join('');
      const ownerOptions = [...ownerSet]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map((item) => `<option value="${esc(item)}">${esc(item)}</option>`)
        .join('');
      const startMonthOptions = monthSelectOptions(startMonthSet, selectedStartMonth);
      const endMonthOptions = monthSelectOptions(endMonthSet, selectedEndMonth);

      el.filterDivision.innerHTML = `<option value="">전체</option>${divisionOptions}${teamOptions}`;
      el.filterTeam.innerHTML = `<option value="">전체</option>`;
      el.filterOwner.innerHTML = `<option value="">전체</option>${ownerOptions}`;
      el.filterExperimentStartMonth.innerHTML = startMonthOptions;
      el.filterExperimentEndMonth.innerHTML = endMonthOptions;

      if (selectedDivision) el.filterDivision.value = selectedDivision;
      if (selectedOwner) el.filterOwner.value = selectedOwner;
      if (selectedStartMonth) el.filterExperimentStartMonth.value = selectedStartMonth;
      if (selectedEndMonth) el.filterExperimentEndMonth.value = selectedEndMonth;
      renderFilterChipRows();
      return;
    }

    const taxonomy = await fetchJSON('/api/admin/taxonomy');
    const divisionOptions = taxonomy.divisions
      .map((item) => `<option value="${esc(item)}">${esc(item)}</option>`)
      .join('');
    const domainOptions = taxonomy.domains
      .map((item) => `<option value="${esc(item)}">${esc(item)}</option>`)
      .join('');
    const teamOptions = (taxonomy.teams || [])
      .map((item) => `<option value="${esc(item)}">${esc(item)}</option>`)
      .join('');
    const aarrrOptions = taxonomy.aarrrStages
      .map((item) => `<option value="${esc(item)}">${esc(item)}</option>`)
      .join('');

    el.filterDivision.innerHTML = `<option value="">전체</option>${divisionOptions}`;
    el.filterDomain.innerHTML = `<option value="">전체</option>${domainOptions}`;
    el.filterTeam.innerHTML = `<option value="">전체</option>${teamOptions}`;
    el.filterAarrr.innerHTML = `<option value="">전체</option>${aarrrOptions}`;

    if (selectedDivision) el.filterDivision.value = selectedDivision;
    if (selectedDomain) el.filterDomain.value = selectedDomain;
    if (selectedTeam) el.filterTeam.value = selectedTeam;
    if (selectedAarrr) el.filterAarrr.value = selectedAarrr;
    if (el.filterOwner) el.filterOwner.value = '';
    if (el.filterExperimentStartMonth) el.filterExperimentStartMonth.value = '';
    if (el.filterExperimentEndMonth) el.filterExperimentEndMonth.value = '';
    renderFilterChipRows();
  } catch (_err) {
    // keep default options
    renderFilterChipRows();
  }
}

function setPageHeader() {
  const meta = ROUTES[state.route];
  const crumbs = String(meta.title || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  const pageTitle = crumbs[crumbs.length - 1] || meta.title;
  if (el.pageBreadcrumb) {
    el.pageBreadcrumb.textContent = crumbs.join(' > ');
  }
  el.pageTitle.textContent = pageTitle;
  el.pageDesc.textContent = meta.desc;
  document.title = `${meta.title} | 배민 인사이트 포털`;
}

async function onTopbarCreateObjective() {
  const taxonomy = await fetchJSON('/api/admin/taxonomy');
  openCreateObjectiveModal(taxonomy);
}

async function onTopbarCreateKr() {
  const [objectives, krs, taxonomy] = await Promise.all([
    fetchJSON('/api/objectives'),
    fetchJSON('/api/krs'),
    fetchJSON('/api/admin/taxonomy')
  ]);
  if (objectives.length === 0) {
    showToast('먼저 Objective를 생성해 주세요.', true);
    return;
  }
  openCreateKrModal(objectives, krs, taxonomy);
}

async function onTopbarCreateInitiative() {
  const [objectives, krs, taxonomy] = await Promise.all([
    fetchJSON('/api/objectives'),
    fetchJSON('/api/krs'),
    fetchJSON('/api/admin/taxonomy')
  ]);
  if (objectives.length === 0) {
    showToast('먼저 Objective를 생성해 주세요.', true);
    return;
  }
  openCreateInitiativeModal(objectives, krs, taxonomy);
}

function topbarCreateActionByRoute(route) {
  if (route === '/goals/objectives') {
    return { label: '+ Objective 등록', onClick: onTopbarCreateObjective };
  }
  if (route === '/goals/krs') {
    return { label: '+ KR 등록', onClick: onTopbarCreateKr };
  }
  if (route === '/goals/initiatives') {
    return { label: '+ Initiative 등록', onClick: onTopbarCreateInitiative };
  }
  return null;
}

function renderTopbarActions() {
  if (!el.topbarActions) return;
  const action = topbarCreateActionByRoute(state.route);
  if (!action) {
    el.topbarActions.innerHTML = '';
    return;
  }

  el.topbarActions.innerHTML = `
    <button class="btn secondary topbar-action-btn" id="btnTopbarCreateAction">${esc(action.label)}</button>
  `;
  const button = document.getElementById('btnTopbarCreateAction');
  if (!button) return;
  button.addEventListener('click', async () => {
    try {
      await action.onClick();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

async function renderCurrentRoute() {
  closeLayerModal();
  const meta = ROUTES[state.route];
  if (!meta) {
    state.route = '/dashboard/executive';
  }
  syncRouteFilterUI();

  setPageHeader();
  renderTopbarActions();
  renderNav();
  el.pageContent.innerHTML = `<section class="card panel">로딩 중...</section>`;

  try {
    await ROUTES[state.route].render();
  } catch (err) {
    el.pageContent.innerHTML = `
      <section class="card panel">
        <h3>화면 로드 실패</h3>
        <p class="empty">${esc(err.message)}</p>
      </section>
    `;
  }
}

function dashboardQuickActions() {
  return '';
}

function bindRouteJumpButtons() {
  // left navigation replaces in-content route jump buttons
}

async function renderExecutive() {
  const data = await fetchJSON(`/api/dashboard/executive${globalQuery()}`);

  const summary = data.summary;
  const risks = data.riskKrs || [];
  const organizationRows = data.organizationRows || [];
  const topPerformers = data.topPerformers || [];
  const experimentWinRate = data.experimentWinRate || { winnerRate: 0, winnerExperimentCount: 0, totalExperimentCount: 0 };
  const notificationPreview = data.notifications || [];
  const topNotificationCount = 5;
  const signalPriority = (value) => {
    if (value === 'red') return 0;
    if (value === 'yellow') return 1;
    return 2;
  };
  const orderedOrganizations = [...organizationRows]
    .sort((a, b) => {
      const aSignal = signalPriority(String(a.status || '').toLowerCase());
      const bSignal = signalPriority(String(b.status || '').toLowerCase());
      if (aSignal !== bSignal) return aSignal - bSignal;
      return Number(a.achievement || 0) - Number(b.achievement || 0);
    })
    .slice(0, 3);
  const orderedTopPerformers = [...topPerformers].slice(0, 5);

  el.pageContent.innerHTML = `
    ${dashboardQuickActions()}
    <section class="card panel">
      <div class="grid-4">
        <article class="stat"><p class="k">Objectives</p><p class="v">${summary.objectiveCount}</p></article>
        <article class="stat"><p class="k">KRs</p><p class="v">${summary.krCount}</p></article>
        <article class="stat"><p class="k">Sub-KRs</p><p class="v">${summary.subKrCount ?? 0}</p></article>
        <article class="stat"><p class="k">Initiatives</p><p class="v">${summary.initiativeCount ?? 0}</p></article>
      </div>
      <div class="grid-4" style="margin-top:12px;">
        <article class="stat"><p class="k">AVG Achievement</p><p class="v">${fmtNumber(summary.avgAchievement)}%</p></article>
        <article class="stat"><p class="k">monthly update</p><p class="v">${fmtNumber(summary.updateRate)}%</p></article>
        <article class="stat"><p class="k">Experiments</p><p class="v">${summary.experimentCount}</p></article>
        <article class="stat"><p class="k">TG Win ratio</p><p class="v">${fmtNumber(experimentWinRate.winnerRate)}%</p></article>
      </div>
    </section>

    <section class="grid-3">
      <article class="card panel">
        <div class="section-head-inline">
          <h3>Notifications Preview</h3>
          <button type="button" class="section-link" data-route-link="/dashboard/notifications" aria-label="알림 전체 보기">›</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>대상명</th><th>미입력 월</th><th>상태</th></tr></thead>
            <tbody>
              ${notificationPreview.length === 0
      ? '<tr><td colspan="3">알림 데이터가 없습니다.</td></tr>'
      : notificationPreview
          .slice(0, topNotificationCount)
          .map(
            (item) => `<tr>
                <td>${esc(item.targetTitle || '-')}</td>
                <td>${esc(item.yearMonth || '-')}</td>
                <td><span class="badge ${esc(item.__status === 'registered' ? 'status' : 'danger')}">${esc(item.__status === 'registered' ? '실적 등록' : item.__status === 'missing' ? '미등록' : '-')}</span></td>
              </tr>`
          )
          .join('')}
            </tbody>
          </table>
        </div>
      </article>

      <article class="card panel">
        <div class="section-head-inline">
          <h3>Top Performing Division/Team</h3>
        </div>
        ${orderedTopPerformers.length === 0
      ? '<div class="empty">기준 대상이 없습니다.</div>'
      : `
          <div class="table-wrap">
            <table class="data-table">
	              <thead><tr><th>조직</th><th>업데이트율</th><th>월간 추세</th></tr></thead>
              <tbody>
                ${orderedTopPerformers
                  .map(
                    (row) => `<tr>
                      <td>${esc(row.organizationName || '-')}</td>
                      <td>${fmtNumber(row.completionRate || 0)}%</td>
                      <td>${fmtNumber(row.monthDelta || 0)}%</td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `}
      </article>

      <article class="card panel">
        <div class="section-head-inline">
          <h3>Signal Distribution</h3>
          <button type="button" class="section-link" data-route-link="/dashboard/domain" aria-label="도메인 대시보드로 이동">›</button>
        </div>
        <div class="grid-3 compact-stat-grid" style="margin-bottom:12px;">
          <article class="stat stat-mini"><p class="k">${signalText('green')}</p><p class="v">${summary.signal.green}</p></article>
          <article class="stat stat-mini"><p class="k">${signalText('yellow')}</p><p class="v">${summary.signal.yellow}</p></article>
          <article class="stat stat-mini"><p class="k">${signalText('red')}</p><p class="v">${summary.signal.red}</p></article>
        </div>
        <h3 style="margin-top:8px;">조직별 상태</h3>
        ${orderedOrganizations.length === 0 ? '<div class="empty">조직 상태 데이터가 없습니다.</div>' : `
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>조직명</th><th>상태</th><th>진척도</th></tr></thead>
              <tbody>
                ${orderedOrganizations
                  .map(
                    (row) => `<tr>
                      <td>${esc(row.name || '-')}</td>
                      <td>${signalBadge(row.status || 'red')}</td>
                      <td>${fmtNumber(row.achievement || 0)}%</td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `}
      </article>
    </section>

    <section class="card panel">
      <div class="section-head-inline">
        <h3>Risk KR / Sub-KR / Initiative (Review Priority)</h3>
        <button type="button" class="section-link" data-route-link="/dashboard/review" aria-label="리뷰 대시보드로 이동">›</button>
      </div>
      ${risks.length === 0 ? '<div class="empty">리스크 항목이 없습니다.</div>' : `
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Type</th><th>대상</th><th>Objective</th><th>실</th><th>도메인</th><th>Signal</th><th>Achievement</th><th></th></tr>
            </thead>
            <tbody>
              ${risks
                .map(
                  (item) => `<tr>
                    <td>${esc(item.typeLabel || item.entityType || '-')}</td>
                    <td>${esc(item.title || item.krTitle || '-')}</td>
                    <td>${esc(item.objectiveTitle || '-')}</td>
                    <td>${esc(item.division || '-')}</td>
                    <td>${esc(item.domain || '-')}</td>
                    <td>${signalBadge(item.signal)}</td>
                    <td>${fmtNumber(item.achievement)}%</td>
                    <td><button class="btn ghost" data-go-entity="${esc(item.entityType || 'kr')}|${esc(item.krId || item.subKrId || item.initiativeId || '')}">이동</button></td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `}
    </section>
  `;

  const goEntityButtons = el.pageContent.querySelectorAll('[data-go-entity]');
  goEntityButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const raw = String(button.dataset.goEntity || '');
      const [type, id] = raw.split('|');
      if (type === 'kr') {
        state.selectedKrId = id;
        state.selectedSubKrId = null;
        navigate('/goals/krs');
        return;
      }
      if (type === 'sub_kr') {
        const relatedKr = risks.find((item) => item.subKrId === id);
        state.selectedKrId = relatedKr?.krId || state.selectedKrId || null;
        state.selectedSubKrId = id;
        navigate('/goals/krs');
        return;
      }
      if (type === 'initiative') {
        state.selectedInitiativeId = id;
        state.selectedSubKrId = null;
        navigate('/goals/initiatives');
      }
    });
  });
  const routeLinkButtons = el.pageContent.querySelectorAll('[data-route-link]');
  routeLinkButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = String(button.dataset.routeLink || '').trim();
      if (target) navigate(target);
    });
  });
  bindRouteJumpButtons();
}

async function renderDomain() {
  const rows = await fetchJSON(`/api/dashboard/domains${globalQuery()}`);
  const orderedRows = [...rows].sort((a, b) => Number(a.avgAchievement || 0) - Number(b.avgAchievement || 0));

  el.pageContent.innerHTML = `
    ${dashboardQuickActions()}
    <section class="card panel">
      <h3>도메인별 View</h3>
      ${orderedRows.length === 0 ? '<div class="empty">해당 조건의 도메인 데이터가 없습니다.</div>' : `
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Divisions</th>
                <th>Objectives</th>
                <th>KRs</th>
                <th>Sub-KRs</th>
                <th>Initiatives</th>
                <th>Avg Achievement</th>
                <th>Signals</th>
              </tr>
            </thead>
            <tbody>
              ${orderedRows
                .map(
                  (row) => `<tr>
                    <td>${esc(row.domain)}</td>
                    <td>${esc((row.divisions || []).join(', '))}</td>
                    <td>${row.objectiveCount}</td>
                    <td>${row.krCount}</td>
                    <td>${row.subKrCount ?? 0}</td>
                    <td>${row.initiativeCount ?? 0}</td>
                    <td>
                      <div>${fmtNumber(row.avgAchievement)}%</div>
                      <div class="progress-track"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, row.avgAchievement))}%"></div></div>
                    </td>
                    <td>${signalText('green')}: ${row.signal.green} / ${signalText('yellow')}: ${row.signal.yellow} / ${signalText('red')}: ${row.signal.red}</td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `}
    </section>
  `;
  bindRouteJumpButtons();
}

async function renderKRDetail() {
  const [list, objectives, allKrs, allSubKrs, allInitiatives, allMonthlyPerformances] = await Promise.all([
    fetchJSON(`/api/dashboard/krs${globalQuery()}`),
    fetchJSON('/api/objectives'),
    fetchJSON(`/api/krs${globalQuery()}`),
    fetchJSON(`/api/sub-krs${globalQuery()}`),
    fetchJSON('/api/initiatives'),
    fetchJSON('/api/monthly-performances?targetType=sub_kr')
  ]);

  if (list.length === 0 && allSubKrs.length === 0) {
    el.pageContent.innerHTML = `
      <section class="card panel">
        <div class="list-panel-head">
          <div>
            <h3>KR/Sub-KR</h3>
            <p class="panel-desc">조건에 맞는 KR/Sub-KR이 없습니다.</p>
          </div>
        </div>
        <div class="empty">KR 또는 Sub-KR을 생성한 뒤 상세 현황을 확인해 주세요.</div>
      </section>
    `;
    return;
  }

  const objectiveMap = new Map(objectives.map((item) => [item.id, item]));
  const krMap = new Map(allKrs.map((item) => [item.id, item]));
  const subKrMap = new Map(allSubKrs.map((item) => [item.id, item]));

  const hasSelectedSubKr = allSubKrs.some((item) => item.id === state.selectedSubKrId);
  if (!hasSelectedSubKr) state.selectedSubKrId = null;

  const hasSelectedKr = list.some((item) => item.id === state.selectedKrId);
  if (!hasSelectedKr && !state.selectedSubKrId && list.length > 0) {
    state.selectedKrId = list[0].id;
  }

  const selectedMode = state.selectedSubKrId ? 'sub_kr' : 'kr';
  const detail = selectedMode === 'kr' && state.selectedKrId
    ? await fetchJSON(`/api/dashboard/kr/${state.selectedKrId}`)
    : null;
  const selectedSubKr = selectedMode === 'sub_kr' ? subKrMap.get(state.selectedSubKrId) || null : null;
  const selectedKrForSub = selectedSubKr ? krMap.get(selectedSubKr.krId) || null : null;
  const parentObjectiveForSub = selectedKrForSub ? objectiveMap.get(selectedKrForSub.objectiveId) || null : null;
  const subKrMonthlyRows = selectedSubKr
    ? allMonthlyPerformances
      .filter((item) => item.targetType === 'sub_kr' && item.targetId === selectedSubKr.id)
      .sort((a, b) => String(a.yearMonth).localeCompare(String(b.yearMonth)))
    : [];
  const subKrActualSum = subKrMonthlyRows.reduce((sum, row) => sum + Number(row.actualValue || 0), 0);
  const subKrAchievement = selectedSubKr && Number(selectedSubKr.targetValue) > 0
    ? Number(((subKrActualSum / Number(selectedSubKr.targetValue)) * 100).toFixed(2))
    : 0;
  const subKrSignal = subKrAchievement >= 80 ? 'green' : subKrAchievement >= 50 ? 'yellow' : 'red';
  const subKrInitiatives = selectedSubKr
    ? allInitiatives.filter((item) => item.subKrId === selectedSubKr.id)
    : [];

  const parentObjective = detail ? objectiveMap.get(detail.kr.objectiveId) || null : null;
  const relatedSubKrs = detail ? (allSubKrs || []).filter((item) => item.krId === state.selectedKrId) : [];
  const relatedSubKrIds = new Set(relatedSubKrs.map((item) => item.id));
  const relatedInitiatives = detail ? (allInitiatives || []).filter((item) => {
    if (item.krId === state.selectedKrId) return true;
    return item.subKrId && relatedSubKrIds.has(item.subKrId);
  }) : [];

  const krHalfYear = parentObjective ? `${parentObjective.year} ${parentObjective.half}` : '-';
  const krConnectedInfo = detail
    ? connectedInfoSection([
      { label: '상위 O', value: parentObjective?.title || '-' },
      { label: '도메인', value: detail.kr.domain || parentObjective?.domain || '-', variant: 'domain' },
      { label: 'AARRR', value: detail.kr.aarrrTag || parentObjective?.aarrrTag || '-', variant: 'aarrr' },
      { label: '실', value: detail.kr.division || parentObjective?.division || parentObjective?.teamId || '-' },
      { label: '팀', value: detail.kr.team || '-' },
      { label: '연도/반기', value: krHalfYear },
      { label: 'Owner', value: detail.kr.owner || parentObjective?.owner || '-' },
      { label: '상태', value: detail.kr.status || '-', variant: 'status' }
    ])
    : '';
  const krMonthlyRows = detail ? [...(detail.monthly || [])].sort((a, b) => String(a.yearMonth).localeCompare(String(b.yearMonth))) : [];
  const krUnitLabel = detail?.kr?.unit ? ` ${detail.kr.unit}` : '';
  const subKrHalfYear = parentObjectiveForSub ? `${parentObjectiveForSub.year} ${parentObjectiveForSub.half}` : '-';
  const subKrConnectedInfo = selectedSubKr
    ? connectedInfoSection([
      { label: '상위 KR', value: selectedKrForSub?.title || '-' },
      { label: '상위 O', value: parentObjectiveForSub?.title || '-' },
      { label: '도메인', value: selectedSubKr.domain || selectedKrForSub?.domain || parentObjectiveForSub?.domain || '-', variant: 'domain' },
      { label: 'AARRR', value: selectedSubKr.aarrrTag || selectedKrForSub?.aarrrTag || parentObjectiveForSub?.aarrrTag || '-', variant: 'aarrr' },
      { label: '실', value: selectedSubKr.division || selectedKrForSub?.division || parentObjectiveForSub?.division || parentObjectiveForSub?.teamId || '-' },
      { label: '팀', value: selectedSubKr.team || selectedKrForSub?.team || '-' },
      { label: '연도/반기', value: subKrHalfYear },
      { label: 'Owner', value: selectedSubKr.owner || selectedKrForSub?.owner || parentObjectiveForSub?.owner || '-' },
      { label: '상태', value: selectedSubKr.status || '-', variant: 'status' }
    ])
    : '';
  const subKrUnitLabel = selectedKrForSub?.unit ? ` ${selectedKrForSub.unit}` : '';

  el.pageContent.innerHTML = `
    ${dashboardQuickActions()}
    <section class="split">
      <article class="card panel">
        <h3>KR/Sub-KR 목록</h3>
        <div class="list-card">
          <p class="panel-desc" style="margin:0 0 6px;">KR</p>
          ${list
            .map(
              (item) => `<button class="option-btn ${selectedMode === 'kr' && item.id === state.selectedKrId ? 'active' : ''}" data-kr-select="${esc(item.id)}">
                <strong>${esc(item.title)}</strong>
                <small>${fmtNumber(item.achievement)}% / ${signalText(item.signal)} / ${esc(item.division || '-')} / ${esc(item.domain || '-')}</small>
              </button>`
            )
            .join('')}
          <p class="panel-desc" style="margin:8px 0 6px;">Sub-KR</p>
          ${allSubKrs
            .map((item) => {
              const parentKr = krMap.get(item.krId);
              return `<button class="option-btn ${selectedMode === 'sub_kr' && item.id === state.selectedSubKrId ? 'active' : ''}" data-subkr-select="${esc(item.id)}">
                <strong>${esc(item.title)}</strong>
                <small>${esc(parentKr?.title || '-')} / ${esc(item.division || '-')} / ${esc(item.domain || '-')}</small>
              </button>`;
            })
            .join('')}
        </div>
      </article>

      <article class="card panel">
        ${selectedMode === 'kr' && detail ? `
        <div class="list-panel-head">
          <div>
            <h3>${esc(detail.kr.title)}</h3>
            <p class="panel-desc">KR 상세 페이지입니다. 달성도, 월 실적, 기여 실험을 관리합니다.</p>
          </div>
          <button class="btn ghost table-inline-btn" type="button" id="btnDeleteKr">삭제</button>
        </div>

        ${krConnectedInfo}

        <div class="grid-4">
          <div class="stat"><p class="k">Target</p><p class="v">${fmtNumber(detail.kr.targetValue)} ${esc(detail.kr.unit || '-')}</p></div>
          <div class="stat"><p class="k">Actual Sum</p><p class="v">${fmtNumber(detail.progress.actualSum)} ${esc(detail.kr.unit || '-')}</p></div>
          <div class="stat"><p class="k">Achievement</p><p class="v">${fmtNumber(detail.progress.achievement)}%</p></div>
          <div class="stat"><p class="k">Signal</p><p class="v">${signalText(detail.progress.signal)}</p></div>
        </div>

        <section style="margin-top:12px;">
          <div class="section-head-inline">
            <h3>상태 수정</h3>
            <button class="btn secondary" id="btnKrMonthlyUpdate" type="button" style="width:auto;">+ 월 실적 업데이트</button>
          </div>
          <form id="krStatusForm" class="inline-actions">
            <select id="krStatusSelect" style="width:180px;">
              ${statusOptionsHtml(OKR_STATUS_OPTIONS, detail.kr.status || 'planned')}
            </select>
            <button class="btn secondary" type="submit" style="width:auto;">상태 저장</button>
          </form>
        </section>

        <div class="grid-2" style="margin-top:12px;">
          <section>
            <h3>기여도</h3>
            ${detail.contributions.length === 0 ? '<div class="empty">연결된 실험이 없습니다.</div>' : detail.contributions
      .map(
        (item) => `<div style="margin-bottom:8px;">
                  <div style="display:flex;justify-content:space-between;gap:10px;font-size:13px;">
                    <span>${esc(item.experimentTitle)}</span>
                    <strong>${fmtNumber(item.contributionScore)}</strong>
                  </div>
                  <div class="progress-track"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, item.contributionScore))}%"></div></div>
                </div>`
      )
      .join('')}
          </section>

          <section>
            <h3>월 실적</h3>
            ${krMonthlyRows.length === 0
    ? '<div class="empty">월 실적 데이터 없음</div>'
    : `<div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>월</th><th>실적</th><th>Source</th><th></th></tr></thead>
                  <tbody>
                    ${krMonthlyRows
        .map(
          (item) => `<tr>
                      <td>${esc(item.yearMonth)}</td>
                      <td>${fmtNumber(item.actualValue)}${esc(krUnitLabel)}</td>
                      <td>${statusBadge(item.sourceType || '-')}</td>
                      <td><button class="btn ghost table-inline-btn" type="button" data-edit-kr-monthly="${esc(state.selectedKrId)}" data-ym="${esc(item.yearMonth)}" data-value="${esc(item.actualValue || 0)}">수정</button></td>
                    </tr>`
        )
        .join('')}
                  </tbody>
                </table>
              </div>`}
          </section>
        </div>

        <section style="margin-top:12px;">
          <h3>연결된 실험</h3>
          ${detail.contributions.length === 0
    ? '<div class="empty">연결된 실험이 없습니다. Experiment 페이지에서 등록/수정 후 상위 목표를 매핑해 주세요.</div>'
    : `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>실험명</th><th>상태</th><th>AARRR</th><th>기여도</th></tr></thead>
                <tbody>
                  ${detail.contributions
      .map(
        (item) => `<tr>
                      <td>${esc(item.experimentTitle)}</td>
                      <td>${statusBadge(item.status || '-')}</td>
                      <td>${esc(item.aarrrTag || '-')}</td>
                      <td>${fmtNumber(item.contributionScore)}%</td>
                    </tr>`
      )
      .join('')}
                </tbody>
              </table>
            </div>
          `}
        </section>

        <section style="margin-top:12px;">
          <h3>연결 목표/과제</h3>
          <div class="stack-1">
            <article>
              ${relatedSubKrs.length === 0 ? '<div class="empty">연결된 Sub-KR이 없습니다.</div>' : `
                <div class="table-wrap">
                  <table class="data-table">
                    <thead><tr><th>Sub-KR</th><th>팀</th><th>Target</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      ${relatedSubKrs
      .map(
        (item) => `<tr>
                            <td>${esc(item.title)}</td>
                            <td>${esc(item.team || '-')}</td>
                            <td>${fmtNumber(item.targetValue)}</td>
                            <td>${statusBadge(item.status || '-')}</td>
                            <td><button class="btn ghost table-inline-btn" type="button" data-go-subkr="${esc(item.id)}">Sub-KR</button></td>
                          </tr>`
      )
      .join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </article>

            <article>
              ${relatedInitiatives.length === 0 ? '<div class="empty">연결된 Initiative가 없습니다.</div>' : `
                <div class="table-wrap">
                  <table class="data-table">
                    <thead><tr><th>Initiative</th><th>팀</th><th>진행률</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      ${relatedInitiatives
      .map(
        (item) => `<tr>
                            <td>${esc(item.title)}</td>
                            <td>${esc(item.team || '-')}</td>
                            <td>${fmtNumber(item.progressQuant)}%</td>
                            <td>${statusBadge(item.status || '-')}</td>
                            <td><button class="btn ghost" data-go-initiative="${esc(item.id)}">Initiative</button></td>
                          </tr>`
      )
      .join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </article>
          </div>
        </section>
        ` : ''}

        ${selectedMode === 'sub_kr' && selectedSubKr ? `
        <div class="list-panel-head">
          <div>
            <h3>${esc(selectedSubKr.title)}</h3>
            <p class="panel-desc">Sub-KR 상세 페이지입니다. 상위 KR/O와 월 실적을 함께 관리합니다.</p>
          </div>
          <button class="btn ghost table-inline-btn" type="button" id="btnDeleteSubKr">삭제</button>
        </div>

        ${subKrConnectedInfo}

        <div class="grid-4">
          <div class="stat"><p class="k">Target</p><p class="v">${fmtNumber(selectedSubKr.targetValue)}${esc(subKrUnitLabel)}</p></div>
          <div class="stat"><p class="k">Actual Sum</p><p class="v">${fmtNumber(subKrActualSum)}${esc(subKrUnitLabel)}</p></div>
          <div class="stat"><p class="k">Achievement</p><p class="v">${fmtNumber(subKrAchievement)}%</p></div>
          <div class="stat"><p class="k">Signal</p><p class="v">${signalText(subKrSignal)}</p></div>
        </div>

        <section style="margin-top:12px;">
          <div class="section-head-inline">
            <h3>상태 수정</h3>
            <button class="btn secondary" id="btnSubKrMonthlyUpdate" type="button" style="width:auto;">+ 월 실적 업데이트</button>
          </div>
          <form id="subKrStatusForm" class="inline-actions">
            <select id="subKrStatusSelect" style="width:180px;">
              ${statusOptionsHtml(OKR_STATUS_OPTIONS, selectedSubKr.status || 'planned')}
            </select>
            <button class="btn secondary" type="submit" style="width:auto;">상태 저장</button>
          </form>
        </section>

        <section style="margin-top:12px;">
          <h3>월 실적</h3>
          ${subKrMonthlyRows.length === 0
    ? '<div class="empty">월 실적 데이터 없음</div>'
    : `<div class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>월</th><th>실적</th><th>Source</th><th></th></tr></thead>
                  <tbody>
                    ${subKrMonthlyRows
        .map(
          (item) => `<tr>
                      <td>${esc(item.yearMonth)}</td>
                      <td>${fmtNumber(item.actualValue)}${esc(subKrUnitLabel)}</td>
                      <td>${statusBadge(item.sourceType || '-')}</td>
                      <td><button class="btn ghost table-inline-btn" type="button" data-edit-subkr-monthly="${esc(selectedSubKr.id)}" data-ym="${esc(item.yearMonth)}" data-value="${esc(item.actualValue || 0)}">수정</button></td>
                    </tr>`
        )
        .join('')}
                  </tbody>
                </table>
              </div>`}
        </section>

        <section style="margin-top:12px;">
          <h3>연결된 Initiative</h3>
          ${subKrInitiatives.length === 0 ? '<div class="empty">연결된 Initiative가 없습니다.</div>' : `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Initiative</th><th>팀</th><th>진행률</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  ${subKrInitiatives
      .map(
        (item) => `<tr>
                      <td>${esc(item.title)}</td>
                      <td>${esc(item.team || '-')}</td>
                      <td>${fmtNumber(item.progressQuant)}%</td>
                      <td>${statusBadge(item.status || '-')}</td>
                      <td><button class="btn ghost" data-go-initiative="${esc(item.id)}">Initiative</button></td>
                    </tr>`
      )
      .join('')}
                </tbody>
              </table>
            </div>
          `}
        </section>
        ` : ''}
      </article>
    </section>
  `;

  el.pageContent.querySelectorAll('[data-kr-select]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.selectedKrId = button.dataset.krSelect;
      state.selectedSubKrId = null;
      await renderCurrentRoute();
    });
  });

  el.pageContent.querySelectorAll('[data-subkr-select]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.selectedSubKrId = button.dataset.subkrSelect;
      await renderCurrentRoute();
    });
  });

  if (selectedMode === 'kr' && detail) {
    const krStatusForm = document.getElementById('krStatusForm');
    if (krStatusForm) {
      krStatusForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await fetchJSON(`/api/krs/${encodeURIComponent(state.selectedKrId)}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              status: document.getElementById('krStatusSelect').value,
              actor: 'pm.demo',
              reason: 'update status from KR detail'
            })
          });
          showToast('상태가 저장되었습니다.');
          await renderCurrentRoute();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    const btnKrMonthlyUpdate = document.getElementById('btnKrMonthlyUpdate');
    if (btnKrMonthlyUpdate) {
      btnKrMonthlyUpdate.addEventListener('click', () => {
        openMonthlyUpdateModal({
          title: 'KR 월 실적 업데이트',
          description: '월 단위 KR 실적을 입력합니다.',
          targetType: 'kr',
          targetId: state.selectedKrId,
          valueLabel: detail.kr.unit ? `실적값 (${detail.kr.unit})` : '실적값',
          step: '0.01',
          successMessage: '월 실적이 저장되었습니다.'
        });
      });
    }

    el.pageContent.querySelectorAll('[data-edit-kr-monthly]').forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.editKrMonthly || '';
        const yearMonth = String(button.dataset.ym || '').trim();
        const rawValue = Number(button.dataset.value);
        if (!targetId || !yearMonth) return;
        openMonthlyUpdateModal({
          title: 'KR 월 실적 수정',
          description: 'KR 실적값을 월 단위로 수정합니다.',
          targetType: 'kr',
          targetId,
          defaultYearMonth: yearMonth,
          defaultValue: Number.isFinite(rawValue) ? rawValue : undefined,
          valueLabel: detail.kr.unit ? `실적값 (${detail.kr.unit})` : '실적값',
          step: '0.01',
          isEdit: true,
          successMessage: '월 실적이 수정되었습니다.'
        });
      });
    });

    el.pageContent.querySelectorAll('[data-go-subkr]').forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedSubKrId = button.dataset.goSubkr;
        renderCurrentRoute();
      });
    });

    const btnDeleteKr = document.getElementById('btnDeleteKr');
    if (btnDeleteKr) {
      btnDeleteKr.addEventListener('click', async () => {
        try {
          const deleted = await confirmDeleteAndRefresh({
            path: `/api/krs/${encodeURIComponent(detail.kr.id)}`,
            label: detail.kr.title,
            reason: 'delete kr from KR detail page'
          });
          if (deleted) {
            state.selectedKrId = null;
            state.selectedSubKrId = null;
          }
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }
  }

  if (selectedMode === 'sub_kr' && selectedSubKr) {
    const subKrStatusForm = document.getElementById('subKrStatusForm');
    if (subKrStatusForm) {
      subKrStatusForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          await fetchJSON(`/api/sub-krs/${encodeURIComponent(selectedSubKr.id)}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              status: document.getElementById('subKrStatusSelect').value,
              actor: 'pm.demo',
              reason: 'update status from Sub-KR detail'
            })
          });
          showToast('상태가 저장되었습니다.');
          await renderCurrentRoute();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    const btnSubKrMonthlyUpdate = document.getElementById('btnSubKrMonthlyUpdate');
    if (btnSubKrMonthlyUpdate) {
      btnSubKrMonthlyUpdate.addEventListener('click', () => {
        openMonthlyUpdateModal({
          title: 'Sub-KR 월 실적 업데이트',
          description: '월 단위 Sub-KR 실적을 입력합니다.',
          targetType: 'sub_kr',
          targetId: selectedSubKr.id,
          valueLabel: selectedKrForSub?.unit ? `실적값 (${selectedKrForSub.unit})` : '실적값',
          step: '0.01',
          successMessage: '월 실적이 저장되었습니다.'
        });
      });
    }

    el.pageContent.querySelectorAll('[data-edit-subkr-monthly]').forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.editSubkrMonthly || '';
        const yearMonth = String(button.dataset.ym || '').trim();
        const rawValue = Number(button.dataset.value);
        if (!targetId || !yearMonth) return;
        openMonthlyUpdateModal({
          title: 'Sub-KR 월 실적 수정',
          description: 'Sub-KR 실적값을 월 단위로 수정합니다.',
          targetType: 'sub_kr',
          targetId,
          defaultYearMonth: yearMonth,
          defaultValue: Number.isFinite(rawValue) ? rawValue : undefined,
          valueLabel: selectedKrForSub?.unit ? `실적값 (${selectedKrForSub.unit})` : '실적값',
          step: '0.01',
          isEdit: true,
          successMessage: '월 실적이 수정되었습니다.'
        });
      });
    });

    const btnDeleteSubKr = document.getElementById('btnDeleteSubKr');
    if (btnDeleteSubKr) {
      btnDeleteSubKr.addEventListener('click', async () => {
        try {
          const deleted = await confirmDeleteAndRefresh({
            path: `/api/sub-krs/${encodeURIComponent(selectedSubKr.id)}`,
            label: selectedSubKr.title,
            reason: 'delete sub-kr from Sub-KR detail page'
          });
          if (deleted) {
            state.selectedSubKrId = null;
          }
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }
  }

  el.pageContent.querySelectorAll('[data-go-initiative]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedInitiativeId = button.dataset.goInitiative;
      state.selectedSubKrId = null;
      navigate('/goals/initiatives');
    });
  });

  bindRouteJumpButtons();
}

async function renderReview() {
  const data = await fetchJSON(`/api/dashboard/review${globalQuery()}`);

  el.pageContent.innerHTML = `
    ${dashboardQuickActions()}
    <section class="review-stack">
      <article class="card panel">
        <h3>Review Priority (KR / Sub-KR / Initiative)</h3>
        ${data.reviewItems.length === 0 ? '<div class="empty">리뷰 대상 항목이 없습니다.</div>' : `
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Type</th><th>항목</th><th>Objective</th><th>실</th><th>도메인</th><th>Signal</th><th>Top Contributor</th><th></th></tr></thead>
              <tbody>
                ${data.reviewItems
                  .map(
                    (item) => `<tr>
                      <td>${esc(item.typeLabel || (item.entityType === 'sub_kr' ? 'Sub-KR' : item.entityType === 'initiative' ? 'Initiative' : 'KR'))}</td>
                      <td>${esc(item.title || item.krTitle || '-')}</td>
                      <td>${esc(item.objectiveTitle)}</td>
                      <td>${esc(item.division || '-')}</td>
                      <td>${esc(item.domain || '-')}</td>
                      <td>${signalBadge(item.signal)} (${fmtNumber(item.achievement)}%)</td>
                      <td>${esc(item.topContributor ? item.topContributor.experimentTitle : '-')}</td>
                      <td><button class="btn ghost" data-go-entity="${esc(item.entityType || 'kr')}|${esc(item.krId || item.subKrId || item.initiativeId || '')}">이동</button></td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `}
      </article>

      <article class="card panel">
        <h3>Pending Experiments</h3>
        <ul class="mini-list">
          ${data.pendingExperiments.length > 0 ? data.pendingExperiments
            .map(
              (exp) => `<li>${esc(exp.title)} | ${esc(exp.aarrrTag)} | ${statusBadge(exp.status)}</li>`
            )
            .join('') : '<li>대기 중 실험 없음</li>'}
        </ul>
      </article>
    </section>
  `;

  el.pageContent.querySelectorAll('[data-go-entity]').forEach((button) => {
    button.addEventListener('click', () => {
      const [type, id] = String(button.dataset.goEntity || '').split('|');
      if (type === 'kr') {
        state.selectedKrId = id;
        state.selectedSubKrId = null;
        navigate('/goals/krs');
        return;
      }
      if (type === 'sub_kr') {
        const reviewItems = data.reviewItems || [];
        const related = reviewItems.find((row) => row.subKrId === id);
        state.selectedKrId = related?.krId || state.selectedKrId || null;
        state.selectedSubKrId = id;
        navigate('/goals/krs');
        return;
      }
      if (type === 'initiative') {
        state.selectedInitiativeId = id;
        state.selectedSubKrId = null;
        navigate('/goals/initiatives');
      }
    });
  });
  bindRouteJumpButtons();
}

function percentOrDash(value) {
  if (!Number.isFinite(Number(value))) return '-';
  return `${fmtNumber(value)}%`;
}

function valueOrDash(value) {
  if (!Number.isFinite(Number(value))) return '-';
  return fmtNumber(value);
}

function linkedExperimentTitleOrDash(row) {
  const title = textOrDash(row?.linkedExperimentTitle);
  if (title === '-') return '-';
  const count = Number(row?.linkedExperimentCount || 0);
  return count > 1 ? `${title} 외 ${count - 1}건` : title;
}

function tableMetaBadge(text, variant = 'neutral') {
  return `<span class="badge table-meta ${esc(variant)}">${esc(text || '-')}</span>`;
}

function inputPriorityBadge(priority) {
  const value = String(priority || '-');
  const valueLabel =
    value === '상'
      ? 'High'
      : value === '중'
        ? 'Medium'
        : value === '하'
          ? 'Low'
          : value;
  const variant =
    valueLabel === 'High'
      ? 'priority-high'
      : valueLabel === 'Medium'
        ? 'priority-medium'
        : 'priority-low';
  return tableMetaBadge(valueLabel, variant);
}

function inputClassificationBadge(classification) {
  const value = String(classification || '-').trim();
  const label = value === 'Problem' ? 'Problem' : value === 'Opportunity' ? 'Opportunity' : value === 'Needs' ? 'Needs' : value;
  const tone =
    value === 'Problem'
      ? 'priority-high'
      : value === 'Opportunity'
        ? 'priority-medium'
        : value === 'Needs'
          ? 'priority-low'
          : 'neutral';
  return tableMetaBadge(label, tone);
}

function inputDecisionStatusText(status) {
  const key = String(status || 'registered').trim();
  if (key === 'converted') return '과제화';
  if (key === 'rejected') return '미과제화';
  return '미결정';
}

function inputDecisionBadge(status) {
  const key = String(status || 'registered').trim();
  const text = inputDecisionStatusText(key);
  const tone = key === 'converted' ? 'released' : key === 'rejected' ? 'dropped' : 'planned';
  return `<span class="badge status status-${esc(tone)}">${esc(text)}</span>`;
}

function classificationBadge(label) {
  const value = String(label || '-');
  if (value === '실 O') return tableMetaBadge(value, 'class-objective');
  if (value === '실 KR') return tableMetaBadge(value, 'class-div-kr');
  if (value === '팀 O') return tableMetaBadge(value, 'class-team-objective');
  if (value === '팀 KR') return tableMetaBadge(value, 'class-team-kr');
  if (value === '팀 Initiative' || value === 'Initiative') return tableMetaBadge('팀 Initiative', 'class-initiative');
  return tableMetaBadge(value, 'neutral');
}

function classificationRowTone(label) {
  const value = String(label || '-');
  if (value === '실 O') return 'row-class-objective';
  if (value === '실 KR') return 'row-class-div-kr';
  if (value === '팀 O') return 'row-class-team-objective';
  if (value === '팀 KR') return 'row-class-team-kr';
  if (value === '팀 Initiative' || value === 'Initiative') return 'row-class-initiative';
  return '';
}

function hierarchyTitleCell(row) {
  const depth =
    row.entityType === 'objective'
      ? 0
      : row.entityType === 'kr'
        ? 1
        : row.entityType === 'sub_kr'
          ? 2
          : 3;
  const typeLabel =
    row.entityType === 'objective'
      ? 'O'
      : row.entityType === 'kr'
        ? 'KR'
        : row.entityType === 'sub_kr'
          ? 'Sub-KR'
          : 'Initiative';
  const canNavigate = ['objective', 'kr', 'initiative'].includes(String(row.entityType || '').trim());
  if (!canNavigate) {
    return `<div class="hier-title depth-${depth}"><span class="hier-prefix">${esc(typeLabel)}</span><span>${esc(row.title || '-')}</span></div>`;
  }
  return `<button class="hier-title depth-${depth} table-link-btn table-hier-link" type="button" data-go-okr-entity="${esc(row.entityType || '')}" data-go-okr-id="${esc(row.entityId || '')}"><span class="hier-prefix">${esc(typeLabel)}</span><span>${esc(row.title || '-')}</span></button>`;
}

async function renderOKRTable() {
  const query = globalQuery({
    page: state.tablePage,
    pageSize: state.tablePageSize,
    sortBy: 'hierarchy',
    sortOrder: 'asc'
  });
  const exportQuery = globalQuery({ sortBy: 'hierarchy', sortOrder: 'asc' });
  const data = await fetchJSON(`/api/dashboard/okr-table${query}`);

  const rows = data.rows || [];
  const getNormalizedExperiments = (row) => {
    const list = Array.isArray(row?.linkedExperiments) ? row.linkedExperiments : [];
    const normalized = list.map((item) => ({
      id: String(item?.id || '').trim(),
      title: textOrDash(item?.title),
      startDate: textOrDash(item?.startDate),
      endDate: textOrDash(item?.endDate),
      result: textOrDash(item?.result)
    }));

    const hasLegacy =
      textOrDash(row?.linkedExperimentTitle) !== '-' ||
      textOrDash(row?.linkedExperimentStartDate) !== '-' ||
      textOrDash(row?.linkedExperimentEndDate) !== '-' ||
      textOrDash(row?.linkedExperimentResult) !== '-';

    if (normalized.length === 0 && hasLegacy) {
      normalized.push({
        id: '',
        title: textOrDash(row?.linkedExperimentTitle),
        startDate: textOrDash(row?.linkedExperimentStartDate),
        endDate: textOrDash(row?.linkedExperimentEndDate),
        result: textOrDash(row?.linkedExperimentResult)
      });
    }

    const countHint = Number(row?.linkedExperimentCount || 0);
    const expectedCount = Number.isFinite(countHint) && countHint > 0 ? countHint : normalized.length;
    while (normalized.length < expectedCount) {
      normalized.push({
        id: '',
        title: '-',
        startDate: '-',
        endDate: '-',
        result: '-'
      });
    }

    return normalized;
  };

  const normalizedRows = rows.map((row) => ({
    ...row,
    linkedExperiments: getNormalizedExperiments(row)
  }));
  const experimentTitleCell = (exp) => {
    const title = textOrDash(exp?.title);
    if (title === '-') return '-';
    return `<button class="table-link-btn" type="button" data-okr-exp-link="${esc(exp?.id || '')}" data-okr-exp-title="${esc(title)}">${esc(title)}</button>`;
  };

  const summary = data.summary || { total: 0, byClassification: {}, bySignal: {} };
  const isKrLike = (row) => ['kr', 'sub_kr'].includes(String(row.entityType || '').trim());
  const divObjectiveCount = normalizedRows.filter((row) => String(row.effectiveClassification || '').trim() === '실 O').length;
  const divKrCount = normalizedRows.filter((row) => isKrLike(row) && String(row.effectiveClassification || '').trim() === '실 KR').length;
  const teamObjectiveCount = normalizedRows.filter((row) => String(row.effectiveClassification || '').trim() === '팀 O').length;
  const teamKrCount = normalizedRows.filter((row) => isKrLike(row) && String(row.effectiveClassification || '').trim() === '팀 KR').length;
  const teamInitiativeCount = normalizedRows.filter(
    (row) => String(row.effectiveClassification || '').trim() === '팀 Initiative'
  ).length;
  const pagination = data.pagination || { page: 1, pageSize: state.tablePageSize, totalPages: 1, total: rows.length };
  state.tablePage = Number(pagination.page || 1);
  state.tablePageSize = Number(pagination.pageSize || state.tablePageSize || 20);
  const tablePagerButtons = renderPaginationButtons({
    totalPages: pagination.totalPages,
    currentPage: pagination.page,
    dataAttr: 'table'
  });

  el.pageContent.innerHTML = `
    ${dashboardQuickActions()}

    <section class="card panel" style="display:grid;grid-template-columns:repeat(5, minmax(0, 1fr));gap:8px;">
      <article class="stat"><p class="k">실 O</p><p class="v">${divObjectiveCount}</p></article>
      <article class="stat"><p class="k">실 KR</p><p class="v">${divKrCount}</p></article>
      <article class="stat"><p class="k">팀 O</p><p class="v">${teamObjectiveCount}</p></article>
      <article class="stat"><p class="k">팀 KR</p><p class="v">${teamKrCount}</p></article>
      <article class="stat"><p class="k">팀 Initiative</p><p class="v">${teamInitiativeCount}</p></article>
    </section>

    <section class="card panel table-panel">
      <h3>Total Table</h3>
      <div class="table-toolbar">
        <div class="table-size-control">
          <label for="tablePageSizeSelect">노출 개수</label>
          <select id="tablePageSizeSelect">
            <option value="20" ${state.tablePageSize === 20 ? 'selected' : ''}>20</option>
            <option value="50" ${state.tablePageSize === 50 ? 'selected' : ''}>50</option>
            <option value="100" ${state.tablePageSize === 100 ? 'selected' : ''}>100</option>
          </select>
        </div>
        <button class="btn secondary table-inline-btn" id="btnExportOKRTable">CSV 내보내기</button>
      </div>
      ${normalizedRows.length === 0 ? '<div class="empty">조건에 맞는 데이터가 없습니다.</div>' : `
        <div class="table-wrap okr-table-wrap">
          <table class="data-table okr-table">
            <thead>
              <tr>
                <th class="col-domain">도메인</th>
                <th class="col-aarrr">AARRR</th>
                <th class="col-division">실</th>
                <th class="col-team">팀</th>
                <th class="col-title">항목명</th>
                <th class="col-number">Baseline</th>
                <th class="col-number">Q1 목표</th>
                <th class="col-number">Q2 목표</th>
                <th class="col-month">1월</th>
                <th class="col-month">2월</th>
                <th class="col-month">3월</th>
                <th class="col-month">4월</th>
                <th class="col-month">5월</th>
                <th class="col-month">6월</th>
                <th class="col-number">Q1 달성률</th>
                <th class="col-number">Q2 달성률</th>
                <th class="col-status">신호</th>
                <th class="col-exp-title">실험 제목</th>
                <th class="col-exp-date">실험 시작일</th>
                <th class="col-exp-date">실험 종료일</th>
                <th class="col-exp-result">실험 결과</th>
                <th class="col-rep-owner">대표 담당자</th>
              </tr>
            </thead>
            <tbody>
              ${normalizedRows
                .map(
                  (row) => {
                    const experiments = Array.isArray(row.linkedExperiments) && row.linkedExperiments.length > 0
                      ? row.linkedExperiments
                      : [{ title: '-', startDate: '-', endDate: '-', result: '-' }];
                    const primary = experiments[0];
                    const primaryRow = `<tr class="${esc(classificationRowTone(row.effectiveClassification))}">
                    <td class="col-domain">${tableMetaBadge(row.domain || '-', 'domain')}</td>
                    <td class="col-aarrr">${tableMetaBadge(row.aarrrTag || '-', 'aarrr')}</td>
                    <td class="col-division">${esc(row.division || '-')}</td>
                    <td class="col-team">${esc(row.team || '-')}</td>
                    <td class="col-title cell-text">${hierarchyTitleCell(row)}</td>
                    <td class="col-number">${valueOrDash(row.baseline)}</td>
                    <td class="col-number">${valueOrDash(row.q1Target)}</td>
                    <td class="col-number">${valueOrDash(row.q2Target)}</td>
                    <td class="col-month">${valueOrDash(row.monthlyValueMap?.[1])}</td>
                    <td class="col-month">${valueOrDash(row.monthlyValueMap?.[2])}</td>
                    <td class="col-month">${valueOrDash(row.monthlyValueMap?.[3])}</td>
                    <td class="col-month">${valueOrDash(row.monthlyValueMap?.[4])}</td>
                    <td class="col-month">${valueOrDash(row.monthlyValueMap?.[5])}</td>
                    <td class="col-month">${valueOrDash(row.monthlyValueMap?.[6])}</td>
                    <td class="col-number">${percentOrDash(row.q1Achievement)}</td>
                    <td class="col-number">${percentOrDash(row.q2Achievement)}</td>
                    <td class="col-status">${signalBadge(row.signal)}</td>
                    <td class="col-exp-title cell-text">${experimentTitleCell(primary)}</td>
                    <td class="col-exp-date">${esc(textOrDash(primary?.startDate))}</td>
                    <td class="col-exp-date">${esc(textOrDash(primary?.endDate))}</td>
                    <td class="col-exp-result cell-text">${esc(textOrDash(primary?.result))}</td>
                    <td class="col-rep-owner">${esc(textOrDash(row.owner))}</td>
                  </tr>`;
                    const extraRows = experiments
                      .slice(1)
                      .map(
                        (exp) => `<tr class="row-linked-exp">
                          <td class="col-domain"></td>
                          <td class="col-aarrr"></td>
                          <td class="col-division"></td>
                          <td class="col-team"></td>
                          <td class="col-title cell-text">↳ 연결 실험</td>
                          <td class="col-number"></td>
                          <td class="col-number"></td>
                          <td class="col-number"></td>
                          <td class="col-month"></td>
                          <td class="col-month"></td>
                          <td class="col-month"></td>
                          <td class="col-month"></td>
                          <td class="col-month"></td>
                          <td class="col-month"></td>
                          <td class="col-number"></td>
                          <td class="col-number"></td>
                          <td class="col-status"></td>
                          <td class="col-exp-title cell-text">${experimentTitleCell(exp)}</td>
                          <td class="col-exp-date">${esc(textOrDash(exp?.startDate))}</td>
                          <td class="col-exp-date">${esc(textOrDash(exp?.endDate))}</td>
                          <td class="col-exp-result cell-text">${esc(textOrDash(exp?.result))}</td>
                          <td class="col-rep-owner"></td>
                        </tr>`
                      )
                      .join('');
                    return `${primaryRow}${extraRows}`;
                  }
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `}

      <div class="table-pagination-bottom">
        <div class="table-size-control">총 ${pagination.total}건 · ${pagination.page} / ${pagination.totalPages} 페이지</div>
        <div class="table-pager centered">${tablePagerButtons}</div>
      </div>
    </section>
  `;

  const tablePageSizeSelect = document.getElementById('tablePageSizeSelect');
  if (tablePageSizeSelect) {
    tablePageSizeSelect.addEventListener('change', async () => {
      state.tablePageSize = Number(tablePageSizeSelect.value || 20);
      state.tablePage = 1;
      await renderCurrentRoute();
    });
  }

  const btnExportOKRTable = document.getElementById('btnExportOKRTable');
  if (btnExportOKRTable) {
    btnExportOKRTable.addEventListener('click', () => {
      window.location.href = `/api/dashboard/okr-table/export.csv${exportQuery}`;
    });
  }

  el.pageContent.querySelectorAll('[data-table-page]').forEach((button) => {
    button.addEventListener('click', async () => {
      const page = Number(button.dataset.tablePage || 1);
      if (!Number.isFinite(page) || page < 1 || page === state.tablePage) return;
      state.tablePage = page;
      await renderCurrentRoute();
    });
  });

  el.pageContent.querySelectorAll('[data-go-okr-entity]').forEach((button) => {
    button.addEventListener('click', () => {
      const entityType = String(button.dataset.goOkrEntity || '').trim();
      const entityId = String(button.dataset.goOkrId || '').trim();
      if (!entityId) return;
      if (entityType === 'objective') {
        state.selectedObjectiveId = entityId;
        navigate('/goals/objectives');
        return;
      }
      if (entityType === 'kr') {
        state.selectedKrId = entityId;
        state.selectedSubKrId = null;
        navigate('/goals/krs');
        return;
      }
      if (entityType === 'initiative') {
        state.selectedInitiativeId = entityId;
        navigate('/goals/initiatives');
      }
    });
  });

  el.pageContent.querySelectorAll('[data-okr-exp-link]').forEach((button) => {
    button.addEventListener('click', () => {
      const experimentId = String(button.dataset.okrExpLink || '').trim();
      const experimentTitle = String(button.dataset.okrExpTitle || '').trim();
      openLayerModal({
        title: '실험플랫폼 링크 연결',
        description: '아직 실험플랫폼 URL이 연결되지 않았습니다.',
        bodyHtml: `
          <div class="field-row">
            <p>실험 제목: ${esc(experimentTitle || '-')}</p>
            <p>실험 ID: ${esc(experimentId || '-')}</p>
            <small class="field-help">추후 URL 연결 기능이 제공될 예정입니다.</small>
          </div>
        `,
        submitLabel: '닫기',
        showCancel: false,
        onSubmit: async () => {}
      });
    });
  });

  bindRouteJumpButtons();
}

async function renderObjectives() {
  const objectives = await fetchJSON(`/api/objectives${entityQuery()}`);

  if (objectives.length === 0) {
    el.pageContent.innerHTML = `
      <section class="card panel">
        <div class="list-panel-head">
          <div>
            <h3>Objective Detail</h3>
            <p class="panel-desc">조건에 맞는 Objective가 없습니다.</p>
          </div>
        </div>
        <div class="empty">새 Objective를 생성해 주세요.</div>
      </section>
    `;
    return;
  }

  const selected = objectives.some((obj) => obj.id === state.selectedObjectiveId);
  if (!selected) {
    state.selectedObjectiveId = objectives[0].id;
  }

  const objectiveMap = new Map(objectives.map((obj) => [obj.id, obj]));
  const selectedObjective = objectiveMap.get(state.selectedObjectiveId) || objectives[0];
  state.selectedObjectiveId = selectedObjective.id;

  const [objectiveKrs, allSubKrs, allInitiatives] = await Promise.all([
    fetchJSON(`/api/dashboard/krs${globalQuery({ objectiveId: selectedObjective.id })}`),
    fetchJSON(`/api/sub-krs${entityQuery()}`),
    fetchJSON(`/api/initiatives${entityQuery()}`)
  ]);

  const krIds = new Set(objectiveKrs.map((kr) => kr.id));
  const relatedSubKrs = allSubKrs.filter((sub) => krIds.has(sub.krId));
  const subKrIds = new Set(relatedSubKrs.map((sub) => sub.id));
  const relatedInitiatives = allInitiatives.filter((init) => subKrIds.has(init.subKrId));
  const avgAchievement =
    objectiveKrs.length > 0
      ? Number((objectiveKrs.reduce((sum, row) => sum + Number(row.achievement || 0), 0) / objectiveKrs.length).toFixed(2))
      : 0;
  const objectiveSignal = signalFromValue(avgAchievement);
  const objectiveConnectedInfo = connectedInfoSection([
    { label: '도메인', value: selectedObjective.domain || '-', variant: 'domain' },
    { label: 'AARRR', value: selectedObjective.aarrrTag || '-', variant: 'aarrr' },
    { label: '실', value: selectedObjective.division || selectedObjective.teamId || '-' },
    { label: '팀', value: selectedObjective.team || '-' },
    { label: '연도/반기', value: `${selectedObjective.year} ${selectedObjective.half}` },
    { label: 'Owner', value: selectedObjective.owner || '-' },
    { label: '상태', value: selectedObjective.status || '-', variant: 'status' }
  ]);

  el.pageContent.innerHTML = `
    ${dashboardQuickActions()}
    <section class="split">
      <article class="card panel">
        <h3>Objective 목록</h3>
        <div class="list-card">
          ${objectives
            .map(
              (obj) => `<button class="option-btn ${obj.id === selectedObjective.id ? 'active' : ''}" data-objective-select="${esc(obj.id)}">
                <strong>${esc(obj.title)}</strong>
                <small>${esc(obj.division || obj.teamId || '-')} / ${esc(obj.domain || '-')} / ${esc(obj.half)} ${obj.year}</small>
              </button>`
            )
            .join('')}
        </div>
      </article>

      <article class="card panel">
        <div class="list-panel-head">
          <div>
            <h3>${esc(selectedObjective.title)}</h3>
            <p class="panel-desc">${esc(selectedObjective.definition || 'Objective 설명 없음')}</p>
          </div>
          <button class="btn ghost table-inline-btn" type="button" id="btnDeleteObjective">삭제</button>
        </div>

        ${objectiveConnectedInfo}

        <div class="grid-4">
          <div class="stat"><p class="k">Avg Achievement</p><p class="v">${fmtNumber(avgAchievement)}%</p></div>
          <div class="stat"><p class="k">Signal</p><p class="v">${signalBadge(objectiveSignal)}</p></div>
          <div class="stat"><p class="k">KRs</p><p class="v">${objectiveKrs.length}</p></div>
          <div class="stat"><p class="k">Initiatives</p><p class="v">${relatedInitiatives.length}</p></div>
        </div>

        <section style="margin-top:12px;">
          <h3>연결 KR</h3>
          ${objectiveKrs.length === 0 ? '<div class="empty">연결된 KR이 없습니다.</div>' : `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>KR</th><th>Signal</th><th>Achievement</th><th>팀</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  ${objectiveKrs
                    .map(
                      (kr) => `<tr>
                        <td>${esc(kr.title)}</td>
                        <td>${signalBadge(kr.signal)}</td>
                        <td>${fmtNumber(kr.achievement)}%</td>
                        <td>${esc(kr.team || '-')}</td>
                        <td>${statusBadge(kr.krStatus || '-')}</td>
                        <td><button class="btn ghost" data-go-kr="${esc(kr.id)}">KR</button></td>
                      </tr>`
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `}
        </section>

      </article>
    </section>
  `;

  el.pageContent.querySelectorAll('[data-objective-select]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.selectedObjectiveId = button.dataset.objectiveSelect;
      await renderCurrentRoute();
    });
  });

  el.pageContent.querySelectorAll('[data-go-kr]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedKrId = button.dataset.goKr;
      state.selectedSubKrId = null;
      navigate('/goals/krs');
    });
  });

  const btnDeleteObjective = document.getElementById('btnDeleteObjective');
  if (btnDeleteObjective) {
    btnDeleteObjective.addEventListener('click', async () => {
      try {
        const deleted = await confirmDeleteAndRefresh({
          path: `/api/objectives/${encodeURIComponent(selectedObjective.id)}`,
          label: selectedObjective.title,
          reason: 'delete objective from objective page'
        });
        if (deleted) {
          state.selectedObjectiveId = null;
        }
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

}

async function renderKRSubKR() {
  const [objectives, krs, subKrs, taxonomy] = await Promise.all([
    fetchJSON(`/api/objectives${globalQuery()}`),
    fetchJSON(`/api/krs${globalQuery()}`),
    fetchJSON(`/api/sub-krs${globalQuery()}`),
    fetchJSON('/api/admin/taxonomy')
  ]);

  const objectiveMap = new Map(objectives.map((obj) => [obj.id, obj]));
  const krMap = new Map(krs.map((kr) => [kr.id, kr]));
  const objectiveOptions = objectives
    .map((obj) => `<option value="${esc(obj.id)}">${esc(obj.title)} (${esc(obj.division || obj.teamId || '-')})</option>`)
    .join('');
  const krOptions = krs
    .map((kr) => `<option value="${esc(kr.id)}">${esc(kr.title)} (${esc(objectiveMap.get(kr.objectiveId)?.title || '-')})</option>`)
    .join('');
  const aarrrOptions = taxonomy.aarrrStages.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('');

  el.pageContent.innerHTML = `
  <section class="card panel">
      <div class="list-panel-head">
        <div>
          <h3>KR List</h3>
          <p class="panel-desc">상위 KR 목록입니다.</p>
        </div>
      </div>
      <div class="inline-actions" style="justify-content:flex-end; margin: 4px 0 8px;">
        <button class="btn" id="btnCreateKr">+ KR 생성</button>
      </div>
      <p class="field-help">필수 입력: Objective, KR 제목, Target Value</p>
      ${krs.length === 0 ? '<div class="empty">KR가 없습니다.</div>' : `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>KR</th><th>Objective</th><th>소유 범위</th><th>팀</th><th>단위(Unit)</th><th>Target</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${krs
                .map(
                  (kr) => `<tr>
                    <td>${esc(kr.title)}</td>
                    <td>${esc(objectiveMap.get(kr.objectiveId)?.title || '-')}</td>
                    <td>${esc(kr.ownerScope || 'division')}</td>
                    <td>${esc(kr.team || '-')}</td>
                    <td>${esc(kr.unit || '-')}</td>
                    <td>${fmtNumber(kr.targetValue)}</td>
                    <td>${statusBadge(kr.status)}</td>
                    <td><button class="btn ghost table-inline-btn" type="button" data-delete-kr="${esc(kr.id)}" data-kr-title="${esc(kr.title)}">삭제</button></td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `}
    </section>

      <section class="card panel">
      <div class="list-panel-head">
        <div>
          <h3>KR (세부) List</h3>
          <p class="panel-desc">KR 하위 실행 단위 목록입니다.</p>
        </div>
      </div>
      <div class="inline-actions" style="justify-content:flex-end; margin: 4px 0 8px;">
        <button class="btn" id="btnCreateSubKr">+ KR(세부) 생성</button>
      </div>
      <p class="field-help">필수 입력: 상위 KR, KR(세부) 제목, Target Value</p>
      ${subKrs.length === 0 ? '<div class="empty">KR(세부)가 없습니다.</div>' : `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>KR(세부)</th><th>상위 KR</th><th>소유 범위</th><th>팀</th><th>Target</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${subKrs
                .map(
                  (item) => `<tr>
                    <td>${esc(item.title)}</td>
                    <td>${esc(krMap.get(item.krId)?.title || '-')}</td>
                    <td>${esc(item.ownerScope || 'division')}</td>
                    <td>${esc(item.team || '-')}</td>
                    <td>${fmtNumber(item.targetValue)}</td>
                    <td>${statusBadge(item.status)}</td>
                    <td><button class="btn ghost table-inline-btn" type="button" data-delete-subkr="${esc(item.id)}" data-subkr-title="${esc(item.title)}">삭제</button></td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `}
    </section>
  `;

  document.getElementById('btnCreateKr').addEventListener('click', () => {
    openLayerModal({
      title: 'KR 생성',
      description: '상위 KR을 등록합니다. 필수값을 먼저 입력하세요.',
      submitLabel: 'KR 추가',
      bodyHtml: `
        <div class="form-grid cols-2">
          <div class="field-row">
            <label for="layerKrObjectiveId">Objective *</label>
            <select id="layerKrObjectiveId" name="objectiveId" required>${objectiveOptions}</select>
            <small class="field-help">연결할 Objective를 선택합니다.</small>
          </div>
          <div class="field-row">
            <label for="layerKrTitle">KR 제목 *</label>
            <input id="layerKrTitle" name="title" type="text" placeholder="예: 전환율 지수 120 달성" required />
            <small class="field-help">측정 가능한 문장으로 작성합니다.</small>
          </div>
          <div class="field-row">
            <label for="layerKrUnit">Unit</label>
            <input id="layerKrUnit" name="unit" type="text" placeholder="예: %, 건, 점, 억원" />
            <small class="field-help">선택 입력</small>
          </div>
          <div class="field-row">
            <label for="layerKrTarget">Target Value *</label>
            <input id="layerKrTarget" name="targetValue" type="number" step="0.01" placeholder="예: 120" required />
            <small class="field-help">최종 목표값(양수)</small>
          </div>
          <div class="field-row">
            <label for="layerKrOwnerScope">소유 범위</label>
            <select id="layerKrOwnerScope" name="ownerScope">
              <option value="division">division</option>
              <option value="team">team</option>
            </select>
            <small class="field-help">실/팀 단위 책임 범위</small>
          </div>
          <div class="field-row">
            <label for="layerKrTeam">팀</label>
            <input id="layerKrTeam" name="team" type="text" placeholder="ownerScope가 team이면 입력" />
            <small class="field-help">예: 추천큐레이션팀</small>
          </div>
          <div class="field-row">
            <label for="layerKrAarrr">AARRR</label>
            <select id="layerKrAarrr" name="aarrrTag">${aarrrOptions}</select>
            <small class="field-help">해당 없으면 '-' 유지</small>
          </div>
          <div class="field-row">
            <label for="layerKrBaseline">시작값</label>
            <input id="layerKrBaseline" name="baseline" type="number" step="0.01" />
            <small class="field-help">달성률 계산 기준값</small>
          </div>
          <div class="field-row">
            <label for="layerKrQ1">Q1 목표값</label>
            <input id="layerKrQ1" name="q1Target" type="number" step="0.01" />
            <small class="field-help">선택 입력</small>
          </div>
          <div class="field-row">
            <label for="layerKrQ2">Q2 목표값</label>
            <input id="layerKrQ2" name="q2Target" type="number" step="0.01" />
            <small class="field-help">선택 입력</small>
          </div>
          <div class="field-row">
            <label for="layerKrOwner">Owner</label>
            <input id="layerKrOwner" name="owner" type="text" placeholder="예: lead.recommend" />
            <small class="field-help">미입력 시 기본 owner 사용</small>
          </div>
          <div class="field-row">
            <label for="layerKrStatus">상태</label>
            <select id="layerKrStatus" name="status">
              ${statusOptionsHtml(OKR_STATUS_OPTIONS, 'planned')}
            </select>
            <small class="field-help">현재 상태를 선택합니다.</small>
          </div>
          <div class="field-row">
            <label for="layerKrDefinition">설명</label>
            <textarea id="layerKrDefinition" name="definition" placeholder="KR 정의/범위"></textarea>
            <small class="field-help">선택 입력</small>
          </div>
        </div>
      `,
      onSubmit: async (formData) => {
        await fetchJSON('/api/krs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            objectiveId: String(formData.get('objectiveId')),
            title: String(formData.get('title') || '').trim(),
            definition: optionalText(formData, 'definition'),
            unit: optionalText(formData, 'unit'),
            targetValue: Number(formData.get('targetValue')),
            ownerScope: String(formData.get('ownerScope') || 'division'),
            team: optionalText(formData, 'team'),
            aarrrTag: String(formData.get('aarrrTag') || '-'),
            baseline: optionalNumber(formData, 'baseline'),
            q1Target: optionalNumber(formData, 'q1Target'),
            q2Target: optionalNumber(formData, 'q2Target'),
            owner: optionalText(formData, 'owner') || 'pm.demo',
            status: String(formData.get('status') || 'planned'),
            actor: 'pm.demo',
            reason: 'create KR from layer modal'
          })
        });
        showToast('KR 생성 완료');
        await hydrateTaxonomy();
        await renderCurrentRoute();
      }
    });
  });

  document.getElementById('btnCreateSubKr').addEventListener('click', () => {
    openLayerModal({
      title: 'KR(세부) 생성',
      description: '상위 KR에 연결되는 세부 KR을 등록합니다.',
      submitLabel: 'KR(세부) 추가',
      bodyHtml: `
        <div class="form-grid cols-2">
          <div class="field-row">
            <label for="layerSubKrId">상위 KR *</label>
            <select id="layerSubKrId" name="krId" required>${krOptions}</select>
            <small class="field-help">어떤 KR에 연결할지 선택합니다.</small>
          </div>
          <div class="field-row">
            <label for="layerSubTitle">KR(세부) 제목 *</label>
            <input id="layerSubTitle" name="title" type="text" placeholder="예: 추천 카드 클릭 지수 80 달성" required />
            <small class="field-help">측정 가능한 문장으로 작성합니다.</small>
          </div>
          <div class="field-row">
            <label for="layerSubTarget">Target Value *</label>
            <input id="layerSubTarget" name="targetValue" type="number" step="0.01" placeholder="예: 80" required />
            <small class="field-help">최종 목표값(양수)</small>
          </div>
          <div class="field-row">
            <label for="layerSubOwnerScope">소유 범위</label>
            <select id="layerSubOwnerScope" name="ownerScope">
              <option value="division">division</option>
              <option value="team">team</option>
            </select>
            <small class="field-help">실/팀 단위 책임 범위</small>
          </div>
          <div class="field-row">
            <label for="layerSubTeam">팀</label>
            <input id="layerSubTeam" name="team" type="text" placeholder="ownerScope가 team이면 입력" />
            <small class="field-help">예: 추천큐레이션팀</small>
          </div>
          <div class="field-row">
            <label for="layerSubAarrr">AARRR</label>
            <select id="layerSubAarrr" name="aarrrTag">${aarrrOptions}</select>
            <small class="field-help">해당 없으면 '-' 유지</small>
          </div>
          <div class="field-row">
            <label for="layerSubBaseline">시작값</label>
            <input id="layerSubBaseline" name="baseline" type="number" step="0.01" />
            <small class="field-help">달성률 계산 기준값</small>
          </div>
          <div class="field-row">
            <label for="layerSubQ1">Q1 목표값</label>
            <input id="layerSubQ1" name="q1Target" type="number" step="0.01" />
            <small class="field-help">선택 입력</small>
          </div>
          <div class="field-row">
            <label for="layerSubQ2">Q2 목표값</label>
            <input id="layerSubQ2" name="q2Target" type="number" step="0.01" />
            <small class="field-help">선택 입력</small>
          </div>
          <div class="field-row">
            <label for="layerSubOwner">Owner</label>
            <input id="layerSubOwner" name="owner" type="text" placeholder="예: pm.recommend" />
            <small class="field-help">미입력 시 기본 owner 사용</small>
          </div>
          <div class="field-row">
            <label for="layerSubStatus">상태</label>
            <select id="layerSubStatus" name="status">
              ${statusOptionsHtml(OKR_STATUS_OPTIONS, 'planned')}
            </select>
            <small class="field-help">현재 상태를 선택합니다.</small>
          </div>
          <div class="field-row">
            <label for="layerSubDefinition">설명</label>
            <textarea id="layerSubDefinition" name="definition" placeholder="세부 KR 정의/범위"></textarea>
            <small class="field-help">선택 입력</small>
          </div>
        </div>
      `,
      onSubmit: async (formData) => {
        await fetchJSON('/api/sub-krs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            krId: String(formData.get('krId')),
            title: String(formData.get('title') || '').trim(),
            definition: optionalText(formData, 'definition'),
            targetValue: Number(formData.get('targetValue')),
            ownerScope: String(formData.get('ownerScope') || 'division'),
            team: optionalText(formData, 'team'),
            aarrrTag: String(formData.get('aarrrTag') || '-'),
            baseline: optionalNumber(formData, 'baseline'),
            q1Target: optionalNumber(formData, 'q1Target'),
            q2Target: optionalNumber(formData, 'q2Target'),
            owner: optionalText(formData, 'owner') || 'pm.demo',
            status: String(formData.get('status') || 'planned'),
            actor: 'pm.demo',
            reason: 'create sub-kr from layer modal'
          })
        });
        showToast('KR(세부) 생성 완료');
        await hydrateTaxonomy();
        await renderCurrentRoute();
      }
    });
  });

  el.pageContent.querySelectorAll('[data-delete-kr]').forEach((button) => {
    button.addEventListener('click', async () => {
      const krId = String(button.dataset.deleteKr || '').trim();
      const krTitle = String(button.dataset.krTitle || '').trim();
      if (!krId) return;
      try {
        await confirmDeleteAndRefresh({
          path: `/api/krs/${encodeURIComponent(krId)}`,
          label: krTitle,
          reason: 'delete kr from KR list page'
        });
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });

  el.pageContent.querySelectorAll('[data-delete-subkr]').forEach((button) => {
    button.addEventListener('click', async () => {
      const subKrId = String(button.dataset.deleteSubkr || '').trim();
      const subKrTitle = String(button.dataset.subkrTitle || '').trim();
      if (!subKrId) return;
      try {
        await confirmDeleteAndRefresh({
          path: `/api/sub-krs/${encodeURIComponent(subKrId)}`,
          label: subKrTitle,
          reason: 'delete sub-kr from KR list page'
        });
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

async function renderInitiatives() {
  const [initiatives, subKrs, krs, objectives] = await Promise.all([
    fetchJSON(`/api/initiatives${entityQuery()}`),
    fetchJSON(`/api/sub-krs${entityQuery()}`),
    fetchJSON(`/api/krs${entityQuery()}`),
    fetchJSON(`/api/objectives${entityQuery()}`)
  ]);

  if (initiatives.length === 0) {
    el.pageContent.innerHTML = `
      <section class="card panel">
        <div class="list-panel-head">
          <div>
            <h3>Initiative Detail</h3>
            <p class="panel-desc">조건에 맞는 Initiative가 없습니다.</p>
          </div>
        </div>
        <div class="empty">먼저 KR(세부)에 연결된 Initiative를 생성해 주세요.</div>
      </section>
    `;
    return;
  }

  const selected = initiatives.some((item) => item.id === state.selectedInitiativeId);
  if (!selected) {
    state.selectedInitiativeId = initiatives[0].id;
  }

  const subKrMap = new Map(subKrs.map((item) => [item.id, item]));
  const krMap = new Map(krs.map((item) => [item.id, item]));
  const objectiveMap = new Map(objectives.map((item) => [item.id, item]));
  const selectedInitiative = initiatives.find((item) => item.id === state.selectedInitiativeId) || initiatives[0];
  state.selectedInitiativeId = selectedInitiative.id;

  const selectedSubKr = subKrMap.get(selectedInitiative.subKrId) || null;
  const selectedKr = selectedSubKr
    ? krMap.get(selectedSubKr.krId) || null
    : (selectedInitiative.krId ? krMap.get(selectedInitiative.krId) || null : null);
  const selectedObjective = selectedKr
    ? objectiveMap.get(selectedKr.objectiveId) || null
    : (selectedInitiative.objectiveId ? objectiveMap.get(selectedInitiative.objectiveId) || null : null);

  const [monthly, initiativeLinks, experiments, krLinksForSelected] = await Promise.all([
    fetchJSON(
      `/api/monthly-performances?targetType=initiative&targetId=${encodeURIComponent(selectedInitiative.id)}`
    ),
    fetchJSON(`/api/initiative-experiment-links?initiativeId=${encodeURIComponent(selectedInitiative.id)}`).catch(() => []),
    fetchJSON('/api/experiments').catch(() => []),
    selectedKr
      ? fetchJSON(`/api/kr-experiment-links?krId=${encodeURIComponent(selectedKr.id)}`).catch(() => [])
      : Promise.resolve([])
  ]);
  const experimentMap = new Map(experiments.map((item) => [item.id, item]));
  const directLinkedExperiments = initiativeLinks
    .map((link) => experimentMap.get(link.experimentId))
    .filter(Boolean);
  const inheritedKrExperiments = (krLinksForSelected || [])
    .map((link) => experimentMap.get(link.experimentId))
    .filter(Boolean);
  const resolvedLinkedExperiments = directLinkedExperiments.length > 0
    ? directLinkedExperiments
    : [...new Map(inheritedKrExperiments.map((item) => [item.id, item])).values()];
  const isInheritedFromKr = directLinkedExperiments.length === 0 && resolvedLinkedExperiments.length > 0;
  const initiativeSignal = signalFromValue(selectedInitiative.progressQuant);
  const initiativeHalfYear = selectedObjective
    ? `${selectedObjective.year} ${selectedObjective.half}`
    : (selectedInitiative.year && selectedInitiative.half ? `${selectedInitiative.year} ${selectedInitiative.half}` : '-');
  const initiativeConnectedInfo = connectedInfoSection([
    { label: '도메인', value: selectedInitiative.domain || selectedKr?.domain || selectedObjective?.domain || '-', variant: 'domain' },
    { label: 'AARRR', value: selectedInitiative.aarrrTag || selectedKr?.aarrrTag || selectedObjective?.aarrrTag || '-', variant: 'aarrr' },
    { label: '실', value: selectedInitiative.division || selectedKr?.division || selectedObjective?.division || selectedObjective?.teamId || '-' },
    { label: '팀', value: selectedInitiative.team || selectedKr?.team || '-' },
    { label: '연도/반기', value: initiativeHalfYear },
    { label: 'Owner', value: selectedInitiative.owner || selectedObjective?.owner || '-' },
    { label: '상태', value: selectedInitiative.status || '-', variant: 'status' }
  ]);

  el.pageContent.innerHTML = `
    ${dashboardQuickActions()}
    <section class="split">
      <article class="card panel">
        <h3>Initiative 목록</h3>
        <div class="list-card">
          ${initiatives
            .map(
              (item) => `<button class="option-btn ${item.id === selectedInitiative.id ? 'active' : ''}" data-initiative-select="${esc(item.id)}">
                <strong>${esc(item.title)}</strong>
                <small>${fmtNumber(item.progressQuant)}% / ${esc(statusOptionLabel(item.status || '-'))} / ${esc(item.team || '-')}</small>
              </button>`
            )
            .join('')}
        </div>
      </article>

      <article class="card panel">
        <div class="list-panel-head">
          <div>
            <h3>${esc(selectedInitiative.title)}</h3>
            <p class="panel-desc">${esc(selectedInitiative.definition || 'Initiative 설명 없음')}</p>
          </div>
          <button class="btn ghost table-inline-btn" type="button" id="btnDeleteInitiative">삭제</button>
        </div>

        ${initiativeConnectedInfo}

        <div class="grid-5">
          <div class="stat"><p class="k">Progress</p><p class="v">${fmtNumber(selectedInitiative.progressQuant)}%</p></div>
          <div class="stat"><p class="k">Signal</p><p class="v">${signalBadge(initiativeSignal)}</p></div>
          <div class="stat"><p class="k">Monthly Entries</p><p class="v">${monthly.length}</p></div>
          <div class="stat"><p class="k">Mapping Source</p><p class="v">${isInheritedFromKr ? 'KR inherited' : 'Initiative direct'}</p></div>
          <div class="stat"><p class="k">Linked Experiments</p><p class="v">${resolvedLinkedExperiments.length}</p></div>
        </div>

        <section style="margin-top:12px;">
          <div class="section-head-inline">
            <h3>상태 수정</h3>
            <button class="btn secondary" id="btnInitiativeMonthlyUpdate" type="button" style="width:auto;">+ 월 실적 업데이트</button>
          </div>
          <form id="initiativeStatusForm" class="inline-actions">
            <select id="initiativeStatusSelect" style="width:160px;">
              ${statusOptionsHtml(OKR_STATUS_OPTIONS, selectedInitiative.status || 'planned')}
            </select>
            <button class="btn secondary" type="submit" style="width:auto;">상태 저장</button>
          </form>
        </section>

        <section style="margin-top:12px;">
          <h3>월 실적</h3>
          ${monthly.length === 0 ? '<div class="empty">월 실적 데이터가 없습니다.</div>' : `
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Month</th><th>Value</th><th>Source</th><th></th></tr></thead>
                <tbody>
                  ${monthly
                    .map(
                      (item) => `<tr>
                        <td>${esc(item.yearMonth)}</td>
                        <td>${fmtNumber(item.actualValue)}</td>
                        <td>${statusBadge(item.sourceType)}</td>
                        <td><button class="btn ghost table-inline-btn" type="button" data-edit-initiative-monthly="${esc(selectedInitiative.id)}" data-ym="${esc(item.yearMonth)}" data-value="${esc(item.actualValue || 0)}">수정</button></td>
                      </tr>`
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `}
        </section>

        <section style="margin-top:12px;">
          <h3>연결된 실험</h3>
          ${resolvedLinkedExperiments.length === 0
    ? '<div class="empty">연결된 실험이 없습니다. Experiment 페이지에서 등록/수정 후 상위 목표를 매핑해 주세요.</div>'
    : `
            ${isInheritedFromKr ? '<p class="panel-desc">직접 Initiative 매핑이 없어 상위 KR에 연결된 실험을 표시합니다.</p>' : ''}
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>실험명</th><th>상태</th><th>AARRR</th><th>담당자</th></tr></thead>
                <tbody>
                  ${resolvedLinkedExperiments
      .map(
        (item) => `<tr>
                      <td>${esc(item.title)}</td>
                      <td>${statusBadge(item.status || '-')}</td>
                      <td>${esc(item.aarrrTag || '-')}</td>
                      <td>${esc(item.owner || '-')}</td>
                    </tr>`
      )
      .join('')}
                </tbody>
              </table>
            </div>
          `}
        </section>

      </article>
    </section>
  `;

  el.pageContent.querySelectorAll('[data-initiative-select]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.selectedInitiativeId = button.dataset.initiativeSelect;
      await renderCurrentRoute();
    });
  });

  const initiativeStatusForm = document.getElementById('initiativeStatusForm');
  initiativeStatusForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await fetchJSON(`/api/initiatives/${encodeURIComponent(selectedInitiative.id)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: document.getElementById('initiativeStatusSelect').value,
          actor: 'pm.demo',
          reason: 'update initiative status from detail'
        })
      });
      showToast('상태가 저장되었습니다.');
      await renderCurrentRoute();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  const btnInitiativeMonthlyUpdate = document.getElementById('btnInitiativeMonthlyUpdate');
  btnInitiativeMonthlyUpdate.addEventListener('click', () => {
    openMonthlyUpdateModal({
      title: 'Initiative 월 실적 업데이트',
      description: 'Initiative 진행률(%)을 월 단위로 입력합니다.',
      targetType: 'initiative',
      targetId: selectedInitiative.id,
      valueLabel: '진행률(%)',
      valuePlaceholder: '0~100',
      min: 0,
      max: 100,
      step: '0.01',
      successMessage: '월 실적과 진행률이 저장되었습니다.',
      afterUpsert: async (progressValue) => {
        await fetchJSON(`/api/initiatives/${encodeURIComponent(selectedInitiative.id)}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            progressQuant: progressValue,
            actor: 'pm.demo',
            reason: 'update initiative progress from monthly entry'
          })
        });
      }
    });
  });

  el.pageContent.querySelectorAll('[data-edit-initiative-monthly]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.editInitiativeMonthly || '';
      const yearMonth = String(button.dataset.ym || '').trim();
      const rawValue = Number(button.dataset.value);
      if (!targetId || !yearMonth) return;
      openMonthlyUpdateModal({
        title: 'Initiative 월 실적 수정',
        description: 'Initiative 진행률(%)을 월 단위로 입력합니다.',
        targetType: 'initiative',
        targetId,
        defaultYearMonth: yearMonth,
        defaultValue: Number.isFinite(rawValue) ? rawValue : undefined,
        valueLabel: '진행률(%)',
        valuePlaceholder: '0~100',
        min: 0,
        max: 100,
        step: '0.01',
        isEdit: true,
        successMessage: '월 실적이 수정되었습니다.',
        afterUpsert: async (progressValue) => {
          await fetchJSON(`/api/initiatives/${encodeURIComponent(targetId)}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              progressQuant: progressValue,
              actor: 'pm.demo',
              reason: 'update initiative progress from monthly entry'
            })
          });
        }
      });
    });
  });

  const btnDeleteInitiative = document.getElementById('btnDeleteInitiative');
  if (btnDeleteInitiative) {
    btnDeleteInitiative.addEventListener('click', async () => {
      try {
        const deleted = await confirmDeleteAndRefresh({
          path: `/api/initiatives/${encodeURIComponent(selectedInitiative.id)}`,
          label: selectedInitiative.title,
          reason: 'delete initiative from initiative page'
        });
        if (deleted) {
          state.selectedInitiativeId = null;
        }
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }
}

async function renderInputSources() {
  const inputQuery = entityQuery({
    sortBy: state.inputSortBy
  });
  const defaultInputTeam = INPUT_REGISTRANT.team;
  const [inputs, summary, initiatives, krs, subKrs, taxonomy] = await Promise.all([
    fetchJSON(`/api/input-sources${inputQuery}`),
    fetchJSON(`/api/input-sources/summary${state.filters.team ? `?team=${encodeURIComponent(state.filters.team)}` : ''}`),
    fetchJSON('/api/initiatives').catch(() => []),
    fetchJSON('/api/krs').catch(() => []),
    fetchJSON('/api/sub-krs').catch(() => []),
    fetchJSON('/api/admin/taxonomy')
  ]);

  const inputById = new Map(inputs.map((item) => [item.id, item]));
  const visibleInputs = state.inputShowUndecidedOnly ? inputs.filter((item) => item.status === 'registered') : inputs;

  const goalOptions = [
    ...krs.map((item) => ({
      type: 'kr',
      label: `${item.title}`,
      value: `kr:${item.id}`,
      targetType: 'kr',
      team: String(item.team || '').trim(),
      division: String(item.division || '').trim()
    })),
    ...subKrs.map((item) => ({
      type: 'sub_kr',
      label: `${item.title}`,
      value: `sub_kr:${item.id}`,
      targetType: 'sub_kr',
      parent: item.krId,
      team: String(item.team || '').trim(),
      division: String(item.division || '').trim()
    })),
    ...initiatives.map((item) => ({
      type: 'initiative',
      label: `${item.title}`,
      value: `initiative:${item.id}`,
      targetType: 'initiative',
      team: String(item.team || '').trim(),
      division: String(item.division || '').trim()
    }))
  ]
    .filter((item) => item.label.trim())
    .sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.label.localeCompare(b.label);
    })
    .map((item) => {
      const typeLabel = item.type === 'kr' ? 'KR' : item.type === 'sub_kr' ? 'Sub-KR' : 'Initiative';
      return {
        ...item,
        labelWithType: `[${typeLabel}] ${item.label}`
      };
    });

  const openInputCreateModal = () => {
    openLayerModal({
      title: '인풋 등록',
      description: '분류/프로덕트/소스 기반으로 우선순위가 자동 계산됩니다.',
      submitLabel: '등록',
      bodyHtml: `
        <div class="form-grid cols-2">
          <div class="field-row">
            <label for="layerInputTitle">인풋 제목 *</label>
            <input id="layerInputTitle" name="title" type="text" placeholder="예: 추천 카드 클릭 저하 이슈" required />
          </div>
          <div class="field-row">
            <label for="layerInputClassification">분류 *</label>
            <select id="layerInputClassification" name="classification" required>
              <option value="">선택</option>
              ${(Array.isArray(taxonomy.inputClassifications) ? taxonomy.inputClassifications : []).map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}
            </select>
          </div>
          <div class="field-row">
            <label for="layerInputProduct">프로덕트 구분 *</label>
            <select id="layerInputProduct" name="product" required>
              <option value="">선택</option>
              ${(Array.isArray(taxonomy.inputProducts) ? taxonomy.inputProducts : []).map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}
            </select>
          </div>
          <div class="field-row">
            <label for="layerInputSource">소스 *</label>
            <select id="layerInputSource" name="source" required>
              <option value="">선택</option>
              ${(Array.isArray(taxonomy.inputSources) ? taxonomy.inputSources : []).map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}
            </select>
          </div>
          <div class="field-row">
            <label for="layerInputTeam">등록부서</label>
            <input id="layerInputTeam" name="team" type="text" placeholder="예: 추천큐레이션팀" required />
          </div>
          <div class="field-row">
            <label for="layerInputRegistrant">등록자</label>
            <input id="layerInputRegistrant" name="actor" type="text" placeholder="예: 김민수" required />
          </div>
          <div class="field-row">
            <label for="layerInputDeployBy">배포 필요일</label>
            <input id="layerInputDeployBy" name="deployBy" type="date" />
          </div>
          <div class="field-row">
            <label for="layerInputRef">참고 링크</label>
            <input id="layerInputRef" name="referenceUrl" type="url" placeholder="https://..." />
          </div>
          <div class="field-row" style="grid-column:1 / -1;">
            <label for="layerInputDetail">상세 내용</label>
            <textarea id="layerInputDetail" name="detail" placeholder="배경/근거/참고사항"></textarea>
          </div>
        </div>
      `,
      onSubmit: async (formData) => {
        const deployByRaw = optionalText(formData, 'deployBy') || '';
        const deployBy = deployByRaw ? String(deployByRaw).replace(/\//g, '-') : '';
        await fetchJSON('/api/input-sources', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            reporter: String(formData.get('actor') || '').trim(),
            title: String(formData.get('title') || '').trim(),
            classification: String(formData.get('classification') || '').trim(),
            product: String(formData.get('product') || '').trim(),
            source: String(formData.get('source') || '').trim(),
            detail: optionalText(formData, 'detail') || '',
            referenceUrl: optionalText(formData, 'referenceUrl') || '',
            division: '',
            team: String(formData.get('team') || '').trim(),
            actor: String(formData.get('actor') || '').trim(),
            deployBy,
            reason: 'create input source from UI'
          })
        });
        showToast('Input 등록 완료');
        await renderCurrentRoute();
      }
    });
  };

  const openInputDecisionModal = (item) => {
    const goalsByType = {
      kr: goalOptions.filter((goal) => goal.type === 'kr'),
      sub_kr: goalOptions.filter((goal) => goal.type === 'sub_kr'),
      initiative: goalOptions.filter((goal) => goal.type === 'initiative')
    };
    const buildGoalOptions = () => {
      const normalized = {
        kr: goalsByType.kr,
        sub_kr: goalsByType.sub_kr,
        initiative: goalsByType.initiative
      };

      return `
        <optgroup label="KR">
          ${normalized.kr.map((goal) => `<option value="${esc(goal.labelWithType)}" data-goal-type="${esc(goal.targetType)}" data-goal-id="${esc(goal.value.split(':')[1])}">${esc(goal.labelWithType)}</option>`).join('')}
        </optgroup>
        <optgroup label="Sub-KR">
          ${normalized.sub_kr.map((goal) => `<option value="${esc(goal.labelWithType)}" data-goal-type="${esc(goal.targetType)}" data-goal-id="${esc(goal.value.split(':')[1])}">${esc(goal.labelWithType)}</option>`).join('')}
        </optgroup>
        <optgroup label="Initiative">
          ${normalized.initiative.map((goal) => `<option value="${esc(goal.labelWithType)}" data-goal-type="${esc(goal.targetType)}" data-goal-id="${esc(goal.value.split(':')[1])}">${esc(goal.labelWithType)}</option>`).join('')}
        </optgroup>
      `;
    };

    openLayerModal({
      title: '인풋 과제화 여부 결정',
      description: '과제화 할지, 안 할지와 사유를 한 번에 결정합니다.',
      submitLabel: '결정 저장',
      bodyHtml: `
        <div class="form-grid cols-2">
          <div class="field-row" style="grid-column:1 / -1;">
            <label for="layerInputDecisionType">과제화 여부 *</label>
            <select id="layerInputDecisionType" name="decisionType" required>
              <option value="">선택</option>
              <option value="convert">과제화</option>
              <option value="reject">미과제화</option>
            </select>
          </div>
          <div class="field-row decision-dropdown">
            <label for="layerInputDecisionGoalSearch">목표 연결</label>
            <select id="layerInputDecisionGoalSearch" name="goalDisplay" class="decision-dropdown">
              <option value="">선택</option>
              ${buildGoalOptions()}
            </select>
            <input id="layerInputDecisionGoalType" type="hidden" name="goalType" />
            <input id="layerInputDecisionGoalId" type="hidden" name="goalId" />
            <small class="field-help">과제화 시에만 필수로 선택합니다.</small>
          </div>
          <div class="field-row" style="grid-column:1 / -1;">
            <label for="layerInputDecisionRejectReason">미과제화 사유</label>
            <textarea id="layerInputDecisionRejectReason" name="rejectionReason" placeholder="미과제화 사유를 입력해 주세요."></textarea>
          </div>
        </div>
      `,
      onSubmit: async (formData) => {
        const decision = String(formData.get('decisionType') || '').trim();
        const goalType = String(formData.get('goalType') || '').trim();
        const goalId = String(formData.get('goalId') || '').trim();
        const rejectionReason = optionalText(formData, 'rejectionReason');

        if (!decision) throw new Error('과제화 여부를 선택해 주세요.');

        if (decision === 'convert') {
          if (!goalType || !goalId) {
            throw new Error('과제화 시 목표를 선택해 주세요.');
          }
        }

        if (decision === 'reject' && !rejectionReason) {
          throw new Error('미과제화 사유를 입력해 주세요.');
        }

        await fetchJSON(`/api/input-sources/${encodeURIComponent(item.id)}/process`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            decision,
            workingTeam: String(item.team || item.division || defaultInputTeam || '').trim(),
            goalType: decision === 'convert' ? goalType : undefined,
            goalId: decision === 'convert' ? goalId : undefined,
            rejectionReason: decision === 'reject' ? rejectionReason : undefined,
            actor: 'pm.demo',
            reason: 'decide input source from UI'
          })
        });

        showToast(`Input 과제화 ${decision === 'convert' ? '과제화 반영' : '미과제화 반영'} 완료`);
        await renderCurrentRoute();
      }
    });

    const decisionType = document.getElementById('layerInputDecisionType');
    const goalSearchInput = document.getElementById('layerInputDecisionGoalSearch');
    const goalTypeInput = document.getElementById('layerInputDecisionGoalType');
    const goalIdInput = document.getElementById('layerInputDecisionGoalId');
    const goalListEl = document.getElementById('layerInputDecisionGoalSearch');
    const rejectionReason = document.getElementById('layerInputDecisionRejectReason');
    const goalRow = goalSearchInput ? goalSearchInput.closest('.field-row') : null;
    const rejectRow = rejectionReason ? rejectionReason.closest('.field-row') : null;

    const refreshGoalList = () => {
      if (!goalListEl) return;
      goalListEl.innerHTML = `<option value="">선택</option>${buildGoalOptions()}`;
      if (!goalSearchInput) return;
      if (!goalSearchInput.value) {
        if (goalTypeInput) goalTypeInput.value = '';
        if (goalIdInput) goalIdInput.value = '';
        if (goalSearchInput && goalSearchInput.tagName && String(goalSearchInput.tagName).toLowerCase() === 'select') {
          goalSearchInput.value = '';
        }
        return;
      }
      const selected = [...goalListEl.options].find((option) => option.value === goalSearchInput.value);
      if (!selected) {
        goalSearchInput.value = '';
        if (goalTypeInput) goalTypeInput.value = '';
        if (goalIdInput) goalIdInput.value = '';
      }
    };

    const applyDecisionMode = () => {
      const isConvert = decisionType?.value === 'convert';
      const isReject = decisionType?.value === 'reject';

      if (goalSearchInput) {
        goalSearchInput.disabled = !isConvert;
        if (goalRow) goalRow.classList.toggle('dimmed', !isConvert);
        if (!isConvert) {
          goalSearchInput.value = '';
          if (goalTypeInput) goalTypeInput.value = '';
          if (goalIdInput) goalIdInput.value = '';
        }
        if (isConvert) {
          refreshGoalList();
        }
      }

      if (rejectionReason) {
        rejectionReason.disabled = !isReject;
        if (rejectRow) rejectRow.classList.toggle('dimmed', !isReject);
        if (!isReject) rejectionReason.value = '';
      }
    };

    const resolveGoalChoice = () => {
      if (!goalSearchInput || !goalTypeInput || !goalIdInput) return;
      const selected = goalSearchInput.options && goalSearchInput.selectedOptions ? goalSearchInput.selectedOptions[0] : null;
      if (!selected) {
        goalTypeInput.value = '';
        goalIdInput.value = '';
        return;
      }
      if (selected.value) {
        goalTypeInput.value = selected.dataset.goalType || '';
        goalIdInput.value = selected.dataset.goalId || '';
      } else {
        goalTypeInput.value = '';
        goalIdInput.value = '';
      }
    };

    if (decisionType) {
      decisionType.addEventListener('change', applyDecisionMode);
      applyDecisionMode();
    }
    if (goalSearchInput) {
      goalSearchInput.addEventListener('input', resolveGoalChoice);
      goalSearchInput.addEventListener('change', resolveGoalChoice);
    }
  };

  el.pageContent.innerHTML = `
    <section class="card panel">
      <div class="grid-4" style="margin-top:8px;">
        <article class="stat"><p class="k">Input Total</p><p class="v">${summary.total}</p></article>
        <article class="stat"><p class="k">과제화 미결정</p><p class="v">${summary.byStatus.registered}</p></article>
        <article class="stat"><p class="k">과제화 완료</p><p class="v">${summary.byStatus.converted}</p></article>
        <article class="stat"><p class="k">미과제화</p><p class="v">${summary.byStatus.rejected}</p></article>
      </div>
    </section>

    <section class="card panel">
      <div class="list-panel-head">
        <h3>Input List</h3>
      </div>
      <div class="table-toolbar input-toolbar">
        <div class="table-size-control">
          <select id="inputSortSelect">
            <option value="priority_desc" ${state.inputSortBy === 'priority_desc' ? 'selected' : ''}>우선순위 높은순</option>
            <option value="priority_asc" ${state.inputSortBy === 'priority_asc' ? 'selected' : ''}>우선순위 낮은순</option>
            <option value="latest" ${state.inputSortBy === 'latest' ? 'selected' : ''}>최신순</option>
            <option value="oldest" ${state.inputSortBy === 'oldest' ? 'selected' : ''}>오래된순</option>
          </select>
        </div>
        <label class="toolbar-filter-toggle">
          <input type="checkbox" id="inputUndecidedFilter" ${state.inputShowUndecidedOnly ? 'checked' : ''} />
          <span>미결정 인풋</span>
        </label>
        <button class="btn secondary table-inline-btn" type="button" id="btnCreateInputSourceList">+ 인풋 등록</button>
      </div>

      ${visibleInputs.length === 0 ? '<div class="empty">조건에 맞는 인풋이 없습니다.</div>' : `
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>우선순위</th>
                <th>인풋 제목</th>
                <th>분류</th>
                <th>실</th>
                <th>요청팀</th>
                <th>등록일</th>
                <th>과제화 여부</th>
                <th>결정</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${visibleInputs
                .map(
                  (item) => `<tr>
                    <td>${inputPriorityBadge(item.priority)}</td>
                    <td>${esc(item.title)}</td>
                    <td>${inputClassificationBadge(item.classification)}</td>
                    <td>${esc(item.division || '-')}</td>
                    <td>${esc(item.team || '-')}</td>
                    <td>${esc(item.createdAt ? fmtDateTime(item.createdAt).slice(0, 10) : '-')}</td>
                    <td>${inputDecisionBadge(item.status)}</td>
                    <td>${item.status === 'registered'
                        ? `<button class="btn secondary table-inline-btn" type="button" data-input-decide="${esc(item.id)}">과제화 여부 선택</button>`
                        : '-'
                    }</td>
                    <td><button class="btn ghost table-inline-btn" type="button" data-input-delete="${esc(item.id)}" data-input-title="${esc(item.title)}">삭제</button></td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `}
    </section>
  `;

  const dashboardCreateButtons = el.pageContent.querySelectorAll('[id^="btnCreateInputSource"]');
  dashboardCreateButtons.forEach((button) => {
    button.addEventListener('click', () => openInputCreateModal());
  });

  const inputSortSelect = document.getElementById('inputSortSelect');
  if (inputSortSelect) {
    inputSortSelect.addEventListener('change', async () => {
      state.inputSortBy = String(inputSortSelect.value || 'priority_desc');
      await renderCurrentRoute();
    });
  }

  const inputUndecidedFilter = document.getElementById('inputUndecidedFilter');
  if (inputUndecidedFilter) {
    inputUndecidedFilter.addEventListener('change', async () => {
      state.inputShowUndecidedOnly = Boolean(inputUndecidedFilter.checked);
      state.selectedInputSourceId = null;
      await renderCurrentRoute();
    });
  }

  el.pageContent.querySelectorAll('[data-input-decide]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = inputById.get(button.dataset.inputDecide);
      if (!item) {
        showToast('인풋 정보를 찾을 수 없습니다.', true);
        return;
      }
      openInputDecisionModal(item);
    });
  });

  el.pageContent.querySelectorAll('[data-input-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      const inputSourceId = String(button.dataset.inputDelete || '').trim();
      const inputTitle = String(button.dataset.inputTitle || '').trim();
      if (!inputSourceId) return;
      try {
        await confirmDeleteAndRefresh({
          path: `/api/input-sources/${encodeURIComponent(inputSourceId)}`,
          label: inputTitle,
          reason: 'delete input source from input page'
        });
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

/* async function renderSearch() {
              <option value="">선택</option>
              ${initiativeOptions}
            </select>
            <small class="field-help">과제화 시에만 필수로 선택합니다.</small>
          </div>
          <div class="field-row" style="grid-column:1 / -1;">
            <label for="layerInputDecisionRejectReason">미과제화 사유</label>
            <textarea id="layerInputDecisionRejectReason" name="rejectionReason" placeholder="미과제화 사유를 입력해 주세요."></textarea>
          </div>
        </div>
      `,
      onSubmit: async (formData) => {
        const decision = String(formData.get('decisionType') || '').trim();
        const workingTeam = String(formData.get('workingTeam') || '').trim();
        const initiativeId = optionalText(formData, 'initiativeId');
        const rejectionReason = optionalText(formData, 'rejectionReason');

        if (!decision) throw new Error('과제화 여부를 선택해 주세요.');
        if (!workingTeam) throw new Error('작업부서를 선택해 주세요.');

        if (decision === 'convert' && !initiativeId) {
          throw new Error('과제화 시 OKR 이니셔티브를 선택해 주세요.');
        }

        if (decision === 'reject' && !rejectionReason) {
          throw new Error('미과제화 사유를 입력해 주세요.');
        }

        await fetchJSON(`/api/input-sources/${encodeURIComponent(item.id)}/process`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            decision,
            workingTeam,
            initiativeId,
            rejectionReason: rejectionReason || undefined,
            actor: 'pm.demo',
            reason: 'decide input source from UI'
          })
        });

        showToast(`Input 과제화 ${decision === 'convert' ? '과제화 반영' : '미과제화 반영'} 완료`);
        await renderCurrentRoute();
      }
    });
  };

  el.pageContent.innerHTML = `
    <section class="card panel">
      <div class="grid-4" style="margin-top:8px;">
        <article class="stat"><p class="k">Input Total</p><p class="v">${summary.total}</p></article>
        <article class="stat"><p class="k">과제화 미결정</p><p class="v">${summary.byStatus.registered}</p></article>
        <article class="stat"><p class="k">과제화 완료</p><p class="v">${summary.byStatus.converted}</p></article>
        <article class="stat"><p class="k">미과제화</p><p class="v">${summary.byStatus.rejected}</p></article>
      </div>
    </section>

    <section class="card panel">
      <div class="list-panel-head">
        <h3>Input List</h3>
      </div>
      <div class="table-toolbar input-toolbar">
        <div class="table-size-control">
          <select id="inputSortSelect">
            <option value="priority_desc" ${state.inputSortBy === 'priority_desc' ? 'selected' : ''}>우선순위 높은순</option>
            <option value="priority_asc" ${state.inputSortBy === 'priority_asc' ? 'selected' : ''}>우선순위 낮은순</option>
            <option value="latest" ${state.inputSortBy === 'latest' ? 'selected' : ''}>최신순</option>
            <option value="oldest" ${state.inputSortBy === 'oldest' ? 'selected' : ''}>오래된순</option>
          </select>
        </div>
        <label class="toolbar-filter-toggle">
          <input type="checkbox" id="inputUndecidedFilter" ${state.inputShowUndecidedOnly ? 'checked' : ''} />
          <span>미결정 인풋</span>
        </label>
        <button class="btn secondary table-inline-btn" type="button" id="btnCreateInputSourceList">+ 인풋 등록</button>
      </div>

      ${visibleInputs.length === 0 ? '<div class="empty">조건에 맞는 인풋이 없습니다.</div>' : `
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>우선순위</th>
                <th>인풋 제목</th>
                <th>분류</th>
                <th>실</th>
                <th>요청팀</th>
                <th>등록일</th>
                <th>과제화 여부</th>
                <th>결정</th>
              </tr>
            </thead>
            <tbody>
              ${visibleInputs
                .map(
                  (item) => `<tr>
                    <td>${inputPriorityBadge(item.priority)}</td>
                    <td>${esc(item.title)}</td>
                    <td>${inputClassificationBadge(item.classification)}</td>
                    <td>${esc(item.division || '-')}</td>
                    <td>${esc(item.team || '-')}</td>
                    <td>${esc(item.createdAt ? fmtDateTime(item.createdAt).slice(0, 10) : '-')}</td>
                    <td>${inputDecisionBadge(item.status)}</td>
                      <td>${item.status === 'registered'
                        ? `<button class="btn secondary table-inline-btn" type="button" data-input-decide="${esc(item.id)}">과제화 여부 선택</button>`
                        : '-'
                      }</td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `}
    </section>
  `;

  const dashboardCreateButtons = el.pageContent.querySelectorAll('[id^="btnCreateInputSource"]');
  dashboardCreateButtons.forEach((button) => {
    button.addEventListener('click', () => openInputCreateModal());
  });

  const inputSortSelect = document.getElementById('inputSortSelect');
  if (inputSortSelect) {
    inputSortSelect.addEventListener('change', async () => {
      state.inputSortBy = String(inputSortSelect.value || 'priority_desc');
      await renderCurrentRoute();
    });
  }

  const inputUndecidedFilter = document.getElementById('inputUndecidedFilter');
  if (inputUndecidedFilter) {
    inputUndecidedFilter.addEventListener('change', async () => {
      state.inputShowUndecidedOnly = Boolean(inputUndecidedFilter.checked);
      state.selectedInputSourceId = null;
      await renderCurrentRoute();
    });
  }

  el.pageContent.querySelectorAll('[data-input-decide]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = inputById.get(button.dataset.inputDecide);
      if (!item) {
        showToast('인풋 정보를 찾을 수 없습니다.', true);
        return;
      }
      openInputDecisionModal(item);
    });
  });
}

*/

async function renderSearch() {
  const result = state.searchQuery ? await fetchJSON(`/api/search?q=${encodeURIComponent(state.searchQuery)}`) : null;

  const resultSection = !result
    ? '<div class="empty">검색어를 입력하면 결과가 표시됩니다.</div>'
    : `
      <div class="grid-2">
        <article class="card panel">
          <h3>Objectives (${result.objectives.length})</h3>
          <ul class="mini-list">${result.objectives.map((item) => `<li>${esc(item.title)} | ${esc(item.division || item.teamId || '-')} | ${esc(item.domain || '-')}</li>`).join('') || '<li>없음</li>'}</ul>
        </article>
        <article class="card panel">
          <h3>KRs (${result.krs.length})</h3>
          <ul class="mini-list">${result.krs.map((item) => `<li>${esc(item.title)} | ${esc(item.unit || '-')}</li>`).join('') || '<li>없음</li>'}</ul>
        </article>
        <article class="card panel">
          <h3>Experiments (${result.experiments.length})</h3>
          <ul class="mini-list">${result.experiments.map((item) => `<li>${esc(item.title)} | ${esc(item.aarrrTag)}</li>`).join('') || '<li>없음</li>'}</ul>
        </article>
        <article class="card panel">
          <h3>Initiatives (${result.initiatives.length})</h3>
          <ul class="mini-list">${result.initiatives.map((item) => `<li>${esc(item.title)} | ${esc(statusOptionLabel(item.status || '-'))}</li>`).join('') || '<li>없음</li>'}</ul>
        </article>
      </div>
    `;

  el.pageContent.innerHTML = `
    <section class="card panel">
      <h3>통합 검색</h3>
      <form id="searchForm" class="form-grid cols-2">
        <input id="searchInput" type="text" placeholder="검색어 입력 (예: 리텐션, growth, Activation)" value="${esc(state.searchQuery)}" required />
        <button class="btn" type="submit">검색</button>
      </form>
    </section>
    ${resultSection}
  `;

  document.getElementById('searchForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    state.searchQuery = document.getElementById('searchInput').value.trim();
    await renderCurrentRoute();
  });
}

async function renderAdminPresets() {
  const presetData = await fetchJSON('/api/admin/presets');
  const okrPresetGroups = [
    { key: 'domains', label: 'OKR 도메인', hint: 'Objective/KR/Initiative 도메인 선택값' },
    { key: 'divisions', label: 'OKR 실', hint: 'Objective/KR/Initiative 실 선택값' },
    { key: 'teams', label: 'OKR 팀', hint: '팀 등록 시 상위 조직(실) 연결 필수' }
  ];
  const inputPresetGroups = [
    { key: 'inputClassifications', label: '인풋 분류', hint: '인풋 등록 시 분류 선택값' },
    { key: 'inputProducts', label: '인풋 프로덕트 구분', hint: '인풋 등록 시 프로덕트 선택값' },
    { key: 'inputSources', label: '인풋 소스', hint: '인풋 등록 시 소스 선택값' }
  ];

  const teamDivisionMap = presetData.teamDivisions && typeof presetData.teamDivisions === 'object'
    ? presetData.teamDivisions
    : {};
  const divisionPresetValues = Array.isArray(presetData.divisions) ? presetData.divisions : [];

  function renderDivisionOptions(selectedDivision = '') {
    return divisionPresetValues
      .map((division) => `<option value="${esc(division)}" ${division === selectedDivision ? 'selected' : ''}>${esc(division)}</option>`)
      .join('');
  }

  function renderValuePresetBlock(group) {
    const values = Array.isArray(presetData[group.key]) ? presetData[group.key] : [];
    const disabledAttr = '';
    const readOnlyAttr = '';
    return `
      <section class="preset-block">
        <div class="section-head-inline">
          <h3>${esc(group.label)}</h3>
        </div>
        <p class="panel-desc">${esc(group.hint)}</p>
        <form class="preset-add-row" data-preset-add-form="${esc(group.key)}">
          <input name="value" type="text" placeholder="${esc(`${group.label} 값 입력`)}" ${disabledAttr} required />
          <button class="btn secondary table-inline-btn" type="submit" ${disabledAttr}>추가</button>
        </form>
        ${values.length === 0
    ? '<div class="empty">등록된 값이 없습니다.</div>'
    : `<div class="table-wrap">
              <table class="data-table preset-table">
                <thead>
                  <tr><th>값</th><th class="col-actions">액션</th></tr>
                </thead>
                <tbody>
                  ${values
      .map((value, index) => {
        const inputId = `preset-${group.key}-${index}`;
        return `<tr>
                      <td><input id="${esc(inputId)}" type="text" value="${esc(value)}" ${readOnlyAttr} /></td>
                      <td class="col-actions">
                        <div class="preset-actions">
                          <button class="btn secondary table-inline-btn" type="button" data-preset-update data-preset-type="${esc(group.key)}" data-current-value="${esc(value)}" data-input-id="${esc(inputId)}" ${disabledAttr}>수정</button>
                          <button class="btn ghost table-inline-btn" type="button" data-preset-delete data-preset-type="${esc(group.key)}" data-current-value="${esc(value)}" ${disabledAttr}>삭제</button>
                        </div>
                      </td>
                    </tr>`;
      })
      .join('')}
                </tbody>
              </table>
            </div>`
}
      </section>
    `;
  }

  function renderTeamPresetBlock(group) {
    const values = Array.isArray(presetData[group.key]) ? presetData[group.key] : [];
    const disabledAttr = '';
    const readOnlyAttr = '';
    return `
      <section class="preset-block">
        <div class="section-head-inline">
          <h3>${esc(group.label)}</h3>
        </div>
        <p class="panel-desc">${esc(group.hint)}</p>
        <form class="preset-add-row team-preset-add-row" data-preset-add-form="${esc(group.key)}">
          <input name="value" type="text" placeholder="팀명 입력" ${disabledAttr} required />
          <select name="division" ${disabledAttr} required>
            <option value="">상위 조직(실) 선택</option>
            ${renderDivisionOptions('')}
          </select>
          <button class="btn secondary table-inline-btn" type="submit" ${disabledAttr}>추가</button>
        </form>
        ${values.length === 0
    ? '<div class="empty">등록된 팀이 없습니다.</div>'
    : `<div class="table-wrap">
              <table class="data-table preset-table team-preset-table">
                <thead>
                  <tr><th>팀</th><th>상위 조직(실)</th><th class="col-actions">액션</th></tr>
                </thead>
                <tbody>
                  ${values
      .map((value, index) => {
        const inputId = `preset-${group.key}-${index}`;
        const divisionInputId = `preset-${group.key}-division-${index}`;
        const selectedDivision = String(teamDivisionMap[value] || '').trim();
        return `<tr>
                      <td><input id="${esc(inputId)}" type="text" value="${esc(value)}" ${readOnlyAttr} /></td>
                      <td>
                        <select id="${esc(divisionInputId)}" ${disabledAttr} required>
                          <option value="">상위 조직(실) 선택</option>
                          ${renderDivisionOptions(selectedDivision)}
                        </select>
                      </td>
                      <td class="col-actions">
                        <div class="preset-actions">
                          <button class="btn secondary table-inline-btn" type="button" data-preset-update data-preset-type="${esc(group.key)}" data-current-value="${esc(value)}" data-input-id="${esc(inputId)}" data-division-input-id="${esc(divisionInputId)}" ${disabledAttr}>수정</button>
                          <button class="btn ghost table-inline-btn" type="button" data-preset-delete data-preset-type="${esc(group.key)}" data-current-value="${esc(value)}" ${disabledAttr}>삭제</button>
                        </div>
                      </td>
                    </tr>`;
      })
      .join('')}
                </tbody>
              </table>
            </div>`
}
      </section>
    `;
  }

  function renderPresetBlock(group) {
    if (group.key === 'teams') return renderTeamPresetBlock(group);
    return renderValuePresetBlock(group);
  }

  el.pageContent.innerHTML = `
    <section class="grid-2 preset-grid">
      <article class="card panel">
        <h3>OKR 프리셋</h3>
        ${okrPresetGroups.map((group) => renderPresetBlock(group)).join('')}
      </article>
      <article class="card panel">
        <h3>인풋 프리셋</h3>
        ${inputPresetGroups.map((group) => renderPresetBlock(group)).join('')}
      </article>
    </section>
  `;

  el.pageContent.querySelectorAll('[data-preset-add-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const presetType = String(form.dataset.presetAddForm || '').trim();
      const input = form.querySelector('input[name="value"]');
      const value = String(input?.value || '').trim();
      if (!presetType || !value) {
        showToast('추가할 값을 입력해 주세요.', true);
        return;
      }
      const payload = {
        presetType,
        value,
        actor: 'admin.preset',
        reason: 'manage presets from UI'
      };
      if (presetType === 'teams') {
        const divisionSelect = form.querySelector('select[name="division"]');
        const division = String(divisionSelect?.value || '').trim();
        if (!division) {
          showToast('팀의 상위 조직(실)을 선택해 주세요.', true);
          return;
        }
        payload.division = division;
      }
      try {
        await fetchJSON('/api/admin/presets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast('프리셋 추가 완료');
        await renderCurrentRoute();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });

  el.pageContent.querySelectorAll('[data-preset-update]').forEach((button) => {
    button.addEventListener('click', async () => {
      const presetType = String(button.dataset.presetType || '').trim();
      const currentValue = String(button.dataset.currentValue || '').trim();
      const inputId = String(button.dataset.inputId || '').trim();
      const input = inputId ? document.getElementById(inputId) : null;
      const nextValue = String(input?.value || '').trim();
      if (!presetType || !currentValue || !nextValue) {
        showToast('수정할 값을 입력해 주세요.', true);
        return;
      }
      const payload = {
        presetType,
        currentValue,
        nextValue,
        actor: 'admin.preset',
        reason: 'manage presets from UI'
      };
      if (presetType === 'teams') {
        const divisionInputId = String(button.dataset.divisionInputId || '').trim();
        const divisionInput = divisionInputId ? document.getElementById(divisionInputId) : null;
        const division = String(divisionInput?.value || '').trim();
        if (!division) {
          showToast('팀의 상위 조직(실)을 선택해 주세요.', true);
          return;
        }
        payload.division = division;
      }
      try {
        await fetchJSON('/api/admin/presets/update', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast('프리셋 수정 완료');
        await renderCurrentRoute();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });

  el.pageContent.querySelectorAll('[data-preset-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      const presetType = String(button.dataset.presetType || '').trim();
      const value = String(button.dataset.currentValue || '').trim();
      if (!presetType || !value) return;
      const confirmed = window.confirm(`"${value}" 값을 삭제할까요?`);
      if (!confirmed) return;
      try {
        await fetchJSON('/api/admin/presets/delete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            presetType,
            value,
            actor: 'admin.preset',
            reason: 'manage presets from UI'
          })
        });
        showToast('프리셋 삭제 완료');
        await renderCurrentRoute();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

async function renderDashboardNotifications() {
  const monthFilter = String(state.notificationMonthFilter || '').trim();
  const statusFilter = String(state.notificationStatusFilter || 'all').trim();
  const params = new URLSearchParams();
  params.set('limit', '300');
  if (monthFilter) params.set('yearMonth', monthFilter);
  if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

  const data = await fetchJSON(`/api/dashboard/notifications${params.toString() ? `?${params.toString()}` : ''}`);

  const notifications = Array.isArray(data.notifications) ? data.notifications : [];
  const normalizedNotifications = notifications.map((item) => ({
    ...item,
    __status: (String(item.status || '').trim() === 'registered' ? 'registered' : String(item.status || '').trim() === 'missing' ? 'missing' : ''),
    __division: textOrDash(item.division || item.targetDivision || '-'),
    __owner: textOrDash(item.owner || item.targetOwner || '-')
  }));
  const range = state.notificationRange || { preset: 'all', from: '', to: '' };
  const rangedNotifications = normalizedNotifications.filter((item) => {
    if (String(range.preset || 'all') === 'all') return true;
    return inDateRange(item.yearMonth, range);
  });
  const summary = {
    total: rangedNotifications.length,
    registered: rangedNotifications.filter((item) => item.__status === 'registered').length,
    missing: rangedNotifications.filter((item) => item.__status === 'missing').length
  };
  const targetTypeLabels = {
    kr: 'KR',
    sub_kr: 'Sub-KR',
    initiative: 'Initiative'
  };
  const valueLabelByType = {
    kr: '실적값',
    sub_kr: '실적값',
    initiative: '진행률(%)'
  };
  const statusLabelByType = {
    registered: '실적 등록',
    missing: '미등록'
  };

  el.pageContent.innerHTML = `
    <section class="card panel">
      <div class="section-head-inline">
        <h3>월 실적 알림</h3>
      </div>
      <div class="grid-3" style="margin-bottom:12px;">
        <div class="stat"><p class="k">전체</p><p class="v">${summary.total || 0}</p></div>
        <div class="stat"><p class="k">실적 등록</p><p class="v">${summary.registered || 0}</p></div>
        <div class="stat"><p class="k">미등록</p><p class="v">${summary.missing || 0}</p></div>
      </div>
      ${rangedNotifications.length === 0
      ? '<div class="empty">현재 기준 알림이 없습니다.</div>'
      : `<div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>대상</th><th>대상명</th><th>담당조직</th><th>담당자</th><th>미입력 월</th><th>상태</th><th>액션</th></tr></thead>
                <tbody>
                  ${rangedNotifications
                    .map(
                      (item) => `<tr data-notification-row data-status="${esc(item.__status || item.status || '')}">
                          <td>${esc(targetTypeLabels[item.targetType] || item.targetType || '-')}</td>
                          <td>${esc(item.targetTitle || '-')}</td>
                          <td>${esc(item.__division || '-')}</td>
                          <td>${esc(item.__owner || '-')}</td>
                          <td>${esc(item.yearMonth || '-')}</td>
                          <td><span class="badge ${esc(item.__status === 'missing' ? 'danger' : 'status')}">${esc(statusLabelByType[item.__status] || statusLabelByType[item.status] || item.status || '-')}</span></td>
                          <td>
                            <button class="btn secondary table-inline-btn" type="button" data-noti-jump data-target-type="${esc(item.targetType || '')}" data-target-id="${esc(item.targetId || '')}" data-parent-kr="${esc(item.parentKrId || '')}">목표로 이동</button>
                            <button class="btn table-inline-btn" type="button" data-noti-update data-target-type="${esc(item.targetType || '')}" data-target-id="${esc(item.targetId || '')}" data-ym="${esc(item.yearMonth || '')}">월 실적 업데이트</button>
                          </td>
                        </tr>`
                    )
                    .join('')}
                </tbody>
              </table>
            </div>`
        }
    </section>
  `;

  el.pageContent.querySelectorAll('[data-noti-jump]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetType = String(button.dataset.targetType || '').trim();
      const targetId = String(button.dataset.targetId || '').trim();
      const parentKrId = String(button.dataset.parentKr || '').trim();
      if (targetType === 'kr' && targetId) {
        state.selectedKrId = targetId;
        state.selectedSubKrId = null;
        navigate('/goals/krs');
        return;
      }
      if (targetType === 'sub_kr' && targetId) {
        state.selectedKrId = parentKrId || state.selectedKrId || null;
        state.selectedSubKrId = targetId;
        navigate('/goals/krs');
        return;
      }
      if (targetType === 'initiative' && targetId) {
        state.selectedInitiativeId = targetId;
        state.selectedSubKrId = null;
        navigate('/goals/initiatives');
      }
    });
  });

  el.pageContent.querySelectorAll('[data-noti-update]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetType = String(button.dataset.targetType || '').trim();
      const targetId = String(button.dataset.targetId || '').trim();
      const yearMonth = String(button.dataset.ym || '').trim();
      if (!targetType || !targetId || !yearMonth) return;
      const valueLabel = valueLabelByType[targetType] || '실적값';
      const extra = targetType === 'initiative'
        ? { min: 0, max: 100, description: 'Initiative 진행률(%)을 월 단위로 입력합니다.' }
        : {};
      openMonthlyUpdateModal({
        title: '월 실적 업데이트',
        description: extra.description || '월 단위 실적을 입력합니다.',
        targetType,
        targetId,
        valueLabel,
        valuePlaceholder: valueLabel === '진행률(%)' ? '0~100' : '입력',
        min: extra.min,
        max: extra.max,
        defaultYearMonth: yearMonth,
        step: '0.01',
        isEdit: true,
        successMessage: '월 실적이 저장되었습니다.'
      });
    });
  });
}

async function renderAdminLogs() {
  const [auditLogs, decisionLogs] = await Promise.all([
    fetchJSON('/api/audit-logs?limit=80'),
    fetchJSON('/api/decision-logs')
  ]);

  const entityTypeLabelMap = {
    objective: 'Objective',
    kr: 'KR',
    sub_kr: 'Sub-KR',
    initiative: 'Initiative',
    experiment: '실험',
    input_source: '인풋',
    monthly_performance: '월 실적',
    decision_log: '의사결정 로그',
    preset: '프리셋'
  };
  const actionLabelMap = {
    create: '생성',
    update: '수정',
    delete: '삭제',
    process: '처리',
    upsert: '업데이트',
    sync: '동기화'
  };

  function entityLabel(entityType) {
    const key = String(entityType || '').trim().toLowerCase();
    return entityTypeLabelMap[key] || String(entityType || '항목');
  }

  function actionLabel(action) {
    const key = String(action || '').trim().toLowerCase();
    return actionLabelMap[key] || String(action || '변경');
  }

  function targetLabelFromAudit(log) {
    const after = log.afterValue || {};
    const before = log.beforeValue || {};
    const candidate = after.title || after.name || after.value || before.title || before.name || before.value;
    if (candidate) return String(candidate).trim();
    if (String(log.entityType || '').toLowerCase() === 'preset') {
      const id = String(log.entityId || '').trim();
      const idx = id.indexOf(':');
      if (idx >= 0) return id.slice(idx + 1).trim();
    }
    return String(log.entityId || '').trim();
  }

  function auditMessage(log) {
    const entity = entityLabel(log.entityType);
    const action = actionLabel(log.action);
    const target = targetLabelFromAudit(log);
    const reason = String(log.reason || '').trim();
    let message = `${entity}`;
    if (target) message += ` "${target}"`;
    message += `을(를) ${action}했습니다.`;
    if (reason) message += ` 사유: ${reason}`;
    return message;
  }

  function decisionMessage(log) {
    const title = String(log.title || '제목 없음').trim();
    const decision = String(log.decision || '').trim();
    const context = String(log.context || '').trim();
    let message = `의사결정 "${title}"을(를) 등록했습니다.`;
    if (decision) message += ` 결정: ${decision}`;
    if (context) message += ` 배경: ${context}`;
    return message;
  }

  const mergedLogs = [
    ...decisionLogs.map((log) => ({
      timestamp: log.timestamp,
      actor: String(log.actor || '').trim(),
      typeLabel: '의사결정',
      kind: 'decision',
      message: decisionMessage(log)
    })),
    ...auditLogs.map((log) => ({
      timestamp: log.timestamp,
      actor: String(log.actor || '').trim(),
      typeLabel: '감사기록',
      kind: 'audit',
      message: auditMessage(log)
    }))
  ].sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));

  el.pageContent.innerHTML = `
    <section class="card panel">
      <h3>Audit Logs</h3>
      <p class="panel-desc" style="margin-bottom:12px;">Decision Logs와 Audit Logs를 시간순으로 함께 보여줍니다.</p>
      ${mergedLogs.length === 0
    ? '<div class="empty">표시할 로그가 없습니다.</div>'
    : `
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>시간</th><th>로그 유형</th><th>작성자</th><th>내용</th></tr>
              </thead>
              <tbody>
                ${mergedLogs
      .map(
        (row) => `<tr>
                      <td>${esc(fmtDateTime(row.timestamp))}</td>
                      <td><span class="badge status">${esc(row.typeLabel)}</span></td>
                      <td>${esc(row.actor || '-')}</td>
                      <td>${esc(row.message)}</td>
                    </tr>`
      )
      .join('')}
              </tbody>
            </table>
          </div>
        `}
    </section>
  `;
}

async function renderExperiments() {
  const params = new URLSearchParams();
  if (state.filters.status) params.set('status', state.filters.status);
  const query = params.toString();
  const [experiments, krLinks, initiativeLinks, krs, initiatives, platformExperiments] = await Promise.all([
    fetchJSON(`/api/experiments${query ? `?${query}` : ''}`),
    fetchJSON('/api/kr-experiment-links').catch(() => []),
    fetchJSON('/api/initiative-experiment-links').catch(() => []),
    fetchJSON('/api/krs').catch(() => []),
    fetchJSON('/api/initiatives').catch(() => []),
    fetchJSON('/api/experiment-platform/experiments').catch(() => [])
  ]);
  const krMap = new Map(krs.map((item) => [item.id, item]));
  const initiativeMap = new Map(initiatives.map((item) => [item.id, item]));
  const experimentMap = new Map(experiments.map((item) => [item.id, item]));

  const krByExperiment = new Map();
  krLinks.forEach((link) => {
    if (!krByExperiment.has(link.experimentId)) krByExperiment.set(link.experimentId, []);
    krByExperiment.get(link.experimentId).push(link);
  });

  const initiativeByExperiment = new Map();
  initiativeLinks.forEach((link) => {
    if (!initiativeByExperiment.has(link.experimentId)) initiativeByExperiment.set(link.experimentId, []);
    initiativeByExperiment.get(link.experimentId).push(link);
  });

  const experimentFilters = {
    owner: String(state.experimentFilters.owner || '').trim(),
    organization: String(state.filters.division || '').trim(),
    startMonth: normalizeMonth(state.experimentFilters.startMonth),
    endMonth: normalizeMonth(state.experimentFilters.endMonth)
  };
  const parsedOrganization = (() => {
    const raw = experimentFilters.organization;
    if (!raw) return { type: '', value: '' };
    if (raw.startsWith('division::')) return { type: 'division', value: raw.slice('division::'.length) };
    if (raw.startsWith('team::')) return { type: 'team', value: raw.slice('team::'.length) };
    return { type: '', value: raw };
  })();
  const experimentRange = state.experimentRange || { preset: 'all', from: '', to: '' };

  function resolveExperimentContext(experimentId) {
    const targets = [];
    const dedupe = new Set();
    const divisions = [];
    const teams = [];
    const owners = [];
    const addOrganization = (division, team) => {
      const normalizedDivision = String(division || '').trim();
      const normalizedTeam = String(team || '').trim();
      if (normalizedDivision) {
        if (!divisions.includes(normalizedDivision)) divisions.push(normalizedDivision);
      }
      if (normalizedTeam) {
        if (!teams.includes(normalizedTeam)) teams.push(normalizedTeam);
      }
    };
    const addOwner = (owner) => {
      const normalizedOwner = String(owner || '').trim();
      if (!normalizedOwner) return;
      if (!owners.includes(normalizedOwner)) owners.push(normalizedOwner);
    };

    (initiativeByExperiment.get(experimentId) || []).forEach((link) => {
      const initiative = initiativeMap.get(link.initiativeId);
      if (!initiative) return;
      const key = `initiative:${initiative.id}`;
      if (dedupe.has(key)) return;
      dedupe.add(key);
      targets.push({
        type: 'initiative',
        id: initiative.id,
        label: initiative.title,
        sortKey: String(link.updatedAt || link.createdAt || '')
      });
      addOrganization(initiative.division, initiative.team);
      addOwner(initiative.owner);
    });

    (krByExperiment.get(experimentId) || []).forEach((link) => {
      const kr = krMap.get(link.krId);
      if (!kr) return;
      const key = `kr:${kr.id}`;
      if (dedupe.has(key)) return;
      dedupe.add(key);
      targets.push({
        type: 'kr',
        id: kr.id,
        label: kr.title,
        sortKey: String(link.updatedAt || link.createdAt || '')
      });
      addOrganization(kr.division, kr.team);
      addOwner(kr.owner);
    });

    targets.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return { targets, divisions, teams, owners };
  }

  const normalizedSearch = String(state.searchQuery || '').trim().toLowerCase();
  const filteredRows = experiments
    .map((exp) => {
      const context = resolveExperimentContext(exp.id);
      const targets = context.targets;
      const divisions = context.divisions;
      const teams = context.teams;
      const targetOwners = context.owners;
      const startMonth = normalizeMonth(exp.startDate);
      const endMonth = normalizeMonth(exp.endDate);
      const targetLabels = targets.map((item) => `${item.type === 'kr' ? 'KR' : 'Initiative'}: ${item.label}`);
      const owner = String(exp.owner || '').trim() || targetOwners[0] || '';
      const searchBlob = [
        exp.title,
        exp.status,
        exp.hypothesis,
        exp.startDate,
        exp.endDate,
        exp.result,
        owner,
        ...targetLabels
      ]
        .map((item) => String(item || '').toLowerCase())
        .join(' ');
      return {
        exp,
        targets,
        divisions,
        teams,
        startMonth,
        endMonth,
        owner,
        targetOwners,
        searchBlob
      };
    })
    .filter((row) => {
      if (normalizedSearch && !row.searchBlob.includes(normalizedSearch)) return false;
      if (experimentFilters.owner && row.owner !== experimentFilters.owner && !(row.targetOwners || []).includes(experimentFilters.owner)) return false;
      if (experimentFilters.startMonth && row.startMonth !== experimentFilters.startMonth) return false;
      if (experimentFilters.endMonth && row.endMonth !== experimentFilters.endMonth) return false;
      if (String(experimentRange.preset || 'all') !== 'all') {
        const experimentStart = parseDateOnly(row.exp.startDate);
        const experimentEnd = parseDateOnly(row.exp.endDate) || experimentStart;
        const rangeFrom = parseDateOnly(experimentRange.from);
        const rangeTo = parseDateOnly(experimentRange.to);
        if (rangeFrom && experimentEnd && experimentEnd < rangeFrom) return false;
        if (rangeTo && experimentStart && experimentStart > rangeTo) return false;
      }
      if (parsedOrganization.value) {
        if (parsedOrganization.type === 'division' && !row.divisions.includes(parsedOrganization.value)) return false;
        if (parsedOrganization.type === 'team' && !row.teams.includes(parsedOrganization.value)) return false;
        if (
          !parsedOrganization.type &&
          !row.divisions.includes(parsedOrganization.value) &&
          !row.teams.includes(parsedOrganization.value)
        ) {
          return false;
        }
      }
      return true;
    });
  const totalRows = filteredRows.length;
  const experimentTotalPages = Math.max(1, Math.ceil(totalRows / state.experimentPageSize));
  const safeExperimentPage = Math.min(Math.max(1, state.experimentPage), experimentTotalPages);
  state.experimentPage = safeExperimentPage;
  const experimentStart = (safeExperimentPage - 1) * state.experimentPageSize;
  const tableRows = filteredRows.slice(experimentStart, experimentStart + state.experimentPageSize);
  const experimentPagerButtons = renderPaginationButtons({
    totalPages: experimentTotalPages,
    currentPage: safeExperimentPage,
    dataAttr: 'experiment'
  });

  el.pageContent.innerHTML = `
    <section>
      <article class="card panel">
        <div class="section-head-inline">
          <h3>Experiment List</h3>
        </div>
        <div class="list-panel-head">
          <div class="table-size-control">
            <label for="experimentPageSizeSelect">노출 개수</label>
            <select id="experimentPageSizeSelect">
              <option value="20" ${state.experimentPageSize === 20 ? 'selected' : ''}>20</option>
              <option value="50" ${state.experimentPageSize === 50 ? 'selected' : ''}>50</option>
              <option value="100" ${state.experimentPageSize === 100 ? 'selected' : ''}>100</option>
            </select>
          </div>
          <button class="btn secondary table-inline-btn" id="btnCreateExperiment">+ 실험 등록</button>
        </div>
        <div class="table-wrap">
          <table class="data-table experiment-table">
            <thead>
              <tr>
                <th class="exp-col-title">실험 제목</th>
                <th class="exp-col-status">실험 상태</th>
                <th class="exp-col-hypothesis">실험 가설</th>
                <th class="exp-col-date">실험 시작일</th>
                <th class="exp-col-date">실험 종료일</th>
                <th class="exp-col-result">실험 결과</th>
                <th class="exp-col-owner">담당자</th>
                <th class="exp-col-parent">상위 목표</th>
                <th class="exp-col-action"></th>
              </tr>
            </thead>
            <tbody>
              ${tableRows
                .map(
                  (row) => `<tr>
                    <td class="exp-col-title"><button class="table-link-btn exp-title-link" type="button" data-exp-platform-link="${esc(row.exp.id)}">${esc(row.exp.title)}</button></td>
                    <td class="exp-col-status">${statusBadge(row.exp.status)}</td>
                    <td class="exp-col-hypothesis"><span class="exp-two-line-text">${esc(row.exp.hypothesis || '-')}</span></td>
                    <td class="exp-col-date">${esc(row.exp.startDate || '-')}</td>
                    <td class="exp-col-date">${esc(row.exp.endDate || '-')}</td>
                    <td class="exp-col-result"><span class="exp-one-line-text">${esc(row.exp.result || '-')}</span></td>
                    <td class="exp-col-owner">${esc(row.owner || '-')}</td>
                    <td class="exp-col-parent">
                    ${row.targets.length === 0
                        ? '-'
                        : `<div class="exp-parent-links">
                            ${row.targets
                              .map(
                                (target) =>
                                  `<button class="exp-parent-link" type="button" data-parent-type="${esc(
                                    target.type
                                  )}" data-parent-id="${esc(target.id)}" title="${esc(target.label)}">
                                    <span class="exp-parent-kind">${esc(target.type === 'kr' ? 'KR' : 'Initiative')}</span>
                                    <span class="exp-parent-title">${esc(target.label)}</span>
                                  </button>`
                              )
                              .join('')}
                          </div>`
                    }</td>
                    <td class="exp-col-action">
                      <button class="btn secondary table-inline-btn" type="button" data-edit-experiment="${esc(row.exp.id)}">수정</button>
                    </td>
                  </tr>`
                )
                .join('') || '<tr><td colspan="9">실험 없음</td></tr>'}
            </tbody>
          </table>
        </div>
        <div class="table-pagination-bottom">
          <div class="table-size-control">총 ${totalRows}건 · ${safeExperimentPage} / ${experimentTotalPages} 페이지</div>
          <div class="table-pager centered">${experimentPagerButtons}</div>
        </div>
      </article>
    </section>
  `;

  const experimentPageSizeSelect = document.getElementById('experimentPageSizeSelect');
  if (experimentPageSizeSelect) {
    experimentPageSizeSelect.addEventListener('change', async () => {
      state.experimentPageSize = Number(experimentPageSizeSelect.value || 20);
      state.experimentPage = 1;
      await renderCurrentRoute();
    });
  }

  el.pageContent.querySelectorAll('[data-experiment-page]').forEach((button) => {
    button.addEventListener('click', async () => {
      const page = Number(button.dataset.experimentPage || 1);
      if (!Number.isFinite(page) || page < 1 || page === state.experimentPage) return;
      state.experimentPage = page;
      await renderCurrentRoute();
    });
  });

  const btnCreateExperiment = document.getElementById('btnCreateExperiment');
  if (btnCreateExperiment) {
    btnCreateExperiment.addEventListener('click', () => {
      openExperimentModal({
        mode: 'create',
        krs,
        initiatives,
        platformExperiments
      });
    });
  }

  el.pageContent.querySelectorAll('[data-exp-platform-link]').forEach((button) => {
    button.addEventListener('click', () => {
      const experimentId = String(button.dataset.expPlatformLink || '').trim();
      if (!experimentId) return;
      openLayerModal({
        title: '실험플랫폼 링크 연결',
        description: '아직 실험플랫폼 URL이 연결되지 않았습니다.',
        bodyHtml: `
          <div class="field-row">
            <p>실험 ID: ${esc(experimentId)}</p>
            <small class="field-help">추후 URL 연결 기능이 제공될 예정입니다.</small>
          </div>
        `,
        submitLabel: '닫기',
        showCancel: false,
        onSubmit: async () => {}
      });
    });
  });

  el.pageContent.querySelectorAll('[data-edit-experiment]').forEach((button) => {
        button.addEventListener('click', () => {
      const experimentId = button.dataset.editExperiment;
      const experiment = experimentMap.get(experimentId);
      if (!experiment) return;
      const selectedTargets = resolveExperimentContext(experimentId).targets;
      const selectedTarget = selectedTargets[0];
      openExperimentModal({
        mode: 'edit',
        krs,
        initiatives,
        platformExperiments,
        experiment,
        selectedTargetType: selectedTarget?.type || '',
        selectedTargetId: selectedTarget?.id || ''
      });
    });
  });

  el.pageContent.querySelectorAll('[data-parent-type][data-parent-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetType = button.dataset.parentType;
      const targetId = button.dataset.parentId;
      if (!targetId) return;
      if (targetType === 'kr') {
        state.selectedKrId = targetId;
        state.selectedSubKrId = null;
        navigate('/goals/krs');
        return;
      }
      if (targetType === 'initiative') {
        state.selectedInitiativeId = targetId;
        navigate('/goals/initiatives');
      }
    });
  });

}

async function renderIntegrationDwh() {
  const [statusRows, sourceSummary] = await Promise.all([
    fetchJSON('/api/integrations/status?key=dwh_bi'),
    fetchJSON('/api/input-sources/summary')
  ]);

  const status = statusRows[0];

  el.pageContent.innerHTML = `
    <section class="grid-2">
      <article class="card panel">
        <h3>DWH/BI Status</h3>
        <ul class="mini-list">
          <li>Name: ${esc(status.name)}</li>
          <li>Mode: ${esc(status.type)}</li>
          <li>Status: ${statusBadge(status.status)}</li>
          <li>Last Sync: ${fmtDateTime(status.lastSyncAt)}</li>
          <li>Notes: ${esc(status.notes)}</li>
        </ul>
      </article>

      <article class="card panel">
        <h3>Source Mix</h3>
        <ul class="mini-list">
          <li>manual: ${sourceSummary.summary.manual} (${sourceSummary.percentages.manual}%)</li>
          <li>synced: ${sourceSummary.summary.synced} (${sourceSummary.percentages.synced}%)</li>
          <li>calculated: ${sourceSummary.summary.calculated} (${sourceSummary.percentages.calculated}%)</li>
        </ul>
      </article>
    </section>
  `;
}

function bindTopbarActions() {
  el.btnApplyFilters.addEventListener('click', async () => {
    applyFilterInputsToState();
    state.tablePage = 1;
    state.experimentPage = 1;
    await renderCurrentRoute();
  });

  el.btnSearch.addEventListener('click', async () => {
    applyFilterInputsToState();
    state.tablePage = 1;
    state.experimentPage = 1;
    await renderCurrentRoute();
  });

  el.searchKeyword.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyFilterInputsToState();
      state.tablePage = 1;
      state.experimentPage = 1;
      await renderCurrentRoute();
    }
  });

  el.btnResetFilters.addEventListener('click', async () => {
    state.searchQuery = '';
    state.filters = { division: '', domain: '', team: '', aarrrTag: '', status: '' };
    state.experimentFilters = {
      owner: '',
      startMonth: '',
      endMonth: ''
    };
    state.notificationMonthFilter = '';
    state.notificationStatusFilter = 'all';
    state.notificationRange = { preset: 'all', from: '', to: '' };
    state.experimentRange = { preset: 'all', from: '', to: '' };
    state.tablePage = 1;
    state.experimentPage = 1;
    applyStateToFilterInputs();
    await renderCurrentRoute();
  });
}

async function bootstrap() {
  state.route = currentRoute();
  try {
    const health = await fetchJSON('/api/health');
    applyAppVersionBadge(health);
  } catch (_err) {
    applyAppVersionBadge({});
  }
  restoreSidebarState();
  await hydrateTaxonomy();
  applyStateToFilterInputs();
  bindTopbarActions();
  bindSidebarToggle();
  bindBrandHome();

  window.addEventListener('hashchange', async () => {
    const nextRoute = currentRoute();
    if (nextRoute === state.route) return;
    state.route = nextRoute;
    await hydrateTaxonomy();
    await renderCurrentRoute();
  });

  await renderCurrentRoute();
}

bootstrap().catch((err) => {
  el.pageContent.innerHTML = `<section class="card panel"><div class="empty">초기화 실패: ${esc(err.message)}</div></section>`;
});
