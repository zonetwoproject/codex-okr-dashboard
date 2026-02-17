const path = require('path');
const { readStore, writeStore } = require('../src/store');

const dataFile = process.env.DATA_FILE || path.join(__dirname, '../data/store.json');

function run() {
  const store = readStore(dataFile);
  const initiatives = Array.isArray(store.initiatives) ? store.initiatives : [];
  const auditLogs = Array.isArray(store.auditLogs) ? store.auditLogs : [];

  let removedCount = 0;
  const removeStatusScoreDeep = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((item) => removeStatusScoreDeep(item));
      return;
    }
    if (Object.prototype.hasOwnProperty.call(node, 'statusScore')) {
      delete node.statusScore;
      removedCount += 1;
    }
    Object.values(node).forEach((value) => removeStatusScoreDeep(value));
  };

  initiatives.forEach((initiative) => {
    removeStatusScoreDeep(initiative);
  });
  auditLogs.forEach((log) => {
    removeStatusScoreDeep(log.beforeValue);
    removeStatusScoreDeep(log.afterValue);
  });

  writeStore(dataFile, store);

  console.log(`migrate-remove-initiative-statusscore: removed statusScore from ${removedCount} initiative rows`);
  console.log(`data file: ${dataFile}`);
}

run();
