'use strict';

const assert = require('node:assert/strict');
const handler = require('../api/ahmad-sanusi.js');

function responseRecorder() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body) { this.body = body; },
    json() { return JSON.parse(this.body); },
  };
}

async function run() {
  const previousKey = process.env.AHMAD_SANUSI_API_KEY;
  process.env.AHMAD_SANUSI_API_KEY = 'unit-test-key';
  const originalFetch = global.fetch;
  let calls = 0;
  let captured;
  global.fetch = async (url, options) => {
    calls += 1;
    captured = { url: String(url), options };
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({ success: true, data: [{ id: 1 }] }),
    };
  };

  try {
    let res = responseRecorder();
    await handler({ method: 'POST', url: '/api/ahmad-sanusi?resource=kitab-list' }, res);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, 'GET');
    assert.equal(calls, 0);

    res = responseRecorder();
    await handler({ method: 'GET', url: '/api/ahmad-sanusi?resource=hadits-detail&kitab=https%3A%2F%2Fevil.test&nomor=1' }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(calls, 0);

    res = responseRecorder();
    await handler({ method: 'GET', url: '/api/ahmad-sanusi?resource=hadits-daily', headers: { host: 'quran-oyen-site.vercel.app', origin: 'https://untrusted.test' } }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(calls, 0);

    res = responseRecorder();
    await handler({ method: 'GET', url: '/api/ahmad-sanusi?resource=hadits-search&q=sabar&kitab=shahih_bukhari&page=2&limit=40' }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().success, true);
    assert.equal(calls, 1);
    assert.equal(captured.url, 'https://api.ahmadsanusi.com/v1/hadits/search?q=sabar&kitab=shahih_bukhari&page=2&limit=40');
    assert.equal(captured.options.headers['X-API-Key'], 'unit-test-key');
    assert.equal(captured.options.redirect, 'error');
    assert.match(res.headers['cache-control'], /s-maxage=180/);

    delete process.env.AHMAD_SANUSI_API_KEY;
    res = responseRecorder();
    await handler({ method: 'GET', url: '/api/ahmad-sanusi?resource=hadits-daily' }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(calls, 1);

    console.log('Ahmad Sanusi proxy checks passed: method guard, route whitelist, query mapping, cache headers, and server-only API key.');
  } finally {
    global.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.AHMAD_SANUSI_API_KEY;
    else process.env.AHMAD_SANUSI_API_KEY = previousKey;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
