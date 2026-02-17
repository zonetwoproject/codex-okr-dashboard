const path = require('path');
const { readStore, writeStore } = require('../src/store');

const dataFile = process.env.DATA_FILE || path.join(__dirname, '../data/store.json');

function run() {
  const store = readStore(dataFile);
  const krs = Array.isArray(store.krs) ? store.krs : [];

  let removedCount = 0;
  krs.forEach((kr) => {
    if (Object.prototype.hasOwnProperty.call(kr, 'metricType')) {
      delete kr.metricType;
      removedCount += 1;
    }
  });

  writeStore(dataFile, store);

  console.log(`migrate-remove-kr-metrictype: removed metricType from ${removedCount} KR rows`);
  console.log(`data file: ${dataFile}`);
}

run();
