import { app } from './app.js';
import { config } from './config.js';

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`✅ ${config.appName} server listening on http://localhost:${config.port}`);
});

function gracefulShutdown() {
  // eslint-disable-next-line no-console
  console.log('Shutting down server...');
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
