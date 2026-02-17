const path = require('path');
const { readStore, writeStore } = require('../src/store');

const dataFile = process.env.DATA_FILE || path.join(__dirname, '../data/store.json');
const RESULT_VALUES = new Set(['대조군(A) 위너 선정', '실험군(B) 위너 선정', '위너 선정 전']);

function normalizeExperimentResult(value, status) {
  const raw = String(value ?? '').trim();
  if (RESULT_VALUES.has(raw)) return raw;

  if (raw.includes('대조군') && raw.includes('위너') && raw.includes('선정')) {
    return '대조군(A) 위너 선정';
  }
  if (raw.includes('실험군') && raw.includes('위너') && raw.includes('선정')) {
    return '실험군(B) 위너 선정';
  }
  if (raw.includes('위너') && (raw.includes('선정 전') || raw.includes('선전 전'))) {
    return '위너 선정 전';
  }
  if (raw.includes('준비') || raw.includes('중간') || raw.includes('폐기') || raw.includes('대기')) {
    return '위너 선정 전';
  }

  const normalizedStatus = String(status ?? '').trim().toLowerCase();
  if (normalizedStatus === 'winner_selected' || normalizedStatus === 'ended') {
    return '실험군(B) 위너 선정';
  }
  return '위너 선정 전';
}

function run() {
  const store = readStore(dataFile);
  const experiments = Array.isArray(store.experiments) ? store.experiments : [];
  const auditLogs = Array.isArray(store.auditLogs) ? store.auditLogs : [];

  let experimentChanged = 0;
  experiments.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const prev = item.result;
    const next = normalizeExperimentResult(item.result, item.status);
    if (prev !== next) {
      item.result = next;
      experimentChanged += 1;
    }
  });

  let auditChanged = 0;
  auditLogs.forEach((log) => {
    if (!log || log.entityType !== 'experiment') return;
    ['beforeValue', 'afterValue'].forEach((key) => {
      const snapshot = log[key];
      if (!snapshot || typeof snapshot !== 'object') return;
      const prev = snapshot.result;
      const next = normalizeExperimentResult(snapshot.result, snapshot.status);
      if (prev !== next) {
        snapshot.result = next;
        auditChanged += 1;
      }
    });
  });

  writeStore(dataFile, store);

  console.log(`migrate-experiment-result-enum: updated ${experimentChanged} experiments, ${auditChanged} audit snapshots`);
  console.log(`data file: ${dataFile}`);
}

run();
