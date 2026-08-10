import { config } from './config.js';
import { createApp } from './app.js';
import { startScheduler } from './services/scheduler.js';
import { pushEnabled } from './services/notifications.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`HackTrack API listening on http://localhost:${config.port}`);
  console.log(`  database      : ${config.dbFile}`);
  console.log(`  web push      : ${pushEnabled() ? 'enabled' : 'disabled (set VAPID keys)'}`);
  console.log(`  AI assistant  : ${config.anthropicApiKey ? config.anthropicModel : 'local fallback (set ANTHROPIC_API_KEY)'}`);
  startScheduler();
});
