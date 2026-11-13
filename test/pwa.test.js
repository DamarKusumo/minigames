import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('manifest has the fields that make the site installable', () => {
  const m = JSON.parse(readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
  assert.ok(m.name && m.short_name, 'name/short_name');
  assert.equal(m.display, 'standalone');
  assert.ok(m.start_url, 'start_url');
  assert.ok(m.theme_color && m.background_color, 'colors');
  assert.ok(Array.isArray(m.icons) && m.icons.length >= 2, 'icons');
  for (const size of ['192', '512']) {
    const icon = m.icons.find((i) => i.sizes === `${size}x${size}`);
    assert.ok(icon, `icon ${size}`);
    const path = new URL(`../${icon.src}`, import.meta.url);
    assert.ok(existsSync(path), `icon file ${icon.src}`);
    const sig = readFileSync(path).subarray(0, 8);
    assert.deepEqual([...sig], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'PNG magic');
  }
});

test('service worker exists with a fetch handler and precaches the shell', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes("addEventListener('fetch'"), 'fetch handler');
  assert.ok(sw.includes("addEventListener('install'"), 'install handler');
  assert.ok(sw.includes('index.html'), 'precaches index');
  assert.ok(sw.includes('games/snake.js'), 'precaches games');
});

test('index.html links the manifest, theme color, and registers the worker', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('rel="manifest"'));
  assert.ok(html.includes('name="theme-color"'));
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes('serviceWorker'), 'app registers the worker');
});
