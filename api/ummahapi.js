'use strict';

const API_BASE = 'https://ummahapi.com/api';
const COLLECTIONS = new Set(['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'ibnmajah', 'nasai', 'malik', 'nawawi', 'qudsi', 'dehlawi']);
const ALLOWED_PARAMS = new Set(['resource', 'date', 'collection', 'page', 'limit', 'q', 'number']);

function json(res, status, payload, cacheControl = 'no-store') {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(JSON.stringify(payload));
}
function oneParam(params, name, { min = 1, max = 100, required = false } = {}) {
  const values = params.getAll(name);
  if (values.length > 1) throw new Error('parameter');
  const value = (values[0] || '').trim();
  if (!value && !required) return '';
  if (value.length < min || value.length > max) throw new Error('parameter');
  return value;
}
function positiveParam(params, name, fallback, max) {
  const raw = oneParam(params, name, { max: 10 });
  if (!raw) return fallback;
  if (!/^\d+$/.test(raw)) throw new Error('parameter');
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error('parameter');
  return value;
}
function validDate(raw) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const parsed = new Date(`${raw}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === raw;
}
function targetFor(params) {
  for (const key of params.keys()) {
    if (!ALLOWED_PARAMS.has(key) || params.getAll(key).length !== 1) throw new Error('parameter');
  }
  const resource = oneParam(params, 'resource', { min: 1, max: 20, required: true });
  let path;
  let cacheSeconds;
  const urlFor = (route, query = {}) => {
    const url = new URL(`${API_BASE}${route}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
    return { url: url.toString(), cacheSeconds };
  };

  if (resource === 'daily') {
    if (params.has('collection') || params.has('page') || params.has('limit') || params.has('q') || params.has('number')) throw new Error('parameter');
    const date = oneParam(params, 'date', { min: 10, max: 10, required: true });
    if (!validDate(date)) throw new Error('parameter');
    return { resource, date, cacheSeconds: 86400 };
  }
  if (resource === 'collections') {
    if (params.has('date') || params.has('collection') || params.has('page') || params.has('limit') || params.has('q') || params.has('number')) throw new Error('parameter');
    cacheSeconds = 3600;
    return { resource, ...urlFor('/hadith/collections') };
  }
  if (resource === 'collection' || resource === 'search' || resource === 'detail') {
    if (params.has('date')) throw new Error('parameter');
    const collection = oneParam(params, 'collection', { min: 1, max: 20, required: resource !== 'search' });
    if (collection && !COLLECTIONS.has(collection)) throw new Error('parameter');
    if (resource === 'collection') {
      if (params.has('q') || params.has('number')) throw new Error('parameter');
      const page = positiveParam(params, 'page', 1, 100000);
      const limit = positiveParam(params, 'limit', 10, 10);
      cacheSeconds = 600;
      return { resource, ...urlFor(`/hadith/${collection}`, { page, limit }) };
    }
    if (resource === 'search') {
      if (params.has('page') || params.has('number')) throw new Error('parameter');
      const q = oneParam(params, 'q', { min: 1, max: 100, required: true });
      const limit = positiveParam(params, 'limit', 100, 100);
      cacheSeconds = 60;
      return { resource, ...urlFor('/hadith/search', { q, collection, limit }) };
    }
    if (params.has('page') || params.has('limit') || params.has('q')) throw new Error('parameter');
    const number = oneParam(params, 'number', { min: 1, max: 12, required: true });
    if (!/^[1-9]\d{0,7}(?:\.\d{1,3})?$/.test(number)) throw new Error('parameter');
    cacheSeconds = 86400;
    return { resource, ...urlFor(`/hadith/${collection}/${number}`) };
  }
  throw new Error('resource');
}

async function fetchPayload(url, signal) {
  const upstream = await fetch(url, {
    method: 'GET', headers: { Accept: 'application/json' }, signal, redirect: 'error',
  });
  if (!upstream.ok) {
    const error = new Error('upstream');
    error.status = upstream.status;
    error.retryAfter = upstream.headers.get('retry-after');
    throw error;
  }
  const body = await upstream.text();
  if (body.length > 2_000_000) throw new Error('size');
  let payload;
  try { payload = JSON.parse(body); } catch { throw new Error('json'); }
  if (!payload || payload.success !== true || !payload.data) throw new Error('shape');
  return payload;
}
function mapUpstreamError(error) {
  if (error?.status === 404) return { status: 404, message: 'Data tidak ditemukan.' };
  if (error?.status === 429) return { status: 429, message: 'Batas permintaan UmmahAPI tercapai. Coba lagi nanti.' };
  if (error?.name === 'AbortError') return { status: 504, message: 'Layanan data terlalu lama merespons.' };
  return { status: 502, message: 'Layanan data sementara tidak dapat diakses.' };
}
function dailyBundle(quranPayload, asmaPayload, hadithPayload, date) {
  const verseData = quranPayload.data;
  const verse = verseData.verse;
  const surah = verseData.surah;
  const name = asmaPayload.data.name;
  const hadith = hadithPayload.data;
  const surahNumber = Number(surah?.number);
  const ayahNumber = Number(verse?.ayah);
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114
    || !Number.isInteger(ayahNumber) || ayahNumber < 1 || !verse?.arabic
    || !name?.arabic || !name?.transliteration || !hadith?.arabic || !hadith?.english) {
    throw new Error('shape');
  }
  return {
    success: true,
    service: 'daily-bundle',
    data: {
      date,
      ayah: {
        surah_id: surahNumber,
        number_in_surah: ayahNumber,
        text_uthmani: verse.arabic,
        translation_id: verse.translations?.indonesian || '',
        reference: `${surah.name_translation || surah.name_english || `Surah ${surahNumber}`} · ${ayahNumber}`,
      },
      asma: {
        number: Number(name.number) || 0,
        arabic: name.arabic,
        transliteration: name.transliteration,
        meaning_en: name.english || name.meaning || '',
      },
      quote: {
        arabic: hadith.arabic,
        text: hadith.english,
        language: 'en',
        reference: `${hadith.collection_name || hadith.collection || 'Hadis'} #${hadith.hadithnumber || ''}`.trim(),
        grade: hadith.grade || '',
      },
    },
  };
}

module.exports = async function ummahApiProxy(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.headers?.['sec-fetch-site'] === 'cross-site') {
    return json(res, 403, { success: false, message: 'Permintaan lintas situs tidak diizinkan.' });
  }
  const origin = req.headers?.origin;
  const host = req.headers?.host;
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
    const invalidResource = error?.message === 'resource';
    return json(res, 400, { success: false, message: invalidResource ? 'Rute data tidak dikenal.' : 'Parameter tidak valid.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    let payload;
    if (target.resource === 'daily') {
      const [quran, asma, hadith] = await Promise.all([
        fetchPayload(`${API_BASE}/quran/random`, controller.signal),
        fetchPayload(`${API_BASE}/asma-ul-husna/random`, controller.signal),
        fetchPayload(`${API_BASE}/hadith/random`, controller.signal),
      ]);
      payload = dailyBundle(quran, asma, hadith, target.date);
    } else {
      payload = await fetchPayload(target.url, controller.signal);
    }
    return json(res, 200, payload, `public, max-age=0, s-maxage=${target.cacheSeconds}, stale-while-revalidate=3600`);
  } catch (error) {
    const mapped = mapUpstreamError(error);
    if (mapped.status === 429 && error?.retryAfter) res.setHeader('Retry-After', error.retryAfter);
    return json(res, mapped.status, { success: false, message: mapped.message });
  } finally {
    clearTimeout(timeout);
  }
};
