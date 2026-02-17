const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_PRESETS = {
  divisions: [
    '푸드프로덕트실',
    '신규성장추진실',
    '커머스고객확장프로덕트실',
    '커머스거래성장프로덕트실',
    '오더프로덕트실',
    '그로스프로덕트실',
    '결제정산프로덕트실',
    '파트너프로덕트실',
    '배민상회실',
    '파트너성장서비스실',
    '코어프로덕트실',
    '딜리버리서비스실',
    'DF서비스실',
    '중계플랫폼실'
  ],
  domains: ['Food', 'QC', 'Food + QC', 'Partner', 'Delivery', 'Rider'],
  teams: [],
  teamDivisions: {},
  inputClassifications: ['Problem', 'Opportunity', 'Needs'],
  inputProducts: ['Food', 'QC', 'Order', 'Core', 'Membership', 'Delivery', 'CS'],
  inputSources: [
    'NPS',
    'VOC',
    'Team',
    'Internal Stakeholders',
    'DH-TOP Experiments/Playbook',
    'DH-Subscription Recommended Feature List',
    'DH-Key Feature List',
    'DH-etc'
  ]
};

const DEFAULT_STORE = {
  objectives: [],
  krs: [],
  subKrs: [],
  initiatives: [],
  experiments: [],
  krExperimentLinks: [],
  initiativeExperimentLinks: [],
  inputSources: [],
  monthlyPerformances: [],
  decisionLogs: [],
  auditLogs: [],
  presets: DEFAULT_PRESETS
};

function normalizeStringList(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  const seen = new Set();
  const normalized = [];
  source.forEach((item) => {
    const text = String(item || '').trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    normalized.push(text);
  });
  return normalized;
}

function normalizePresets(rawPresets) {
  const source = rawPresets && typeof rawPresets === 'object' ? rawPresets : {};
  const rawTeamDivisions = source.teamDivisions && typeof source.teamDivisions === 'object'
    ? source.teamDivisions
    : {};
  const teamDivisions = {};
  Object.entries(rawTeamDivisions).forEach(([team, division]) => {
    const teamText = String(team || '').trim();
    const divisionText = String(division || '').trim();
    if (!teamText || !divisionText) return;
    teamDivisions[teamText] = divisionText;
  });
  return {
    divisions: normalizeStringList(source.divisions, DEFAULT_PRESETS.divisions),
    domains: normalizeStringList(source.domains, DEFAULT_PRESETS.domains),
    teams: normalizeStringList(source.teams, DEFAULT_PRESETS.teams),
    teamDivisions,
    inputClassifications: normalizeStringList(source.inputClassifications, DEFAULT_PRESETS.inputClassifications),
    inputProducts: normalizeStringList(source.inputProducts, DEFAULT_PRESETS.inputProducts),
    inputSources: normalizeStringList(source.inputSources, DEFAULT_PRESETS.inputSources)
  };
}

function ensureStore(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_STORE, null, 2));
  }
}

function normalizeStore(rawStore) {
  const normalized = { ...DEFAULT_STORE, ...(rawStore || {}) };
  Object.keys(DEFAULT_STORE).forEach((key) => {
    const defaultValue = DEFAULT_STORE[key];
    if (Array.isArray(defaultValue)) {
      if (!Array.isArray(normalized[key])) {
        normalized[key] = [];
      }
      return;
    }
    if (key === 'presets') {
      normalized[key] = normalizePresets(normalized[key]);
    }
  });
  return normalized;
}

function readStore(filePath) {
  ensureStore(filePath);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return normalizeStore(JSON.parse(raw));
}

function writeStore(filePath, store) {
  ensureStore(filePath);
  fs.writeFileSync(filePath, JSON.stringify(normalizeStore(store), null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function addAuditLog(store, { actor, reason, action, entityType, entityId, beforeValue, afterValue }) {
  if (!Array.isArray(store.auditLogs)) {
    store.auditLogs = [];
  }
  store.auditLogs.push({
    id: id('audit'),
    actor,
    reason,
    action,
    entityType,
    entityId,
    beforeValue: beforeValue ?? null,
    afterValue: afterValue ?? null,
    timestamp: nowIso()
  });
}

function signalFromAchievement(achievement) {
  if (achievement >= 80) return 'green';
  if (achievement >= 50) return 'yellow';
  return 'red';
}

function computeKRDashboard(store, krId) {
  const kr = store.krs.find((item) => item.id === krId && !item.deletedAt);
  if (!kr) {
    return null;
  }

  const monthly = store.monthlyPerformances
    .filter((item) => item.targetType === 'kr' && item.targetId === krId)
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

  const actualSum = monthly.reduce((sum, item) => sum + Number(item.actualValue || 0), 0);
  const targetValue = Number(kr.targetValue || 0);
  const achievement = targetValue > 0 ? Math.min(100, (actualSum / targetValue) * 100) : 0;
  const signal = signalFromAchievement(achievement);

  const links = store.krExperimentLinks.filter((item) => item.krId === krId);
  const weightSum = links.reduce((sum, item) => sum + Number(item.weight || 0), 0);

  const contributions = links
    .map((link) => {
      const experiment = store.experiments.find((exp) => exp.id === link.experimentId);
      const normalizedWeight = weightSum > 0 ? Number(link.weight || 0) / weightSum : 0;
      return {
        experimentId: link.experimentId,
        experimentTitle: experiment ? experiment.title : '(deleted)',
        aarrrTag: experiment ? experiment.aarrrTag : null,
        weight: Number(link.weight || 0),
        normalizedWeight,
        contributionScore: achievement * normalizedWeight,
        status: experiment ? experiment.status : 'unknown'
      };
    })
    .sort((a, b) => b.contributionScore - a.contributionScore);

  return {
    kr: {
      ...kr,
      signal
    },
    progress: {
      actualSum,
      achievement,
      signal
    },
    contributions,
    monthly
  };
}

module.exports = {
  readStore,
  writeStore,
  addAuditLog,
  computeKRDashboard,
  signalFromAchievement,
  id,
  nowIso,
  DEFAULT_PRESETS
};
