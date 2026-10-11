const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * DEV-only: serve sandbox credentials from the Metro process env (gitignored `.env`)
 * so the simulator can auto-demo without baking secrets into the JS bundle.
 * Never enable outside local development.
 */
config.server = config.server ?? {};
const previousEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const enhanced = previousEnhanceMiddleware
    ? previousEnhanceMiddleware(middleware, server)
    : middleware;

  return (req, res, next) => {
    if (req.url === '/__dev/sandbox-creds') {
      const email = process.env.SANDBOX_EMAIL;
      const password = process.env.SANDBOX_PASSWORD;
      if (!email || !password) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'SANDBOX_EMAIL/PASSWORD not set in Metro env' }));
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify({ email, password }));
      return;
    }
    return enhanced(req, res, next);
  };
};

module.exports = config;
