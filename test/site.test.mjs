import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { build, outDir } from '../build.mjs';

let pages = [];
const html = {};

before(async () => {
  pages = await build({ quiet: true });
  for (const p of pages) html[p] = await readFile(path.join(outDir, p), 'utf8');
});

test('builds the core company profile pages', () => {
  for (const p of ['index.html', 'solutions.html', 'about.html', 'careers.html', 'news.html', 'contact.html']) {
    assert.ok(pages.includes(p), `${p} should be built`);
  }
});

test('careers page presents benefits, open roles and an application link', () => {
  for (const p of pages) {
    assert.match(html[p], /<a href="careers\.html"(?: aria-current="page")?>Careers<\/a>/, `${p} should link to Careers`);
  }
  const careers = html['careers.html'];
  assert.match(careers, /href="careers\.html" aria-current="page"/);
  assert.match(careers, /Why work at Contoso/);
  for (const benefit of ['Meaningful work', 'Learning budget', 'Hybrid work']) {
    assert.ok(careers.includes(benefit), `Careers page should describe ${benefit}`);
  }
  for (const role of ['Cloud Engineer', 'Cloud Engineering', 'Jakarta', 'Security Analyst', 'Security Operations', 'Surabaya', 'Data Engineer', 'Data &amp; AI', 'Singapore']) {
    assert.ok(careers.includes(role), `Careers page should include ${role}`);
  }
  assert.match(careers, /href="mailto:careers@contoso\.com"/);
});

test('every page has a title and exactly one h1', () => {
  for (const p of pages) {
    assert.match(html[p], /<title>[^<]+<\/title>/, `${p} needs a <title>`);
    const h1 = html[p].match(/<h1[\s>]/g) || [];
    assert.equal(h1.length, 1, `${p} should have exactly one <h1>`);
  }
});

test('every image has an alt attribute', () => {
  for (const p of pages) {
    for (const img of html[p].match(/<img\b[^>]*>/g) || []) {
      assert.match(img, /\salt=/, `${p}: ${img} is missing alt text`);
    }
  }
});

test('internal links and assets resolve', async () => {
  for (const p of pages) {
    const refs = [...html[p].matchAll(/(?:href|src)="([^"#?]+)(?:[#?][^"]*)?"/g)].map((m) => m[1]);
    for (const ref of refs) {
      if (/^(https?:|mailto:|tel:|data:)/.test(ref)) continue;
      try {
        await access(path.join(outDir, ref));
      } catch {
        assert.fail(`${p} links to a missing file: ${ref}`);
      }
    }
  }
});
