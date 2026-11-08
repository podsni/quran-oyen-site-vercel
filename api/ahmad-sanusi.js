'use strict';

const API_BASE = 'https://api.ahmadsanusi.com';
const HADITH_BOOKS = new Set([
  'shahih_bukhari', 'shahih_muslim', 'sunan_abu_daud', 'sunan_tirmidzi',
  'sunan_nasai', 'sunan_ibnu_majah', 'musnad_ahmad', 'musnad_syafii',
  'riyadhus_shalihin', 'riyadhus_shalihin_arab',
]);

function json(res, status, payload, cacheControl = 'no-store') {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

function textParam(params, name, { min = 1, max = 100, required = false } = {}) {
  const value = (params.get(name) || '').trim();
  if (!value && !required) return '';
  if (value.length < min || value.length > max) throw new Error(`Parameter ${name} tidak valid.`);
  return value;
}

function pageParam(params, name, fallback, max) {
  const raw = params.get(name);
  if (raw == null || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) throw new Error(`Parameter ${name} tidak valid.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error(`Parameter ${name} di luar batas.`);
  return value;
}

function slugParam(params, name) {
  const value = textParam(params, name, { min: 1, max: 80, required: true });
  if (!/^[a-z0-9_-]+$/i.test(value)) throw new Error(`Parameter ${name} tidak valid.`);
  return value;
}

function numberParam(params, name) {
  const value = textParam(params, name, { min: 1, max: 8, required: true });
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 99999999) throw new Error(`Parameter ${name} tidak valid.`);
  return value;
}

function targetFor(params) {
  const resource = params.get('resource') || '';
  let path = '';
  const query = new URLSearchParams();
  let cacheSeconds = 300;

  switch (resource) {
    case 'kitab-list': {
      path = '/v1/kitab';
      const q = textParam(params, 'q', { min: 2, max: 80 });
      const category = textParam(params, 'kategori', { min: 1, max: 60 });
      if (q) query.set('q', q);
      if (category) query.set('kategori', category);
      cacheSeconds = 900;
      break;
    }
    case 'kitab-categories':
      path = '/v1/kitab/kategori';
      cacheSeconds = 3600;
      break;
    case 'kitab-detail': {
      const slug = slugParam(params, 'slug');
      path = `/v1/kitab/${encodeURIComponent(slug)}`;
      query.set('page', String(pageParam(params, 'page', 1, 10000)));
      query.set('limit', String(pageParam(params, 'limit', 100, 200)));
      cacheSeconds = 900;
      break;
    }
    case 'kitab-chapter': {
      const slug = slugParam(params, 'slug');
      const number = numberParam(params, 'nomor');
      path = `/v1/kitab/${encodeURIComponent(slug)}/bab/${encodeURIComponent(number)}`;
      cacheSeconds = 3600;
      break;
    }
    case 'kitab-search': {
      const slug = slugParam(params, 'slug');
      const q = textParam(params, 'q', { min: 2, max: 100, required: true });
      path = `/v1/kitab/${encodeURIComponent(slug)}/search`;
      query.set('q', q);
      cacheSeconds = 300;
      break;
    }
    case 'hadits-daily':
      path = '/v1/hadits/daily';
      cacheSeconds = 3600;
      break;
    case 'hadits-books':
      path = '/v1/hadits';
      cacheSeconds = 3600;
      break;
    case 'hadits-search': {
      const q = textParam(params, 'q', { min: 3, max: 100, required: true });
      path = '/v1/hadits/search';
      query.set('q', q);
      const book = textParam(params, 'kitab', { min: 1, max: 80 });
      if (book) {
        if (!HADITH_BOOKS.has(book)) throw new Error('Kitab hadis tidak dikenal.');
        query.set('kitab', book);
      }
      query.set('page', String(pageParam(params, 'page', 1, 10000)));
      query.set('limit', String(pageParam(params, 'limit', 20, 100)));
      cacheSeconds = 180;
      break;
    }
    case 'hadits-list': {
      const book = slugParam(params, 'kitab');
      if (!HADITH_BOOKS.has(book)) throw new Error('Kitab hadis tidak dikenal.');
      path = `/v1/hadits/${encodeURIComponent(book)}`;
      query.set('page', String(pageParam(params, 'page', 1, 10000)));
      query.set('limit', String(pageParam(params, 'limit', 20, 200)));
      cacheSeconds = 600;
      break;
    }
    case 'hadits-detail': {
      const book = slugParam(params, 'kitab');
      if (!HADITH_BOOKS.has(book)) throw new Error('Kitab hadis tidak dikenal.');
      const number = numberParam(params, 'nomor');
      path = `/v1/hadits/${encodeURIComponent(book)}/${encodeURIComponent(number)}`;
      cacheSeconds = 3600;
      break;
    }
    default:
      return null;
  }

  return { url: `${API_BASE}${path}${query.size ? `?${query}` : ''}`, cacheSeconds };
}

module.exports = async function ahmadSanusiProxy(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const origin = req.headers?.origin;
  const host = req.headers?.host;
  const fetchSite = req.headers?.['sec-fetch-site'];
  if (fetchSite === 'cross-site') return json(res, 403, { success: false, message: 'Permintaan lintas situs tidak diizinkan.' });
  if (origin && host) {
    try {
      if (new URL(origin).host.toLowerCase() !== String(host).toLowerCase()) {
        return json(res, 403, { success: false, message: 'Origin tidak diizinkan.' });
      }
    } catch { return json(res, 403, { success: false, message: 'Origin tidak valid.' }); }
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { success: false, message: 'Metode tidak didukung.' });
  }

  let target;
  try {
    const params = new URL(req.url || '/', 'https://quran-oyen-site.vercel.app').searchParams;
    target = targetFor(params);
  } catch (error) {
    return json(res, 400, { success: false, message: error.message || 'Parameter tidak valid.' });
  }
  if (!target) return json(res, 400, { success: false, message: 'Rute data tidak dikenal.' });

  const apiKey = process.env.AHMAD_SANUSI_API_KEY;
  if (!apiKey) return json(res, 503, { success: false, message: 'Layanan data belum dikonfigurasi.' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const upstream = await fetch(target.url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'X-API-Key': apiKey },
      signal: controller.signal,
      redirect: 'error',
    });
    if (!upstream.ok) {
      const retryAfter = upstream.headers.get('retry-after');
      if (upstream.status === 429 && retryAfter) res.setHeader('Retry-After', retryAfter);
      const message = upstream.status === 404 ? 'Data tidak ditemukan.'
        : upstream.status === 429 ? 'Batas permintaan layanan tercapai. Coba lagi nanti.'
          : 'Layanan data sementara tidak dapat diakses.';
      return json(res, upstream.status === 404 ? 404 : upstream.status === 429 ? 429 : 502, { success: false, message });
    }

    const body = await upstream.text();
    if (body.length > 2_000_000) return json(res, 502, { success: false, message: 'Respons data terlalu besar.' });
    let payload;
    try { payload = JSON.parse(body); } catch { return json(res, 502, { success: false, message: 'Respons layanan data tidak valid.' }); }
    return json(res, 200, payload, `public, max-age=0, s-maxage=${target.cacheSeconds}, stale-while-revalidate=3600`);
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    return json(res, 502, { success: false, message: timedOut ? 'Layanan data terlalu lama merespons.' : 'Layanan data sementara tidak dapat diakses.' });
  } finally {
    clearTimeout(timeout);
  }
};
