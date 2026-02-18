const { app, bootstrapReady } = require('../src/server');

module.exports = async (req, res) => {
  await bootstrapReady;
  return app(req, res);
};
