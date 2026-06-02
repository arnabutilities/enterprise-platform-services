const { execSync } = require('child_process');
const { join } = require('path');

const composeFile = join(__dirname, '..', 'docker', 'docker-compose.yml');

function exec(command) {
  return execSync(command, { stdio: 'inherit' });
}

function isInfraRunning() {
  try {
    const result = execSync(`docker compose -f "${composeFile}" ps -q`).toString().trim();
    return result.length > 0;
  } catch {
    return false;
  }
}

function startInfra() {
  console.log('Starting infra services from', composeFile);
  exec(`docker compose -f "${composeFile}" up -d`);
}

if (isInfraRunning()) {
  console.log('Infra services are already running.');
  process.exit(0);
}

startInfra();
console.log('Infra startup complete.');
