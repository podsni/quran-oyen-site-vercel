import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const readText = (path) => fs.readFile(new URL(path, root), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));

const [doa, maulid, tahlil, html, ibadah, sw] = await Promise.all([
  readJson('data/ibadah/doa.json'),
  readJson('data/ibadah/maulid.json'),
  readJson('data/ibadah/tahlil.json'),
  readText('index.html'),
  readText('ibadah.js'),
  readText('sw.js'),
]);

test('Doa and wird catalogue is a local EQuran snapshot with a useful catalogue size', () => {
  assert.equal(doa.status, 'success');
  assert.equal(doa.total, 227);
  assert.equal(doa.data.length, 227);
  assert.deepEqual(doa.data.map((item) => item.id), Array.from({ length: 227 }, (_, index) => index + 1));
  assert.ok(doa.data.every((item) => item.nama && item.ar));
  assert.equal(doa.data.filter((item) => item.tr && item.idn).length, 226);
  assert.match(ibadah, /localRequest\('data\/ibadah\/doa\.json'/);
});

test('catalogue prose in the Arabic field is identified instead of being replaced by invented prayer text', () => {
  const entry = doa.data.find((item) => item.id === 42);
  assert.equal(entry.nama, 'Bila Ada Sesuatu Yang Menggembirakan');
  assert.match(entry.ar, /^Nabi Shallallahu/);
  assert.equal(entry.tr, '');
  assert.equal(entry.idn, '');
  assert.match(ibadah, /hasArabicScript/);
  assert.match(ibadah, /sourceOnlyEntry/);
});

test('Maulid includes 18 Arabic chapters plus the closing dua, with the source limitation stated', () => {
  assert.equal(maulid.schemaVersion, 1);
  assert.equal(maulid.items.length, 19);
  assert.equal(maulid.items.filter((item) => /^Bab (?:I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII):/.test(item.title)).length, 18);
  assert.match(maulid.items.at(-1).title, /Doa Maulid/);
  assert.ok(maulid.items.every((item) => /[\u0600-\u06ff]/.test(item.ar) && item.idn.length > 40));
  assert.match(maulid.sourceNote, /Transliterasi Latin tidak tersedia/);
  assert.ok(maulid.sources.some((source) => source.url.includes('alkhoirot.org')));
});

test('Tahlil has all 28 passages in Arabic, Latin, and Indonesian meaning', () => {
  assert.equal(tahlil.schemaVersion, 1);
  assert.equal(tahlil.items.length, 28);
  assert.ok(tahlil.items.every((item) => /[\u0600-\u06ff]/.test(item.ar) && item.latin.length > 12 && item.idn.length > 12));
  assert.ok(tahlil.sources.some((source) => source.url === 'https://quran.nu.or.id/tahlil'));
});

test('Maulid and Tahlil are local readers rather than links that redirect to Quran NU Online', () => {
  assert.doesNotMatch(html, /href=["']https:\/\/quran\.nu\.or\.id\/(?:maulid|tahlil|wirid)/i);
  assert.doesNotMatch(ibadah, /window\.open\([^\n]*quran\.nu\.or\.id\/(?:maulid|tahlil|wirid)/i);
  for (const type of ['maulid', 'tahlil']) {
    for (const suffix of ['local-badge', 'section-label', 'select', 'prev', 'next', 'progress', 'ar', 'latin-field', 'latin-label', 'latin', 'meaning-field', 'meaning-label', 'meaning', 'copy', 'status', 'source']) {
      assert.match(html, new RegExp(`id=["']doa-${type}-${suffix}["']`), `missing doa-${type}-${suffix}`);
    }
  }
});

test('all local reading JSON files are stamped into the service-worker manifest with matching hashes', async () => {
  const match = sw.match(/const FILES = \/\*FILES\*\/(\{[\s\S]*?\})\/\*END\*\//);
  assert.ok(match, 'service-worker FILES manifest must be stamped');
  const manifest = JSON.parse(match[1]);
  for (const path of ['data/ibadah/doa.json', 'data/ibadah/maulid.json', 'data/ibadah/tahlil.json']) {
    assert.ok(manifest[path], `missing ${path} in service-worker manifest`);
    const digest = createHash('sha256').update(await fs.readFile(new URL(path, root))).digest('hex').slice(0, 10);
    assert.equal(manifest[path], digest, `stale service-worker digest for ${path}`);
  }
});
