const { createClient } = require('@supabase/supabase-js');
const { DEFAULT_PRESETS } = require('./store');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(supabaseUrl && supabaseServiceRoleKey);

let supabaseClient = null;

function isEnabled() {
  return enabled;
}

function getClient() {
  if (!enabled) return null;
  if (supabaseClient) return supabaseClient;
  supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });
  return supabaseClient;
}

function baseStore() {
  return {
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

async function fetchAll(table, orderBy = 'id') {
  const client = getClient();
  if (!client) throw new Error('Supabase is not configured');
  const pageSize = 1000;
  let from = 0;
  let all = [];

  while (true) {
    const { data, error } = await client
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

async function removeAll(table) {
  const client = getClient();
  const { error } = await client.from(table).delete().not('id', 'is', null);
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
}

async function removeAllByPk(table, pk) {
  const client = getClient();
  const { error } = await client.from(table).delete().not(pk, 'is', null);
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
}

async function insertInBatches(table, rows, batchSize = 500) {
  if (!rows.length) return;
  const client = getClient();
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await client.from(table).insert(chunk);
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
  }
}

function mapObjectivesFromDb(rows) {
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

function mapKrsFromDb(rows) {
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

function mapSubKrsFromDb(rows) {
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

function mapInitiativesFromDb(rows) {
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

function mapExperimentsFromDb(rows) {
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

function mapKrExperimentLinksFromDb(rows) {
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

function mapInitiativeExperimentLinksFromDb(rows) {
  return rows.map((x) => ({
    id: x.id,
    initiativeId: x.initiative_id,
    experimentId: x.experiment_id,
    createdAt: toIso(x.created_at),
    updatedAt: toIso(x.updated_at)
  }));
}

function mapInputSourcesFromDb(rows) {
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

function mapMonthlyPerformancesFromDb(rows) {
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

function mapDecisionLogsFromDb(rows) {
  return rows.map((x) => ({
    id: x.id,
    title: x.title,
    context: x.context,
    decision: x.decision,
    actor: x.actor,
    timestamp: toIso(x.timestamp)
  }));
}

function mapAuditLogsFromDb(rows) {
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
      if (Array.isArray(grouped[row.preset_type])) grouped[row.preset_type].push(row.value);
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

function mapObjectivesToDb(rows) {
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

function mapKrsToDb(rows) {
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

function mapSubKrsToDb(rows) {
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

function mapInitiativesToDb(rows) {
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

function mapExperimentsToDb(rows) {
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

function mapKrExperimentLinksToDb(rows) {
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

function mapInitiativeExperimentLinksToDb(rows) {
  return rows.map((x) => ({
    id: x.id,
    initiative_id: x.initiativeId,
    experiment_id: x.experimentId,
    created_at: toTs(x.createdAt),
    updated_at: toTs(x.updatedAt)
  }));
}

function mapInputSourcesToDb(rows) {
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

function mapMonthlyPerformancesToDb(rows) {
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

function mapDecisionLogsToDb(rows) {
  return rows.map((x) => ({
    id: x.id,
    title: x.title,
    context: x.context,
    decision: x.decision,
    actor: x.actor,
    timestamp: toTs(x.timestamp)
  }));
}

function mapAuditLogsToDb(rows) {
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

function buildPresetValues(presets) {
  const listTypes = ['divisions', 'domains', 'teams', 'inputClassifications', 'inputProducts', 'inputSources'];
  const rows = [];
  listTypes.forEach((presetType) => {
    const values = Array.isArray(presets[presetType]) ? presets[presetType] : [];
    values.forEach((value, position) => {
      rows.push({ preset_type: presetType, value: String(value), position });
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

async function loadStoreFromSupabase() {
  if (!enabled) return null;

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

  return {
    objectives: mapObjectivesFromDb(objectives),
    krs: mapKrsFromDb(krs),
    subKrs: mapSubKrsFromDb(subKrs),
    initiatives: mapInitiativesFromDb(initiatives),
    experiments: mapExperimentsFromDb(experiments),
    krExperimentLinks: mapKrExperimentLinksFromDb(krExperimentLinks),
    initiativeExperimentLinks: mapInitiativeExperimentLinksFromDb(initiativeExperimentLinks),
    inputSources: mapInputSourcesFromDb(inputSources),
    monthlyPerformances: mapMonthlyPerformancesFromDb(monthlyPerformances),
    decisionLogs: mapDecisionLogsFromDb(decisionLogs),
    auditLogs: mapAuditLogsFromDb(auditLogs),
    presets: buildPresetObject(presetValues, presetTeamDivisions)
  };
}

async function saveStoreToSupabase(store) {
  if (!enabled) return;
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

  await insertInBatches('objectives', mapObjectivesToDb(store.objectives || []));
  await insertInBatches('krs', mapKrsToDb(store.krs || []));
  await insertInBatches('sub_krs', mapSubKrsToDb(store.subKrs || []));
  await insertInBatches('initiatives', mapInitiativesToDb(store.initiatives || []));
  await insertInBatches('experiments', mapExperimentsToDb(store.experiments || []));
  await insertInBatches('kr_experiment_links', mapKrExperimentLinksToDb(store.krExperimentLinks || []));
  await insertInBatches('initiative_experiment_links', mapInitiativeExperimentLinksToDb(store.initiativeExperimentLinks || []));
  await insertInBatches('input_sources', mapInputSourcesToDb(store.inputSources || []));
  await insertInBatches('monthly_performances', mapMonthlyPerformancesToDb(store.monthlyPerformances || []));
  await insertInBatches('decision_logs', mapDecisionLogsToDb(store.decisionLogs || []));
  await insertInBatches('audit_logs', mapAuditLogsToDb(store.auditLogs || []));
  await insertInBatches('preset_values', presetRows);
  await insertInBatches('preset_team_divisions', teamDivisionRows);
}

module.exports = {
  isEnabled,
  baseStore,
  loadStoreFromSupabase,
  saveStoreToSupabase
};
