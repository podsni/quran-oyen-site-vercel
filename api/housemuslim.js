'use strict';

const API_BASE = 'https://api.housemuslim.org/api/v1';
const BOOKS = new Set(['bukhari', 'muslim', 'abu-dawud', 'tirmidzi', 'nasai', 'ibnu-majah', 'ahmad', 'malik', 'darimi']);
const ALLOWED_PARAMS = new Set(['path', 'q', 'page', 'per_page']);

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

function pageParam(params, name, fallback, max) {
  const raw = oneParam(params, name, { max: 10 });
  if (!raw) return fallback;
  if (!/^\d+$/.test(raw)) throw new Error('parameter');
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error('parameter');
  return value;
}

function targetFor(params) {
  for (const key of params.keys()) {
    if (!ALLOWED_PARAMS.has(key)) throw new Error('parameter');
    if (params.getAll(key).length !== 1) throw new Error('parameter');
  }
  const path = oneParam(params, 'path', { min: 1, max: 160, required: true });
  const query = new URLSearchParams();
  let upstreamPath = '';
  let cacheSeconds = 300;

  if (path === '/daily/today') {
    if (params.has('q') || params.has('page') || params.has('per_page')) throw new Error('parameter');
    upstreamPath = '/daily/today';
    cacheSeconds = 300;
  } else if (path === '/hadith/books') {
    if (params.has('q') || params.has('page') || params.has('per_page')) throw new Error('parameter');
    upstreamPath = '/hadith/books';
    cacheSeconds = 3600;
  } else {
    const search = /^\/hadith\/books\/([a-z0-9-]+)\/search$/.exec(path);
    const items = /^\/hadith\/books\/([a-z0-9-]+)\/items$/.exec(path);
    const detail = /^\/hadith\/books\/([a-z0-9-]+)\/items\/(\d{1,8})$/.exec(path);
    const match = search || items || detail;
    if (!match || !BOOKS.has(match[1])) throw new Error('path');
    if (search) {
      const q = oneParam(params, 'q', { min: 1, max: 100, required: true });
      query.set('q', q);
      query.set('page', String(pageParam(params, 'page', 1, 100000)));
      query.set('per_page', String(pageParam(params, 'per_page', 10, 50)));
      upstreamPath = `/hadith/books/${match[1]}/search`;
      cacheSeconds = 300;
    } else if (items) {
      if (params.has('q')) throw new Error('parameter');
      query.set('page', String(pageParam(params, 'page', 1, 100000)));
      query.set('per_page', String(pageParam(params, 'per_page', 10, 50)));
      upstreamPath = `/hadith/books/${match[1]}/items`;
      cacheSeconds = 600;
    } else {
      if (params.has('q') || params.has('page') || params.has('per_page') || Number(match[2]) < 1) throw new Error('parameter');
      upstreamPath = `/hadith/books/${match[1]}/items/${match[2]}`;
      cacheSeconds = 86400;
    }
  }

  const url = new URL(`${API_BASE}${upstreamPath}`);
  url.search = query.toString();
  return { url: url.toString(), cacheSeconds };
}

module.exports = async function houseMuslimProxy(req, res) {
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
    const invalidPath = error?.message === 'path';
    return json(res, 400, { success: false, message: invalidPath ? 'Rute data tidak dikenal.' : 'Parameter tidak valid.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const upstream = await fetch(target.url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      redirect: 'error',
    });
    if (!upstream.ok) {
      const retryAfter = upstream.headers.get('retry-after');
      if (upstream.status === 429 && retryAfter) res.setHeader('Retry-After', retryAfter);
      const status = upstream.status === 404 ? 404 : upstream.status === 429 ? 429 : 502;
      const message = status === 404 ? 'Data tidak ditemukan.'
        : status === 429 ? 'Batas permintaan layanan tercapai. Coba lagi nanti.'
          : 'Layanan data sementara tidak dapat diakses.';
      return json(res, status, { success: false, message });
    }

    const body = await upstream.text();
    if (body.length > 2_000_000) return json(res, 502, { success: false, message: 'Respons data terlalu besar.' });
    let payload;
    try { payload = JSON.parse(body); } catch { return json(res, 502, { success: false, message: 'Respons layanan data tidak valid.' }); }
    if (!payload || payload.success !== true) return json(res, 502, { success: false, message: 'Respons layanan data tidak valid.' });
    return json(res, 200, payload, `public, max-age=0, s-maxage=${target.cacheSeconds}, stale-while-revalidate=3600`);
  } catch (error) {
    const message = error?.name === 'AbortError' ? 'Layanan data terlalu lama merespons.' : 'Layanan data sementara tidak dapat diakses.';
    return json(res, 502, { success: false, message });
  } finally {
    clearTimeout(timeout);
  }
};
