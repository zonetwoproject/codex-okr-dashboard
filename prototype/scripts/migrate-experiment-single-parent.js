const path = require('path');
const { readStore, writeStore } = require('../src/store');

const dataFile = process.env.DATA_FILE || path.join(__dirname, '../data/store.json');

function toSortKey(link) {
  return String(link?.updatedAt || link?.createdAt || '');
}

function run() {
  const store = readStore(dataFile);
  const krLinks = Array.isArray(store.krExperimentLinks) ? store.krExperimentLinks : [];
  const initiativeLinks = Array.isArray(store.initiativeExperimentLinks) ? store.initiativeExperimentLinks : [];

  const grouped = new Map();
  const passthroughKr = [];
  const passthroughInitiative = [];

  krLinks.forEach((link, index) => {
    if (!link?.experimentId) {
      passthroughKr.push(link);
      return;
    }
    if (!grouped.has(link.experimentId)) grouped.set(link.experimentId, []);
    grouped.get(link.experimentId).push({
      type: 'kr',
      link,
      index,
      sortKey: toSortKey(link)
    });
  });

  initiativeLinks.forEach((link, index) => {
    if (!link?.experimentId) {
      passthroughInitiative.push(link);
      return;
    }
    if (!grouped.has(link.experimentId)) grouped.set(link.experimentId, []);
    grouped.get(link.experimentId).push({
      type: 'initiative',
      link,
      index,
      sortKey: toSortKey(link)
    });
  });

  let removedCount = 0;
  let affectedExperimentCount = 0;
  const nextKrLinks = [...passthroughKr];
  const nextInitiativeLinks = [...passthroughInitiative];

  grouped.forEach((candidates) => {
    if (!Array.isArray(candidates) || candidates.length === 0) return;

    candidates.sort((a, b) => {
      const byTime = b.sortKey.localeCompare(a.sortKey);
      if (byTime !== 0) return byTime;
      return a.index - b.index;
    });

    const keep = candidates[0];
    if (candidates.length > 1) {
      affectedExperimentCount += 1;
      removedCount += candidates.length - 1;
    }

    if (keep.type === 'kr') {
      nextKrLinks.push(keep.link);
    } else {
      nextInitiativeLinks.push(keep.link);
    }
  });

  store.krExperimentLinks = nextKrLinks;
  store.initiativeExperimentLinks = nextInitiativeLinks;

  writeStore(dataFile, store);
  console.log(`migrate-experiment-single-parent: removed ${removedCount} extra mappings across ${affectedExperimentCount} experiments`);
  console.log(`data file: ${dataFile}`);
}

run();
