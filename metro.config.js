const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * DEV-only: serve sandbox credentials from Metro process env (gitignored `.env`)
 * only when EXPO_PUBLIC_DEMO_AUTO_LOGIN=1. Never bake secrets into the JS bundle.
 */
config.server = config.server ?? {};
const previousEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const enhanced = previousEnhanceMiddleware
    ? previousEnhanceMiddleware(middleware, server)
    : middleware;

  return (req, res, next) => {
    if (req.url === '/__dev/sandbox-creds') {
      const enabled = process.env.EXPO_PUBLIC_DEMO_AUTO_LOGIN === '1';
      const email = process.env.SANDBOX_EMAIL;
      const password = process.env.SANDBOX_PASSWORD;
      if (!enabled || !email || !password) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Dev sandbox creds endpoint disabled' }));
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
