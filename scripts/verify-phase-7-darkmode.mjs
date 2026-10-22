import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { certificateOptions } from '../backend/dev-runtime/browser-options.mjs';
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

  const sessionPromise = page.waitForResponse(r => r.url().includes('/auth/session'));
  await page.goto('https://127.0.0.1:8443/');
  await sessionPromise;
  await page.waitForTimeout(500);

  const loginInput = page.getByLabel('Usuario', { exact: true });
  if (await loginInput.isVisible()) {
    await loginInput.fill('estudiante');
    await page.getByLabel('Contraseña', { exact: true }).fill('73652214');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.waitForTimeout(2000);
  }

  await page.getByRole('heading', { name: 'Tu espacio académico' }).waitFor({ timeout: 10000 });

  // Toggle dark mode via header theme toggle button
  const themeToggle = page.getByLabel('Modo oscuro', { exact: true });
  if (await themeToggle.isVisible()) {
    console.log('Toggling theme to dark mode...');
    await themeToggle.click();
    await page.waitForTimeout(600);
  } else {
    console.log('Theme toggle button not visible, applying .dark manually');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
  }

  const isDarkApplied = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  console.log(`Dark mode class on <html>: ${isDarkApplied}`);

  // 1. Dashboard in Dark Mode
  const file1440Dark = resolve(outDir, 'phase-7-dashboard-dark-1440px.png');
  await page.screenshot({ path: file1440Dark });
  console.log(`Saved: ${file1440Dark}`);

  // 2. Mobile Dark Mode
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const file390Dark = resolve(outDir, 'phase-7-dashboard-dark-390px.png');
  await page.screenshot({ path: file390Dark });
  console.log(`Saved: ${file390Dark}`);

  // 3. Courses in Dark Mode
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
  const coursesBtn = page.getByRole('navigation', { name: 'Secciones académicas' }).getByRole('button', { name: 'Cursos' });
  await coursesBtn.click();
  await page.waitForTimeout(1000);

  const coursesDark = resolve(outDir, 'phase-7-courses-dark-1440px.png');
  await page.screenshot({ path: coursesDark });
  console.log(`Saved: ${coursesDark}`);

  // 4. Command Palette (Ctrl+K)
  await page.keyboard.press('Control+KeyK');
  await page.waitForTimeout(500);
  const paletteDark = resolve(outDir, 'phase-7-command-palette-dark.png');
  await page.screenshot({ path: paletteDark });
  console.log(`Saved: ${paletteDark}`);

  await context.close();
  console.log('Fase 7 dark mode verification complete!');
} finally {
  await browser.close();
}
