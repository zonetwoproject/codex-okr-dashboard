const path = require('path');
const { readStore, writeStore } = require('../src/store');

const dataFile = process.env.DATA_FILE || path.join(__dirname, '../data/store.json');

const OKR_STATUS_MAP = {
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
  홀딩: 'holding',
  in_progress: 'in_progress',
  production_released: 'production_released',
  spec_out: 'spec_out',
  holding: 'holding'
};

const EXP_STATUS_MAP = {
  planned: 'before_start',
  active: 'in_progress',
  running: 'in_progress',
  completed: 'ended',
  시작전: 'before_start',
  진행중: 'in_progress',
  '위너 선정': 'winner_selected',
  종료: 'ended',
  폐기: 'discarded',
  before_start: 'before_start',
  in_progress: 'in_progress',
  winner_selected: 'winner_selected',
  ended: 'ended',
  discarded: 'discarded'
};

function mapStatus(value, map) {
  const raw = String(value ?? '').trim();
  if (!raw) return value;
  const normalized = raw.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(map, raw)) return map[raw];
  if (Object.prototype.hasOwnProperty.call(map, normalized)) return map[normalized];
  return value;
}

function migrateCollection(items, map) {
  if (!Array.isArray(items)) return 0;
  let changed = 0;
  items.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    if (!Object.prototype.hasOwnProperty.call(item, 'status')) return;
    const prev = item.status;
    const next = mapStatus(prev, map);
    if (next !== prev) {
      item.status = next;
      changed += 1;
    }
  });
  return changed;
}

function migrateAuditLogs(auditLogs) {
  if (!Array.isArray(auditLogs)) return 0;
  let changed = 0;

  auditLogs.forEach((log) => {
    if (!log || typeof log !== 'object') return;
    const isOkrEntity = log.entityType === 'kr' || log.entityType === 'sub_kr' || log.entityType === 'initiative';
    const isExperimentEntity = log.entityType === 'experiment';
    if (!isOkrEntity && !isExperimentEntity) return;

    const map = isExperimentEntity ? EXP_STATUS_MAP : OKR_STATUS_MAP;
    ['beforeValue', 'afterValue'].forEach((key) => {
      const value = log[key];
      if (!value || typeof value !== 'object') return;
      if (!Object.prototype.hasOwnProperty.call(value, 'status')) return;
      const prev = value.status;
      const next = mapStatus(prev, map);
      if (next !== prev) {
        value.status = next;
        changed += 1;
      }
    });
  });

  return changed;
}

function run() {
  const store = readStore(dataFile);

  const changedKrs = migrateCollection(store.krs, OKR_STATUS_MAP);
  const changedSubKrs = migrateCollection(store.subKrs, OKR_STATUS_MAP);
  const changedInitiatives = migrateCollection(store.initiatives, OKR_STATUS_MAP);
  const changedExperiments = migrateCollection(store.experiments, EXP_STATUS_MAP);
  const changedAuditLogs = migrateAuditLogs(store.auditLogs);
  const total = changedKrs + changedSubKrs + changedInitiatives + changedExperiments + changedAuditLogs;

  writeStore(dataFile, store);

  console.log(`migrate-status-enums: updated ${total} rows`);
  console.log(`  - krs: ${changedKrs}`);
  console.log(`  - subKrs: ${changedSubKrs}`);
  console.log(`  - initiatives: ${changedInitiatives}`);
  console.log(`  - experiments: ${changedExperiments}`);
  console.log(`  - audit logs: ${changedAuditLogs}`);
  console.log(`data file: ${dataFile}`);
}

run();
