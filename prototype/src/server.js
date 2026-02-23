const express = require('express');
const path = require('path');
const {
  addAuditLog,
  computeKRDashboard,
  id,
  nowIso
} = require('./store');
const {
  validateObjective,
  validateKR,
  validateExperiment,
  validateKRExperimentLink,
  validateInitiativeExperimentLink,
  validateMonthlyUpsert,
  validateSubKR,
  validateInitiative,
  validateDecisionLog,
  validateInputSource,
  validateInputSourceProcess
} = require('./validation');
const {
  isEnabled: isSupabaseEnabled,
  loadStoreFromSupabase,
  appendAuditLogToSupabase,
  syncStoreMutationToSupabase
} = require('./supabaseStore');

const app = express();
const port = Number(process.env.PORT || 4000);
let storeCache = null;
let supabaseSyncQueue = Promise.resolve();
const appMarkLabel = resolveAppMarkLabel();
const REQUIRED_PRESET_TYPES = ['domains', 'divisions', 'inputClassifications', 'inputProducts', 'inputSources'];

const AARRR_STAGES = ['-', 'Acquisition', 'Activation', 'Retention', 'Revenue', 'Referral'];
const OKR_STATUS_VALUES = new Set([
  'planned',
  'in_progress',
  'production_released',
  'spec_out',
  'dropped',
  'holding'
]);
const EXPERIMENT_STATUS_VALUES = new Set([
  'before_start',
  'in_progress',
  'winner_selected',
  'ended',
  'discarded'
]);
const LEGACY_OKR_STATUS_MAP = {
  planned: 'planned',
  active: 'in_progress',
  running: 'in_progress',
  completed: 'production_released',
  done: 'production_released',
  hold: 'holding',
  dropped: 'dropped',
  계획중: 'planned',
  진행중: 'in_progress',
  운영배포: 'production_released',
  스펙아웃: 'spec_out',
  드랍: 'dropped',
  홀딩: 'holding'
};
const LEGACY_EXPERIMENT_STATUS_MAP = {
  planned: 'before_start',
  active: 'in_progress',
  running: 'in_progress',
  completed: 'ended',
  ready_to_start: 'before_start',
  'ready to start': 'before_start',
  'ready to review': 'winner_selected',
  concluded: 'ended',
  closed: 'discarded',
  시작전: 'before_start',
  진행중: 'in_progress',
  '위너 선정': 'winner_selected',
  종료: 'ended',
  폐기: 'discarded'
};
const OKR_STATUS_HINT = 'status must be planned|in_progress|production_released|spec_out|dropped|holding';
const EXPERIMENT_STATUS_HINT = 'status must be before_start|in_progress|winner_selected|ended|discarded';
const EXPERIMENT_RESULT_VALUES = new Set(['대조군(A) 위너 선정', '실험군(B) 위너 선정', '위너 선정 전']);
const LEGACY_EXPERIMENT_RESULT_MAP = {
  control_winner: '대조군(A) 위너 선정',
  treatment_winner: '실험군(B) 위너 선정',
  pending_winner: '위너 선정 전',
  pending: '위너 선정 전',
  '위너 선전 전': '위너 선정 전'
};
const EXPERIMENT_RESULT_HINT = 'result must be 대조군(A) 위너 선정|실험군(B) 위너 선정|위너 선정 전';
const CLASSIFICATION_OPTIONS = ['실 O', '실 KR', '팀 O', '팀 KR', '팀 Initiative'];
const LEGACY_CLASSIFICATION_MAP = {
  Initiative: '팀 Initiative'
};
const PRESET_FIELD_META = {
  domains: { minCount: 1, label: 'OKR 도메인' },
  divisions: { minCount: 1, label: 'OKR 실' },
  teams: { minCount: 0, label: 'OKR 팀' },
  inputClassifications: { minCount: 1, label: '인풋 분류' },
  inputProducts: { minCount: 1, label: '인풋 프로덕트 구분' },
  inputSources: { minCount: 1, label: '인풋 소스' }
};

const ROLE_MATRIX = [
  {
    role: 'Admin',
    capabilities: ['policy.update', 'permission.manage', 'master.manage', 'audit.read'],
    defaultActions: ['권한 정책 관리', '조직 마스터 유지']
  },
  {
    role: 'Leadership',
    capabilities: ['review.approve', 'risk.read', 'dashboard.read'],
    defaultActions: ['리뷰 승인', '리스크 우선순위 결정']
  },
  {
    role: 'PM',
    capabilities: ['objective.manage', 'kr.manage', 'initiative.manage', 'review.prepare'],
    defaultActions: ['목표/이니셔티브 운영', '월간 리뷰 준비']
  },
  {
    role: 'Team Member',
    capabilities: ['performance.write', 'comment.write'],
    defaultActions: ['월 실적 입력', '코멘트 업데이트']
  },
  {
    role: 'Analyst',
    capabilities: ['experiment.link', 'metric.sync', 'dashboard.analyze'],
    defaultActions: ['실험 데이터 연결', '지표 정합성 검증']
  }
];

const INTEGRATION_STATUS = [
  {
    key: 'experiment_platform',
    name: 'Experiment Platform',
    type: 'pull+event',
    status: 'degraded',
    lastSyncAt: '2026-02-14T23:30:00Z',
    notes: 'Read path only, write bridge PoC needed'
  },
  {
    key: 'dwh_bi',
    name: 'DWH/BI',
    type: 'pull_batch',
    status: 'active',
    lastSyncAt: '2026-02-14T23:45:00Z',
    notes: 'Nightly ETL active'
  },
  {
    key: 'org_master',
    name: 'Organization Master',
    type: 'pull_batch',
    status: 'active',
    lastSyncAt: '2026-02-14T22:00:00Z',
    notes: 'Daily sync active'
  }
];

const EXPERIMENT_PLATFORM_CATALOG = [
  {
    id: 'platform-exp-001',
    title: '푸드 홈 배너 실험',
    aarrrTag: 'Activation',
    owner: '문도윤',
    status: 'in_progress',
    startDate: '2026-01-05',
    endDate: '2026-03-17',
    hypothesis: '푸드 홈 배너 실험 적용 시 목표 행동 전환율이 유의미하게 상승한다.',
    result: '위너 선정 전'
  },
  {
    id: 'platform-exp-002',
    title: '추천 카드 문구 최적화',
    aarrrTag: 'Activation',
    owner: '임가은',
    status: 'in_progress',
    startDate: '2026-02-08',
    endDate: '2026-04-20',
    hypothesis: '추천 카드 문구 최적화 적용 시 목표 행동 전환율이 유의미하게 상승한다.',
    result: '위너 선정 전'
  },
  {
    id: 'platform-exp-003',
    title: '탐색 응답속도 개선 실험',
    aarrrTag: 'Retention',
    owner: '홍지민',
    status: 'before_start',
    startDate: '2026-03-11',
    endDate: '2026-05-23',
    hypothesis: '탐색 응답속도 개선 실험 적용 시 목표 행동 전환율이 유의미하게 상승한다.',
    result: '위너 선정 전'
  },
  {
    id: 'platform-exp-004',
    title: '파트너 업셀 구간 확장 실험',
    aarrrTag: 'Revenue',
    owner: '강지원',
    status: 'in_progress',
    startDate: '2026-04-14',
    endDate: '2026-06-26',
    hypothesis: '파트너 업셀 구간 확장 실험 적용 시 목표 행동 전환율이 유의미하게 상승한다.',
    result: '위너 선정 전'
  },
  {
    id: 'platform-exp-005',
    title: '정산 알림 리마인드 실험',
    aarrrTag: 'Revenue',
    owner: '김수현',
    status: 'before_start',
    startDate: '2026-05-17',
    endDate: '2026-07-29',
    hypothesis: '정산 알림 리마인드 실험 적용 시 목표 행동 전환율이 유의미하게 상승한다.',
    result: '위너 선정 전'
  },
  {
    id: 'platform-exp-006',
    title: '배차 로직 번들링 실험',
    aarrrTag: 'Retention',
    owner: '박서윤',
    status: 'in_progress',
    startDate: '2026-01-21',
    endDate: '2026-04-02',
    hypothesis: '배차 로직 번들링 실험 적용 시 목표 행동 전환율이 유의미하게 상승한다.',
    result: '위너 선정 전'
  },
  {
    id: 'platform-exp-007',
    title: 'ETA 예측모델 고도화 실험',
    aarrrTag: 'Retention',
    owner: '장현우',
    status: 'in_progress',
    startDate: '2026-02-24',
    endDate: '2026-05-06',
    hypothesis: 'ETA 예측모델 고도화 실험 적용 시 목표 행동 전환율이 유의미하게 상승한다.',
    result: '위너 선정 전'
  },
  {
    id: 'platform-exp-008',
    title: '신규가입 웰컴 퍼널 단축 실험',
    aarrrTag: 'Acquisition',
    owner: '조아라',
    status: 'before_start',
    startDate: '2026-03-29',
    endDate: '2026-06-10',
    hypothesis: '신규가입 웰컴 퍼널 단축 실험 적용 시 목표 행동 전환율이 유의미하게 상승한다.',
    result: '위너 선정 전'
  },
  {
    id: 'platform-exp-009',
    title: '주문 취소 사유 안내 개선 실험',
    aarrrTag: 'Retention',
    owner: '최민성',
    status: 'before_start',
    startDate: '2026-04-03',
    endDate: '2026-06-15',
    hypothesis: '주문 취소 사유 안내 개선 실험 적용 시 목표 행동 전환율이 유의미하게 상승한다.',
    result: '위너 선정 전'
  },
  {
    id: 'platform-exp-010',
    title: '라이더 안내 메시지 리프레시 실험',
    aarrrTag: 'Referral',
    owner: '한지우',
    status: 'winner_selected',
    startDate: '2026-01-09',
    endDate: '2026-03-21',
    hypothesis: '라이더 안내 메시지 리프레시 실험 적용 시 목표 행동 전환율이 유의미하게 상승한다.',
    result: '실험군(B) 위너 선정'
  }
];

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

function fail(res, code, message) {
  res.status(code).json({ error: message });
}

function resolveAppMarkLabel() {
  const explicitLabel = String(process.env.APP_MARK_LABEL || '').trim();
  if (explicitLabel) return explicitLabel;

  const ref = String(process.env.VERCEL_GIT_COMMIT_REF || '').toLowerCase();
  if (ref === 'main') return 'Mark1';
  if (ref.includes('mark2')) return 'Mark2';
  return 'Dev';
}

function loadStore() {
  if (!storeCache) {
    throw new Error('store is not initialized');
  }
  return storeCache;
}

async function persistStore(store) {
  storeCache = store;
  if (!isSupabaseEnabled()) {
    throw new Error('Supabase configuration is required');
  }

  const latestAuditLog =
    Array.isArray(store.auditLogs) && store.auditLogs.length > 0
      ? store.auditLogs[store.auditLogs.length - 1]
      : null;
  if (!latestAuditLog) {
    throw new Error('latest audit log is required for Supabase delta sync');
  }

  const mode = await syncStoreMutationToSupabase(store, latestAuditLog);
  await appendAuditLogToSupabase(latestAuditLog);
  console.log(`Synced store mutation to Supabase (${mode})`);
}

async function persistStoreOrFail(res, store) {
  try {
    await persistStore(store);
    return true;
  } catch (error) {
    console.error('[persist] failed:', error.message);
    fail(res, 500, 'failed to sync data');
    return false;
  }
}

async function bootstrapStore() {
  if (!isSupabaseEnabled()) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  try {
    const remoteStore = await loadStoreFromSupabase();
    if (!remoteStore || typeof remoteStore !== 'object') {
      throw new Error('empty store payload from Supabase');
    }
    storeCache = remoteStore;
    console.log('Loaded initial store from Supabase');
    return;
  } catch (error) {
    throw new Error(`[supabase-load] failed: ${error.message}`);
  }
}

function normalizeStringList(values, fallback = []) {
  const source = Array.isArray(values) ? values : fallback;
  const seen = new Set();
  const normalized = [];
  source.forEach((value) => {
    const text = String(value || '').trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    normalized.push(text);
  });
  return normalized;
}

function mergePreferredWithExtras(preferred = [], extras = []) {
  const seen = new Set();
  const result = [];
  preferred.forEach((item) => {
    const text = String(item || '').trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    result.push(text);
  });
  [...new Set((extras || []).map((item) => String(item || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .forEach((item) => {
      if (seen.has(item)) return;
      seen.add(item);
      result.push(item);
    });
  return result;
}

function normalizeTeamDivisionMap(value) {
  const source = value && typeof value === 'object' ? value : {};
  const normalized = {};
  Object.entries(source).forEach(([team, division]) => {
    const teamText = String(team || '').trim();
    const divisionText = String(division || '').trim();
    if (!teamText || !divisionText) return;
    normalized[teamText] = divisionText;
  });
  return normalized;
}

function collectTeamDivisionMapFromStore(store) {
  const counts = new Map();
  const addPair = (teamValue, divisionValue) => {
    const team = String(teamValue || '').trim();
    const division = String(divisionValue || '').trim();
    if (!team || !division) return;
    const key = `${team}::${division}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  };

  (store.objectives || []).forEach((item) => {
    if (item.deletedAt) return;
    addPair(item.team, item.division || item.teamId);
  });
  (store.krs || []).forEach((item) => {
    if (item.deletedAt) return;
    addPair(item.team, item.division);
  });
  (store.subKrs || []).forEach((item) => {
    if (item.deletedAt) return;
    addPair(item.team, item.division);
  });
  (store.initiatives || []).forEach((item) => {
    if (item.deletedAt) return;
    addPair(item.team, item.division);
  });

  const rankedByTeam = new Map();
  counts.forEach((count, key) => {
    const [team, division] = key.split('::');
    const current = rankedByTeam.get(team);
    if (!current || count > current.count || (count === current.count && division.localeCompare(current.division) < 0)) {
      rankedByTeam.set(team, { division, count });
    }
  });

  const map = {};
  rankedByTeam.forEach((entry, team) => {
    map[team] = entry.division;
  });
  return map;
}

function getPresetCollections(store) {
  const source = store && store.presets && typeof store.presets === 'object' ? store.presets : {};
  const sourceTeamDivisions = normalizeTeamDivisionMap(source.teamDivisions);
  const teams = normalizeStringList(
    [...(Array.isArray(source.teams) ? source.teams : []), ...Object.keys(sourceTeamDivisions)],
    []
  );
  const teamDivisions = {};
  teams.forEach((team) => {
    const division = sourceTeamDivisions[team] || '';
    if (!division) return;
    teamDivisions[team] = division;
  });
  return {
    domains: normalizeStringList(source.domains, []),
    divisions: normalizeStringList(source.divisions, []),
    teams,
    teamDivisions,
    inputClassifications: normalizeStringList(source.inputClassifications, []),
    inputProducts: normalizeStringList(source.inputProducts, []),
    inputSources: normalizeStringList(source.inputSources, [])
  };
}

function ensurePresetCollectionsOnStore(store) {
  const presets = getPresetCollections(store);
  store.presets = { ...presets };
  return presets;
}

function collectTaxonomyExtras(store) {
  const extras = {
    divisions: new Set(),
    domains: new Set(),
    teams: new Set()
  };

  const addText = (set, value) => {
    const text = String(value || '').trim();
    if (text) set.add(text);
  };

  (store.objectives || []).forEach((item) => {
    if (item.deletedAt) return;
    addText(extras.divisions, item.division || item.teamId);
    addText(extras.domains, item.domain);
    addText(extras.teams, item.team);
  });
  (store.krs || []).forEach((item) => {
    if (item.deletedAt) return;
    addText(extras.divisions, item.division);
    addText(extras.domains, item.domain);
    addText(extras.teams, item.team);
  });
  (store.subKrs || []).forEach((item) => {
    if (item.deletedAt) return;
    addText(extras.divisions, item.division);
    addText(extras.domains, item.domain);
    addText(extras.teams, item.team);
  });
  (store.initiatives || []).forEach((item) => {
    if (item.deletedAt) return;
    addText(extras.divisions, item.division);
    addText(extras.domains, item.domain);
    addText(extras.teams, item.team);
  });
  (store.inputSources || []).forEach((item) => {
    if (item.deletedAt) return;
    addText(extras.teams, item.team);
    addText(extras.teams, item.workingTeam);
  });

  return {
    divisions: [...extras.divisions],
    domains: [...extras.domains],
    teams: [...extras.teams],
    teamDivisions: collectTeamDivisionMapFromStore(store)
  };
}

function inferDivisionByTeam(store, teamName) {
  const team = String(teamName || '').trim();
  if (!team) return '';
  const presetDivision = String(store?.presets?.teamDivisions?.[team] || '').trim();
  if (presetDivision) return presetDivision;
  const candidates = new Map();
  const addCandidate = (value) => {
    const division = String(value || '').trim();
    if (!division) return;
    candidates.set(division, (candidates.get(division) || 0) + 1);
  };

  (store.objectives || []).forEach((item) => {
    if (item.deletedAt) return;
    if (String(item.team || '').trim() !== team) return;
    addCandidate(item.division || item.teamId);
  });
  (store.krs || []).forEach((item) => {
    if (item.deletedAt) return;
    if (String(item.team || '').trim() !== team) return;
    addCandidate(item.division);
  });
  (store.subKrs || []).forEach((item) => {
    if (item.deletedAt) return;
    if (String(item.team || '').trim() !== team) return;
    addCandidate(item.division);
  });
  (store.initiatives || []).forEach((item) => {
    if (item.deletedAt) return;
    if (String(item.team || '').trim() !== team) return;
    addCandidate(item.division);
  });

  if (candidates.size === 0) return '';

  const ranked = [...candidates.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
  return ranked[0][0];
}

function buildTaxonomyPayload(store) {
  const presetCollections = getPresetCollections(store);
  return {
    divisions: [...presetCollections.divisions],
    domains: [...presetCollections.domains],
    aarrrStages: AARRR_STAGES,
    classifications: CLASSIFICATION_OPTIONS,
    inputClassifications: [...presetCollections.inputClassifications],
    inputProducts: [...presetCollections.inputProducts],
    inputSources: [...presetCollections.inputSources],
    teams: [...presetCollections.teams],
    teamDivisions: { ...presetCollections.teamDivisions }
  };
}

function parsePresetType(value) {
  const key = String(value || '').trim();
  return PRESET_FIELD_META[key] ? key : null;
}

function findMissingRequiredPresetTypes(presets) {
  const source = presets && typeof presets === 'object' ? presets : {};
  return REQUIRED_PRESET_TYPES.filter((type) => !Array.isArray(source[type]) || source[type].length === 0);
}

function ensureRequiredPresets(res, presets) {
  const missing = findMissingRequiredPresetTypes(presets);
  if (missing.length === 0) return true;
  res.status(503).json({
    error: 'required preset data is missing in Supabase',
    missingPresetTypes: missing
  });
  return false;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeOkrStatus(value, fallback = 'planned') {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const normalized = raw.toLowerCase();
  if (OKR_STATUS_VALUES.has(normalized)) return normalized;
  if (LEGACY_OKR_STATUS_MAP[raw]) return LEGACY_OKR_STATUS_MAP[raw];
  if (LEGACY_OKR_STATUS_MAP[normalized]) return LEGACY_OKR_STATUS_MAP[normalized];
  return fallback;
}

function parseOkrStatus(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  if (OKR_STATUS_VALUES.has(normalized)) return normalized;
  if (LEGACY_OKR_STATUS_MAP[raw]) return LEGACY_OKR_STATUS_MAP[raw];
  if (LEGACY_OKR_STATUS_MAP[normalized]) return LEGACY_OKR_STATUS_MAP[normalized];
  return null;
}

function normalizeExperimentStatus(value, fallback = 'before_start') {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const normalized = raw.toLowerCase();
  if (EXPERIMENT_STATUS_VALUES.has(normalized)) return normalized;
  if (LEGACY_EXPERIMENT_STATUS_MAP[raw]) return LEGACY_EXPERIMENT_STATUS_MAP[raw];
  if (LEGACY_EXPERIMENT_STATUS_MAP[normalized]) return LEGACY_EXPERIMENT_STATUS_MAP[normalized];
  return fallback;
}

function parseExperimentStatus(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  if (EXPERIMENT_STATUS_VALUES.has(normalized)) return normalized;
  if (LEGACY_EXPERIMENT_STATUS_MAP[raw]) return LEGACY_EXPERIMENT_STATUS_MAP[raw];
  if (LEGACY_EXPERIMENT_STATUS_MAP[normalized]) return LEGACY_EXPERIMENT_STATUS_MAP[normalized];
  return null;
}

function normalizeExperimentResult(value, fallback = '위너 선정 전') {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  if (EXPERIMENT_RESULT_VALUES.has(raw)) return raw;
  const normalized = raw.toLowerCase();
  if (LEGACY_EXPERIMENT_RESULT_MAP[raw]) return LEGACY_EXPERIMENT_RESULT_MAP[raw];
  if (LEGACY_EXPERIMENT_RESULT_MAP[normalized]) return LEGACY_EXPERIMENT_RESULT_MAP[normalized];
  if (raw.includes('대조군') && raw.includes('위너') && raw.includes('선정')) return '대조군(A) 위너 선정';
  if (raw.includes('실험군') && raw.includes('위너') && raw.includes('선정')) return '실험군(B) 위너 선정';
  if (raw.includes('위너') && (raw.includes('선정 전') || raw.includes('선전 전'))) return '위너 선정 전';
  if (raw.includes('준비') || raw.includes('중간') || raw.includes('폐기') || raw.includes('대기')) return '위너 선정 전';
  return fallback;
}

function parseExperimentResult(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (EXPERIMENT_RESULT_VALUES.has(raw)) return raw;
  const normalized = raw.toLowerCase();
  if (LEGACY_EXPERIMENT_RESULT_MAP[raw]) return LEGACY_EXPERIMENT_RESULT_MAP[raw];
  if (LEGACY_EXPERIMENT_RESULT_MAP[normalized]) return LEGACY_EXPERIMENT_RESULT_MAP[normalized];
  if (raw.includes('대조군') && raw.includes('위너') && raw.includes('선정')) return '대조군(A) 위너 선정';
  if (raw.includes('실험군') && raw.includes('위너') && raw.includes('선정')) return '실험군(B) 위너 선정';
  if (raw.includes('위너') && (raw.includes('선정 전') || raw.includes('선전 전'))) return '위너 선정 전';
  if (raw.includes('준비') || raw.includes('중간') || raw.includes('폐기') || raw.includes('대기')) return '위너 선정 전';
  return null;
}

function normalizeExperimentPlatformCatalog() {
  return EXPERIMENT_PLATFORM_CATALOG.map((item) => ({
    ...item,
    status: normalizeExperimentStatus(item.status, 'before_start'),
    result: normalizeExperimentResult(item.result, '위너 선정 전')
  }));
}

function findExperimentPlatformItem(platformExperimentId) {
  const idValue = String(platformExperimentId || '').trim();
  if (!idValue) return null;
  const catalog = normalizeExperimentPlatformCatalog();
  return catalog.find((item) => item.id === idValue) || null;
}

function isSignalStatus(status) {
  return status === 'green' || status === 'yellow' || status === 'red';
}

function matchesTextQuery(query, fields) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => String(field || '').toLowerCase().includes(q));
}

function applyGlobalFilters(rows, query) {
  const normalizedStatusQuery = query.status && !isSignalStatus(query.status)
    ? parseOkrStatus(query.status)
    : null;
  return rows.filter((row) => {
    if (query.objectiveId && row.objectiveId !== query.objectiveId) return false;
    if (query.krId && row.krId !== query.krId) return false;
    if (query.half && row.half !== query.half) return false;
    if (query.year && Number(row.year) !== Number(query.year)) return false;
    if (query.division && row.division !== query.division) return false;
    if (query.teamId && row.division !== query.teamId) return false;
    if (query.team && row.team !== query.team) return false;
    if (query.domain && row.domain !== query.domain) return false;

    if (query.status) {
      if (isSignalStatus(query.status)) {
        if (row.signal !== query.status) return false;
      } else {
        if (!normalizedStatusQuery) return false;
        if (row.krStatus !== normalizedStatusQuery) return false;
      }
    }

    if (query.classification) {
      const normalizedClassification = normalizeClassificationValue(query.classification);
      const inferred = row.ownerScope === 'team' ? '팀 KR' : '실 KR';
      if (!normalizedClassification) return false;
      if (normalizedClassification !== '실 KR' && normalizedClassification !== '팀 KR') return false;
      if (normalizedClassification !== inferred) return false;
    }

    if (query.aarrrTag) {
      const hasTag = row.contributions.some((item) => item.aarrrTag === query.aarrrTag);
      if (!hasTag) return false;
    }

    if (!matchesTextQuery(query.q, [
      row.krTitle,
      row.objectiveTitle,
      row.division,
      row.domain,
      row.team,
      row.krStatus,
      ...(row.contributions || []).map((item) => item.experimentTitle)
    ])) {
      return false;
    }

    return true;
  });
}

function getDashboardRows(store, query = {}) {
  const objectiveMap = new Map(store.objectives.filter((obj) => !obj.deletedAt).map((obj) => [obj.id, obj]));
  const rows = store.krs
    .filter((kr) => !kr.deletedAt)
    .map((kr) => {
      const objective = objectiveMap.get(kr.objectiveId);
      if (!objective) return null;

      const dashboard = computeKRDashboard(store, kr.id);
      if (!dashboard) return null;

      return {
        krId: kr.id,
        krTitle: kr.title,
        objectiveId: objective.id,
        objectiveTitle: objective.title,
        half: objective.half,
        year: objective.year,
        division: objective.division || objective.teamId || '',
        domain: objective.domain || '',
        team: kr.team || '',
        ownerScope: kr.ownerScope || 'division',
        teamId: objective.division || objective.teamId || '',
        krStatus: normalizeOkrStatus(kr.status, 'planned'),
        targetValue: toNumber(kr.targetValue),
        actualSum: toNumber(dashboard.progress.actualSum),
        achievement: toNumber(dashboard.progress.achievement),
        signal: dashboard.progress.signal,
        contributions: (dashboard.contributions || []).map((item) => ({
          ...item,
          status: normalizeExperimentStatus(item.status, 'before_start')
        })),
        monthly: dashboard.monthly
      };
    })
    .filter(Boolean);

  return applyGlobalFilters(rows, query);
}

function applyExpandedDashboardFilters(rows, query = {}) {
  const normalizedStatusQuery = query.status && !isSignalStatus(query.status)
    ? parseOkrStatus(query.status)
    : null;

  return rows.filter((row) => {
    if (query.objectiveId && row.objectiveId !== query.objectiveId) return false;
    if (query.half && row.half !== query.half) return false;
    if (query.year && Number(row.year) !== Number(query.year)) return false;
    if (query.division && row.division !== query.division) return false;
    if (query.teamId && row.division !== query.teamId) return false;
    if (query.team && row.team !== query.team) return false;
    if (query.domain && row.domain !== query.domain) return false;
    if (query.aarrrTag && row.aarrrTag !== normalizeAarrrTag(query.aarrrTag)) return false;

    if (query.status) {
      if (isSignalStatus(query.status)) {
        if (row.signal !== query.status) return false;
      } else {
        if (!normalizedStatusQuery) return false;
        if (row.status !== normalizedStatusQuery) return false;
      }
    }

    if (query.classification) {
      const normalizedClassification = normalizeClassificationValue(query.classification);
      if (!normalizedClassification) return false;
      if (normalizedClassification !== row.effectiveClassification) return false;
    }

    if (query.q) {
      const haystacks = [
        row.title,
        row.objectiveTitle,
        row.division,
        row.domain,
        row.team,
        row.owner,
        row.status,
        ...(row.linkedExperimentTitle ? [row.linkedExperimentTitle] : [])
      ];
      if (!matchesTextQuery(query.q, haystacks)) return false;
    }

    return true;
  });
}

function getExpandedDashboardRows(store, query = {}) {
  const maps = buildEntityMaps(store);
  const experimentContext = buildExperimentLinkContext(store);
  const baseRows = [
    ...buildKRRows(store, maps),
    ...buildSubKRRows(store, maps),
    ...buildInitiativeRows(store, maps)
  ];

  const rows = baseRows
    .map((baseRow) => {
      const metricRow = enrichTableRowWithMetrics(store, baseRow);
      const row = {
        ...metricRow,
        ...resolveLinkedExperimentsForRow(metricRow, experimentContext)
      };
      const dashboard = baseRow.entityType === 'kr' ? computeKRDashboard(store, baseRow.entityId) : null;
      if (dashboard) {
        row.contributions = dashboard.contributions || [];
      } else {
        row.contributions = [];
      }
      const hasPerformance = Number.isFinite(row.q2Achievement);
      row.achievement = hasPerformance ? row.q2Achievement : null;
      row.hasPerformance = hasPerformance;
      row.targetType = row.entityType;
      return row;
    })
    .filter(Boolean);

  return applyExpandedDashboardFilters(rows, query);
}

function normalizeDashboardEntityType(entityType) {
  if (entityType === 'kr') return 'kr';
  if (entityType === 'sub_kr') return 'subKR';
  if (entityType === 'initiative') return 'initiative';
  if (entityType === 'objective') return 'objective';
  return 'etc';
}

function labelForDashboardEntityType(entityType) {
  if (entityType === 'kr') return 'KR';
  if (entityType === 'sub_kr') return 'Sub-KR';
  if (entityType === 'initiative') return 'Initiative';
  if (entityType === 'objective') return 'Objective';
  return String(entityType || '-');
}

function deriveAchievedRatePayload(rows) {
  const total = rows.length;
  if (total === 0) {
    return { average: 0, updatedCount: 0, updatedRate: 0 };
  }
  const updatedRows = rows.filter((row) => Boolean(row.hasPerformance) && Number.isFinite(row.achievement));
  const updatedCount = updatedRows.length;
  const average =
    updatedCount > 0 ? updatedRows.reduce((sum, row) => sum + row.achievement, 0) / updatedCount : 0;
  return {
    average: Number(average.toFixed(2)),
    updatedCount,
    updatedRate: Number(((updatedCount / total) * 100).toFixed(2))
  };
}

function buildDashboardNotificationPreview(store, rows, maxItems = 6) {
  const allNotifications = buildMonthlyNotificationItemsForMonth(store, null).map((item) => ({
    ...item,
    __status: normalizeNotificationStatus(item.status),
    __division: normalizeNotificationText(item.division),
    __owner: normalizeNotificationText(item.owner)
  }));
  const sorted = allNotifications.sort((a, b) => {
    const statusCmp = String(a.__status || '').localeCompare(String(b.__status || ''));
    if (statusCmp !== 0) return statusCmp;
    return String(b.yearMonth || '').localeCompare(String(a.yearMonth || ''));
  });

  return sorted.slice(0, maxItems);
}

function buildExperimentWinRatePayload(store, rows) {
  const experimentContext = buildExperimentLinkContext(store);
  const experimentStatusCount = rows.reduce(
    (acc, row) => {
      const experimentIds = Array.isArray(row.linkedExperimentIds) ? row.linkedExperimentIds : [];
      for (const experimentId of experimentIds) {
        acc.uniqueIds.add(experimentId);
      }
      return acc;
    },
    { uniqueIds: new Set() }
  );

  let winnerExperimentCount = 0;
  let totalExperimentCount = 0;
  for (const experimentId of experimentStatusCount.uniqueIds) {
    const experiment = experimentContext.experimentMap.get(experimentId);
    if (!experiment) continue;
    totalExperimentCount += 1;
    if (normalizeExperimentResult(experiment.result, '위너 선정 전') === '실험군(B) 위너 선정') {
      winnerExperimentCount += 1;
    }
  }
  const winnerRate = totalExperimentCount === 0 ? 0 : Number(((winnerExperimentCount / totalExperimentCount) * 100).toFixed(2));
  return {
    totalExperimentCount,
    winnerExperimentCount,
    winnerRate
  };
}

function buildOrganizationStatusRows(rows) {
  const map = new Map();
  const toSignal = (achievement) => {
    if (!Number.isFinite(achievement)) return 'red';
    return achievement >= 80 ? 'green' : achievement >= 60 ? 'yellow' : 'red';
  };

  rows.forEach((row) => {
    const division = row.division || row.team || '미지정';
    if (!map.has(division)) {
      map.set(division, { name: division, total: 0, achievementSum: 0, completed: 0 });
    }
    const item = map.get(division);
    item.total += 1;
    item.achievementSum += Number.isFinite(row.achievement) ? row.achievement : 0;
    if (Number.isFinite(row.achievement)) item.completed += 1;
  });

  return [...map.values()].map((item) => ({
    name: item.name,
    total: item.total,
    completed: item.completed,
    achievement: item.total > 0 ? Number((item.achievementSum / item.total).toFixed(2)) : 0,
    status: toSignal(item.total > 0 ? item.achievementSum / item.total : 0),
    trend: 0
  })).sort((a, b) => b.achievement - a.achievement);
}

function buildTopPerformers(rows) {
  const divisionMap = new Map();
  rows.forEach((row) => {
    const division = row.division || row.team || '미지정';
    if (!divisionMap.has(division)) {
      divisionMap.set(division, []);
    }
    divisionMap.get(division).push(row);
  });

  const ranking = [...divisionMap.entries()].map(([division, items]) => {
    const withAchievement = items.filter((row) => Number.isFinite(row.achievement)).map((row) => row.achievement);
    const avg = withAchievement.length > 0
      ? withAchievement.reduce((sum, value) => sum + value, 0) / withAchievement.length
      : 0;
    const completionRate = items.length > 0 ? (items.filter((row) => Number.isFinite(row.achievement)).length / items.length) * 100 : 0;
    const deltaRows = items.filter((row) => Number.isFinite(row.q1Achievement) && Number.isFinite(row.q2Achievement));
    const delta = deltaRows.length > 0
      ? deltaRows.reduce((sum, row) => sum + (row.q2Achievement - row.q1Achievement), 0) / deltaRows.length
      : 0;
    return {
      organizationName: division,
      avgAchievement: Number(avg.toFixed(2)),
      completionRate: Number(completionRate.toFixed(2)),
      monthDelta: Number(delta.toFixed(2)),
      teamCount: new Set(items.map((row) => row.team || '')).size
    };
  });

  return ranking.sort((a, b) => b.avgAchievement - a.avgAchievement).slice(0, 5);
}

function buildNotificationListForQuery(store, query = {}) {
  const targetType = String(query.targetType || '').trim();
  const targetId = String(query.targetId || '').trim();
  let statusFilter = normalizeNotificationStatus(query.status || '');
  const yearMonthParam = String(query.yearMonth || '').trim();
  const limit = Number(query.limit || 0);

  let selectedYearMonth = null;
  if (yearMonthParam) {
    const parsed = parseYearMonth(yearMonthParam);
    if (!parsed) {
      return { error: 'yearMonth is invalid', status: 400 };
    }
    selectedYearMonth = parsed;
  }

  let notifications = buildMonthlyNotificationItemsForMonth(store, selectedYearMonth);
  if (targetType) {
    notifications = notifications.filter((item) => item.targetType === targetType);
  }
  if (targetId) {
    notifications = notifications.filter((item) => item.targetId === targetId);
  }

  const summary = {
    total: notifications.length,
    registered: notifications.filter((item) => normalizeNotificationStatus(item.status) === 'registered').length,
    missing: notifications.filter((item) => normalizeNotificationStatus(item.status) === 'missing').length
  };

  if (statusFilter && !['registered', 'missing'].includes(statusFilter)) {
    statusFilter = '';
  }
  if (statusFilter) {
    notifications = notifications.filter((item) => normalizeNotificationStatus(item.status) === statusFilter);
  }

  const maxResults = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : notifications.length;

  return {
    notifications: notifications.slice(0, maxResults),
    summary
  };
}

function escapeCsv(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  if (raw.includes('"') || raw.includes(',') || raw.includes('\n') || raw.includes('\r')) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

function toCsvLine(values) {
  return values.map(escapeCsv).join(',');
}

function buildOKRTableRowsForCsv(rows) {
  const maxCount = Math.max(
    0,
    ...rows.map((row) => Number.isFinite(Number((row.linkedExperimentCount))) ? Number(row.linkedExperimentCount) : 0)
  );

  const headers = [
    'rowId',
    '분류',
    '도메인',
    'AARRR',
    '실',
    '팀',
    'Objective',
    '항목명',
    'Baseline',
    'Q1목표',
    'Q2목표',
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    'Q1달성률',
    'Q2달성률',
    '신호',
    ...Array.from({ length: maxCount }, (_, idx) => `실험${idx + 1}_제목`),
    ...Array.from({ length: maxCount }, (_, idx) => `실험${idx + 1}_시작일`),
    ...Array.from({ length: maxCount }, (_, idx) => `실험${idx + 1}_종료일`),
    ...Array.from({ length: maxCount }, (_, idx) => `실험${idx + 1}_결과`)
  ];

  const body = rows.map((row) => {
    const linkedExperiments = Array.isArray(row.linkedExperiments) ? row.linkedExperiments : [];
    const maxExperimentsForRow = linkedExperiments.length;
    const expPadding = (linkedExperiments.length < maxCount)
      ? Array.from({ length: maxCount - linkedExperiments.length }, () => ({ title: '-', startDate: '-', endDate: '-', result: '-' }))
      : [];
    const normalized = linkedExperiments.map((item) => ({
      title: item.title || '-',
      startDate: item.startDate || '-',
      endDate: item.endDate || '-',
      result: item.result || '-'
    }));
    const allExp = [...normalized, ...expPadding];

    return [
      row.rowId,
      row.classification || row.effectiveClassification,
      row.domain || '-',
      row.aarrrTag || '-',
      row.division || '-',
      row.team || '-',
      row.objectiveTitle || '-',
      row.title || '-',
      Number.isFinite(Number(row.baseline)) ? row.baseline : '',
      Number.isFinite(Number(row.q1Target)) ? row.q1Target : '',
      Number.isFinite(Number(row.q2Target)) ? row.q2Target : '',
      row.monthlyValueMap?.[1] ?? '',
      row.monthlyValueMap?.[2] ?? '',
      row.monthlyValueMap?.[3] ?? '',
      row.monthlyValueMap?.[4] ?? '',
      row.monthlyValueMap?.[5] ?? '',
      row.monthlyValueMap?.[6] ?? '',
      Number.isFinite(Number(row.q1Achievement)) ? row.q1Achievement : '',
      Number.isFinite(Number(row.q2Achievement)) ? row.q2Achievement : '',
      row.signal || '',
      ...allExp.flatMap((exp) => [exp.title, exp.startDate, exp.endDate, exp.result])
    ];
  });

  return {
    headers,
    body,
    maxCount
  };
}

function objectiveTeamRows(store, presetCollections = getPresetCollections(store)) {
  const grouped = new Map((presetCollections.divisions || []).map((division) => [division, { division, objectiveCount: 0, domains: new Set() }]));

  store.objectives
    .filter((obj) => !obj.deletedAt)
    .forEach((obj) => {
      const division = obj.division || obj.teamId || '';
      if (!division) return;
      if (!grouped.has(division)) {
        grouped.set(division, { division, objectiveCount: 0, domains: new Set() });
      }
      const row = grouped.get(division);
      row.objectiveCount += 1;
      if (obj.domain) {
        row.domains.add(obj.domain);
      }
    });

  return [...grouped.values()]
    .map((row) => ({
      division: row.division,
      objectiveCount: row.objectiveCount,
      domains: [...row.domains]
    }))
    .sort((a, b) => a.division.localeCompare(b.division));
}

function inputPriorityFromClassification(classification) {
  if (String(classification) === 'Problem') return '상';
  if (String(classification) === 'Opportunity') return '중';
  if (String(classification) === 'Needs') return '하';
  return '하';
}

function normalizeInputClassification(value, presetCollections) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const options = normalizeStringList(
    presetCollections?.inputClassifications,
    []
  );
  if (options.includes(raw)) return raw;
  return null;
}

function normalizeInputProduct(value, presetCollections) {
  const raw = String(value || '').trim();
  const options = normalizeStringList(
    presetCollections?.inputProducts,
    []
  );
  if (options.includes(raw)) return raw;
  return null;
}

function normalizeInputSourceRecord(item, presetCollections) {
  const classificationOptions = normalizeStringList(
    presetCollections?.inputClassifications,
    []
  );
  const priorityBasedClassification =
    item.priority === '상'
      ? 'Problem'
      : item.priority === '중'
        ? 'Opportunity'
        : item.priority === '하'
          ? 'Needs'
          : null;
  const rawClassification =
    normalizeInputClassification(item.classification, presetCollections) ||
    (classificationOptions.includes(priorityBasedClassification) ? priorityBasedClassification : null);
  let classification = rawClassification;
  if (!classification) {
    if (item.reach !== undefined || item.impact !== undefined || item.confidence !== undefined || item.effort !== undefined) {
      const reach = Number(item.reach || 0);
      const impact = Number(item.impact || 0);
      const confidence = Number(item.confidence || 0);
      const effort = Number(item.effort || 0);
      if (Number.isFinite(reach) && Number.isFinite(impact) && Number.isFinite(confidence) && Number.isFinite(effort)) {
        const score = (reach * impact * confidence) / Math.max(1, effort);
        if (score >= 9) classification = 'Problem';
        else if (score >= 5) classification = 'Opportunity';
      }
    }
  }
  if (!classification) classification = classificationOptions[0] || '';

  const mappedProduct = normalizeInputProduct(item.product, presetCollections)
    || normalizeInputProduct(item.domain, presetCollections)
    || normalizeInputProduct(item.division, presetCollections);
  const fallbackProducts = normalizeStringList(presetCollections?.inputProducts, []);
  const defaultProduct = fallbackProducts[0] || '';
  const product =
    mappedProduct ||
    (String(item.domain || '').trim() === 'Food + QC' ? 'Food'
      : String(item.domain || '').trim() === 'Rider' ? 'Delivery'
      : String(item.domain || '').trim() === 'Partner' ? ''
      : defaultProduct);

  const sourceOptions = normalizeStringList(presetCollections?.inputSources, []);
  const defaultSource = sourceOptions[0] || '';
  const sourceRaw = String(item.source || '').trim();
  const source = sourceOptions.includes(sourceRaw) ? sourceRaw : defaultSource;

  return {
    ...item,
    classification,
    product,
    source,
    priority: inputPriorityFromClassification(classification),
    detail: item.detail || item.summary || '',
    summary: item.summary || item.detail || ''
  };
}

function inputPriorityRank(priority) {
  if (priority === '상') return 3;
  if (priority === '중') return 2;
  return 1;
}

function normalizeInputSourceStatus(value, fallback = 'registered') {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === 'registered' || raw === 'pending') return 'registered';
  if (raw === 'converted' || raw === 'processed') return 'converted';
  if (raw === 'rejected' || raw === 'dropped') return 'rejected';
  return fallback;
}

function matchesInputSourceQuery(item, query) {
  const normalizedStatusQuery = query.status ? normalizeInputSourceStatus(query.status, '') : '';
  if (query.division && item.division !== query.division) return false;
  if (query.team && item.team !== query.team && item.workingTeam !== query.team) return false;
  if (query.domain && item.product !== query.domain) return false;
  if (query.aarrrTag && item.source !== query.aarrrTag) return false;
  if (query.krId && item.krId !== query.krId) return false;
  if (normalizedStatusQuery && item.status !== normalizedStatusQuery) return false;
  if (!matchesTextQuery(query.q, [item.title, item.detail, item.reporter, item.referenceUrl, item.classification, item.product, item.source])) return false;
  return true;
}

function sortInputSources(list, sortBy = 'priority_desc') {
  const rows = [...list];
  const priorityCompare = (a, b) => {
    const pa = inputPriorityRank(a.priority);
    const pb = inputPriorityRank(b.priority);
    if (pb !== pa) return pb - pa;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  };

  if (sortBy === 'priority_asc') {
    rows.sort((a, b) => {
      const pa = inputPriorityRank(a.priority);
      const pb = inputPriorityRank(b.priority);
      if (pa !== pb) return pa - pb;
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
    return rows;
  }
  if (sortBy === 'oldest') {
    rows.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    return rows;
  }
  if (sortBy === 'latest') {
    rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return rows;
  }

  rows.sort(priorityCompare);
  return rows;
}

function normalizeAarrrTag(value) {
  if (value === 'Acqusition') return 'Acquisition';
  if (!value) return '-';
  return value;
}

function parseRowId(rowId) {
  const raw = String(rowId || '');
  const [entityType, entityId] = raw.split(':');
  if (!entityType || !entityId) return null;
  if (!['objective', 'kr', 'sub_kr', 'initiative'].includes(entityType)) return null;
  return { entityType, entityId };
}

function normalizeClassificationValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const mapped = LEGACY_CLASSIFICATION_MAP[raw] || raw;
  if (CLASSIFICATION_OPTIONS.includes(mapped)) return mapped;
  return null;
}

function entityCollectionName(entityType) {
  if (entityType === 'objective') return 'objectives';
  if (entityType === 'kr') return 'krs';
  if (entityType === 'sub_kr') return 'subKrs';
  return 'initiatives';
}

function targetTypeFromEntityType(entityType) {
  if (entityType === 'objective') return 'objective';
  if (entityType === 'kr') return 'kr';
  if (entityType === 'sub_kr') return 'sub_kr';
  return 'initiative';
}

function inferClassification(entityType, item) {
  if (entityType === 'objective') {
    return item.team ? '팀 O' : '실 O';
  }
  if (entityType === 'initiative') return '팀 Initiative';
  return item.ownerScope === 'team' ? '팀 KR' : '실 KR';
}

function parseYearMonth(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

function normalizeTargetIds(values, fallback = []) {
  const source = Array.isArray(values) ? values : fallback;
  const seen = new Set();
  const result = [];
  source.forEach((value) => {
    const targetId = String(value || '').trim();
    if (!targetId || seen.has(targetId)) return;
    seen.add(targetId);
    result.push(targetId);
  });
  return result;
}

function halfMonthStart(half) {
  return half === 'H2' ? 7 : 1;
}

function halfDisplayMonthToCalendarMonth(half, displayMonth) {
  const month = halfMonthStart(half) + Number(displayMonth) - 1;
  return month;
}

function calendarMonthToHalfDisplayMonth(half, calendarMonth) {
  const display = Number(calendarMonth) - halfMonthStart(half) + 1;
  if (display < 1 || display > 6) return null;
  return display;
}

function currentUtcYearMonth() {
  const now = new Date();
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1
  };
}

function formatYearMonth(year, month) {
  return `${Number(year)}-${String(month).padStart(2, '0')}`;
}

function isCalendarMonthInFuture(year, month, now = currentUtcYearMonth()) {
  return Number(year) > Number(now.year) || (Number(year) === Number(now.year) && Number(month) > Number(now.month));
}

function buildNotificationContextMaps(store) {
  return {
    objectiveMap: new Map(store.objectives.filter((item) => !item.deletedAt).map((item) => [item.id, item])),
    krMap: new Map(store.krs.filter((item) => !item.deletedAt).map((item) => [item.id, item])),
    subKrMap: new Map(store.subKrs.filter((item) => !item.deletedAt).map((item) => [item.id, item])),
    initiativeMap: new Map(store.initiatives.filter((item) => !item.deletedAt).map((item) => [item.id, item]))
  };
}

function resolveObjectiveFromTarget(context, targetType, targetId) {
  if (targetType === 'kr') {
    const target = context.krMap.get(targetId);
    if (!target) return null;
    return context.objectiveMap.get(target.objectiveId) || null;
  }

  if (targetType === 'sub_kr') {
    const target = context.subKrMap.get(targetId);
    if (!target) return null;
    const kr = context.krMap.get(target.krId);
    if (!kr) return null;
    return context.objectiveMap.get(kr.objectiveId) || null;
  }

  if (targetType === 'initiative') {
    const target = context.initiativeMap.get(targetId);
    if (!target) return null;
    const mappedSubKr = target.subKrId ? context.subKrMap.get(target.subKrId) : null;
    const mappedKr = mappedSubKr ? context.krMap.get(mappedSubKr.krId) : null;
    const krFromMap = target.krId ? context.krMap.get(target.krId) : null;
    const objectiveId = krFromMap ? krFromMap.objectiveId : mappedKr ? mappedKr.objectiveId : target.objectiveId;
    if (!objectiveId) return null;
    return context.objectiveMap.get(objectiveId) || null;
  }

  return null;
}

function normalizeNotificationStatus(status) {
  const rawStatus = String(status || '').trim();
  if (!rawStatus) return '';
  if (rawStatus === '미등록') return 'missing';
  if (rawStatus === '실적 등록' || rawStatus === '등록') return 'registered';
  return rawStatus.toLowerCase();
}

function normalizeNotificationText(value) {
  const text = String(value || '').trim();
  return text || '-';
}

function getMonthlyNotificationEntriesForTarget({
  targetType,
  targetId,
  targetTitle,
  objective,
  targetDivision,
  targetOwner,
  monthlyPerformances,
  now,
  selectedYearMonth
}) {
  if (!objective) return [];
  const year = Number(objective.year);
  const half = String(objective.half || '').trim();
  if (!Number.isFinite(year) || !['H1', 'H2'].includes(half)) return [];

    const existing = new Set(
      monthlyPerformances
        .filter((item) => item.targetType === targetType && item.targetId === targetId)
        .map((item) => item.yearMonth)
    );

  const monthCandidates = [];
  const selectedMonth =
    selectedYearMonth && Number(selectedYearMonth.year) === year
      ? Number(selectedYearMonth.month)
      : null;
  const selectedDisplayMonth = selectedMonth ? calendarMonthToHalfDisplayMonth(half, selectedMonth) : null;

  if (selectedMonth && selectedDisplayMonth) {
    monthCandidates.push(selectedDisplayMonth);
  } else if (!selectedYearMonth) {
    for (let i = 1; i <= 6; i += 1) {
      monthCandidates.push(i);
    }
  }

  const rows = [];
  for (let i = 1; i <= 6; i += 1) {
    if (!monthCandidates.includes(i)) continue;

    const calendarMonth = halfDisplayMonthToCalendarMonth(half, i);
    if (isCalendarMonthInFuture(year, calendarMonth, now)) continue;

    const yearMonth = formatYearMonth(year, calendarMonth);
    const isRegistered = existing.has(yearMonth);

    rows.push({
      targetType,
      targetId,
      targetTitle,
      status: normalizeNotificationStatus(isRegistered ? 'registered' : 'missing'),
      division: normalizeNotificationText(targetDivision || '-'),
      owner: normalizeNotificationText(targetOwner || '-'),
      year,
      half,
      yearMonth,
      month: calendarMonth
    });
  }
  return rows;
}

function buildMonthlyNotificationItems(store) {
  return buildMonthlyNotificationItemsForMonth(store, null);
}

function buildMonthlyNotificationItemsForMonth(store, selectedYearMonth = null) {
  const now = currentUtcYearMonth();
  const maps = buildNotificationContextMaps(store);
  const notifications = [];
  const baseArgs = { monthlyPerformances: store.monthlyPerformances, now, selectedYearMonth };

  const krRows = store.krs.filter((item) => !item.deletedAt);
  krRows.forEach((kr) => {
    const objective = resolveObjectiveFromTarget(maps, 'kr', kr.id);
  const missing = getMonthlyNotificationEntriesForTarget({
      targetType: 'kr',
      targetId: kr.id,
      targetTitle: kr.title,
      objective,
      targetDivision: normalizeNotificationText(kr.division || objective?.division || objective?.teamId),
      targetOwner: normalizeNotificationText(kr.owner || objective?.owner),
      ...baseArgs
    });
    missing.forEach((item) => {
      notifications.push({
        targetType: item.targetType,
        targetId: item.targetId,
        targetTitle: item.targetTitle,
        status: item.status,
        division: item.division,
        owner: item.owner,
        yearMonth: item.yearMonth,
        month: item.month,
        year: item.year,
        half: item.half,
        parentKrId: kr.id,
        parentObjectiveTitle: objective ? objective.title : '-',
        parentObjectiveId: objective ? objective.id : null,
        routeType: 'kr'
      });
    });
  });

  const subKrRows = store.subKrs.filter((item) => !item.deletedAt);
  subKrRows.forEach((subKr) => {
    const objective = resolveObjectiveFromTarget(maps, 'sub_kr', subKr.id);
  const missing = getMonthlyNotificationEntriesForTarget({
      targetType: 'sub_kr',
      targetId: subKr.id,
      targetTitle: subKr.title,
      objective,
      targetDivision: normalizeNotificationText(subKr.division || objective?.division || objective?.teamId),
      targetOwner: normalizeNotificationText(subKr.owner || objective?.owner),
      ...baseArgs
    });
    missing.forEach((item) => {
      notifications.push({
        targetType: item.targetType,
        targetId: item.targetId,
        targetTitle: item.targetTitle,
        status: item.status,
        division: item.division,
        owner: item.owner,
        yearMonth: item.yearMonth,
        month: item.month,
        year: item.year,
        half: item.half,
        parentKrId: subKr.krId || null,
        parentObjectiveTitle: objective ? objective.title : '-',
        parentObjectiveId: objective ? objective.id : null,
        routeType: 'sub_kr'
      });
    });
  });

  const initiativeRows = store.initiatives.filter((item) => !item.deletedAt);
  initiativeRows.forEach((initiative) => {
    const objective = resolveObjectiveFromTarget(maps, 'initiative', initiative.id);
  const missing = getMonthlyNotificationEntriesForTarget({
      targetType: 'initiative',
      targetId: initiative.id,
      targetTitle: initiative.title,
      objective,
      targetDivision: normalizeNotificationText(initiative.division || objective?.division || objective?.teamId),
      targetOwner: normalizeNotificationText(initiative.owner || objective?.owner),
      ...baseArgs
    });
    missing.forEach((item) => {
      notifications.push({
        targetType: item.targetType,
        targetId: item.targetId,
        targetTitle: item.targetTitle,
        status: item.status,
        division: item.division,
        owner: item.owner,
        yearMonth: item.yearMonth,
        month: item.month,
        year: item.year,
        half: item.half,
        parentKrId: initiative.krId || null,
        parentObjectiveTitle: objective ? objective.title : '-',
        parentObjectiveId: objective ? objective.id : null,
        routeType: 'initiative'
      });
    });
  });

  return notifications.sort((a, b) => {
    const ym = String(a.yearMonth || '').localeCompare(String(b.yearMonth || ''));
    if (ym !== 0) return ym;
    if (a.targetType !== b.targetType) return String(a.targetType || '').localeCompare(String(b.targetType || ''));
    return String(a.targetTitle || '').localeCompare(String(b.targetTitle || ''));
  });
}

function monthlyValuesByHalf(store, targetType, targetId, year, half) {
  const displayValueMap = {};
  for (let i = 1; i <= 6; i += 1) {
    displayValueMap[i] = null;
  }

  store.monthlyPerformances
    .filter((item) => item.targetType === targetType && item.targetId === targetId)
    .forEach((item) => {
      const parsed = parseYearMonth(item.yearMonth);
      if (!parsed || parsed.year !== Number(year)) return;
      const displayMonth = calendarMonthToHalfDisplayMonth(half, parsed.month);
      if (!displayMonth) return;
      displayValueMap[displayMonth] = Number(item.actualValue);
    });

  return displayValueMap;
}

function latestQuarterValue(monthlyValueMap, quarter) {
  const order = quarter === 'q1' ? [3, 2, 1] : [6, 5, 4];
  for (const month of order) {
    const value = monthlyValueMap[month];
    if (value === null || value === undefined || value === '') {
      continue;
    }
    if (Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function computeQuarterAchievement({ baseline, target, current }) {
  if (!Number.isFinite(Number(current))) {
    return { achievement: null, status: 'missing_actual' };
  }

  const denominator = Number(target) - Number(baseline);
  if (!Number.isFinite(denominator) || denominator === 0) {
    return { achievement: null, status: 'invalid_denominator' };
  }

  const achievement = ((Number(current) - Number(baseline)) / denominator) * 100;
  return { achievement: Number(achievement.toFixed(2)), status: 'ok' };
}

function defaultBaselineTarget(entityType) {
  if (entityType === 'initiative') {
    return { baseline: 0, q1Target: 1, q2Target: 1 };
  }
  return { baseline: 0, q1Target: 100, q2Target: 100 };
}

function buildEntityMaps(store) {
  return {
    objectiveMap: new Map(store.objectives.filter((item) => !item.deletedAt).map((item) => [item.id, item])),
    krMap: new Map(store.krs.filter((item) => !item.deletedAt).map((item) => [item.id, item])),
    subKrMap: new Map(store.subKrs.filter((item) => !item.deletedAt).map((item) => [item.id, item]))
  };
}

function buildObjectiveRows(store) {
  return store.objectives
    .filter((item) => !item.deletedAt)
    .map((objective) => ({
      entityType: 'objective',
      entityId: objective.id,
      krId: null,
      subKrId: null,
      objectiveId: objective.id,
      objectiveTitle: objective.title,
      title: objective.title,
      definition: objective.definition || '',
      half: objective.half,
      year: Number(objective.year),
      division: objective.division || objective.teamId || '',
      team: objective.team || '',
      domain: objective.domain || '',
      aarrrTag: normalizeAarrrTag(objective.aarrrTag || '-'),
      ownerScope: 'division',
      owner: objective.owner || 'unassigned',
      status: objective.status || 'active',
      classificationOverride: objective.classificationOverride || null,
      baseline: Number.isFinite(Number(objective.baseline)) ? Number(objective.baseline) : defaultBaselineTarget('objective').baseline,
      q1Target: Number.isFinite(Number(objective.q1Target)) ? Number(objective.q1Target) : defaultBaselineTarget('objective').q1Target,
      q2Target: Number.isFinite(Number(objective.q2Target)) ? Number(objective.q2Target) : defaultBaselineTarget('objective').q2Target,
      startDate: objective.startDate || null,
      endDate: objective.endDate || null,
      updatedAt: objective.updatedAt || objective.createdAt || nowIso()
    }));
}

function buildKRRows(store, maps) {
  return store.krs
    .filter((item) => !item.deletedAt)
    .map((kr) => {
      const objective = maps.objectiveMap.get(kr.objectiveId);
      if (!objective) return null;
      return {
        entityType: 'kr',
        entityId: kr.id,
        krId: kr.id,
        subKrId: null,
        objectiveId: objective.id,
        objectiveTitle: objective.title,
        title: kr.title,
        definition: kr.definition || '',
        half: objective.half,
        year: Number(objective.year),
        division: kr.division || objective.division || objective.teamId || '',
        team: kr.team || '',
        domain: kr.domain || objective.domain || '',
        aarrrTag: normalizeAarrrTag(kr.aarrrTag || '-'),
        ownerScope: kr.ownerScope || 'division',
        owner: kr.owner || 'unassigned',
        status: normalizeOkrStatus(kr.status, 'planned'),
        classificationOverride: kr.classificationOverride || null,
        baseline: Number.isFinite(Number(kr.baseline)) ? Number(kr.baseline) : defaultBaselineTarget('kr').baseline,
        q1Target: Number.isFinite(Number(kr.q1Target)) ? Number(kr.q1Target) : Number(kr.targetValue || defaultBaselineTarget('kr').q1Target),
        q2Target: Number.isFinite(Number(kr.q2Target)) ? Number(kr.q2Target) : Number(kr.targetValue || defaultBaselineTarget('kr').q2Target),
        startDate: kr.startDate || null,
        endDate: kr.endDate || null,
        updatedAt: kr.updatedAt || kr.createdAt || nowIso()
      };
    })
    .filter(Boolean);
}

function buildSubKRRows(store, maps) {
  return store.subKrs
    .filter((item) => !item.deletedAt)
    .map((subKr) => {
      const kr = maps.krMap.get(subKr.krId);
      if (!kr) return null;
      const objective = maps.objectiveMap.get(kr.objectiveId);
      if (!objective) return null;
      return {
        entityType: 'sub_kr',
        entityId: subKr.id,
        krId: kr.id,
        subKrId: subKr.id,
        objectiveId: objective.id,
        objectiveTitle: objective.title,
        title: subKr.title,
        definition: subKr.definition || '',
        half: objective.half,
        year: Number(objective.year),
        division: subKr.division || kr.division || objective.division || objective.teamId || '',
        team: subKr.team || kr.team || '',
        domain: subKr.domain || kr.domain || objective.domain || '',
        aarrrTag: normalizeAarrrTag(subKr.aarrrTag || kr.aarrrTag || '-'),
        ownerScope: subKr.ownerScope || kr.ownerScope || 'division',
        owner: subKr.owner || kr.owner || 'unassigned',
        status: normalizeOkrStatus(subKr.status, 'planned'),
        classificationOverride: subKr.classificationOverride || null,
        baseline: Number.isFinite(Number(subKr.baseline)) ? Number(subKr.baseline) : defaultBaselineTarget('sub_kr').baseline,
        q1Target: Number.isFinite(Number(subKr.q1Target)) ? Number(subKr.q1Target) : Number(subKr.targetValue || defaultBaselineTarget('sub_kr').q1Target),
        q2Target: Number.isFinite(Number(subKr.q2Target)) ? Number(subKr.q2Target) : Number(subKr.targetValue || defaultBaselineTarget('sub_kr').q2Target),
        startDate: subKr.startDate || null,
        endDate: subKr.endDate || null,
        updatedAt: subKr.updatedAt || subKr.createdAt || nowIso()
      };
    })
    .filter(Boolean);
}

function buildInitiativeRows(store, maps) {
  return store.initiatives
    .filter((item) => !item.deletedAt)
    .map((initiative) => {
      const subKr = initiative.subKrId ? maps.subKrMap.get(initiative.subKrId) : null;
      const krFromSub = subKr ? maps.krMap.get(subKr.krId) : null;
      const kr = krFromSub || (initiative.krId ? maps.krMap.get(initiative.krId) : null);
      const objectiveFromKr = kr ? maps.objectiveMap.get(kr.objectiveId) : null;
      const objective = objectiveFromKr || (initiative.objectiveId ? maps.objectiveMap.get(initiative.objectiveId) : null);
      if (!objective) return null;
      return {
        entityType: 'initiative',
        entityId: initiative.id,
        krId: kr ? kr.id : null,
        subKrId: subKr ? subKr.id : null,
        objectiveId: objective.id,
        objectiveTitle: objective.title,
        title: initiative.title,
        definition: initiative.definition || '',
        half: objective.half,
        year: Number(objective.year),
        division: initiative.division || subKr.division || kr.division || objective.division || objective.teamId || '',
        team: initiative.team || subKr.team || kr.team || '',
        domain: initiative.domain || subKr.domain || kr.domain || objective.domain || '',
        aarrrTag: normalizeAarrrTag(initiative.aarrrTag || subKr.aarrrTag || kr.aarrrTag || '-'),
        ownerScope: 'team',
        owner: initiative.owner || 'unassigned',
        status: normalizeOkrStatus(initiative.status, 'planned'),
        classificationOverride: initiative.classificationOverride || null,
        baseline: Number.isFinite(Number(initiative.baseline)) ? Number(initiative.baseline) : defaultBaselineTarget('initiative').baseline,
        q1Target: Number.isFinite(Number(initiative.q1Target)) ? Number(initiative.q1Target) : defaultBaselineTarget('initiative').q1Target,
        q2Target: Number.isFinite(Number(initiative.q2Target)) ? Number(initiative.q2Target) : defaultBaselineTarget('initiative').q2Target,
        startDate: initiative.startDate || null,
        endDate: initiative.endDate || null,
        updatedAt: initiative.updatedAt || initiative.createdAt || nowIso()
      };
    })
    .filter(Boolean);
}

function enrichTableRowWithMetrics(store, baseRow) {
  const targetType = targetTypeFromEntityType(baseRow.entityType);
  const monthlyValueMap = monthlyValuesByHalf(store, targetType, baseRow.entityId, baseRow.year, baseRow.half);
  const q1Current = latestQuarterValue(monthlyValueMap, 'q1');
  const q2Current = latestQuarterValue(monthlyValueMap, 'q2');

  const q1Calc = computeQuarterAchievement({
    baseline: baseRow.baseline,
    target: baseRow.q1Target,
    current: q1Current
  });
  const q2Calc = computeQuarterAchievement({
    baseline: baseRow.baseline,
    target: baseRow.q2Target,
    current: q2Current
  });

  const inferredClassification = inferClassification(baseRow.entityType, baseRow);
  const classificationOverride = normalizeClassificationValue(baseRow.classificationOverride);
  const effectiveClassification = classificationOverride || inferredClassification;

  const rowSignal =
    q2Calc.achievement === null
      ? 'red'
      : q2Calc.achievement >= 80
        ? 'green'
        : q2Calc.achievement >= 50
          ? 'yellow'
          : 'red';

  const dataStatus = [];
  if (q1Calc.status !== 'ok') dataStatus.push(`q1:${q1Calc.status}`);
  if (q2Calc.status !== 'ok') dataStatus.push(`q2:${q2Calc.status}`);
  if (baseRow.entityType === 'initiative' && !baseRow.team) dataStatus.push('team:missing');

  return {
    ...baseRow,
    rowId: `${baseRow.entityType}:${baseRow.entityId}`,
    targetType,
    inferredClassification,
    classificationOverride,
    effectiveClassification,
    monthlyValueMap,
    q1Current,
    q2Current,
    q1Achievement: q1Calc.achievement,
    q2Achievement: q2Calc.achievement,
    signal: rowSignal,
    dataStatus: dataStatus.length > 0 ? dataStatus.join(',') : 'ok'
  };
}

function addToListMap(map, key, value) {
  if (!key || !value) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function buildExperimentLinkContext(store) {
  const experimentMap = new Map(
    store.experiments
      .filter((item) => !item.deletedAt)
      .map((item) => [item.id, item])
  );
  const krMap = new Map(store.krs.filter((item) => !item.deletedAt).map((item) => [item.id, item]));
  const subKrMap = new Map(store.subKrs.filter((item) => !item.deletedAt).map((item) => [item.id, item]));

  const krExperimentIdsByKrId = new Map();
  (store.krExperimentLinks || []).forEach((link) => {
    if (!experimentMap.has(link.experimentId)) return;
    if (!krMap.has(link.krId)) return;
    addToListMap(krExperimentIdsByKrId, link.krId, link.experimentId);
  });

  const initiativeExperimentIdsByInitiativeId = new Map();
  (store.initiativeExperimentLinks || []).forEach((link) => {
    if (!experimentMap.has(link.experimentId)) return;
    addToListMap(initiativeExperimentIdsByInitiativeId, link.initiativeId, link.experimentId);
  });

  const krIdsByObjectiveId = new Map();
  krMap.forEach((kr) => {
    addToListMap(krIdsByObjectiveId, kr.objectiveId, kr.id);
  });

  const subKrIdsByKrId = new Map();
  subKrMap.forEach((subKr) => {
    addToListMap(subKrIdsByKrId, subKr.krId, subKr.id);
  });

  const initiativeIdsByObjectiveId = new Map();
  const initiativeIdsByKrId = new Map();
  const initiativeIdsBySubKrId = new Map();
  (store.initiatives || [])
    .filter((item) => !item.deletedAt)
    .forEach((initiative) => {
      const subKr = initiative.subKrId ? subKrMap.get(initiative.subKrId) : null;
      const krFromSub = subKr ? krMap.get(subKr.krId) : null;
      const kr = krFromSub || (initiative.krId ? krMap.get(initiative.krId) : null);
      const objectiveId = kr?.objectiveId || initiative.objectiveId || null;

      if (objectiveId) addToListMap(initiativeIdsByObjectiveId, objectiveId, initiative.id);
      if (kr?.id) addToListMap(initiativeIdsByKrId, kr.id, initiative.id);
      if (initiative.subKrId) addToListMap(initiativeIdsBySubKrId, initiative.subKrId, initiative.id);
    });

  return {
    experimentMap,
    krExperimentIdsByKrId,
    initiativeExperimentIdsByInitiativeId,
    krIdsByObjectiveId,
    subKrIdsByKrId,
    initiativeIdsByObjectiveId,
    initiativeIdsByKrId,
    initiativeIdsBySubKrId
  };
}

function resolveLinkedExperimentsForRow(row, context) {
  const experimentIds = new Set();

  const addKrExperiments = (krId) => {
    (context.krExperimentIdsByKrId.get(krId) || []).forEach((experimentId) => experimentIds.add(experimentId));
  };
  const addInitiativeExperiments = (initiativeId) => {
    (context.initiativeExperimentIdsByInitiativeId.get(initiativeId) || []).forEach((experimentId) => experimentIds.add(experimentId));
  };

  if (row.entityType === 'objective') {
    // Objective row does not inherit experiments from child KR/Initiative rows.
  } else if (row.entityType === 'kr') {
    // KR row shows only experiments directly linked to KR.
    addKrExperiments(row.entityId);
  } else if (row.entityType === 'sub_kr') {
    // Sub-KR row has no direct experiment link type in current model.
  } else if (row.entityType === 'initiative') {
    // Initiative row shows only experiments directly linked to Initiative.
    addInitiativeExperiments(row.entityId);
  }

  const linkedExperiments = [...experimentIds]
    .map((experimentId) => context.experimentMap.get(experimentId))
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));

  const top = linkedExperiments[0] || null;
  return {
    linkedExperimentIds: [...experimentIds],
    linkedExperimentCount: linkedExperiments.length,
    linkedExperimentTitle: top?.title || '',
    linkedExperimentStartDate: top?.startDate || '',
    linkedExperimentEndDate: top?.endDate || '',
    linkedExperimentResult: top ? normalizeExperimentResult(top.result, '위너 선정 전') : '',
    linkedExperiments: linkedExperiments.map((item) => ({
      id: item.id,
      title: item.title || '',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      result: normalizeExperimentResult(item.result, '위너 선정 전')
    }))
  };
}

function buildOKRTableRows(store) {
  const maps = buildEntityMaps(store);
  const experimentContext = buildExperimentLinkContext(store);
  const baseRows = [
    ...buildObjectiveRows(store),
    ...buildKRRows(store, maps),
    ...buildSubKRRows(store, maps),
    ...buildInitiativeRows(store, maps)
  ];

  return baseRows.map((row) => {
    const metricRow = enrichTableRowWithMetrics(store, row);
    return {
      ...metricRow,
      ...resolveLinkedExperimentsForRow(metricRow, experimentContext)
    };
  });
}

function matchesStatusFilter(row, status) {
  if (!status) return true;
  if (['green', 'yellow', 'red'].includes(status)) {
    return row.signal === status;
  }
  const normalizedQuery = parseOkrStatus(status);
  if (normalizedQuery) {
    return normalizeOkrStatus(row.status, 'planned') === normalizedQuery;
  }
  return row.status === status;
}

function filterOKRTableRows(rows, query) {
  const search = String(query.q || '').trim().toLowerCase();
  const normalizedClassificationQuery = normalizeClassificationValue(query.classification);
  return rows.filter((row) => {
    if (query.half && row.half !== query.half) return false;
    if (query.year && Number(row.year) !== Number(query.year)) return false;
    if (query.division && row.division !== query.division) return false;
    if (query.domain && row.domain !== query.domain) return false;
    if (query.team && row.team !== query.team) return false;
    if (query.aarrrTag && row.aarrrTag !== query.aarrrTag) return false;
    if (query.classification && (!normalizedClassificationQuery || row.effectiveClassification !== normalizedClassificationQuery)) return false;
    if (!matchesStatusFilter(row, query.status)) return false;

    if (search) {
      const haystacks = [
        row.title,
        row.objectiveTitle,
        row.definition,
        row.division,
        row.team,
        row.domain,
        row.owner,
        row.linkedExperimentTitle,
        row.linkedExperimentResult,
        row.linkedExperimentStartDate,
        row.linkedExperimentEndDate
      ];
      const hasMatch = haystacks.some((text) => String(text || '').toLowerCase().includes(search));
      if (!hasMatch) return false;
    }

    return true;
  });
}

function sortOKRTableRows(rows, query) {
  const sortBy = String(query.sortBy || 'hierarchy');
  const sortOrder = String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  const direction = sortOrder === 'asc' ? 1 : -1;

  if (sortBy === 'hierarchy') {
    const rowHierarchyRank = (row) => {
      const classification = String(row.effectiveClassification || '').trim();
      if (row.entityType === 'objective') {
        if (classification === '실 O') return 1;
        if (classification === '팀 O') return 3;
        return 90;
      }
      if (row.entityType === 'kr') {
        if (classification === '실 KR') return 2;
        if (classification === '팀 KR') return 4;
        return 91;
      }
      if (row.entityType === 'sub_kr') {
        if (classification === '팀 KR') return 5;
        if (classification === '실 KR') return 2;
        return 92;
      }
      if (row.entityType === 'initiative') {
        if (classification === '팀 Initiative') return 6;
        return 93;
      }
      return 99;
    };

    const entityOrder = {
      objective: 1,
      kr: 2,
      sub_kr: 3,
      initiative: 4
    };

    return [...rows].sort((a, b) => {
      const yearCompare = Number(a.year || 0) - Number(b.year || 0);
      if (yearCompare !== 0) return yearCompare;

      const halfCompare = String(a.half || '').localeCompare(String(b.half || ''));
      if (halfCompare !== 0) return halfCompare;

      const divisionA = String(a.division || '').trim();
      const divisionB = String(b.division || '').trim();
      const divisionCompare = divisionA.localeCompare(divisionB);
      if (divisionCompare !== 0) return divisionCompare;

      const rankA = rowHierarchyRank(a);
      const rankB = rowHierarchyRank(b);
      if (rankA !== rankB) return rankA - rankB;

      const teamA = String(a.team || '').trim();
      const teamB = String(b.team || '').trim();
      const teamCompare = teamA.localeCompare(teamB);
      if (teamCompare !== 0) return teamCompare;

      const objectiveTitleCompare = String(a.objectiveTitle || '').localeCompare(String(b.objectiveTitle || ''));
      if (objectiveTitleCompare !== 0) return objectiveTitleCompare;

      const objectiveIdCompare = String(a.objectiveId || '').localeCompare(String(b.objectiveId || ''));
      if (objectiveIdCompare !== 0) return objectiveIdCompare;

      const krCompare = String(a.krId || '').localeCompare(String(b.krId || ''));
      if (krCompare !== 0) return krCompare;

      const subKrCompare = String(a.subKrId || '').localeCompare(String(b.subKrId || ''));
      if (subKrCompare !== 0) return subKrCompare;

      const entityOrderA = entityOrder[a.entityType] || 99;
      const entityOrderB = entityOrder[b.entityType] || 99;
      if (entityOrderA !== entityOrderB) return entityOrderA - entityOrderB;

      const titleCompare = String(a.title || '').localeCompare(String(b.title || ''));
      if (titleCompare !== 0) return titleCompare;
      return String(a.entityId || '').localeCompare(String(b.entityId || '')) * direction;
    });
  }

  const sorted = [...rows].sort((a, b) => {
    let av = a[sortBy];
    let bv = b[sortBy];

    if (sortBy === 'q1Achievement' || sortBy === 'q2Achievement') {
      av = Number.isFinite(Number(av)) ? Number(av) : -Infinity;
      bv = Number.isFinite(Number(bv)) ? Number(bv) : -Infinity;
    }

    if (av === undefined || av === null) av = '';
    if (bv === undefined || bv === null) bv = '';
    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * direction;
    }
    return String(av).localeCompare(String(bv)) * direction;
  });

  return sorted;
}

function paginateRows(rows, query) {
  const page = Math.max(1, Number(query.page || 1));
  const pageSize = Math.min(200, Math.max(1, Number(query.pageSize || 50)));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pagedRows = rows.slice(start, start + pageSize);
  return {
    rows: pagedRows,
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages
    }
  };
}

function buildTableSummary(rows) {
  const summary = {
    total: rows.length,
    byClassification: {},
    bySignal: { green: 0, yellow: 0, red: 0 }
  };

  CLASSIFICATION_OPTIONS.forEach((label) => {
    summary.byClassification[label] = 0;
  });

  rows.forEach((row) => {
    if (summary.byClassification[row.effectiveClassification] === undefined) {
      summary.byClassification[row.effectiveClassification] = 0;
    }
    summary.byClassification[row.effectiveClassification] += 1;
    if (summary.bySignal[row.signal] !== undefined) {
      summary.bySignal[row.signal] += 1;
    }
  });

  return summary;
}

function findEntityByRowId(store, rowId) {
  const parsed = parseRowId(rowId);
  if (!parsed) return null;
  const collectionName = entityCollectionName(parsed.entityType);
  const collection = store[collectionName] || [];
  const entity = collection.find((item) => item.id === parsed.entityId && !item.deletedAt);
  if (!entity) return null;
  return { ...parsed, collectionName, entity };
}

function updateEntityFromTablePatch(entityType, entity, patchBody) {
  const updated = { ...entity };

  if (patchBody.classificationOverride !== undefined) {
    const value = normalizeClassificationValue(patchBody.classificationOverride);
    updated.classificationOverride = value || null;
  }

  if (patchBody.definition !== undefined) updated.definition = patchBody.definition;
  if (patchBody.owner !== undefined) updated.owner = patchBody.owner;
  if (patchBody.status !== undefined) {
    if (entityType === 'kr' || entityType === 'sub_kr' || entityType === 'initiative') {
      const nextStatus = parseOkrStatus(patchBody.status);
      if (!nextStatus) {
        throw new Error(OKR_STATUS_HINT);
      }
      updated.status = nextStatus;
    } else {
      updated.status = patchBody.status;
    }
  }
  if (patchBody.division !== undefined) updated.division = patchBody.division;
  if (patchBody.team !== undefined) updated.team = patchBody.team;
  if (patchBody.domain !== undefined) updated.domain = patchBody.domain;
  if (patchBody.aarrrTag !== undefined) updated.aarrrTag = normalizeAarrrTag(patchBody.aarrrTag);
  if (patchBody.startDate !== undefined) updated.startDate = patchBody.startDate;
  if (patchBody.endDate !== undefined) updated.endDate = patchBody.endDate;
  if (patchBody.ownerScope !== undefined) updated.ownerScope = patchBody.ownerScope;

  if (patchBody.baseline !== undefined) updated.baseline = Number(patchBody.baseline);
  if (patchBody.q1Target !== undefined) updated.q1Target = Number(patchBody.q1Target);
  if (patchBody.q2Target !== undefined) updated.q2Target = Number(patchBody.q2Target);

  updated.updatedAt = nowIso();
  return updated;
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    now: nowIso(),
    appMarkLabel,
    gitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA || null
  });
});

app.get('/api/objectives', (req, res) => {
  const store = loadStore();
  let list = store.objectives.filter((item) => !item.deletedAt);
  if (req.query.half) {
    list = list.filter((item) => item.half === req.query.half);
  }
  if (req.query.year) {
    list = list.filter((item) => Number(item.year) === Number(req.query.year));
  }
  if (req.query.division) {
    list = list.filter((item) => (item.division || item.teamId) === req.query.division);
  }
  if (req.query.teamId) {
    list = list.filter((item) => (item.division || item.teamId) === req.query.teamId);
  }
  if (req.query.team) {
    list = list.filter((item) => item.team === req.query.team);
  }
  if (req.query.domain) {
    list = list.filter((item) => item.domain === req.query.domain);
  }
  if (req.query.aarrrTag) {
    const aarrrTag = normalizeAarrrTag(req.query.aarrrTag);
    list = list.filter((item) => normalizeAarrrTag(item.aarrrTag) === aarrrTag);
  }
  if (req.query.status) {
    list = list.filter((item) => item.status === req.query.status);
  }
  if (req.query.q) {
    list = list.filter((item) =>
      matchesTextQuery(req.query.q, [item.title, item.definition, item.owner, item.division, item.team, item.domain, item.status])
    );
  }
  res.json(list);
});

app.post('/api/objectives', async (req, res) => {
  const body = req.body || {};
  const store = loadStore();
  const presetCollections = ensurePresetCollectionsOnStore(store);
  const organizationOptions = [
    ...normalizeStringList(presetCollections.divisions),
    ...normalizeStringList(presetCollections.teams)
  ];
  const error = validateObjective(body, {
    organizations: organizationOptions,
    domains: presetCollections.domains
  });
  if (error) return fail(res, 400, error);
  const organizationType = String(body.organizationType || '').trim() === 'team' ? 'team' : 'division';
  const organizationValue = String(body.division || body.team || body.teamId || '').trim();
  const teamValue = organizationType === 'team' ? organizationValue : String(body.team || '').trim();
  const inferredDivision = inferDivisionByTeam(store, teamValue);
  const divisionValue = organizationType === 'team' ? (inferredDivision || '') : organizationValue;
  const objective = {
    id: id('obj'),
    half: body.half,
    year: Number(body.year),
    title: body.title,
    definition: body.definition || '',
    division: divisionValue,
    domain: body.domain || '',
    teamId: divisionValue,
    team: teamValue,
    aarrrTag: normalizeAarrrTag(body.aarrrTag || '-'),
    baseline: Number.isFinite(Number(body.baseline)) ? Number(body.baseline) : 0,
    q1Target: Number.isFinite(Number(body.q1Target)) ? Number(body.q1Target) : 100,
    q2Target: Number.isFinite(Number(body.q2Target)) ? Number(body.q2Target) : 100,
    owner: body.owner || 'unassigned',
    status: body.status || 'active',
    classificationOverride: body.classificationOverride || null,
    startDate: body.startDate || null,
    endDate: body.endDate || null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null
  };

  store.objectives.push(objective);
  addAuditLog(store, {
    actor: body.actor,
    reason: body.reason,
    action: 'create',
    entityType: 'objective',
    entityId: objective.id,
    beforeValue: null,
    afterValue: objective
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.status(201).json(objective);
});

app.post('/api/objectives/:objectiveId', async (req, res) => {
  const store = loadStore();
  const target = store.objectives.find((item) => item.id === req.params.objectiveId && !item.deletedAt);
  if (!target) return fail(res, 404, 'objective not found');

  const patch = req.body || {};
  if (!patch.actor || !patch.reason) {
    return fail(res, 400, 'actor and reason are required for updates');
  }

  const before = { ...target };
  if (patch.half !== undefined) target.half = patch.half;
  if (patch.year !== undefined) target.year = Number(patch.year);
  if (patch.title !== undefined) target.title = patch.title;
  if (patch.definition !== undefined) target.definition = patch.definition;
  if (patch.division !== undefined) {
    const divisionValue = String(patch.division || '').trim();
    target.division = divisionValue;
    target.teamId = divisionValue;
  }
  if (patch.team !== undefined) target.team = patch.team;
  if (patch.domain !== undefined) target.domain = patch.domain;
  if (patch.aarrrTag !== undefined) target.aarrrTag = normalizeAarrrTag(patch.aarrrTag);
  if (patch.baseline !== undefined) target.baseline = Number(patch.baseline);
  if (patch.q1Target !== undefined) target.q1Target = Number(patch.q1Target);
  if (patch.q2Target !== undefined) target.q2Target = Number(patch.q2Target);
  if (patch.owner !== undefined) target.owner = patch.owner;
  if (patch.status !== undefined) target.status = patch.status;
  if (patch.classificationOverride !== undefined) target.classificationOverride = patch.classificationOverride;
  if (patch.startDate !== undefined) target.startDate = patch.startDate;
  if (patch.endDate !== undefined) target.endDate = patch.endDate;
  target.updatedAt = nowIso();

  addAuditLog(store, {
    actor: patch.actor,
    reason: patch.reason,
    action: 'update',
    entityType: 'objective',
    entityId: target.id,
    beforeValue: before,
    afterValue: target
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json(target);
});

app.delete('/api/objectives/:objectiveId', async (req, res) => {
  const store = loadStore();
  const objective = store.objectives.find((item) => item.id === req.params.objectiveId && !item.deletedAt);
  if (!objective) return fail(res, 404, 'objective not found');

  const actor = String(req.body?.actor || '').trim();
  const reason = String(req.body?.reason || '').trim();
  if (!actor || !reason) return fail(res, 400, 'actor and reason are required');

  if (store.krs.some((item) => item.objectiveId === objective.id && !item.deletedAt)) {
    return fail(res, 409, '연결된 KR가 있어 Objective를 삭제할 수 없습니다. KR를 먼저 삭제해 주세요.');
  }
  if (store.initiatives.some((item) => item.objectiveId === objective.id && !item.deletedAt)) {
    return fail(res, 409, '연결된 Initiative가 있어 Objective를 삭제할 수 없습니다. Initiative를 먼저 삭제해 주세요.');
  }

  const before = { ...objective };
  objective.deletedAt = nowIso();
  objective.updatedAt = nowIso();

  addAuditLog(store, {
    actor,
    reason,
    action: 'delete',
    entityType: 'objective',
    entityId: objective.id,
    beforeValue: before,
    afterValue: objective
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json({ id: objective.id, deleted: true });
});

app.get('/api/objectives/:objectiveId/krs', (req, res) => {
  const store = loadStore();
  const list = store.krs.filter((kr) => !kr.deletedAt && kr.objectiveId === req.params.objectiveId);
  res.json(list.map((item) => ({ ...item, status: normalizeOkrStatus(item.status, 'planned') })));
});

app.get('/api/krs', (req, res) => {
  const store = loadStore();
  let list = store.krs.filter((item) => !item.deletedAt);
  const objectiveMap = new Map(store.objectives.filter((obj) => !obj.deletedAt).map((obj) => [obj.id, obj]));
  const normalizedStatusQuery = req.query.status && !isSignalStatus(req.query.status)
    ? parseOkrStatus(req.query.status)
    : null;

  if (req.query.objectiveId) {
    list = list.filter((item) => item.objectiveId === req.query.objectiveId);
  }
  if (req.query.team) {
    list = list.filter((item) => item.team === req.query.team);
  }
  if (req.query.status && !isSignalStatus(req.query.status)) {
    if (!normalizedStatusQuery) {
      list = [];
    } else {
      list = list.filter((item) => normalizeOkrStatus(item.status, 'planned') === normalizedStatusQuery);
    }
  }

  if (req.query.teamId || req.query.division || req.query.domain || req.query.half || req.query.year) {
    list = list.filter((kr) => {
      const obj = objectiveMap.get(kr.objectiveId);
      if (!obj || obj.deletedAt) return false;
      const objectiveDivision = obj.division || obj.teamId;
      if (req.query.teamId && objectiveDivision !== req.query.teamId) return false;
      if (req.query.division && objectiveDivision !== req.query.division) return false;
      if (req.query.domain && obj.domain !== req.query.domain) return false;
      if (req.query.half && obj.half !== req.query.half) return false;
      if (req.query.year && Number(obj.year) !== Number(req.query.year)) return false;
      return true;
    });
  }

  if (req.query.status && isSignalStatus(req.query.status)) {
    list = list.filter((kr) => {
      const dashboard = computeKRDashboard(store, kr.id);
      return dashboard && dashboard.progress.signal === req.query.status;
    });
  }

  if (req.query.q) {
    list = list.filter((kr) => {
      const obj = objectiveMap.get(kr.objectiveId);
      const normalizedStatus = normalizeOkrStatus(kr.status, 'planned');
      return matchesTextQuery(req.query.q, [
        kr.title,
        kr.definition,
        kr.unit,
        kr.owner,
        kr.team,
        kr.domain,
        normalizedStatus,
        obj ? obj.title : '',
        obj ? obj.division || obj.teamId : ''
      ]);
    });
  }

  res.json(list.map((item) => ({ ...item, status: normalizeOkrStatus(item.status, 'planned') })));
});

app.post('/api/krs', async (req, res) => {
  const body = req.body || {};
  const error = validateKR(body);
  if (error) return fail(res, 400, error);
  if (body.status !== undefined) {
    const parsedStatus = parseOkrStatus(body.status);
    if (!parsedStatus) return fail(res, 400, OKR_STATUS_HINT);
  }

  const store = loadStore();
  const objective = store.objectives.find((item) => item.id === body.objectiveId && !item.deletedAt);
  if (!objective) return fail(res, 400, 'objectiveId not found');
  const teamValue = String(body.team || '').trim();
  const inferredDivision = inferDivisionByTeam(store, teamValue || objective.team || '');

  const kr = {
    id: id('kr'),
    objectiveId: body.objectiveId,
    title: body.title,
    definition: body.definition || '',
    unit: body.unit || '',
    targetValue: Number(body.targetValue),
    baseline: Number.isFinite(Number(body.baseline)) ? Number(body.baseline) : 0,
    q1Target: Number.isFinite(Number(body.q1Target)) ? Number(body.q1Target) : Number(body.targetValue),
    q2Target: Number.isFinite(Number(body.q2Target)) ? Number(body.q2Target) : Number(body.targetValue),
    ownerScope: body.ownerScope || 'division',
    division: body.division || objective.division || objective.teamId || inferredDivision || '',
    team: teamValue,
    domain: body.domain || objective.domain || '',
    aarrrTag: normalizeAarrrTag(body.aarrrTag || '-'),
    owner: body.owner || objective.owner || 'unassigned',
    status: normalizeOkrStatus(body.status, 'planned'),
    classificationOverride: body.classificationOverride || null,
    startDate: body.startDate || null,
    endDate: body.endDate || null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null
  };

  store.krs.push(kr);
  addAuditLog(store, {
    actor: body.actor,
    reason: body.reason,
    action: 'create',
    entityType: 'kr',
    entityId: kr.id,
    beforeValue: null,
    afterValue: kr
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.status(201).json(kr);
});

app.post('/api/krs/:krId', async (req, res) => {
  const store = loadStore();
  const target = store.krs.find((item) => item.id === req.params.krId && !item.deletedAt);
  if (!target) return fail(res, 404, 'kr not found');

  const patch = req.body || {};
  if (!patch.actor || !patch.reason) {
    return fail(res, 400, 'actor and reason are required for updates');
  }

  const before = { ...target };
  if (patch.title !== undefined) target.title = patch.title;
  if (patch.definition !== undefined) target.definition = patch.definition;
  if (patch.unit !== undefined) target.unit = patch.unit;
  if (patch.targetValue !== undefined) {
    if (!Number.isFinite(Number(patch.targetValue)) || Number(patch.targetValue) <= 0) {
      return fail(res, 400, 'targetValue must be a positive number');
    }
    target.targetValue = Number(patch.targetValue);
  }
  if (patch.status !== undefined) {
    const parsedStatus = parseOkrStatus(patch.status);
    if (!parsedStatus) return fail(res, 400, OKR_STATUS_HINT);
    target.status = parsedStatus;
  }
  if (patch.ownerScope !== undefined) target.ownerScope = patch.ownerScope;
  if (patch.division !== undefined) target.division = patch.division;
  if (patch.team !== undefined) target.team = patch.team;
  if (patch.domain !== undefined) target.domain = patch.domain;
  if (patch.aarrrTag !== undefined) target.aarrrTag = normalizeAarrrTag(patch.aarrrTag);
  if (patch.baseline !== undefined) target.baseline = Number(patch.baseline);
  if (patch.q1Target !== undefined) target.q1Target = Number(patch.q1Target);
  if (patch.q2Target !== undefined) target.q2Target = Number(patch.q2Target);
  if (patch.classificationOverride !== undefined) target.classificationOverride = patch.classificationOverride;
  if (patch.startDate !== undefined) target.startDate = patch.startDate;
  if (patch.endDate !== undefined) target.endDate = patch.endDate;
  target.updatedAt = nowIso();

  addAuditLog(store, {
    actor: patch.actor,
    reason: patch.reason,
    action: 'update',
    entityType: 'kr',
    entityId: target.id,
    beforeValue: before,
    afterValue: target
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json({ ...target, status: normalizeOkrStatus(target.status, 'planned') });
});

app.delete('/api/krs/:krId', async (req, res) => {
  const store = loadStore();
  const target = store.krs.find((item) => item.id === req.params.krId && !item.deletedAt);
  if (!target) return fail(res, 404, 'kr not found');

  const actor = String(req.body?.actor || '').trim();
  const reason = String(req.body?.reason || '').trim();
  if (!actor || !reason) return fail(res, 400, 'actor and reason are required');

  if (store.subKrs.some((item) => item.krId === target.id && !item.deletedAt)) {
    return fail(res, 409, '연결된 Sub-KR가 있어 KR를 삭제할 수 없습니다. Sub-KR를 먼저 삭제해 주세요.');
  }
  if (store.initiatives.some((item) => item.krId === target.id && !item.deletedAt)) {
    return fail(res, 409, '연결된 Initiative가 있어 KR를 삭제할 수 없습니다. Initiative를 먼저 삭제해 주세요.');
  }
  if (store.krExperimentLinks.some((item) => item.krId === target.id)) {
    return fail(res, 409, '연결된 Experiment 매핑이 있어 KR를 삭제할 수 없습니다. 매핑을 먼저 해제해 주세요.');
  }

  const before = { ...target };
  target.deletedAt = nowIso();
  target.updatedAt = nowIso();

  addAuditLog(store, {
    actor,
    reason,
    action: 'delete',
    entityType: 'kr',
    entityId: target.id,
    beforeValue: before,
    afterValue: target
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json({ id: target.id, deleted: true });
});

app.get('/api/sub-krs', (req, res) => {
  const store = loadStore();
  let list = store.subKrs.filter((item) => !item.deletedAt);
  const krMap = new Map(store.krs.filter((kr) => !kr.deletedAt).map((kr) => [kr.id, kr]));
  const normalizedStatusQuery = req.query.status ? parseOkrStatus(req.query.status) : null;
  if (req.query.krId) {
    list = list.filter((item) => item.krId === req.query.krId);
  }
  if (req.query.team) {
    list = list.filter((item) => item.team === req.query.team);
  }
  if (req.query.division) {
    list = list.filter((item) => item.division === req.query.division);
  }
  if (req.query.domain) {
    list = list.filter((item) => item.domain === req.query.domain);
  }
  if (req.query.aarrrTag) {
    const aarrrTag = normalizeAarrrTag(req.query.aarrrTag);
    list = list.filter((item) => normalizeAarrrTag(item.aarrrTag) === aarrrTag);
  }
  if (req.query.status) {
    if (!normalizedStatusQuery) {
      list = [];
    } else {
      list = list.filter((item) => normalizeOkrStatus(item.status, 'planned') === normalizedStatusQuery);
    }
  }
  if (req.query.q) {
    list = list.filter((item) => {
      const kr = krMap.get(item.krId);
      const normalizedStatus = normalizeOkrStatus(item.status, 'planned');
      return matchesTextQuery(req.query.q, [
        item.title,
        item.definition,
        item.owner,
        item.team,
        item.division,
        item.domain,
        normalizedStatus,
        kr ? kr.title : ''
      ]);
    });
  }
  res.json(list.map((item) => ({ ...item, status: normalizeOkrStatus(item.status, 'planned') })));
});

app.post('/api/sub-krs', async (req, res) => {
  const body = req.body || {};
  const error = validateSubKR(body);
  if (error) return fail(res, 400, error);
  if (body.status !== undefined) {
    const parsedStatus = parseOkrStatus(body.status);
    if (!parsedStatus) return fail(res, 400, OKR_STATUS_HINT);
  }

  const store = loadStore();
  const kr = store.krs.find((item) => item.id === body.krId && !item.deletedAt);
  if (!kr) return fail(res, 400, 'krId not found');
  const teamValue = String(body.team || kr.team || '').trim();
  const inferredDivision = inferDivisionByTeam(store, teamValue);

  const subKr = {
    id: id('subkr'),
    krId: body.krId,
    title: body.title,
    definition: body.definition || '',
    targetValue: Number(body.targetValue),
    baseline: Number.isFinite(Number(body.baseline)) ? Number(body.baseline) : 0,
    q1Target: Number.isFinite(Number(body.q1Target)) ? Number(body.q1Target) : Number(body.targetValue),
    q2Target: Number.isFinite(Number(body.q2Target)) ? Number(body.q2Target) : Number(body.targetValue),
    ownerScope: body.ownerScope || kr.ownerScope || 'division',
    division: body.division || kr.division || inferredDivision || '',
    team: teamValue,
    domain: body.domain || kr.domain || '',
    aarrrTag: normalizeAarrrTag(body.aarrrTag || kr.aarrrTag || '-'),
    owner: body.owner || kr.owner || 'unassigned',
    status: normalizeOkrStatus(body.status, 'planned'),
    classificationOverride: body.classificationOverride || null,
    startDate: body.startDate || null,
    endDate: body.endDate || null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null
  };

  store.subKrs.push(subKr);
  addAuditLog(store, {
    actor: body.actor,
    reason: body.reason,
    action: 'create',
    entityType: 'sub_kr',
    entityId: subKr.id,
    beforeValue: null,
    afterValue: subKr
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.status(201).json({ ...subKr, status: normalizeOkrStatus(subKr.status, 'planned') });
});

app.post('/api/sub-krs/:subKrId', async (req, res) => {
  const store = loadStore();
  const target = store.subKrs.find((item) => item.id === req.params.subKrId && !item.deletedAt);
  if (!target) return fail(res, 404, 'sub_kr not found');

  const patch = req.body || {};
  if (!patch.actor || !patch.reason) {
    return fail(res, 400, 'actor and reason are required for updates');
  }

  const before = { ...target };
  if (patch.title !== undefined) target.title = patch.title;
  if (patch.definition !== undefined) target.definition = patch.definition;
  if (patch.targetValue !== undefined) {
    if (!Number.isFinite(Number(patch.targetValue)) || Number(patch.targetValue) <= 0) {
      return fail(res, 400, 'targetValue must be a positive number');
    }
    target.targetValue = Number(patch.targetValue);
  }
  if (patch.status !== undefined) {
    const parsedStatus = parseOkrStatus(patch.status);
    if (!parsedStatus) return fail(res, 400, OKR_STATUS_HINT);
    target.status = parsedStatus;
  }
  if (patch.ownerScope !== undefined) target.ownerScope = patch.ownerScope;
  if (patch.division !== undefined) target.division = patch.division;
  if (patch.team !== undefined) target.team = patch.team;
  if (patch.domain !== undefined) target.domain = patch.domain;
  if (patch.aarrrTag !== undefined) target.aarrrTag = normalizeAarrrTag(patch.aarrrTag);
  if (patch.baseline !== undefined) target.baseline = Number(patch.baseline);
  if (patch.q1Target !== undefined) target.q1Target = Number(patch.q1Target);
  if (patch.q2Target !== undefined) target.q2Target = Number(patch.q2Target);
  if (patch.classificationOverride !== undefined) target.classificationOverride = patch.classificationOverride;
  if (patch.startDate !== undefined) target.startDate = patch.startDate;
  if (patch.endDate !== undefined) target.endDate = patch.endDate;
  target.updatedAt = nowIso();

  addAuditLog(store, {
    actor: patch.actor,
    reason: patch.reason,
    action: 'update',
    entityType: 'sub_kr',
    entityId: target.id,
    beforeValue: before,
    afterValue: target
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json({ ...target, status: normalizeOkrStatus(target.status, 'planned') });
});

app.delete('/api/sub-krs/:subKrId', async (req, res) => {
  const store = loadStore();
  const target = store.subKrs.find((item) => item.id === req.params.subKrId && !item.deletedAt);
  if (!target) return fail(res, 404, 'sub_kr not found');

  const actor = String(req.body?.actor || '').trim();
  const reason = String(req.body?.reason || '').trim();
  if (!actor || !reason) return fail(res, 400, 'actor and reason are required');

  if (store.initiatives.some((item) => item.subKrId === target.id && !item.deletedAt)) {
    return fail(res, 409, '연결된 Initiative가 있어 Sub-KR를 삭제할 수 없습니다. Initiative를 먼저 삭제해 주세요.');
  }

  const before = { ...target };
  target.deletedAt = nowIso();
  target.updatedAt = nowIso();

  addAuditLog(store, {
    actor,
    reason,
    action: 'delete',
    entityType: 'sub_kr',
    entityId: target.id,
    beforeValue: before,
    afterValue: target
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json({ id: target.id, deleted: true });
});

app.get('/api/initiatives', (req, res) => {
  const store = loadStore();
  let list = store.initiatives.filter((item) => !item.deletedAt);
  const subKrMap = new Map(store.subKrs.filter((sub) => !sub.deletedAt).map((sub) => [sub.id, sub]));
  const normalizedStatusQuery = req.query.status ? parseOkrStatus(req.query.status) : null;
  if (req.query.subKrId) {
    list = list.filter((item) => item.subKrId === req.query.subKrId);
  }
  if (req.query.team) {
    list = list.filter((item) => item.team === req.query.team);
  }
  if (req.query.division) {
    list = list.filter((item) => item.division === req.query.division);
  }
  if (req.query.domain) {
    list = list.filter((item) => item.domain === req.query.domain);
  }
  if (req.query.aarrrTag) {
    const aarrrTag = normalizeAarrrTag(req.query.aarrrTag);
    list = list.filter((item) => normalizeAarrrTag(item.aarrrTag) === aarrrTag);
  }
  if (req.query.status) {
    if (!normalizedStatusQuery) {
      list = [];
    } else {
      list = list.filter((item) => normalizeOkrStatus(item.status, 'planned') === normalizedStatusQuery);
    }
  }
  if (req.query.q) {
    list = list.filter((item) => {
      const sub = subKrMap.get(item.subKrId);
      const normalizedStatus = normalizeOkrStatus(item.status, 'planned');
      return matchesTextQuery(req.query.q, [
        item.title,
        item.definition,
        item.owner,
        item.team,
        item.division,
        item.domain,
        normalizedStatus,
        sub ? sub.title : ''
      ]);
    });
  }
  res.json(list.map((item) => ({ ...item, status: normalizeOkrStatus(item.status, 'planned') })));
});

app.post('/api/initiatives', async (req, res) => {
  const body = req.body || {};
  const error = validateInitiative(body);
  if (error) return fail(res, 400, error);
  if (body.status !== undefined) {
    const parsedStatus = parseOkrStatus(body.status);
    if (!parsedStatus) return fail(res, 400, OKR_STATUS_HINT);
  }

  const store = loadStore();
  const objectiveMap = new Map(store.objectives.filter((item) => !item.deletedAt).map((item) => [item.id, item]));
  const krMap = new Map(store.krs.filter((item) => !item.deletedAt).map((item) => [item.id, item]));
  const subKrMap = new Map(store.subKrs.filter((item) => !item.deletedAt).map((item) => [item.id, item]));

  let subKr = null;
  let kr = null;
  let objective = null;

  if (body.subKrId) {
    subKr = subKrMap.get(body.subKrId);
    if (!subKr) return fail(res, 400, 'subKrId not found');
    kr = krMap.get(subKr.krId);
    if (!kr) return fail(res, 400, 'linked KR not found');
    objective = objectiveMap.get(kr.objectiveId);
    if (!objective) return fail(res, 400, 'linked Objective not found');
  } else {
    objective = objectiveMap.get(body.objectiveId);
    if (!objective) return fail(res, 400, 'objectiveId not found');
    if (body.krId) {
      kr = krMap.get(body.krId);
      if (!kr) return fail(res, 400, 'krId not found');
      if (kr.objectiveId !== objective.id) {
        return fail(res, 400, 'krId does not belong to objectiveId');
      }
    }
  }

  const initiative = {
    id: id('init'),
    objectiveId: objective.id,
    krId: kr ? kr.id : null,
    subKrId: subKr ? subKr.id : null,
    title: body.title,
    definition: body.definition || '',
    progressQuant: Number.isFinite(Number(body.progressQuant)) ? Number(body.progressQuant) : 0,
    baseline: Number.isFinite(Number(body.baseline)) ? Number(body.baseline) : 0,
    q1Target: Number.isFinite(Number(body.q1Target)) ? Number(body.q1Target) : 1,
    q2Target: Number.isFinite(Number(body.q2Target)) ? Number(body.q2Target) : 1,
    division:
      body.division
      || subKr?.division
      || kr?.division
      || objective.division
      || objective.teamId
      || inferDivisionByTeam(store, body.team || subKr?.team || kr?.team || '')
      || '',
    team: String(body.team || subKr?.team || kr?.team || '').trim(),
    domain: body.domain || subKr?.domain || kr?.domain || objective.domain || '',
    aarrrTag: normalizeAarrrTag(body.aarrrTag || subKr?.aarrrTag || kr?.aarrrTag || objective.aarrrTag || '-'),
    owner: body.owner || subKr?.owner || kr?.owner || objective.owner || 'unassigned',
    status: normalizeOkrStatus(body.status, 'planned'),
    classificationOverride: body.classificationOverride || null,
    startDate: body.startDate || null,
    endDate: body.endDate || null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null
  };

  store.initiatives.push(initiative);
  addAuditLog(store, {
    actor: body.actor,
    reason: body.reason,
    action: 'create',
    entityType: 'initiative',
    entityId: initiative.id,
    beforeValue: null,
    afterValue: initiative
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.status(201).json({ ...initiative, status: normalizeOkrStatus(initiative.status, 'planned') });
});

app.post('/api/initiatives/:initiativeId', async (req, res) => {
  const store = loadStore();
  const target = store.initiatives.find((item) => item.id === req.params.initiativeId && !item.deletedAt);
  if (!target) return fail(res, 404, 'initiative not found');

  const patch = req.body || {};
  if (!patch.actor || !patch.reason) {
    return fail(res, 400, 'actor and reason are required for updates');
  }

  if (
    patch.progressQuant !== undefined &&
    (!Number.isFinite(Number(patch.progressQuant)) || Number(patch.progressQuant) < 0 || Number(patch.progressQuant) > 100)
  ) {
    return fail(res, 400, 'progressQuant must be a number between 0 and 100');
  }

  const before = { ...target };
  if (patch.progressQuant !== undefined) target.progressQuant = Number(patch.progressQuant);
  if (patch.status !== undefined) {
    const parsedStatus = parseOkrStatus(patch.status);
    if (!parsedStatus) return fail(res, 400, OKR_STATUS_HINT);
    target.status = parsedStatus;
  }
  target.updatedAt = nowIso();

  addAuditLog(store, {
    actor: patch.actor,
    reason: patch.reason,
    action: 'update',
    entityType: 'initiative',
    entityId: target.id,
    beforeValue: before,
    afterValue: target
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json({ ...target, status: normalizeOkrStatus(target.status, 'planned') });
});

app.delete('/api/initiatives/:initiativeId', async (req, res) => {
  const store = loadStore();
  const target = store.initiatives.find((item) => item.id === req.params.initiativeId && !item.deletedAt);
  if (!target) return fail(res, 404, 'initiative not found');

  const actor = String(req.body?.actor || '').trim();
  const reason = String(req.body?.reason || '').trim();
  if (!actor || !reason) return fail(res, 400, 'actor and reason are required');

  if (store.initiativeExperimentLinks.some((item) => item.initiativeId === target.id)) {
    return fail(res, 409, '연결된 Experiment 매핑이 있어 Initiative를 삭제할 수 없습니다. 매핑을 먼저 해제해 주세요.');
  }

  const before = { ...target };
  target.deletedAt = nowIso();
  target.updatedAt = nowIso();

  addAuditLog(store, {
    actor,
    reason,
    action: 'delete',
    entityType: 'initiative',
    entityId: target.id,
    beforeValue: before,
    afterValue: target
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json({ id: target.id, deleted: true });
});

app.get('/api/experiment-platform/experiments', (req, res) => {
  let list = normalizeExperimentPlatformCatalog();
  if (req.query.q) {
    list = list.filter((item) =>
      matchesTextQuery(req.query.q, [item.title, item.aarrrTag, item.owner, item.hypothesis, item.startDate, item.endDate, item.result])
    );
  }
  res.json(list);
});

app.get('/api/experiments', (req, res) => {
  const store = loadStore();
  let list = store.experiments.filter((item) => !item.deletedAt);
  const normalizedStatusQuery = req.query.status ? parseExperimentStatus(req.query.status) : null;
  if (req.query.aarrrTag) {
    list = list.filter((item) => item.aarrrTag === req.query.aarrrTag);
  }
  if (req.query.status) {
    if (!normalizedStatusQuery) {
      list = [];
    } else {
      list = list.filter((item) => normalizeExperimentStatus(item.status, 'before_start') === normalizedStatusQuery);
    }
  }
  if (req.query.q) {
    list = list.filter((item) =>
      matchesTextQuery(req.query.q, [
        item.title,
        item.aarrrTag,
        normalizeExperimentStatus(item.status, 'before_start'),
        item.owner,
        item.hypothesis,
        item.startDate,
        item.endDate,
        normalizeExperimentResult(item.result, '위너 선정 전')
      ])
    );
  }
  res.json(
    list.map((item) => ({
      ...item,
      status: normalizeExperimentStatus(item.status, 'before_start'),
      result: normalizeExperimentResult(item.result, '위너 선정 전')
    }))
  );
});

app.post('/api/experiments', async (req, res) => {
  const body = { ...(req.body || {}) };
  if (body.platformExperimentId !== undefined) {
    const platformItem = findExperimentPlatformItem(body.platformExperimentId);
    if (!platformItem) return fail(res, 400, 'invalid platformExperimentId');
    body.title = platformItem.title;
    body.aarrrTag = platformItem.aarrrTag;
    body.owner = platformItem.owner;
    body.status = platformItem.status;
    body.hypothesis = platformItem.hypothesis;
    body.startDate = platformItem.startDate;
    body.endDate = platformItem.endDate;
    body.result = platformItem.result;
  }
  const error = validateExperiment(body);
  if (error) return fail(res, 400, error);
  if (body.status !== undefined) {
    const parsedStatus = parseExperimentStatus(body.status);
    if (!parsedStatus) return fail(res, 400, EXPERIMENT_STATUS_HINT);
  }
  if (body.result !== undefined) {
    const parsedResult = parseExperimentResult(body.result);
    if (!parsedResult) return fail(res, 400, EXPERIMENT_RESULT_HINT);
  }

  const store = loadStore();
  const experiment = {
    id: id('exp'),
    platformExperimentId: body.platformExperimentId ? String(body.platformExperimentId).trim() : null,
    title: String(body.title || '').trim(),
    aarrrTag: body.aarrrTag,
    owner: String(body.owner || '').trim() || 'unassigned',
    status: normalizeExperimentStatus(body.status, 'before_start'),
    hypothesis: body.hypothesis ? String(body.hypothesis).trim() : null,
    startDate: body.startDate ? String(body.startDate).trim() : null,
    endDate: body.endDate ? String(body.endDate).trim() : null,
    result: normalizeExperimentResult(body.result, '위너 선정 전'),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null
  };

  store.experiments.push(experiment);
  addAuditLog(store, {
    actor: body.actor,
    reason: body.reason,
    action: 'create',
    entityType: 'experiment',
    entityId: experiment.id,
    beforeValue: null,
    afterValue: experiment
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.status(201).json({
    ...experiment,
    status: normalizeExperimentStatus(experiment.status, 'before_start'),
    result: normalizeExperimentResult(experiment.result, '위너 선정 전')
  });
});

app.post('/api/experiments/:experimentId', async (req, res) => {
  const body = { ...(req.body || {}) };
  if (!body.actor || !body.reason) {
    return fail(res, 400, 'Missing required fields: actor, reason');
  }

  if (body.platformExperimentId !== undefined) {
    const platformItem = findExperimentPlatformItem(body.platformExperimentId);
    if (!platformItem) return fail(res, 400, 'invalid platformExperimentId');
    body.title = platformItem.title;
    body.aarrrTag = platformItem.aarrrTag;
    body.owner = platformItem.owner;
    body.status = platformItem.status;
    body.hypothesis = platformItem.hypothesis;
    body.startDate = platformItem.startDate;
    body.endDate = platformItem.endDate;
    body.result = platformItem.result;
  }

  const store = loadStore();
  const target = store.experiments.find((item) => item.id === req.params.experimentId && !item.deletedAt);
  if (!target) return fail(res, 404, 'experiment not found');

  const nextTitle = body.title !== undefined ? String(body.title || '').trim() : String(target.title || '').trim();
  const nextAarrrTag = body.aarrrTag !== undefined ? body.aarrrTag : target.aarrrTag;
  const validationBody = {
    title: nextTitle,
    aarrrTag: nextAarrrTag,
    actor: body.actor,
    reason: body.reason
  };
  const error = validateExperiment(validationBody);
  if (error) return fail(res, 400, error);

  if (body.status !== undefined) {
    const parsedStatus = parseExperimentStatus(body.status);
    if (!parsedStatus) return fail(res, 400, EXPERIMENT_STATUS_HINT);
  }
  if (body.result !== undefined) {
    const parsedResult = parseExperimentResult(body.result);
    if (!parsedResult) return fail(res, 400, EXPERIMENT_RESULT_HINT);
  }

  const before = { ...target };
  if (body.title !== undefined) target.title = nextTitle;
  if (body.platformExperimentId !== undefined) {
    const value = String(body.platformExperimentId || '').trim();
    target.platformExperimentId = value || null;
  }
  if (body.aarrrTag !== undefined) target.aarrrTag = validationBody.aarrrTag;
  if (body.owner !== undefined) target.owner = String(body.owner || '').trim() || 'unassigned';
  if (body.status !== undefined) target.status = normalizeExperimentStatus(body.status, 'before_start');
  if (body.hypothesis !== undefined) {
    const value = String(body.hypothesis || '').trim();
    target.hypothesis = value || null;
  }
  if (body.startDate !== undefined) {
    const value = String(body.startDate || '').trim();
    target.startDate = value || null;
  }
  if (body.endDate !== undefined) {
    const value = String(body.endDate || '').trim();
    target.endDate = value || null;
  }
  if (body.result !== undefined) {
    const parsedResult = parseExperimentResult(body.result);
    if (!parsedResult) return fail(res, 400, EXPERIMENT_RESULT_HINT);
    target.result = parsedResult;
  }
  target.updatedAt = nowIso();

  addAuditLog(store, {
    actor: body.actor,
    reason: body.reason,
    action: 'update',
    entityType: 'experiment',
    entityId: target.id,
    beforeValue: before,
    afterValue: target
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json({
    ...target,
    status: normalizeExperimentStatus(target.status, 'before_start'),
    result: normalizeExperimentResult(target.result, '위너 선정 전')
  });
});

app.delete('/api/experiments/:experimentId', async (req, res) => {
  const store = loadStore();
  const target = store.experiments.find((item) => item.id === req.params.experimentId && !item.deletedAt);
  if (!target) return fail(res, 404, 'experiment not found');

  const actor = String(req.body?.actor || '').trim();
  const reason = String(req.body?.reason || '').trim();
  if (!actor || !reason) return fail(res, 400, 'actor and reason are required');

  if (store.krExperimentLinks.some((item) => item.experimentId === target.id)) {
    return fail(res, 409, 'KR와 연결된 매핑이 있어 Experiment를 삭제할 수 없습니다. KR 매핑을 먼저 해제해 주세요.');
  }
  if (store.initiativeExperimentLinks.some((item) => item.experimentId === target.id)) {
    return fail(res, 409, 'Initiative와 연결된 매핑이 있어 Experiment를 삭제할 수 없습니다. Initiative 매핑을 먼저 해제해 주세요.');
  }

  const before = { ...target };
  target.deletedAt = nowIso();
  target.updatedAt = nowIso();

  addAuditLog(store, {
    actor,
    reason,
    action: 'delete',
    entityType: 'experiment',
    entityId: target.id,
    beforeValue: before,
    afterValue: target
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json({ id: target.id, deleted: true });
});

app.post('/api/experiments/:experimentId/mappings', async (req, res) => {
  const body = req.body || {};
  if (!body.actor || !body.reason) {
    return fail(res, 400, 'Missing required fields: actor, reason');
  }

  const store = loadStore();
  const experiment = store.experiments.find((item) => item.id === req.params.experimentId && !item.deletedAt);
  if (!experiment) return fail(res, 404, 'experiment not found');

  const legacyTargetType = String(body.targetType || '').trim();
  const legacyTargetId = String(body.targetId || '').trim();
  const requestedPairs = [];
  const pushPair = (targetType, targetId) => {
    const normalizedType = String(targetType || '').trim();
    const normalizedId = String(targetId || '').trim();
    if (!normalizedType || !normalizedId) return;
    if (normalizedType === 'kr' || normalizedType === 'initiative') {
      requestedPairs.push({ type: normalizedType, id: normalizedId });
      return;
    }
    throw new Error('targetType must be kr|initiative');
  };

  try {
    normalizeTargetIds(body.krIds, []).forEach((id) => pushPair('kr', id));
    normalizeTargetIds(body.initiativeIds, []).forEach((id) => pushPair('initiative', id));
    if (legacyTargetType && legacyTargetId) {
      pushPair(legacyTargetType, legacyTargetId);
    }
  } catch (error) {
    return fail(res, 400, error.message);
  }

  const uniquePairSet = new Set();
  const uniquePairs = [];
  requestedPairs.forEach((pair) => {
    const key = `${pair.type}:${pair.id}`;
    if (uniquePairSet.has(key)) return;
    uniquePairSet.add(key);
    uniquePairs.push(pair);
  });

  if (uniquePairs.length === 0) {
    return fail(res, 400, 'at least one mapping target is required');
  }
  if (uniquePairs.length > 1) {
    return fail(res, 400, 'only one mapping target is allowed per experiment');
  }

  const requestedTarget = uniquePairs[0];
  if (requestedTarget.type === 'kr') {
    const isValidKr = store.krs.some((item) => item.id === requestedTarget.id && !item.deletedAt);
    if (!isValidKr) return fail(res, 400, `invalid krId: ${requestedTarget.id}`);
  } else {
    const isValidInitiative = store.initiatives.some((item) => item.id === requestedTarget.id && !item.deletedAt);
    if (!isValidInitiative) return fail(res, 400, `invalid initiativeId: ${requestedTarget.id}`);
  }

  const existingKrLinks = store.krExperimentLinks.filter((item) => item.experimentId === experiment.id);
  const existingInitiativeLinks = store.initiativeExperimentLinks.filter((item) => item.experimentId === experiment.id);
  const existingKrMap = new Map(existingKrLinks.map((item) => [item.krId, item]));
  const existingInitiativeMap = new Map(existingInitiativeLinks.map((item) => [item.initiativeId, item]));
  const timestamp = nowIso();
  const parsedWeight = Number(body.weight);
  const hasBodyWeight = Number.isFinite(parsedWeight);

  store.krExperimentLinks = store.krExperimentLinks.filter((item) => item.experimentId !== experiment.id);
  store.initiativeExperimentLinks = store.initiativeExperimentLinks.filter((item) => item.experimentId !== experiment.id);

  if (requestedTarget.type === 'kr') {
    const targetId = requestedTarget.id;
    const existing = existingKrMap.get(targetId);
    const weightValue = hasBodyWeight ? parsedWeight : Number(existing?.weight || 100);
    store.krExperimentLinks.push(
      existing
        ? {
          ...existing,
          weight: weightValue,
          rationale: body.rationale || existing.rationale || null,
          updatedAt: timestamp
        }
        : {
          id: id('link'),
          krId: targetId,
          experimentId: experiment.id,
          weight: weightValue,
          rationale: body.rationale || null,
          createdAt: timestamp,
          updatedAt: timestamp
        }
    );
  } else {
    const targetId = requestedTarget.id;
    const existing = existingInitiativeMap.get(targetId);
    store.initiativeExperimentLinks.push(
      existing
        ? {
          ...existing,
          updatedAt: timestamp
        }
        : {
          id: id('inilink'),
          initiativeId: targetId,
          experimentId: experiment.id,
          createdAt: timestamp,
          updatedAt: timestamp
        }
    );
  }

  addAuditLog(store, {
    actor: body.actor,
    reason: body.reason,
    action: 'replace',
    entityType: 'experiment_mappings',
    entityId: experiment.id,
    beforeValue: {
      krIds: existingKrLinks.map((item) => item.krId),
      initiativeIds: existingInitiativeLinks.map((item) => item.initiativeId),
      targetType: requestedTarget.type,
      targetId: requestedTarget.id
    },
    afterValue: {
      targetType: requestedTarget.type,
      targetId: requestedTarget.id,
      krIds: requestedTarget.type === 'kr' ? [requestedTarget.id] : [],
      initiativeIds: requestedTarget.type === 'initiative' ? [requestedTarget.id] : []
    }
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json({
    experimentId: experiment.id,
    targetType: requestedTarget.type,
    targetId: requestedTarget.id,
    krIds: requestedTarget.type === 'kr' ? [requestedTarget.id] : [],
    initiativeIds: requestedTarget.type === 'initiative' ? [requestedTarget.id] : []
  });
});

app.get('/api/kr-experiment-links', (req, res) => {
  const store = loadStore();
  let list = store.krExperimentLinks;
  if (req.query.krId) {
    list = list.filter((item) => item.krId === req.query.krId);
  }
  res.json(list);
});

app.post('/api/kr-experiment-links', async (req, res) => {
  const body = req.body || {};
  const error = validateKRExperimentLink(body);
  if (error) return fail(res, 400, error);

  const store = loadStore();
  const kr = store.krs.find((item) => item.id === body.krId && !item.deletedAt);
  const experiment = store.experiments.find((item) => item.id === body.experimentId && !item.deletedAt);
  if (!kr) return fail(res, 400, 'krId not found');
  if (!experiment) return fail(res, 400, 'experimentId not found');

  const existingKrLinks = store.krExperimentLinks.filter((item) => item.experimentId === body.experimentId);
  const existingInitiativeLinks = store.initiativeExperimentLinks.filter((item) => item.experimentId === body.experimentId);
  const existing = existingKrLinks.find((item) => item.krId === body.krId);
  const now = nowIso();
  const weightValue = Number.isFinite(Number(body.weight))
    ? Number(body.weight)
    : Number(existing?.weight || 100);

  store.krExperimentLinks = store.krExperimentLinks.filter((item) => item.experimentId !== body.experimentId);
  store.initiativeExperimentLinks = store.initiativeExperimentLinks.filter((item) => item.experimentId !== body.experimentId);

  const link = existing
    ? {
      ...existing,
      weight: weightValue,
      rationale: body.rationale || existing.rationale || null,
      updatedAt: now
    }
    : {
      id: id('link'),
      krId: body.krId,
      experimentId: body.experimentId,
      weight: weightValue,
      rationale: body.rationale || null,
      createdAt: now,
      updatedAt: now
    };

  store.krExperimentLinks.push(link);
  addAuditLog(store, {
    actor: body.actor,
    reason: body.reason,
    action: 'replace',
    entityType: 'experiment_mappings',
    entityId: body.experimentId,
    beforeValue: {
      krIds: existingKrLinks.map((item) => item.krId),
      initiativeIds: existingInitiativeLinks.map((item) => item.initiativeId)
    },
    afterValue: {
      targetType: 'kr',
      targetId: body.krId
    }
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.status(existing ? 200 : 201).json(link);
});

app.get('/api/initiative-experiment-links', (req, res) => {
  const store = loadStore();
  let list = store.initiativeExperimentLinks;
  if (req.query.initiativeId) {
    list = list.filter((item) => item.initiativeId === req.query.initiativeId);
  }
  res.json(list);
});

app.post('/api/initiative-experiment-links', async (req, res) => {
  const body = req.body || {};
  const error = validateInitiativeExperimentLink(body);
  if (error) return fail(res, 400, error);

  const store = loadStore();
  const initiative = store.initiatives.find((item) => item.id === body.initiativeId && !item.deletedAt);
  const experiment = store.experiments.find((item) => item.id === body.experimentId && !item.deletedAt);
  if (!initiative) return fail(res, 400, 'initiativeId not found');
  if (!experiment) return fail(res, 400, 'experimentId not found');

  const existingKrLinks = store.krExperimentLinks.filter((item) => item.experimentId === body.experimentId);
  const existingInitiativeLinks = store.initiativeExperimentLinks.filter((item) => item.experimentId === body.experimentId);
  const existing = existingInitiativeLinks.find((item) => item.initiativeId === body.initiativeId);
  const now = nowIso();

  store.krExperimentLinks = store.krExperimentLinks.filter((item) => item.experimentId !== body.experimentId);
  store.initiativeExperimentLinks = store.initiativeExperimentLinks.filter((item) => item.experimentId !== body.experimentId);

  const link = existing
    ? {
      ...existing,
      updatedAt: now
    }
    : {
      id: id('inilink'),
      initiativeId: body.initiativeId,
      experimentId: body.experimentId,
      createdAt: now,
      updatedAt: now
    };

  store.initiativeExperimentLinks.push(link);
  addAuditLog(store, {
    actor: body.actor,
    reason: body.reason,
    action: 'replace',
    entityType: 'experiment_mappings',
    entityId: body.experimentId,
    beforeValue: {
      krIds: existingKrLinks.map((item) => item.krId),
      initiativeIds: existingInitiativeLinks.map((item) => item.initiativeId)
    },
    afterValue: {
      targetType: 'initiative',
      targetId: body.initiativeId
    }
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.status(existing ? 200 : 201).json(link);
});

app.get('/api/monthly-performances', (req, res) => {
  const store = loadStore();
  let list = [...store.monthlyPerformances];
  if (req.query.targetType) {
    list = list.filter((item) => item.targetType === req.query.targetType);
  }
  if (req.query.targetId) {
    list = list.filter((item) => item.targetId === req.query.targetId);
  }
  if (req.query.sourceType) {
    list = list.filter((item) => item.sourceType === req.query.sourceType);
  }
  res.json(list.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)));
});

app.post('/api/monthly-performances/upsert', async (req, res) => {
  const body = req.body || {};
  const error = validateMonthlyUpsert(body);
  if (error) return fail(res, 400, error);
  const sourceType = body.sourceType || 'manual';

  const store = loadStore();
  const existsTarget =
    (body.targetType === 'objective' && store.objectives.some((item) => item.id === body.targetId && !item.deletedAt)) ||
    (body.targetType === 'kr' && store.krs.some((item) => item.id === body.targetId && !item.deletedAt)) ||
    (body.targetType === 'sub_kr' && store.subKrs.some((item) => item.id === body.targetId && !item.deletedAt)) ||
    (body.targetType === 'initiative' && store.initiatives.some((item) => item.id === body.targetId && !item.deletedAt));

  if (!existsTarget) return fail(res, 400, 'targetId not found for targetType');

  const existing = store.monthlyPerformances.find(
    (item) =>
      item.targetType === body.targetType &&
      item.targetId === body.targetId &&
      item.yearMonth === body.yearMonth
  );

  if (existing) {
    const before = { ...existing };
    existing.actualValue = Number(body.actualValue);
    existing.sourceType = sourceType;
    existing.note = body.note || existing.note || null;
    existing.updatedAt = nowIso();

    addAuditLog(store, {
      actor: body.actor,
      reason: body.reason,
      action: 'upsert:update',
      entityType: 'monthly_performance',
      entityId: existing.id,
      beforeValue: before,
      afterValue: existing
    });

    if (!(await persistStoreOrFail(res, store))) return;
    return res.status(200).json(existing);
  }

  const record = {
    id: id('mp'),
    targetType: body.targetType,
    targetId: body.targetId,
    yearMonth: body.yearMonth,
    actualValue: Number(body.actualValue),
    sourceType,
    note: body.note || null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  store.monthlyPerformances.push(record);
  addAuditLog(store, {
    actor: body.actor,
    reason: body.reason,
    action: 'upsert:create',
    entityType: 'monthly_performance',
    entityId: record.id,
    beforeValue: null,
    afterValue: record
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.status(200).json(record);
});

app.get('/api/dashboard/kr/:krId', (req, res) => {
  const store = loadStore();
  const result = computeKRDashboard(store, req.params.krId);
  if (!result) return fail(res, 404, 'kr not found');
  res.json({
    ...result,
    kr: {
      ...result.kr,
      status: normalizeOkrStatus(result.kr?.status, 'planned')
    },
    contributions: (result.contributions || []).map((item) => ({
      ...item,
      status: normalizeExperimentStatus(item.status, 'before_start')
    }))
  });
});

app.get('/api/dashboard/krs', (req, res) => {
  const store = loadStore();
  const rows = getDashboardRows(store, req.query).map((row) => ({
    id: row.krId,
    title: row.krTitle,
    objectiveId: row.objectiveId,
    objectiveTitle: row.objectiveTitle,
    division: row.division,
    domain: row.domain,
    teamId: row.division,
    half: row.half,
    year: row.year,
    targetValue: row.targetValue,
    signal: row.signal,
    achievement: Number(row.achievement.toFixed(2))
  }));

  res.json(rows);
});

app.get('/api/dashboard/executive', (req, res) => {
  const store = loadStore();
  const rows = getExpandedDashboardRows(store, req.query);
  const experimentTotal = store.experiments.filter((item) => !item.deletedAt).length;
  const achievementPayload = deriveAchievedRatePayload(rows);
  const signalSummary = {
    green: rows.filter((row) => row.signal === 'green').length,
    yellow: rows.filter((row) => row.signal === 'yellow').length,
    red: rows.filter((row) => row.signal === 'red').length
  };
  const summary = {
    objectiveCount: new Set(rows.map((row) => row.objectiveId)).size,
    krCount: rows.filter((row) => row.entityType === 'kr').length,
    subKrCount: rows.filter((row) => row.entityType === 'sub_kr').length,
    initiativeCount: rows.filter((row) => row.entityType === 'initiative').length,
    rowCount: rows.length,
    experimentCount: experimentTotal,
    avgAchievement: achievementPayload.average,
    updateRate: achievementPayload.updatedRate,
    updateCount: achievementPayload.updatedCount,
    signal: signalSummary
  };
  const organizationRows = buildOrganizationStatusRows(rows);
  const topPerformers = buildTopPerformers(rows);
  const experimentWinRate = buildExperimentWinRatePayload(store, rows);
  const notificationPreview = buildDashboardNotificationPreview(store, rows, 6);

  const contributionMap = new Map();
  rows.forEach((row) => {
    const list = row.contributions || [];
    list.forEach((item) => {
      if (!contributionMap.has(item.experimentId)) {
        contributionMap.set(item.experimentId, {
          experimentId: item.experimentId,
          experimentTitle: item.experimentTitle,
          totalContribution: 0
        });
      }
      contributionMap.get(item.experimentId).totalContribution += toNumber(item.contributionScore);
    });
  });

  const topContributors = [...contributionMap.values()]
    .sort((a, b) => b.totalContribution - a.totalContribution)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      totalContribution: Number(item.totalContribution.toFixed(2))
    }));

  const riskKrs = rows
    .filter((row) => row.signal !== 'green')
    .sort((a, b) => {
      const aAchievement = Number.isFinite(a.achievement) ? a.achievement : 0;
      const bAchievement = Number.isFinite(b.achievement) ? b.achievement : 0;
      return aAchievement - bAchievement;
    })
    .slice(0, 6)
    .map((row) => ({
      rowId: row.rowId,
      entityType: row.entityType,
      typeLabel: labelForDashboardEntityType(row.entityType),
      title: row.title,
      objectiveTitle: row.objectiveTitle,
      division: row.division,
      domain: row.domain,
      achievement: Number.isFinite(row.achievement) ? Number(row.achievement.toFixed(2)) : 0,
      signal: row.signal,
      parentKrId: row.krId,
      team: row.team,
      owner: row.owner,
      krId: row.krId || null,
      subKrId: row.subKrId || null,
      initiativeId: row.entityType === 'initiative' ? row.entityId : null,
      progressDelta: Number.isFinite(row.q1Achievement) && Number.isFinite(row.q2Achievement)
        ? Number((row.q2Achievement - row.q1Achievement).toFixed(2))
        : null
    }));

  res.json({
    summary,
    topContributors,
    riskKrs,
    notifications: notificationPreview,
    organizationRows,
    topPerformers,
    experimentWinRate
  });
});

app.get('/api/dashboard/domains', (req, res) => {
  const store = loadStore();
  const rows = getExpandedDashboardRows(store, req.query);
  const grouped = new Map();

  rows.forEach((row) => {
    const domain = row.domain || '미지정';
    if (!grouped.has(domain)) {
      grouped.set(domain, {
        domain,
        divisions: new Set(),
        objectiveIds: new Set(),
        itemCount: 0,
        krCount: 0,
        subKrCount: 0,
        initiativeCount: 0,
        avgAchievement: 0,
        signal: { green: 0, yellow: 0, red: 0 }
      });
    }

    const bucket = grouped.get(domain);
    bucket.itemCount += 1;
    bucket.divisions.add(row.division || '-');
    bucket.objectiveIds.add(row.objectiveId);
    if (row.entityType === 'kr') bucket.krCount += 1;
    if (row.entityType === 'sub_kr') bucket.subKrCount += 1;
    if (row.entityType === 'initiative') bucket.initiativeCount += 1;
    bucket.avgAchievement += row.achievement;
    bucket.signal[row.signal] += 1;
  });

  const result = [...grouped.values()]
    .map((bucket) => ({
      domain: bucket.domain,
      divisionCount: bucket.divisions.size,
      divisions: [...bucket.divisions].sort((a, b) => a.localeCompare(b)),
      objectiveCount: bucket.objectiveIds.size,
      rowCount: bucket.itemCount,
      krCount: bucket.krCount,
      subKrCount: bucket.subKrCount,
      initiativeCount: bucket.initiativeCount,
      avgAchievement: bucket.itemCount > 0 ? Number((bucket.avgAchievement / bucket.itemCount).toFixed(2)) : 0,
      signal: bucket.signal
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain));

  res.json(result);
});

app.get('/api/dashboard/review', (req, res) => {
  const store = loadStore();
  const rows = getExpandedDashboardRows(store, req.query);

  const reviewItems = rows
    .filter((row) => row.signal !== 'green')
    .sort((a, b) => (Number.isFinite(a.achievement) ? a.achievement : 0) - (Number.isFinite(b.achievement) ? b.achievement : 0))
    .slice(0, 10)
    .map((row) => ({
      rowId: row.rowId,
      entityType: row.entityType,
      typeLabel: labelForDashboardEntityType(row.entityType),
      title: row.title,
      objectiveTitle: row.objectiveTitle,
      division: row.division,
      domain: row.domain,
      krId: row.krId || null,
      subKrId: row.subKrId || null,
      initiativeId: row.entityType === 'initiative' ? row.entityId : null,
      achievement: Number.isFinite(row.achievement) ? Number(row.achievement.toFixed(2)) : 0,
      signal: row.signal,
      owner: row.owner || '-',
      topContributor: row.contributions[0] || null,
      linkedExperimentCount: Number(row.linkedExperimentCount || 0),
      linkedExperimentTitle: row.linkedExperimentTitle || '-'
    }));

  const recentAudit = [...store.auditLogs]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 10);

  const pendingExperiments = store.experiments
    .filter((exp) => {
      if (exp.deletedAt) return false;
      const normalized = normalizeExperimentStatus(exp.status, 'before_start');
      return normalized === 'before_start' || normalized === 'in_progress';
    })
    .slice(0, 10)
    .map((item) => ({ ...item, status: normalizeExperimentStatus(item.status, 'before_start') }));

  res.json({
    reviewItems,
    pendingExperiments,
    recentAudit
  });
});

app.get('/api/dashboard/okr-table', (req, res) => {
  const store = loadStore();
  const allRows = buildOKRTableRows(store);
  const filtered = filterOKRTableRows(allRows, req.query);
  const sorted = sortOKRTableRows(filtered, req.query);
  const { rows, pagination } = paginateRows(sorted, req.query);
  const summary = buildTableSummary(filtered);
  res.json({ rows, pagination, summary });
});

app.get('/api/dashboard/okr-table/export.csv', (req, res) => {
  const store = loadStore();
  const allRows = buildOKRTableRows(store);
  const filtered = filterOKRTableRows(allRows, req.query);
  const sorted = sortOKRTableRows(filtered, {
    ...req.query,
    sortBy: req.query.sortBy || 'hierarchy',
    sortOrder: req.query.sortOrder || 'asc'
  });

  const csvPayload = buildOKRTableRowsForCsv(sorted);
  const csvRows = [toCsvLine(csvPayload.headers)];
  csvPayload.body.forEach((row) => {
    csvRows.push(toCsvLine(row));
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="okr-total-table.csv"');
  res.status(200).send(`\uFEFF${csvRows.join('\n')}`);
});

app.get('/api/dashboard/notifications', (req, res) => {
  const store = loadStore();
  const result = buildNotificationListForQuery(store, req.query);
  if (result.error) {
    return fail(res, result.status, result.error);
  }
  res.json(result);
});

app.patch('/api/dashboard/okr-table/:rowId', async (req, res) => {
  const store = loadStore();
  const found = findEntityByRowId(store, req.params.rowId);
  if (!found) return fail(res, 404, 'row not found');

  const actor = req.body?.actor || 'unknown';
  const reason = req.body?.reason || 'table patch';

  const collection = store[found.collectionName];
  const index = collection.findIndex((item) => item.id === found.entityId);
  if (index < 0) return fail(res, 404, 'row not found');

  const before = { ...collection[index] };
  let updated;
  try {
    updated = updateEntityFromTablePatch(found.entityType, collection[index], req.body || {});
  } catch (err) {
    return fail(res, 400, err.message || 'invalid patch');
  }
  collection[index] = updated;

  addAuditLog(store, {
    actor,
    reason,
    action: 'update',
    entityType: found.entityType,
    entityId: found.entityId,
    beforeValue: before,
    afterValue: updated
  });

  if (!(await persistStoreOrFail(res, store))) return;

  const row = buildOKRTableRows(store).find((item) => item.rowId === `${found.entityType}:${found.entityId}`) || null;
  res.json({ row });
});

app.post('/api/dashboard/okr-table/:rowId/monthly-upsert', async (req, res) => {
  const store = loadStore();
  const found = findEntityByRowId(store, req.params.rowId);
  if (!found) return fail(res, 404, 'row not found');

  const month = Number(req.body?.month);
  const value = Number(req.body?.value);
  const sourceType = req.body?.sourceType || 'manual';
  const actor = req.body?.actor || 'unknown';
  const reason = req.body?.reason || 'table monthly upsert';
  if (!Number.isInteger(month) || month < 1 || month > 6) {
    return fail(res, 400, 'month must be 1..6');
  }
  if (!Number.isFinite(value)) {
    return fail(res, 400, 'value must be a number');
  }
  if (!['manual', 'synced', 'calculated'].includes(sourceType)) {
    return fail(res, 400, 'sourceType must be manual|synced|calculated');
  }

  const rows = buildOKRTableRows(store);
  const row = rows.find((item) => item.rowId === `${found.entityType}:${found.entityId}`);
  if (!row) return fail(res, 404, 'row not found');

  const calendarMonth = halfDisplayMonthToCalendarMonth(row.half, month);
  const now = currentUtcYearMonth();
  if (isCalendarMonthInFuture(row.year, calendarMonth, now)) {
    return fail(res, 400, 'yearMonth cannot be in the future');
  }

  const yearMonth = `${row.year}-${String(calendarMonth).padStart(2, '0')}`;
  const targetType = targetTypeFromEntityType(found.entityType);

  const existing = store.monthlyPerformances.find(
    (item) => item.targetType === targetType && item.targetId === found.entityId && item.yearMonth === yearMonth
  );

  if (existing) {
    const before = { ...existing };
    existing.actualValue = value;
    existing.sourceType = sourceType;
    existing.note = req.body?.note || existing.note || null;
    existing.updatedAt = nowIso();

    addAuditLog(store, {
      actor,
      reason,
      action: 'upsert:update',
      entityType: 'monthly_performance',
      entityId: existing.id,
      beforeValue: before,
      afterValue: existing
    });
  } else {
    const created = {
      id: id('mp'),
      targetType,
      targetId: found.entityId,
      yearMonth,
      actualValue: value,
      sourceType,
      note: req.body?.note || null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    store.monthlyPerformances.push(created);
    addAuditLog(store, {
      actor,
      reason,
      action: 'upsert:create',
      entityType: 'monthly_performance',
      entityId: created.id,
      beforeValue: null,
      afterValue: created
    });
  }

  if (!(await persistStoreOrFail(res, store))) return;
  const updatedRow = buildOKRTableRows(store).find((item) => item.rowId === `${found.entityType}:${found.entityId}`) || null;
  res.json({ row: updatedRow });
});

app.get('/api/dashboard/okr-table/:rowId/audit', (req, res) => {
  const store = loadStore();
  const found = findEntityByRowId(store, req.params.rowId);
  if (!found) return fail(res, 404, 'row not found');

  const entityLogs = store.auditLogs
    .filter((log) => log.entityType === found.entityType && log.entityId === found.entityId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const performanceTargetType = targetTypeFromEntityType(found.entityType);
  const performanceIds = new Set(
    store.monthlyPerformances
      .filter((item) => item.targetType === performanceTargetType && item.targetId === found.entityId)
      .map((item) => item.id)
  );

  const performanceLogs = store.auditLogs
    .filter((log) => log.entityType === 'monthly_performance' && performanceIds.has(log.entityId))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const logs = [...entityLogs, ...performanceLogs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  res.json(logs.slice(0, Number(req.query.limit || 100)));
});

app.get('/api/input-sources', (req, res) => {
  const store = loadStore();
  const presetCollections = getPresetCollections(store);
  const krMap = new Map(store.krs.filter((item) => !item.deletedAt).map((item) => [item.id, item]));
  const objectiveMap = new Map(store.objectives.filter((item) => !item.deletedAt).map((item) => [item.id, item]));
  const initiativeMap = new Map(store.initiatives.filter((item) => !item.deletedAt).map((item) => [item.id, item]));

  const rows = (store.inputSources || [])
    .filter((item) => !item.deletedAt)
    .map((item) => {
      const normalized = normalizeInputSourceRecord(item, presetCollections);
      const linkedKr = item.krId ? krMap.get(item.krId) : null;
      const linkedObjective = linkedKr ? objectiveMap.get(linkedKr.objectiveId) : null;
      const linkedInitiative = item.linkedInitiativeId ? initiativeMap.get(item.linkedInitiativeId) : null;
      const priority = normalized.priority;
      const status = normalizeInputSourceStatus(item.status, 'registered');

      return {
        ...normalized,
        status,
        priority,
        linkedKrTitle: linkedKr?.title || '',
        linkedObjectiveTitle: linkedObjective?.title || '',
        linkedInitiativeTitle: linkedInitiative?.title || '',
        linkedInitiativeStatus: linkedInitiative ? normalizeOkrStatus(linkedInitiative.status, 'planned') : ''
      };
    })
    .filter((item) => matchesInputSourceQuery(item, req.query));

  const sorted = sortInputSources(rows, String(req.query.sortBy || 'priority_desc'));
  res.json(sorted);
});

app.post('/api/input-sources', async (req, res) => {
  const body = req.body || {};
  const store = loadStore();
  const presetCollections = ensurePresetCollectionsOnStore(store);
  const error = validateInputSource(body, {
    inputClassifications: presetCollections.inputClassifications,
    inputProducts: presetCollections.inputProducts,
    inputSources: presetCollections.inputSources
  });
  if (error) return fail(res, 400, error);
  const linkedKr = body.krId ? store.krs.find((item) => item.id === body.krId && !item.deletedAt) : null;
  if (body.krId && !linkedKr) return fail(res, 400, 'krId not found');

  const input = {
    id: id('input'),
    title: String(body.title || '').trim(),
    summary: String(body.summary || body.detail || '').trim(),
    detail: String(body.detail || '').trim() || '',
    referenceUrl: String(body.referenceUrl || '').trim() || '',
    division: String(body.division || '').trim(),
    team: String(body.team || '').trim(),
    reporter: String(body.reporter || body.actor || '').trim(),
    product: String(body.product || '').trim(),
    source: String(body.source || '').trim(),
    classification: String(body.classification || '').trim(),
    deployBy: body.deployBy ? String(body.deployBy).trim() : '',
    krId: body.krId ? String(body.krId).trim() : null,
    priority: inputPriorityFromClassification(body.classification),
    status: 'registered',
    workingTeam: null,
    linkedInitiativeId: null,
    rejectionReason: null,
    processedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null
  };

  store.inputSources = Array.isArray(store.inputSources) ? store.inputSources : [];
  store.inputSources.push(input);
  addAuditLog(store, {
    actor: body.actor,
    reason: body.reason,
    action: 'create',
    entityType: 'input_source',
    entityId: input.id,
    beforeValue: null,
    afterValue: input
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.status(201).json(input);
});

app.post('/api/input-sources/:inputSourceId/process', async (req, res) => {
  const body = req.body || {};
  const error = validateInputSourceProcess(body);
  if (error) return fail(res, 400, error);

  const store = loadStore();
  const target = (store.inputSources || []).find((item) => item.id === req.params.inputSourceId && !item.deletedAt);
  if (!target) return fail(res, 404, 'input source not found');

  const before = { ...target };
  const decision = String(body.decision || '').trim();
  target.workingTeam = String(
    body.workingTeam || target.workingTeam || target.team || target.division || ''
  ).trim();
  target.processedAt = nowIso();

  if (decision === 'convert') {
    const targetType = String(body.goalType || '').trim();
    const targetId = String(body.goalId || '').trim();
    const legacyInitiativeId = String(body.initiativeId || '').trim();
    const resolvedType = targetType || (legacyInitiativeId ? 'initiative' : '');
    const resolvedId = targetId || legacyInitiativeId;

    if (!resolvedId) return fail(res, 400, 'goalId not found');
    if (!['kr', 'sub_kr', 'initiative'].includes(resolvedType)) {
      return fail(res, 400, 'goalType must be kr|sub_kr|initiative');
    }

    if (resolvedType === 'kr') {
      const kr = store.krs.find((item) => item.id === resolvedId && !item.deletedAt);
      if (!kr) return fail(res, 400, 'goal target not found');
      target.krId = kr.id;
      target.linkedSubKrId = null;
      target.linkedInitiativeId = null;
    } else if (resolvedType === 'sub_kr') {
      const subKr = store.subKrs.find((item) => item.id === resolvedId && !item.deletedAt);
      if (!subKr) return fail(res, 400, 'goal target not found');
      target.linkedSubKrId = subKr.id;
      target.krId = null;
      target.linkedInitiativeId = null;
    } else {
      const initiative = store.initiatives.find((item) => item.id === resolvedId && !item.deletedAt);
      if (!initiative) return fail(res, 400, 'goal target not found');
      target.krId = null;
      target.linkedSubKrId = null;
      target.linkedInitiativeId = initiative.id;
    }

    target.linkedTargetType = resolvedType;
    target.linkedTargetId = resolvedId;
    target.status = 'converted';
    target.rejectionReason = null;
  } else {
    target.status = 'rejected';
    target.linkedTargetType = null;
    target.linkedTargetId = null;
    target.linkedInitiativeId = null;
    target.linkedSubKrId = null;
    target.krId = null;
    target.rejectionReason = String(body.rejectionReason || '').trim();
  }

  target.updatedAt = nowIso();

  addAuditLog(store, {
    actor: body.actor,
    reason: body.reason,
    action: 'process',
    entityType: 'input_source',
    entityId: target.id,
    beforeValue: before,
    afterValue: target
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json(target);
});

app.delete('/api/input-sources/:inputSourceId', async (req, res) => {
  const store = loadStore();
  const target = (store.inputSources || []).find((item) => item.id === req.params.inputSourceId && !item.deletedAt);
  if (!target) return fail(res, 404, 'input source not found');

  const actor = String(req.body?.actor || '').trim();
  const reason = String(req.body?.reason || '').trim();
  if (!actor || !reason) return fail(res, 400, 'actor and reason are required');

  const before = { ...target };
  target.deletedAt = nowIso();
  target.updatedAt = nowIso();

  addAuditLog(store, {
    actor,
    reason,
    action: 'delete',
    entityType: 'input_source',
    entityId: target.id,
    beforeValue: before,
    afterValue: target
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json({ id: target.id, deleted: true });
});

app.get('/api/input-sources/summary', (req, res) => {
  const store = loadStore();
  const presetCollections = getPresetCollections(store);
  const list = (store.inputSources || [])
    .filter((item) => !item.deletedAt)
    .map((item) => {
      const normalized = normalizeInputSourceRecord(item, presetCollections);
      return {
        ...normalized,
        status: normalizeInputSourceStatus(item.status, 'registered'),
        priority: normalized.priority
      };
    });

  const byStatus = {
    registered: 0,
    converted: 0,
    rejected: 0
  };
  const byPriority = {
    상: 0,
    중: 0,
    하: 0
  };
  const byTeam = {};

  list.forEach((item) => {
    byStatus[item.status] += 1;
    byPriority[item.priority] += 1;

    const teamKey = String(item.workingTeam || item.team || '-');
    if (!byTeam[teamKey]) {
      byTeam[teamKey] = {
        total: 0,
        registered: 0,
        converted: 0,
        rejected: 0
      };
    }
    byTeam[teamKey].total += 1;
    byTeam[teamKey][item.status] += 1;
  });

  const selectedTeam = String(req.query.team || '').trim();
  const myTeam = selectedTeam
    ? {
      team: selectedTeam,
      ...(byTeam[selectedTeam] || { total: 0, registered: 0, converted: 0, rejected: 0 })
    }
    : null;

  res.json({
    total: list.length,
    byStatus,
    byPriority,
    byTeam,
    myTeam
  });
});

app.get('/api/admin/roles', (_req, res) => {
  res.json(ROLE_MATRIX);
});

app.get('/api/admin/notifications', (req, res) => {
  const store = loadStore();
  const result = buildNotificationListForQuery(store, req.query);
  if (result.error) {
    return fail(res, result.status, result.error);
  }

  res.json(result);
});

app.get('/api/admin/presets', (_req, res) => {
  const store = loadStore();
  const presets = getPresetCollections(store);
  if (!ensureRequiredPresets(res, presets)) return;
  res.json({
    ...presets,
    meta: PRESET_FIELD_META
  });
});

app.post('/api/admin/presets', async (req, res) => {
  const body = req.body || {};
  const presetType = parsePresetType(body.presetType);
  if (!presetType) return fail(res, 400, 'presetType is invalid');

  const actor = String(body.actor || '').trim();
  const reason = String(body.reason || '').trim();
  if (!actor || !reason) return fail(res, 400, 'actor and reason are required');

  const value = String(body.value || '').trim();
  if (!value) return fail(res, 400, 'value is required');

  const store = loadStore();
  const presets = ensurePresetCollectionsOnStore(store);
  const division = String(body.division || '').trim();
  if (presetType === 'teams') {
    if (!division) return fail(res, 400, 'division is required for teams');
    if (!presets.divisions.includes(division)) {
      return fail(res, 400, 'division must be one of configured OKR divisions');
    }
  }
  const list = [...(presets[presetType] || [])];
  if (list.includes(value)) return fail(res, 409, 'preset value already exists');

  const before = {
    presetType,
    values: list,
    ...(presetType === 'teams' ? { teamDivisions: { ...(store.presets.teamDivisions || {}) } } : {})
  };
  list.push(value);
  store.presets[presetType] = list;
  if (presetType === 'teams') {
    store.presets.teamDivisions = {
      ...(store.presets.teamDivisions || {}),
      [value]: division
    };
  }
  const after = {
    presetType,
    values: list,
    ...(presetType === 'teams' ? { teamDivisions: store.presets.teamDivisions } : {})
  };

  addAuditLog(store, {
    actor,
    reason,
    action: 'create',
    entityType: 'preset',
    entityId: `${presetType}:${value}`,
    beforeValue: before,
    afterValue: after
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.status(201).json(after);
});

app.post('/api/admin/presets/update', async (req, res) => {
  const body = req.body || {};
  const presetType = parsePresetType(body.presetType);
  if (!presetType) return fail(res, 400, 'presetType is invalid');

  const actor = String(body.actor || '').trim();
  const reason = String(body.reason || '').trim();
  if (!actor || !reason) return fail(res, 400, 'actor and reason are required');

  const currentValue = String(body.currentValue || '').trim();
  const nextValue = String(body.nextValue || '').trim();
  if (!currentValue || !nextValue) return fail(res, 400, 'currentValue and nextValue are required');

  const store = loadStore();
  const presets = ensurePresetCollectionsOnStore(store);
  const division = String(body.division || '').trim();
  if (presetType === 'teams') {
    if (!division) return fail(res, 400, 'division is required for teams');
    if (!presets.divisions.includes(division)) {
      return fail(res, 400, 'division must be one of configured OKR divisions');
    }
  }
  const list = [...(presets[presetType] || [])];
  const currentIndex = list.indexOf(currentValue);
  if (currentIndex < 0) return fail(res, 404, 'preset value not found');
  if (currentValue !== nextValue && list.includes(nextValue)) return fail(res, 409, 'nextValue already exists');

  const beforeTeamDivisions = { ...(store.presets.teamDivisions || {}) };
  const before = {
    presetType,
    values: list,
    ...(presetType === 'teams' || presetType === 'divisions' ? { teamDivisions: beforeTeamDivisions } : {})
  };
  list[currentIndex] = nextValue;
  store.presets[presetType] = normalizeStringList(list);
  if (presetType === 'teams') {
    const nextTeamDivisions = { ...(store.presets.teamDivisions || {}) };
    delete nextTeamDivisions[currentValue];
    nextTeamDivisions[nextValue] = division;
    store.presets.teamDivisions = nextTeamDivisions;
  } else if (presetType === 'divisions') {
    const nextTeamDivisions = { ...(store.presets.teamDivisions || {}) };
    Object.entries(nextTeamDivisions).forEach(([teamName, divisionName]) => {
      if (String(divisionName || '').trim() === currentValue) {
        nextTeamDivisions[teamName] = nextValue;
      }
    });
    store.presets.teamDivisions = nextTeamDivisions;
  }
  const after = { presetType, values: store.presets[presetType] };
  if (presetType === 'teams' || presetType === 'divisions') {
    after.teamDivisions = store.presets.teamDivisions;
  }

  addAuditLog(store, {
    actor,
    reason,
    action: 'update',
    entityType: 'preset',
    entityId: `${presetType}:${currentValue}`,
    beforeValue: before,
    afterValue: after
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json(after);
});

app.post('/api/admin/presets/delete', async (req, res) => {
  const body = req.body || {};
  const presetType = parsePresetType(body.presetType);
  if (!presetType) return fail(res, 400, 'presetType is invalid');

  const actor = String(body.actor || '').trim();
  const reason = String(body.reason || '').trim();
  if (!actor || !reason) return fail(res, 400, 'actor and reason are required');

  const value = String(body.value || '').trim();
  if (!value) return fail(res, 400, 'value is required');

  const store = loadStore();
  const presets = ensurePresetCollectionsOnStore(store);
  const list = [...(presets[presetType] || [])];
  const targetIndex = list.indexOf(value);
  if (targetIndex < 0) return fail(res, 404, 'preset value not found');

  const minCount = PRESET_FIELD_META[presetType]?.minCount ?? 0;
  if (list.length <= minCount) {
    return fail(res, 400, `at least ${minCount} value(s) required for ${presetType}`);
  }

  const beforeTeamDivisions = { ...(store.presets.teamDivisions || {}) };
  const before = {
    presetType,
    values: list,
    ...(presetType === 'teams' || presetType === 'divisions' ? { teamDivisions: beforeTeamDivisions } : {})
  };
  list.splice(targetIndex, 1);
  store.presets[presetType] = list;
  if (presetType === 'teams') {
    const nextTeamDivisions = { ...(store.presets.teamDivisions || {}) };
    delete nextTeamDivisions[value];
    store.presets.teamDivisions = nextTeamDivisions;
  } else if (presetType === 'divisions') {
    const nextTeamDivisions = { ...(store.presets.teamDivisions || {}) };
    Object.entries(nextTeamDivisions).forEach(([teamName, divisionName]) => {
      if (String(divisionName || '').trim() === value) {
        delete nextTeamDivisions[teamName];
      }
    });
    store.presets.teamDivisions = nextTeamDivisions;
  }
  const after = { presetType, values: list };
  if (presetType === 'teams' || presetType === 'divisions') {
    after.teamDivisions = store.presets.teamDivisions;
  }

  addAuditLog(store, {
    actor,
    reason,
    action: 'delete',
    entityType: 'preset',
    entityId: `${presetType}:${value}`,
    beforeValue: before,
    afterValue: after
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.json(after);
});

app.get('/api/admin/org-master', (_req, res) => {
  const store = loadStore();
  const presetCollections = getPresetCollections(store);
  const divisionRows = objectiveTeamRows(store, presetCollections);
  res.json({
    divisions: divisionRows,
    teams: divisionRows,
    domains: presetCollections.domains,
    aarrrStages: AARRR_STAGES,
    totalObjectives: store.objectives.filter((obj) => !obj.deletedAt).length
  });
});

app.get('/api/admin/taxonomy', (_req, res) => {
  const store = loadStore();
  const taxonomy = buildTaxonomyPayload(store);
  if (!ensureRequiredPresets(res, taxonomy)) return;
  res.json(taxonomy);
});

app.get('/api/master-options', (_req, res) => {
  const store = loadStore();
  const taxonomy = buildTaxonomyPayload(store);
  if (!ensureRequiredPresets(res, taxonomy)) return;
  res.json(taxonomy);
});

app.get('/api/audit-logs', (req, res) => {
  const store = loadStore();
  let list = [...store.auditLogs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  if (req.query.entityType) {
    list = list.filter((item) => item.entityType === req.query.entityType);
  }
  if (req.query.entityId) {
    list = list.filter((item) => item.entityId === req.query.entityId);
  }

  const limit = Number(req.query.limit || 100);
  res.json(list.slice(0, limit));
});

app.get('/api/decision-logs', (_req, res) => {
  const store = loadStore();
  const list = [...store.decisionLogs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  res.json(list);
});

app.post('/api/decision-logs', async (req, res) => {
  const body = req.body || {};
  const error = validateDecisionLog(body);
  if (error) return fail(res, 400, error);

  const store = loadStore();
  const log = {
    id: id('decision'),
    title: body.title,
    context: body.context,
    decision: body.decision,
    actor: body.actor,
    timestamp: nowIso()
  };

  store.decisionLogs.push(log);
  addAuditLog(store, {
    actor: body.actor,
    reason: body.title,
    action: 'create',
    entityType: 'decision_log',
    entityId: log.id,
    beforeValue: null,
    afterValue: log
  });

  if (!(await persistStoreOrFail(res, store))) return;
  res.status(201).json(log);
});

app.get('/api/integrations/status', (req, res) => {
  const key = req.query.key;
  const list = key ? INTEGRATION_STATUS.filter((item) => item.key === key) : INTEGRATION_STATUS;
  res.json(list);
});

app.get('/api/search', (req, res) => {
  const store = loadStore();
  const query = String(req.query.q || '').trim().toLowerCase();
  if (!query) {
    return res.json({ objectives: [], krs: [], experiments: [], initiatives: [] });
  }

  const includesQuery = (value) => String(value || '').toLowerCase().includes(query);

  const objectives = store.objectives
    .filter(
      (item) =>
        !item.deletedAt &&
        (includesQuery(item.title) ||
          includesQuery(item.division || item.teamId) ||
          includesQuery(item.domain) ||
          includesQuery(item.owner))
    )
    .slice(0, 10);

  const krs = store.krs
    .filter(
      (item) =>
        !item.deletedAt &&
        (includesQuery(item.title) ||
          includesQuery(item.unit) ||
          includesQuery(item.owner) ||
          includesQuery(normalizeOkrStatus(item.status, 'planned')))
    )
    .slice(0, 10);

  const experiments = store.experiments
    .filter(
      (item) =>
        !item.deletedAt &&
        (includesQuery(item.title) ||
          includesQuery(item.aarrrTag) ||
          includesQuery(item.owner) ||
          includesQuery(normalizeExperimentStatus(item.status, 'before_start')) ||
          includesQuery(normalizeExperimentResult(item.result, '위너 선정 전')))
    )
    .slice(0, 10)
    .map((item) => ({
      ...item,
      status: normalizeExperimentStatus(item.status, 'before_start'),
      result: normalizeExperimentResult(item.result, '위너 선정 전')
    }));

  const initiatives = store.initiatives
    .filter(
      (item) =>
        !item.deletedAt &&
        (includesQuery(item.title) ||
          includesQuery(item.owner) ||
          includesQuery(normalizeOkrStatus(item.status, 'planned')))
    )
    .slice(0, 10);

  res.json({ objectives, krs, experiments, initiatives });
});

app.use('/api', (_req, res) => {
  fail(res, 404, 'api route not found');
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const bootstrapReady = bootstrapStore().catch((error) => {
  console.error('[bootstrap] async init failed:', error.message);
  throw error;
});

if (require.main === module) {
  bootstrapReady
    .then(() => {
      app.listen(port, () => {
        console.log(`OKR dashboard prototype server listening on port ${port}`);
        console.log('Supabase sync: enabled');
      });
    })
    .catch((error) => {
      console.error('[bootstrap] failed:', error.message);
      process.exit(1);
    });
}

module.exports = app;
module.exports.bootstrapReady = bootstrapReady;
module.exports.bootstrapStore = bootstrapStore;
