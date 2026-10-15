import { chromium } from '../frontend/node_modules/playwright-core/index.mjs';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
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
  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('Content Security Policy directive')) {
      console.log('PAGE LOG:', text);
    }
  });

  const sessionPromise = page.waitForResponse(r => r.url().includes('/auth/session'));
  await page.goto('https://127.0.0.1:8443/');
  await sessionPromise;

  await page.waitForTimeout(500);

  const loginInput = page.getByLabel('Usuario', { exact: true });
  if (await loginInput.isVisible()) {
    console.log('Logging in as estudiante...');
    await loginInput.fill('estudiante');
    await page.getByLabel('Contraseña', { exact: true }).fill('a2bd69321e87e3716b730252');
    
    // Click submit and wait for session update
    const submitBtn = page.getByRole('button', { name: 'Ingresar', exact: true });
    await submitBtn.click();
    await page.waitForTimeout(2000);
  }

  // Verify authenticated dashboard header
  await page.getByRole('heading', { name: 'Tu espacio académico' }).waitFor({ timeout: 10000 });
  console.log('Authenticated dashboard loaded!');

  const sections = [
    { name: 'dashboard', btnName: 'Inicio' },
    { name: 'courses', btnName: 'Cursos' },
    { name: 'activities', btnName: 'Tareas' },
    { name: 'calendar', btnName: 'Calendario' },
    { name: 'library', btnName: 'Biblioteca' },
    { name: 'progress', btnName: 'Progreso' }
  ];

  for (const sec of sections) {
    // 1. Set to desktop first so sidebar is visible
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);

    // Click the sidebar button
    const navBtn = page.getByRole('navigation', { name: 'Secciones académicas' }).getByRole('button', { name: sec.btnName });
    await navBtn.click();
    await page.waitForTimeout(1000);

    // Check 1440px desktop
    const scroll1440 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const file1440 = resolve(outDir, `phase-6-${sec.name}-1440px.png`);
    await page.screenshot({ path: file1440 });
    console.log(`[${sec.name}] 1440px screenshot saved. Horizontal scroll: ${scroll1440}`);

    // Check 390px mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    const scroll390 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const file390 = resolve(outDir, `phase-6-${sec.name}-390px.png`);
    await page.screenshot({ path: file390 });
    console.log(`[${sec.name}] 390px screenshot saved. Horizontal scroll: ${scroll390}`);
  }

  await context.close();
  console.log('Fase 6 verification complete!');
} finally {
  await browser.close();
}
