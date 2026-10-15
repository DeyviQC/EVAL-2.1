import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const repo = resolve(import.meta.dirname, '..', '..', '..');
const script = resolve(repo, 'backend', 'scripts', 'setup-team.ps1');
const shell = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';

function run(args) {
  return spawnSync(shell, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], {
    cwd: repo,
    encoding: 'utf8',
    windowsHide: true,
  });
}

test('inspect exposes the pinned, user-scoped setup contract without writing', { skip: process.platform !== 'win32' }, () => {
  const localPath = resolve(repo, '.local');
  const existedBefore = existsSync(localPath);
  const before = existedBefore ? statSync(localPath).mtimeMs : null;
  const result = run(['-Command', 'inspect']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const contract = JSON.parse(result.stdout);
  assert.deepEqual(contract, {
    runtime: '.local/runtime',
    php: {
      version: '8.4.26',
      archive: 'php-8.4.26-nts-Win32-vs17-x64.zip',
      sha256: 'da68394f9193b7f6b89d0c76861a4034ae10efee7fd55a7255d8118c2acf70d7',
    },
    mysql: {
      version: '8.4.11',
      archive: 'mysql-8.4.11-winx64.zip',
      sha256: 'a492371d687d2bab088b0062581144a0044b8964baefdf4faa579292b423d25c',
      port: 3307,
    },
    composer: {
      version: '2.10.3',
      archive: 'composer-2.10.3.phar',
      sha256: '7a2d379d5b8ffdaa028580ef26494c36d2feef4b178d3dd1473a4dbc5e17c8d6',
    },
    generatedPathsAreIgnored: true,
    requiresAdministrator: false,
  });
  assert.equal(existsSync(localPath), existedBefore);
  if (existedBefore) assert.equal(statSync(localPath).mtimeMs, before);
});

test('prepare keeps curl for EVAL but runs Composer through PHP streams', { skip: process.platform !== 'win32' }, () => {
  const source = readFileSync(script, 'utf8');
  assert.match(source, /^extension=curl$/m);
  assert.match(source, /\$composerIni\s*=\s*\$phpIni\s+-replace\s+'\(\?m\)\^extension=curl/);
  assert.match(source, /& \$php -c \$composerIniPath .*composer\.phar/);
});

test('local dev keeps mandatory TLS but disables Windows-broken server-cert verification', { skip: process.platform !== 'win32' }, () => {
  const database = readFileSync(resolve(repo, 'backend', 'scripts', 'database.php'), 'utf8');
  const manage = readFileSync(resolve(repo, 'backend', 'scripts', 'manage-dev.ps1'), 'utf8');
  // Default (flag absent): full verification stays on; opt-out is the literal '0'.
  assert.match(database, /getenv\('EVAL_DB_SSL_VERIFY'\)\s*!=='0'|getenv\('EVAL_DB_SSL_VERIFY'\)\s*!==\s*'0'/);
  assert.match(database, /MYSQL_ATTR_SSL_VERIFY_SERVER_CERT\s*=>/);
  assert.match(database, /MYSQL_ATTR_SSL_CA\s*=>/);
  // Only the managed local dev environment opts out (TLS still required by the owned server).
  assert.match(manage, /EVAL_DB_SSL_VERIFY='0'/);
});

test('unsupported commands fail before changing local state', { skip: process.platform !== 'win32' }, () => {
  const localPath = resolve(repo, '.local');
  const existedBefore = existsSync(localPath);
  const before = existedBefore ? statSync(localPath).mtimeMs : null;
  const result = run(['-Command', 'erase']);

  assert.notEqual(result.status, 0);
  assert.equal(result.stderr.trim(), 'Unsupported setup command. Use inspect, prepare, or verify.');
  assert.equal(result.stdout, '');
  assert.equal(existsSync(localPath), existedBefore);
  if (existedBefore) assert.equal(statSync(localPath).mtimeMs, before);
});
