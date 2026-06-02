import { existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

const root = resolve(__dirname, '..');
const nodeEnv = process.env.NODE_ENV || 'development';

for (const file of ['.env', `.env.${nodeEnv}`, '.env.local']) {
  const path = resolve(root, file);
  if (existsSync(path)) {
    config({ path });
  }
}
