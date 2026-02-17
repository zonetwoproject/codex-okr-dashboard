const path = require('path');
const { readStore, writeStore } = require('../src/store');

const dataFile = process.env.DATA_FILE || path.join(__dirname, '../data/store.json');
const VALID_CLASSIFICATION = new Set(['Problem', 'Opportunity', 'Needs']);
const VALID_PRODUCT = new Set(['Food', 'QC', 'Order', 'Core', 'Membership', 'Delivery', 'CS']);
const VALID_SOURCE = new Set([
  'NPS',
  'VOC',
  'Team',
  'Internal Stakeholders',
  'DH-TOP Experiments/Playbook',
  'DH-Subscription Recommended Feature List',
  'DH-Key Feature List',
  'DH-etc'
]);

function normalizeClassification(value, legacyPriority) {
  const raw = String(value?.classification || value || '').trim();
  if (VALID_CLASSIFICATION.has(raw)) return raw;
  if (legacyPriority === '상') return 'Problem';
  if (legacyPriority === '중') return 'Opportunity';
  if (legacyPriority === '하') return 'Needs';
  const source = value || {};
  const reach = Number.isFinite(Number(source.reach)) ? Number(source.reach) : NaN;
  const impact = Number.isFinite(Number(source.impact)) ? Number(source.impact) : NaN;
  const confidence = Number.isFinite(Number(source.confidence)) ? Number(source.confidence) : NaN;
  const effort = Number.isFinite(Number(source.effort)) ? Number(source.effort) : NaN;
  if (![reach, impact, confidence, effort].every(Number.isFinite)) return 'Needs';
  const rice = (reach * impact * confidence) / Math.max(1, effort);
  if (rice >= 9) return 'Problem';
  if (rice >= 5) return 'Opportunity';
  return 'Needs';
}

function normalizeProduct(value, domain) {
  const raw = String(value || '').trim();
  if (VALID_PRODUCT.has(raw)) return raw;
  const mapped = String(domain || '').trim();
  if (mapped === 'Food') return 'Food';
  if (mapped === 'QC') return 'QC';
  if (mapped === 'Order') return 'Order';
  if (mapped === 'Core') return 'Core';
  if (mapped === 'Membership') return 'Membership';
  if (mapped === 'Delivery') return 'Delivery';
  if (mapped === 'CS') return 'CS';
  if (mapped === 'Partner') return 'Core';
  if (mapped === 'Food + QC') return 'Food';
  if (mapped === 'Rider') return 'Delivery';
  return 'Core';
}

function normalizeSource(value) {
  const raw = String(value || '').trim();
  return VALID_SOURCE.has(raw) ? raw : 'Team';
}

function run() {
  const store = readStore(dataFile);
  let changedRows = 0;
  let removedLegacyFields = 0;

  const list = Array.isArray(store.inputSources) ? store.inputSources : [];
  const normalized = list.map((item) => {
    const next = {
      ...item,
      classification: normalizeClassification(item, item.priority),
      product: normalizeProduct(item.product, item.domain),
      source: normalizeSource(item.source)
    };

    next.priority = next.classification === 'Problem' ? '상' : next.classification === 'Opportunity' ? '중' : '하';
    next.detail = item.detail || item.summary || '';
    next.summary = item.summary || item.detail || '';
    next.deployBy = item.deployBy || '';
    next.reporter = item.reporter || item.actor || 'unknown';
    next.team = item.team || '';

    ['reach', 'impact', 'confidence', 'effort', 'riceScore'].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(next, key)) {
        delete next[key];
        removedLegacyFields += 1;
      }
    });

    if (
      next.classification !== item.classification ||
      next.product !== item.product ||
      next.source !== item.source ||
      next.priority !== (item.priority || '') ||
      !item.reporter
    ) {
      changedRows += 1;
    }

    return next;
  });

  store.inputSources = normalized;
  writeStore(dataFile, store);
  console.log(`migrate-normalize-input-sources: normalized ${changedRows} input source rows`);
  console.log(`migrate-normalize-input-sources: removed legacy fields ${removedLegacyFields}`);
  console.log(`data file: ${dataFile}`);
}

run();
