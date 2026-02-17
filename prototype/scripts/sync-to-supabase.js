const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { readStore } = require('../src/store');

const dataFile = process.env.DATA_FILE || path.join(__dirname, '../data/store.json');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

function toDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return text.slice(0, 10);
}

function toTs(value) {
  if (!value) return null;
  const text = String(value).trim();
  return text || null;
}

function mapObjectives(rows) {
  return rows.map((x) => ({
    id: x.id,
    half: x.half,
    year: Number(x.year),
    title: x.title,
    definition: x.definition ?? null,
    division: x.division ?? null,
    domain: x.domain ?? null,
    team_id: x.teamId ?? null,
    team: x.team ?? null,
    aarrr_tag: x.aarrrTag ?? null,
    baseline: x.baseline ?? null,
    q1_target: x.q1Target ?? null,
    q2_target: x.q2Target ?? null,
    owner: x.owner ?? null,
    status: x.status ?? null,
    start_date: toDate(x.startDate),
    end_date: toDate(x.endDate),
    classification_override: x.classificationOverride ?? null,
    created_at: toTs(x.createdAt),
    updated_at: toTs(x.updatedAt),
    deleted_at: toTs(x.deletedAt)
  }));
}

function mapKrs(rows) {
  return rows.map((x) => ({
    id: x.id,
    objective_id: x.objectiveId,
    title: x.title,
    definition: x.definition ?? null,
    unit: x.unit ?? null,
    target_value: x.targetValue,
    baseline: x.baseline ?? null,
    q1_target: x.q1Target ?? null,
    q2_target: x.q2Target ?? null,
    owner_scope: x.ownerScope ?? null,
    division: x.division ?? null,
    team: x.team ?? null,
    domain: x.domain ?? null,
    aarrr_tag: x.aarrrTag ?? null,
    owner: x.owner ?? null,
    status: x.status ?? null,
    start_date: toDate(x.startDate),
    end_date: toDate(x.endDate),
    classification_override: x.classificationOverride ?? null,
    created_at: toTs(x.createdAt),
    updated_at: toTs(x.updatedAt),
    deleted_at: toTs(x.deletedAt)
  }));
}

function mapSubKrs(rows) {
  return rows.map((x) => ({
    id: x.id,
    kr_id: x.krId,
    title: x.title,
    definition: x.definition ?? null,
    target_value: x.targetValue,
    baseline: x.baseline ?? null,
    q1_target: x.q1Target ?? null,
    q2_target: x.q2Target ?? null,
    owner_scope: x.ownerScope ?? null,
    division: x.division ?? null,
    team: x.team ?? null,
    domain: x.domain ?? null,
    aarrr_tag: x.aarrrTag ?? null,
    owner: x.owner ?? null,
    status: x.status ?? null,
    start_date: toDate(x.startDate),
    end_date: toDate(x.endDate),
    classification_override: x.classificationOverride ?? null,
    created_at: toTs(x.createdAt),
    updated_at: toTs(x.updatedAt),
    deleted_at: toTs(x.deletedAt)
  }));
}

function mapInitiatives(rows) {
  return rows.map((x) => ({
    id: x.id,
    objective_id: x.objectiveId ?? null,
    kr_id: x.krId ?? null,
    sub_kr_id: x.subKrId ?? null,
    title: x.title,
    definition: x.definition ?? null,
    progress_quant: x.progressQuant ?? null,
    baseline: x.baseline ?? null,
    q1_target: x.q1Target ?? null,
    q2_target: x.q2Target ?? null,
    division: x.division ?? null,
    team: x.team ?? null,
    domain: x.domain ?? null,
    aarrr_tag: x.aarrrTag ?? null,
    owner: x.owner ?? null,
    status: x.status ?? null,
    start_date: toDate(x.startDate),
    end_date: toDate(x.endDate),
    classification_override: x.classificationOverride ?? null,
    created_at: toTs(x.createdAt),
    updated_at: toTs(x.updatedAt),
    deleted_at: toTs(x.deletedAt)
  }));
}

function mapExperiments(rows) {
  return rows.map((x) => ({
    id: x.id,
    platform_experiment_id: x.platformExperimentId ?? null,
    title: x.title,
    aarrr_tag: x.aarrrTag ?? null,
    owner: x.owner ?? null,
    status: x.status ?? null,
    hypothesis: x.hypothesis ?? null,
    start_date: toDate(x.startDate),
    end_date: toDate(x.endDate),
    result: x.result ?? null,
    created_at: toTs(x.createdAt),
    updated_at: toTs(x.updatedAt),
    deleted_at: toTs(x.deletedAt)
  }));
}

function mapKrExperimentLinks(rows) {
  return rows.map((x) => ({
    id: x.id,
    kr_id: x.krId,
    experiment_id: x.experimentId,
    weight: x.weight ?? null,
    rationale: x.rationale ?? null,
    created_at: toTs(x.createdAt),
    updated_at: toTs(x.updatedAt)
  }));
}

function mapInitiativeExperimentLinks(rows) {
  return rows.map((x) => ({
    id: x.id,
    initiative_id: x.initiativeId,
    experiment_id: x.experimentId,
    created_at: toTs(x.createdAt),
    updated_at: toTs(x.updatedAt)
  }));
}

function mapInputSources(rows) {
  return rows.map((x) => ({
    id: x.id,
    title: x.title,
    summary: x.summary ?? null,
    detail: x.detail ?? null,
    reference_url: x.referenceUrl ?? null,
    division: x.division ?? null,
    team: x.team ?? null,
    reporter: x.reporter ?? null,
    classification: x.classification ?? null,
    product: x.product ?? null,
    source: x.source ?? null,
    domain: x.domain ?? null,
    kr_id: x.krId ?? null,
    linked_initiative_id: x.linkedInitiativeId ?? null,
    priority: x.priority ?? null,
    status: x.status ?? null,
    working_team: x.workingTeam ?? null,
    rejection_reason: x.rejectionReason ?? null,
    processed_at: toTs(x.processedAt),
    deploy_by: toDate(x.deployBy),
    created_at: toTs(x.createdAt),
    updated_at: toTs(x.updatedAt),
    deleted_at: toTs(x.deletedAt)
  }));
}

function mapMonthlyPerformances(rows) {
  return rows.map((x) => ({
    id: x.id,
    target_type: x.targetType,
    target_id: x.targetId,
    year_month: x.yearMonth,
    actual_value: x.actualValue,
    source_type: x.sourceType ?? null,
    note: x.note ?? null,
    created_at: toTs(x.createdAt),
    updated_at: toTs(x.updatedAt)
  }));
}

function mapDecisionLogs(rows) {
  return rows.map((x) => ({
    id: x.id,
    title: x.title,
    context: x.context,
    decision: x.decision,
    actor: x.actor,
    timestamp: toTs(x.timestamp)
  }));
}

function mapAuditLogs(rows) {
  return rows.map((x) => ({
    id: x.id,
    actor: x.actor,
    reason: x.reason ?? null,
    action: x.action,
    entity_type: x.entityType ?? null,
    entity_id: x.entityId ?? null,
    before_value: x.beforeValue ?? null,
    after_value: x.afterValue ?? null,
    timestamp: toTs(x.timestamp)
  }));
}

async function removeAll(table) {
  const { error } = await supabase.from(table).delete().not('id', 'is', null);
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
}

async function removeAllByPk(table, pk) {
  const { error } = await supabase.from(table).delete().not(pk, 'is', null);
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
}

async function insertInBatches(table, rows, batchSize = 500) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
  }
}

function buildPresetValues(presets) {
  const listTypes = [
    'divisions',
    'domains',
    'teams',
    'inputClassifications',
    'inputProducts',
    'inputSources'
  ];
  const rows = [];
  listTypes.forEach((presetType) => {
    const values = Array.isArray(presets[presetType]) ? presets[presetType] : [];
    values.forEach((value, position) => {
      rows.push({
        preset_type: presetType,
        value: String(value),
        position
      });
    });
  });
  return rows;
}

function buildTeamDivisionRows(presets) {
  const source = presets && typeof presets.teamDivisions === 'object' ? presets.teamDivisions : {};
  return Object.entries(source)
    .map(([team, division]) => ({
      team: String(team || '').trim(),
      division: String(division || '').trim()
    }))
    .filter((x) => x.team && x.division);
}

async function run() {
  const store = readStore(dataFile);
  const presetRows = buildPresetValues(store.presets || {});
  const teamDivisionRows = buildTeamDivisionRows(store.presets || {});

  await removeAllByPk('preset_team_divisions', 'team');
  await removeAllByPk('preset_values', 'id');
  await removeAll('audit_logs');
  await removeAll('decision_logs');
  await removeAll('monthly_performances');
  await removeAll('input_sources');
  await removeAll('initiative_experiment_links');
  await removeAll('kr_experiment_links');
  await removeAll('experiments');
  await removeAll('initiatives');
  await removeAll('sub_krs');
  await removeAll('krs');
  await removeAll('objectives');

  await insertInBatches('objectives', mapObjectives(store.objectives || []));
  await insertInBatches('krs', mapKrs(store.krs || []));
  await insertInBatches('sub_krs', mapSubKrs(store.subKrs || []));
  await insertInBatches('initiatives', mapInitiatives(store.initiatives || []));
  await insertInBatches('experiments', mapExperiments(store.experiments || []));
  await insertInBatches('kr_experiment_links', mapKrExperimentLinks(store.krExperimentLinks || []));
  await insertInBatches('initiative_experiment_links', mapInitiativeExperimentLinks(store.initiativeExperimentLinks || []));
  await insertInBatches('input_sources', mapInputSources(store.inputSources || []));
  await insertInBatches('monthly_performances', mapMonthlyPerformances(store.monthlyPerformances || []));
  await insertInBatches('decision_logs', mapDecisionLogs(store.decisionLogs || []));
  await insertInBatches('audit_logs', mapAuditLogs(store.auditLogs || []));
  await insertInBatches('preset_values', presetRows);
  await insertInBatches('preset_team_divisions', teamDivisionRows);

  console.log('Supabase sync completed');
  console.log({
    objectives: (store.objectives || []).length,
    krs: (store.krs || []).length,
    subKrs: (store.subKrs || []).length,
    initiatives: (store.initiatives || []).length,
    experiments: (store.experiments || []).length,
    inputSources: (store.inputSources || []).length,
    monthlyPerformances: (store.monthlyPerformances || []).length
  });
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
