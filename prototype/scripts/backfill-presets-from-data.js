const { createClient } = require('@supabase/supabase-js');

const PRESET_TYPES = ['divisions', 'domains', 'teams', 'inputClassifications', 'inputProducts', 'inputSources'];
const REQUIRED_PRESET_TYPES = ['domains', 'divisions', 'inputClassifications', 'inputProducts', 'inputSources'];

function normalizeText(value) {
  return String(value || '').trim();
}

function mergeOrdered(existing = [], derived = []) {
  const seen = new Set();
  const merged = [];
  [...existing, ...derived].forEach((value) => {
    const text = normalizeText(value);
    if (!text || seen.has(text)) return;
    seen.add(text);
    merged.push(text);
  });
  return merged;
}

async function fetchAll(client, table, orderBy = 'id') {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .order(orderBy, { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table} fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

function collectDerivedPresetValues(rowsByTable) {
  const derived = {
    domains: [],
    divisions: [],
    teams: [],
    inputClassifications: [],
    inputProducts: [],
    inputSources: []
  };
  const teamDivisionCounts = new Map();

  const pushValue = (type, value) => {
    if (!Array.isArray(derived[type])) return;
    const text = normalizeText(value);
    if (!text) return;
    derived[type].push(text);
  };

  const addTeamDivision = (teamValue, divisionValue) => {
    const team = normalizeText(teamValue);
    const division = normalizeText(divisionValue);
    if (!team || !division) return;
    if (!teamDivisionCounts.has(team)) teamDivisionCounts.set(team, new Map());
    const byDivision = teamDivisionCounts.get(team);
    byDivision.set(division, (byDivision.get(division) || 0) + 1);
  };

  const addOkrRow = (row) => {
    const division = normalizeText(row.division || row.team_id);
    const team = normalizeText(row.team);
    const domain = normalizeText(row.domain);

    pushValue('divisions', division);
    pushValue('teams', team);
    pushValue('domains', domain);
    addTeamDivision(team, division);
  };

  (rowsByTable.objectives || []).forEach(addOkrRow);
  (rowsByTable.krs || []).forEach(addOkrRow);
  (rowsByTable.sub_krs || []).forEach(addOkrRow);
  (rowsByTable.initiatives || []).forEach(addOkrRow);

  (rowsByTable.input_sources || []).forEach((row) => {
    const division = normalizeText(row.division);
    const team = normalizeText(row.team);
    const workingTeam = normalizeText(row.working_team);
    const classification = normalizeText(row.classification);
    const product = normalizeText(row.product);
    const source = normalizeText(row.source);
    const domain = normalizeText(row.domain);

    pushValue('teams', team);
    pushValue('teams', workingTeam);
    pushValue('inputClassifications', classification);
    pushValue('inputProducts', product);
    pushValue('inputSources', source);
    pushValue('domains', domain);
    addTeamDivision(team, division);
    addTeamDivision(workingTeam, division);
  });

  const resolvedTeamDivisions = {};
  [...teamDivisionCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([team, divisions]) => {
      const ranked = [...divisions.entries()].sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      });
      if (ranked.length > 0) {
        resolvedTeamDivisions[team] = ranked[0][0];
      }
    });

  const normalizedDerived = {};
  PRESET_TYPES.forEach((type) => {
    normalizedDerived[type] = mergeOrdered([], derived[type]);
  });

  return {
    presetValues: normalizedDerived,
    teamDivisions: resolvedTeamDivisions
  };
}

async function insertInBatches(client, table, rows, batchSize = 500) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await client.from(table).insert(chunk);
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
  }
}

async function applyPresetBackfill(client, finalPresetValues, finalTeamDivisions) {
  for (const presetType of PRESET_TYPES) {
    const values = Array.isArray(finalPresetValues[presetType]) ? finalPresetValues[presetType] : [];
    if (values.length === 0) continue;
    const { error: deleteError } = await client.from('preset_values').delete().eq('preset_type', presetType);
    if (deleteError) throw new Error(`preset_values delete failed (${presetType}): ${deleteError.message}`);
    const rows = values.map((value, position) => ({
      preset_type: presetType,
      value,
      position
    }));
    await insertInBatches(client, 'preset_values', rows);
  }

  const teamDivisionRows = Object.entries(finalTeamDivisions)
    .map(([team, division]) => ({
      team: normalizeText(team),
      division: normalizeText(division)
    }))
    .filter((row) => row.team && row.division)
    .sort((a, b) => a.team.localeCompare(b.team));

  if (teamDivisionRows.length > 0) {
    const { error: deleteError } = await client.from('preset_team_divisions').delete().not('team', 'is', null);
    if (deleteError) throw new Error(`preset_team_divisions delete failed: ${deleteError.message}`);
    await insertInBatches(client, 'preset_team_divisions', teamDivisionRows);
  }
}

async function run() {
  const apply = process.argv.includes('--apply');
  const force = process.argv.includes('--force');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });

  const [
    presetValuesRows,
    presetTeamDivisionRows,
    objectives,
    krs,
    subKrs,
    initiatives,
    inputSources
  ] = await Promise.all([
    fetchAll(client, 'preset_values', 'position'),
    fetchAll(client, 'preset_team_divisions', 'team'),
    fetchAll(client, 'objectives'),
    fetchAll(client, 'krs'),
    fetchAll(client, 'sub_krs'),
    fetchAll(client, 'initiatives'),
    fetchAll(client, 'input_sources')
  ]);

  const existingByType = Object.fromEntries(PRESET_TYPES.map((type) => [type, []]));
  presetValuesRows
    .sort((a, b) => a.preset_type.localeCompare(b.preset_type) || Number(a.position || 0) - Number(b.position || 0))
    .forEach((row) => {
      const presetType = normalizeText(row.preset_type);
      if (!PRESET_TYPES.includes(presetType)) return;
      existingByType[presetType].push(normalizeText(row.value));
    });

  const existingTeamDivisions = {};
  presetTeamDivisionRows.forEach((row) => {
    const team = normalizeText(row.team);
    const division = normalizeText(row.division);
    if (!team || !division) return;
    existingTeamDivisions[team] = division;
  });

  const derived = collectDerivedPresetValues({
    objectives,
    krs,
    sub_krs: subKrs,
    initiatives,
    input_sources: inputSources
  });

  const finalPresetValues = {};
  PRESET_TYPES.forEach((presetType) => {
    finalPresetValues[presetType] = mergeOrdered(existingByType[presetType], derived.presetValues[presetType]);
  });
  const finalTeamDivisions = { ...derived.teamDivisions, ...existingTeamDivisions };
  const missingRequired = REQUIRED_PRESET_TYPES.filter((presetType) => finalPresetValues[presetType].length === 0);

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    existingCounts: Object.fromEntries(PRESET_TYPES.map((presetType) => [presetType, existingByType[presetType].length])),
    derivedCounts: Object.fromEntries(PRESET_TYPES.map((presetType) => [presetType, derived.presetValues[presetType].length])),
    finalCounts: Object.fromEntries(PRESET_TYPES.map((presetType) => [presetType, finalPresetValues[presetType].length])),
    existingTeamDivisions: Object.keys(existingTeamDivisions).length,
    derivedTeamDivisions: Object.keys(derived.teamDivisions).length,
    finalTeamDivisions: Object.keys(finalTeamDivisions).length,
    missingRequiredPresetTypes: missingRequired
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!apply) {
    console.log('Dry-run complete. Run with --apply to persist changes.');
    return;
  }

  if (missingRequired.length > 0 && !force) {
    throw new Error(`required preset types still missing after derivation: ${missingRequired.join(', ')}`);
  }

  await applyPresetBackfill(client, finalPresetValues, finalTeamDivisions);

  const verifyRows = await fetchAll(client, 'preset_values', 'position');
  const verifyByType = Object.fromEntries(PRESET_TYPES.map((presetType) => [presetType, 0]));
  verifyRows.forEach((row) => {
    const presetType = normalizeText(row.preset_type);
    if (presetType in verifyByType) {
      verifyByType[presetType] += 1;
    }
  });
  const verifyTeamDivisions = await fetchAll(client, 'preset_team_divisions', 'team');

  console.log(
    JSON.stringify(
      {
        applied: true,
        verifiedPresetCounts: verifyByType,
        verifiedTeamDivisions: verifyTeamDivisions.length
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(`[backfill-presets] failed: ${error.message}`);
  process.exit(1);
});
