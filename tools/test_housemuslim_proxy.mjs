import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const handler = require('../api/housemuslim.js');
const originalFetch = globalThis.fetch;
let calls;
let upstreamStatus;
let upstreamBody;

beforeEach(() => {
  calls = [];
  upstreamStatus = 200;
  upstreamBody = { success: true, data: [] };
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify(upstreamBody), {
      status: upstreamStatus,
      headers: { 'Content-Type': 'application/json' },
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

 test('maps only the daily content and book catalog to the official upstream', async () => {
  const dailyRes = response();
  await handler(request('/api/housemuslim?path=%2Fdaily%2Ftoday'), dailyRes);
  assert.equal(dailyRes.statusCode, 200);
  assert.equal(calls[0].url, 'https://api.housemuslim.org/api/v1/daily/today');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(dailyRes.headers['Cache-Control'], 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');

  const booksRes = response();
  await handler(request('/api/housemuslim?path=%2Fhadith%2Fbooks'), booksRes);
  assert.equal(calls[1].url, 'https://api.housemuslim.org/api/v1/hadith/books');
});

test('validates and encodes search/list parameters for an allowlisted book', async () => {
  const searchRes = response();
  await handler(request('/api/housemuslim?path=%2Fhadith%2Fbooks%2Fbukhari%2Fsearch&q=niat%20baik&page=2&per_page=10'), searchRes);
  assert.equal(searchRes.statusCode, 200);
  assert.equal(calls[0].url, 'https://api.housemuslim.org/api/v1/hadith/books/bukhari/search?q=niat+baik&page=2&per_page=10');

  const detailRes = response();
  await handler(request('/api/housemuslim?path=%2Fhadith%2Fbooks%2Fabu-dawud%2Fitems%2F12'), detailRes);
  assert.equal(detailRes.statusCode, 200);
  assert.equal(calls[1].url, 'https://api.housemuslim.org/api/v1/hadith/books/abu-dawud/items/12');
});

test('rejects unknown paths, books, parameters, duplicate parameters, and cross-site calls', async () => {
  for (const path of [
    '/api/housemuslim?path=%2Fadmin',
    '/api/housemuslim?path=%2Fhadith%2Fbooks%2Funknown%2Fitems',
    '/api/housemuslim?path=%2Fdaily%2Ftoday&url=https%3A%2F%2Fevil.example',
    '/api/housemuslim?path=%2Fhadith%2Fbooks%2Fbukhari%2Fsearch&q=niat&q=spam',
  ]) {
    const res = response();
    await handler(request(path), res);
    assert.equal(res.statusCode, 400, path);
  }
  const crossRes = response();
  await handler(request('/api/housemuslim?path=%2Fdaily%2Ftoday', { headers: { 'sec-fetch-site': 'cross-site' } }), crossRes);
  assert.equal(crossRes.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('allows only GET and maps upstream failures without leaking upstream details', async () => {
  const methodRes = response();
  await handler(request('/api/housemuslim?path=%2Fdaily%2Ftoday', { method: 'POST' }), methodRes);
  assert.equal(methodRes.statusCode, 405);
  assert.equal(methodRes.headers.Allow, 'GET');
  assert.equal(calls.length, 0);

  upstreamStatus = 429;
  const rateRes = response();
  await handler(request('/api/housemuslim?path=%2Fdaily%2Ftoday'), rateRes);
  assert.equal(rateRes.statusCode, 429);
  assert.equal(JSON.parse(rateRes.body).success, false);
});
