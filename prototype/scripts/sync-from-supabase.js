const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { writeStore, DEFAULT_PRESETS } = require('../src/store');

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

async function fetchAll(table, orderBy = 'id') {
  const pageSize = 1000;
  let from = 0;
  let all = [];

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table} fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

function toIso(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function toDateString(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (!text) return '';
  return text.slice(0, 10);
}

function mapObjectives(rows) {
  return rows.map((x) => ({
    id: x.id,
    half: x.half,
    year: Number(x.year),
    title: x.title,
    definition: x.definition,
    division: x.division,
    domain: x.domain,
    teamId: x.team_id,
    team: x.team || '',
    aarrrTag: x.aarrr_tag || '-',
    baseline: x.baseline,
    q1Target: x.q1_target,
    q2Target: x.q2_target,
    owner: x.owner,
    status: x.status,
    startDate: toDateString(x.start_date),
    endDate: toDateString(x.end_date),
    classificationOverride: x.classification_override,
    createdAt: toIso(x.created_at),
    updatedAt: toIso(x.updated_at),
    deletedAt: toIso(x.deleted_at)
  }));
}

function mapKrs(rows) {
  return rows.map((x) => ({
    id: x.id,
    objectiveId: x.objective_id,
    title: x.title,
    definition: x.definition,
    unit: x.unit,
    targetValue: Number(x.target_value),
    baseline: x.baseline,
    q1Target: x.q1_target,
    q2Target: x.q2_target,
    ownerScope: x.owner_scope,
    division: x.division,
    team: x.team || '',
    domain: x.domain,
    aarrrTag: x.aarrr_tag || '-',
    owner: x.owner,
    status: x.status,
    startDate: toDateString(x.start_date),
    endDate: toDateString(x.end_date),
    classificationOverride: x.classification_override,
    createdAt: toIso(x.created_at),
    updatedAt: toIso(x.updated_at),
    deletedAt: toIso(x.deleted_at)
  }));
}

function mapSubKrs(rows) {
  return rows.map((x) => ({
    id: x.id,
    krId: x.kr_id,
    title: x.title,
    definition: x.definition,
    targetValue: Number(x.target_value),
    baseline: x.baseline,
    q1Target: x.q1_target,
    q2Target: x.q2_target,
    ownerScope: x.owner_scope,
    division: x.division,
    team: x.team || '',
    domain: x.domain,
    aarrrTag: x.aarrr_tag || '-',
    owner: x.owner,
    status: x.status,
    startDate: toDateString(x.start_date),
    endDate: toDateString(x.end_date),
    classificationOverride: x.classification_override,
    createdAt: toIso(x.created_at),
    updatedAt: toIso(x.updated_at),
    deletedAt: toIso(x.deleted_at)
  }));
}

function mapInitiatives(rows) {
  return rows.map((x) => ({
    id: x.id,
    objectiveId: x.objective_id,
    krId: x.kr_id,
    subKrId: x.sub_kr_id,
    title: x.title,
    definition: x.definition,
    progressQuant: x.progress_quant,
    baseline: x.baseline,
    q1Target: x.q1_target,
    q2Target: x.q2_target,
    division: x.division,
    team: x.team || '',
    domain: x.domain,
    aarrrTag: x.aarrr_tag || '-',
    owner: x.owner,
    status: x.status,
    startDate: toDateString(x.start_date),
    endDate: toDateString(x.end_date),
    classificationOverride: x.classification_override,
    createdAt: toIso(x.created_at),
    updatedAt: toIso(x.updated_at),
    deletedAt: toIso(x.deleted_at)
  }));
}

function mapExperiments(rows) {
  return rows.map((x) => ({
    id: x.id,
    platformExperimentId: x.platform_experiment_id,
    title: x.title,
    aarrrTag: x.aarrr_tag || '-',
    owner: x.owner,
    status: x.status,
    hypothesis: x.hypothesis,
    startDate: toDateString(x.start_date),
    endDate: toDateString(x.end_date),
    result: x.result || '위너 선정 전',
    createdAt: toIso(x.created_at),
    updatedAt: toIso(x.updated_at),
    deletedAt: toIso(x.deleted_at)
  }));
}

function mapKrExperimentLinks(rows) {
  return rows.map((x) => ({
    id: x.id,
    krId: x.kr_id,
    experimentId: x.experiment_id,
    weight: x.weight,
    rationale: x.rationale,
    createdAt: toIso(x.created_at),
    updatedAt: toIso(x.updated_at)
  }));
}

function mapInitiativeExperimentLinks(rows) {
  return rows.map((x) => ({
    id: x.id,
    initiativeId: x.initiative_id,
    experimentId: x.experiment_id,
    createdAt: toIso(x.created_at),
    updatedAt: toIso(x.updated_at)
  }));
}

function mapInputSources(rows) {
  return rows.map((x) => ({
    id: x.id,
    title: x.title,
    summary: x.summary,
    detail: x.detail,
    referenceUrl: x.reference_url,
    division: x.division,
    team: x.team || '',
    reporter: x.reporter,
    classification: x.classification,
    product: x.product,
    source: x.source,
    domain: x.domain,
    krId: x.kr_id,
    linkedInitiativeId: x.linked_initiative_id,
    priority: x.priority,
    status: x.status,
    workingTeam: x.working_team || '',
    rejectionReason: x.rejection_reason,
    processedAt: toIso(x.processed_at),
    deployBy: toDateString(x.deploy_by),
    createdAt: toIso(x.created_at),
    updatedAt: toIso(x.updated_at),
    deletedAt: toIso(x.deleted_at)
  }));
}

function mapMonthlyPerformances(rows) {
  return rows.map((x) => ({
    id: x.id,
    targetType: x.target_type,
    targetId: x.target_id,
    yearMonth: x.year_month,
    actualValue: Number(x.actual_value),
    sourceType: x.source_type,
    note: x.note,
    createdAt: toIso(x.created_at),
    updatedAt: toIso(x.updated_at)
  }));
}

function mapDecisionLogs(rows) {
  return rows.map((x) => ({
    id: x.id,
    title: x.title,
    context: x.context,
    decision: x.decision,
    actor: x.actor,
    timestamp: toIso(x.timestamp)
  }));
}

function mapAuditLogs(rows) {
  return rows.map((x) => ({
    id: x.id,
    actor: x.actor,
    reason: x.reason,
    action: x.action,
    entityType: x.entity_type,
    entityId: x.entity_id,
    beforeValue: x.before_value,
    afterValue: x.after_value,
    timestamp: toIso(x.timestamp)
  }));
}

function buildPresetObject(presetRows, teamDivisionRows) {
  const grouped = {
    divisions: [],
    domains: [],
    teams: [],
    inputClassifications: [],
    inputProducts: [],
    inputSources: []
  };

  presetRows
    .sort((a, b) => a.preset_type.localeCompare(b.preset_type) || a.position - b.position)
    .forEach((row) => {
      if (Array.isArray(grouped[row.preset_type])) {
        grouped[row.preset_type].push(row.value);
      }
    });

  const teamDivisions = {};
  teamDivisionRows.forEach((row) => {
    teamDivisions[row.team] = row.division;
  });

  return {
    ...DEFAULT_PRESETS,
    ...grouped,
    teamDivisions
  };
}

async function run() {
  const [
    objectives,
    krs,
    subKrs,
    initiatives,
    experiments,
    krExperimentLinks,
    initiativeExperimentLinks,
    inputSources,
    monthlyPerformances,
    decisionLogs,
    auditLogs,
    presetValues,
    presetTeamDivisions
  ] = await Promise.all([
    fetchAll('objectives'),
    fetchAll('krs'),
    fetchAll('sub_krs'),
    fetchAll('initiatives'),
    fetchAll('experiments'),
    fetchAll('kr_experiment_links'),
    fetchAll('initiative_experiment_links'),
    fetchAll('input_sources'),
    fetchAll('monthly_performances'),
    fetchAll('decision_logs'),
    fetchAll('audit_logs'),
    fetchAll('preset_values', 'position'),
    fetchAll('preset_team_divisions', 'team')
  ]);

  const store = {
    objectives: mapObjectives(objectives),
    krs: mapKrs(krs),
    subKrs: mapSubKrs(subKrs),
    initiatives: mapInitiatives(initiatives),
    experiments: mapExperiments(experiments),
    krExperimentLinks: mapKrExperimentLinks(krExperimentLinks),
    initiativeExperimentLinks: mapInitiativeExperimentLinks(initiativeExperimentLinks),
    inputSources: mapInputSources(inputSources),
    monthlyPerformances: mapMonthlyPerformances(monthlyPerformances),
    decisionLogs: mapDecisionLogs(decisionLogs),
    auditLogs: mapAuditLogs(auditLogs),
    presets: buildPresetObject(presetValues, presetTeamDivisions)
  };

  writeStore(dataFile, store);
  console.log(`Wrote ${dataFile}`);
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
