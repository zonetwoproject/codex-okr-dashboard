const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const port = 4011;
const base = `http://127.0.0.1:${port}`;
const tempFile = path.join('/tmp', `okr-proto-smoke-${Date.now()}.json`);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(retry = 30) {
  for (let i = 0; i < retry; i += 1) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return;
    } catch (_err) {
      // keep retrying
    }
    await sleep(200);
  }
  throw new Error('Server did not start in time');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function post(pathname, payload) {
  const res = await fetch(`${base}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`${pathname} failed: ${JSON.stringify(body)}`);
  }
  return body;
}

async function run() {
  const child = spawn('node', ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      DATA_FILE: tempFile
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (buf) => process.stdout.write(buf));
  child.stderr.on('data', (buf) => process.stderr.write(buf));

  try {
    await waitForServer();

    const objective = await post('/api/objectives', {
      half: 'H1',
      year: 2026,
      title: 'Smoke Objective',
      division: '코어프로덕트실',
      domain: 'QC',
      aarrrTag: '-',
      baseline: 10,
      q1Target: 30,
      q2Target: 50,
      owner: 'qa.user',
      actor: 'qa.user',
      reason: 'smoke create objective'
    });

    const kr = await post('/api/krs', {
      objectiveId: objective.id,
      title: 'Smoke KR',
      unit: '건',
      targetValue: 100,
      baseline: 10,
      q1Target: 40,
      q2Target: 80,
      ownerScope: 'team',
      team: 'QA Team',
      aarrrTag: 'Activation',
      actor: 'qa.user',
      reason: 'smoke create kr'
    });

    const experiment = await post('/api/experiments', {
      title: 'Smoke Experiment',
      aarrrTag: 'Activation',
      actor: 'qa.user',
      reason: 'smoke create experiment'
    });

    await post('/api/kr-experiment-links', {
      krId: kr.id,
      experimentId: experiment.id,
      weight: 100,
      actor: 'qa.user',
      reason: 'smoke link'
    });

    await post('/api/monthly-performances/upsert', {
      targetType: 'kr',
      targetId: kr.id,
      yearMonth: '2026-01',
      actualValue: 40,
      sourceType: 'manual',
      actor: 'qa.user',
      reason: 'smoke mp create'
    });

    await post('/api/monthly-performances/upsert', {
      targetType: 'kr',
      targetId: kr.id,
      yearMonth: '2026-01',
      actualValue: 60,
      sourceType: 'synced',
      actor: 'qa.user',
      reason: 'smoke mp upsert'
    });

    const dashRes = await fetch(`${base}/api/dashboard/kr/${kr.id}`);
    const dash = await dashRes.json();

    assert(dashRes.ok, 'dashboard endpoint must succeed');
    assert(dash.progress.actualSum === 60, 'monthly upsert should update actualSum to 60');
    assert(Math.round(dash.progress.achievement) === 60, 'achievement should be 60%');
    assert(dash.contributions.length === 1, 'one contribution should exist');
    assert(Math.round(dash.contributions[0].contributionScore) === 60, 'contribution score should be 60');

    const auditRes = await fetch(`${base}/api/audit-logs?limit=5`);
    const audits = await auditRes.json();
    assert(auditRes.ok, 'audit log endpoint must succeed');
    assert(audits.length > 0, 'audit logs should be populated');

    const tableRes = await fetch(`${base}/api/dashboard/okr-table?classification=%ED%8C%80%20KR`);
    const tableBody = await tableRes.json();
    assert(tableRes.ok, 'okr table endpoint must succeed');
    assert(tableBody.rows.length > 0, 'okr table should return rows');

    const krRow = tableBody.rows.find((row) => row.entityType === 'kr' && row.entityId === kr.id);
    assert(Boolean(krRow), 'created kr should exist in okr table');

    const patchedRes = await fetch(`${base}/api/dashboard/okr-table/${encodeURIComponent(krRow.rowId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        classificationOverride: '팀 KR',
        actor: 'qa.user',
        reason: 'smoke override'
      })
    });
    const patched = await patchedRes.json();
    assert(patchedRes.ok, 'okr table patch should succeed');
    assert(patched.row.effectiveClassification === '팀 KR', 'override classification should apply');

    const tableUpsertRes = await fetch(
      `${base}/api/dashboard/okr-table/${encodeURIComponent(krRow.rowId)}/monthly-upsert`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          month: 6,
          value: 88,
          sourceType: 'manual',
          actor: 'qa.user',
          reason: 'smoke table month upsert'
        })
      }
    );
    const tableUpsert = await tableUpsertRes.json();
    assert(tableUpsertRes.ok, 'okr table monthly upsert should succeed');
    assert(Math.round(tableUpsert.row.q2Current) === 88, 'q2 current should reflect table upsert');

    console.log('Smoke test passed');
  } finally {
    child.kill('SIGTERM');
    await sleep(100);
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

run().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
