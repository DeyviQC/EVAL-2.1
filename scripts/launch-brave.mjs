import tls from 'node:tls';
import { createHash, X509Certificate } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const bravePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';

if (!existsSync(bravePath)) {
  console.error('Brave executable not found at:', bravePath);
  process.exit(1);
}

// Get SPKI pin
const rawCert = await new Promise((ok, fail) => {
  const socket = tls.connect({ host: '127.0.0.1', port: 8443, rejectUnauthorized: false }, () => {
    const raw = socket.getPeerCertificate().raw;
    socket.end();
    ok(raw);
  });
  socket.setTimeout(5000, () => socket.destroy(new Error('TLS inspection timeout')));
  socket.on('error', fail);
});

const cert = new X509Certificate(rawCert);
const pin = createHash('sha256').update(cert.publicKey.export({ format: 'der', type: 'spki' })).digest('base64');
console.log('SPKI Pin:', pin);

const args = [
  `--ignore-certificate-errors-spki-list=${pin}`,
  '--ignore-certificate-errors',
  'https://127.0.0.1:8443/'
];

console.log('Launching Brave...');
const child = spawn(bravePath, args, {
  detached: true,
  stdio: 'ignore'
});
child.unref();

console.log('Brave launched successfully!');
