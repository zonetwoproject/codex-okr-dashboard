const { app, bootstrapReady } = require('../src/server');

module.exports = async (req, res) => {
  try {
    await bootstrapReady;
    return app(req, res);
  } catch (error) {
    console.error('[vercel-handler] failed:', error.message);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: 'serverless bootstrap failed',
        message: error.message
      })
    );
  }
};
