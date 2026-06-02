const { execSync } = require('child_process');
const { join } = require('path');

const composeFile = join(__dirname, '..', 'docker', 'docker-compose.yml');
const timeoutMs = 60000;
const intervalMs = 5000;
const startTime = Date.now();

function checkPostgres() {
  execSync(`docker compose -f "${composeFile}" exec -T postgres pg_isready -U bff_user -d bff_db`, {
    stdio: 'ignore',
  });
}

function checkRedis() {
  const result = execSync(`docker compose -f "${composeFile}" exec -T redis redis-cli ping`)
    .toString()
    .trim();
  if (result !== 'PONG') {
    throw new Error(`Unexpected Redis ping response: ${result}`);
  }
}

function waitForService(checkFn, name) {
  while (true) {
    try {
      checkFn();
      process.stdout.write(`${name} is healthy\n`);
      return;
    } catch (error) {
      if (Date.now() - startTime > timeoutMs) {
        console.error(`${name} did not become healthy within ${timeoutMs / 1000}s`);
        throw error;
      }
      process.stdout.write(`${name} not ready yet, retrying...\r`);
      const waitUntil = Date.now() + intervalMs;
      while (Date.now() < waitUntil) {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
      }
    }
  }
}

console.log('Checking infra health...');
waitForService(checkPostgres, 'Postgres');
waitForService(checkRedis, 'Redis');
console.log('Infra health check passed.');
