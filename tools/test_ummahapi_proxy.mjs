import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const handler = require('../api/ummahapi.js');
const originalFetch = globalThis.fetch;
let calls;
let upstreamStatus;
let upstreamBody;

beforeEach(() => {
  calls = [];
  upstreamStatus = 200;
  upstreamBody = null;
  globalThis.fetch = async (url, options) => {
    const href = String(url);
    calls.push({ url: href, options });
    let payload = upstreamBody;
    if (!payload) {
      if (href.endsWith('/quran/random')) payload = { success: true, data: { surah: { number: 25, name_english: 'Al-Furqan' }, verse: { ayah: 24, arabic: 'آية', translations: { indonesian: 'Ayat Indonesia' } } } };
      else if (href.endsWith('/asma-ul-husna/random')) payload = { success: true, data: { name: { number: 75, arabic: 'الظَّاهِرُ', transliteration: 'Az-Zaahir', english: 'The Manifest' } } };
      else if (href.endsWith('/hadith/random')) payload = { success: true, data: { collection: 'qudsi', collection_name: '40 Hadith Qudsi', hadithnumber: 32, arabic: 'حديث', english: 'A hadith in English.', grade: null } };
      else payload = { success: true, data: { collections: [] } };
    }
    return new Response(JSON.stringify(payload), {
      status: upstreamStatus,
      headers: { 'Content-Type': 'application/json', ...(upstreamStatus === 429 ? { 'Retry-After': '30' } : {}) },
    });
  };
});
after(() => { globalThis.fetch = originalFetch; });

function response() {
  return {
    headers: {}, statusCode: 0, body: '',
    setHeader(name, value) { this.headers[name] = value; },
    end(body) { this.body = body; },
  };
}
function request(path, { method = 'GET', headers = {} } = {}) {
  return {
    method,
    url: path,
    headers: { host: 'quran-oyen-site.vercel.app', origin: 'https://quran-oyen-site.vercel.app', 'sec-fetch-site': 'same-origin', ...headers },
  };
}

 test('builds a normalized daily bundle from official Quran, Asma, and hadith endpoints', async () => {
  const res = response();
  await handler(request('/api/ummahapi?resource=daily&date=2026-11-08'), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map((call) => call.url).sort(), [
    'https://ummahapi.com/api/asma-ul-husna/random',
    'https://ummahapi.com/api/hadith/random',
    'https://ummahapi.com/api/quran/random',
  ]);
  assert.ok(calls.every((call) => call.options.redirect === 'error'));
  const payload = JSON.parse(res.body);
  assert.equal(payload.data.ayah.surah_id, 25);
  assert.equal(payload.data.ayah.number_in_surah, 24);
  assert.equal(payload.data.ayah.translation_id, 'Ayat Indonesia');
  assert.equal(payload.data.asma.meaning_en, 'The Manifest');
  assert.equal(payload.data.quote.reference, '40 Hadith Qudsi #32');
  assert.equal(payload.data.quote.language, 'en');
  assert.equal(res.headers['Cache-Control'], 'public, max-age=0, s-maxage=86400, stale-while-revalidate=3600');
});

test('allows only the listed collections and maps browse, search, and detail parameters', async () => {
  upstreamBody = { success: true, data: { collections: [] } };
  const catalog = response();
  await handler(request('/api/ummahapi?resource=collections'), catalog);
  assert.equal(catalog.statusCode, 200);
  assert.equal(calls[0].url, 'https://ummahapi.com/api/hadith/collections');

  const list = response();
  await handler(request('/api/ummahapi?resource=collection&collection=bukhari&page=2&limit=10'), list);
  assert.equal(list.statusCode, 200);
  assert.equal(calls[1].url, 'https://ummahapi.com/api/hadith/bukhari?page=2&limit=10');

  const search = response();
  await handler(request('/api/ummahapi?resource=search&collection=abudawud&q=prayer&limit=100'), search);
  assert.equal(search.statusCode, 200);
  assert.equal(calls[2].url, 'https://ummahapi.com/api/hadith/search?q=prayer&collection=abudawud&limit=100');

  const detail = response();
  await handler(request('/api/ummahapi?resource=detail&collection=tirmidhi&number=2787.2'), detail);
  assert.equal(detail.statusCode, 200);
  assert.equal(calls[3].url, 'https://ummahapi.com/api/hadith/tirmidhi/2787.2');
});

test('rejects unknown resources, collections, parameters, invalid dates, duplicates, and cross-site calls', async () => {
  for (const path of [
    '/api/ummahapi?resource=proxy&url=https%3A%2F%2Fevil.example',
    '/api/ummahapi?resource=collection&collection=unknown&page=1',
    '/api/ummahapi?resource=search&collection=bukhari&q=prayer&query=other',
    '/api/ummahapi?resource=search&collection=bukhari&q=prayer&q=spam',
    '/api/ummahapi?resource=daily&date=2026-02-30',
    '/api/ummahapi?resource=daily&date=2026-11-08&collection=bukhari',
    '/api/ummahapi?resource=detail&collection=bukhari&number=1%2F2',
  ]) {
    const res = response();
    await handler(request(path), res);
    assert.equal(res.statusCode, 400, path);
  }
  const crossRes = response();
  await handler(request('/api/ummahapi?resource=collections', { headers: { 'sec-fetch-site': 'cross-site' } }), crossRes);
  assert.equal(crossRes.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('allows only GET and maps rate-limit failures without leaking upstream details', async () => {
  const methodRes = response();
  await handler(request('/api/ummahapi?resource=collections', { method: 'POST' }), methodRes);
  assert.equal(methodRes.statusCode, 405);
  assert.equal(methodRes.headers.Allow, 'GET');
  assert.equal(calls.length, 0);

  upstreamBody = { success: false, message: 'private upstream detail' };
  upstreamStatus = 429;
  const rateRes = response();
  await handler(request('/api/ummahapi?resource=collections'), rateRes);
  assert.equal(rateRes.statusCode, 429);
  assert.equal(rateRes.headers['Retry-After'], '30');
  assert.equal(JSON.parse(rateRes.body).success, false);
  assert.doesNotMatch(rateRes.body, /private upstream detail/);
});


test('supports the existing global search without a collection filter', async () => {
  const res = response();
  await handler(request('/api/ummahapi?resource=search&q=mercy&limit=25'), res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls[0].url, 'https://ummahapi.com/api/hadith/search?q=mercy&limit=25');
});
