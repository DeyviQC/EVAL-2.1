import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { certificateOptions, loopbackCertificate } from '../backend/dev-runtime/browser-options.mjs';

import tls from 'node:tls';
const rawCert = await new Promise((ok, fail) => {
  const socket = tls.connect({ host: '127.0.0.1', port: 8443, rejectUnauthorized: false }, () => {
    const raw = socket.getPeerCertificate().raw;
    socket.end();
    ok(raw);
  });
  socket.setTimeout(5000, () => socket.destroy(new Error('TLS inspection timeout')));
  socket.on('error', fail);
});
const options = certificateOptions(rawCert);
const outDir = 'C:/Users/kevin/.gemini/antigravity/brain/cb02490a-6a9d-4504-a9ea-702409143cfd';
mkdirSync(outDir, { recursive: true });

const installedBrowser = [
  process.env.ProgramFiles && resolve(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].find(p => p && existsSync(p));

const browser = await chromium.launch({
  ...options,
  executablePath: installedBrowser,
  headless: true
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('response', res => console.log('RESPONSE:', res.status(), res.url()));
  await page.goto('https://127.0.0.1:8443/');

  // If already authenticated from earlier session, click logout
  if (await page.getByRole('button', { name: 'Cerrar sesión' }).isVisible()) {
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.getByRole('heading', { name: 'Acceso a EVAL' }).waitFor();
  } else {
    await page.getByRole('heading', { name: 'Acceso a EVAL' }).waitFor();
  }

  // 1. Check 1440px desktop
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(600); // let animations settle

  const hasHScrollDesktop = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  console.log(`Desktop 1440px horizontal scroll detected: ${hasHScrollDesktop}`);

  const desktopScreenshot = resolve(outDir, 'login-desktop-1440px.png');
  await page.screenshot({ path: desktopScreenshot, fullPage: false });
  console.log(`Saved desktop screenshot: ${desktopScreenshot}`);

  // 2. Check 390px mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);

  const hasHScrollMobile = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  console.log(`Mobile 390px horizontal scroll detected: ${hasHScrollMobile}`);

  const mobileScreenshot = resolve(outDir, 'login-mobile-390px.png');
  await page.screenshot({ path: mobileScreenshot, fullPage: false });
  console.log(`Saved mobile screenshot: ${mobileScreenshot}`);

  // 3. Test form input and login
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByLabel('Usuario', { exact: true }).fill('estudiante');
  await page.getByLabel('Contraseña', { exact: true }).fill('a2bd69321e87e3716b730252');
  
  const submitButton = page.getByRole('button', { name: 'Ingresar', exact: true });
  const responsePromise = page.waitForResponse(r => r.url().includes('/auth/login'), { timeout: 10000 }).catch(() => null);
  await submitButton.click();
  const loginRes = await responsePromise;
  if (loginRes) {
    console.log(`Login response status: ${loginRes.status()}, body: ${await loginRes.text()}`);
  } else {
    console.log('No login response received within 10s');
  }

  await page.waitForTimeout(3000);
  const afterScreenshot = resolve(outDir, 'after-login-click.png');
  await page.screenshot({ path: afterScreenshot });
  console.log(`Saved after-login screenshot: ${afterScreenshot}`);

  await page.getByRole('heading', { name: 'Tu espacio académico' }).waitFor({ timeout: 5000 });
  console.log('Login successful, navigated to authenticated dashboard!');

  await context.close();
  console.log('All login verification checks passed successfully!');
} finally {
  await browser.close();
}
