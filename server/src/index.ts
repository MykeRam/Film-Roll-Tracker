import { createApp } from './app.js';
import { env } from './config.js';

const app = createApp();

app.listen(env.PORT, env.HOST, () => {
  console.log(`Film Roll Tracker API listening at http://${env.HOST}:${env.PORT}`);
});

