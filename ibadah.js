import { makeShareButton, makeShareUrl } from './share-content.js?v=20261109-share-1';
import * as Adhan from './vendor/adhan-4.4.6/adhan.esm.min.js';
const API = 'https://equran.id';
const CACHE_DB = 'quran-oyen-islamic-api';
const CACHE_STORE = 'responses';
const memory = new Map();
let database;

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};
const hasArabicScript = (value) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(String(value ?? ''));

const TEXT = {
  id: {
    featureTitle: 'Fitur ibadah', vectorTitle: 'Cari berdasarkan makna', vectorSub: 'Temukan ayat dan tafsir dengan pertanyaan sehari-hari.',
    doaFeature: 'Doa, Wirid, Maulid & Tahlil', doaSub: 'Kumpulan bacaan Arab dan tautan sumber resmi.', prayerFeature: 'Jadwal salat', prayerSub: 'Hitung waktu lokal dengan GPS atau pilih kota secara manual.',
    vectorPanel: 'Pencarian makna Al-Qur’an', vectorHint: 'Tulis pertanyaan dalam bahasa sehari-hari. Pencarian dikirim ke EQuran.id.',
    vectorPlaceholder: 'Contoh: ayat tentang sabar menghadapi cobaan', vectorButton: 'Cari makna', vectorType: 'Jenis hasil', vectorAll: 'Ayat dan tafsir', vectorAyat: 'Ayat saja', vectorTafsir: 'Tafsir saja',
    vectorLoading: 'Mencari ayat dan tafsir…', vectorEmpty: 'Belum ada hasil yang cocok. Coba ubah pertanyaan atau gunakan kata yang lebih spesifik.', vectorError: 'Pencarian belum berhasil. Periksa koneksi lalu coba lagi.',
    results: (n) => `${n} hasil`, ayah: (s, a) => `${s} · Ayat ${a}`, ayatType: 'Ayat', tafsirType: 'Tafsir', relevance: 'Kecocokan',
    openAyah: 'Buka ayat', openTafsir: 'Buka tafsir ayat', playAyah: 'Putar ayat', latin: 'Latin', translation: 'Terjemahan',
    doaPanel: 'Bacaan ibadah', doaHint: 'Kumpulan doa dengan teks Arab, Latin, dan arti. Cari bacaan atau pilih kategori.', wiridHint: 'Wirid dan dzikir dari katalog EQuran.id. Untuk koleksi lengkap, buka sumber resmi NU Online.', doaSearch: 'Cari doa, wirid, atau kata…', doaCategory: 'Kategori', allGroups: 'Semua kategori', doaLoading: 'Memuat daftar doa dan dzikir…', doaError: 'Daftar doa belum dapat dimuat. Periksa koneksi lalu coba lagi.', doaEmpty: 'Tidak ada bacaan yang cocok dengan pencarian ini.', wiridEmpty: 'Belum ada bacaan wirid yang cocok. Coba kata lain atau buka koleksi resmi NU Online.',
    doaTab: 'Doa', wiridTab: 'Wirid', maulidTab: 'Maulid', tahlilTab: 'Tahlil', maulidTitle: 'Bacaan Maulid', maulidDescription: 'Buka kumpulan Maulid dari sumber resmi Quran NU Online.', maulidOpen: 'Buka bacaan Maulid', tahlilTitle: 'Bacaan Tahlil', tahlilDescription: 'Buka kumpulan Tahlil dari sumber resmi Quran NU Online.', tahlilOpen: 'Buka bacaan Tahlil',
    readLatin: 'Bacaan Latin', meaning: 'Arti', moreInfo: 'Keterangan dan sumber', tags: 'Tag', sourceNoteLabel: 'Keterangan sumber', sourceOnlyEntry: 'Sumber katalog tidak menyertakan teks doa Arab, bacaan Latin, atau arti Indonesia untuk entri ini.',
    prayerPanel: 'Jadwal salat', prayerHint: 'Hitung waktu salat langsung di perangkat dengan lokasi GPS, atau pilih provinsi dan kota.', prayerUseLocation: 'Gunakan lokasi saat ini', prayerLocationPrivacy: 'Koordinat hanya dipakai di perangkat untuk menghitung jadwal; tidak dikirim ke layanan lain atau disimpan.', prayerGpsLoading: 'Meminta izin lokasi dan menghitung di perangkat…', prayerGpsDenied: 'Izin lokasi ditolak. Izinkan akses lokasi di browser atau pilih kota secara manual.', prayerGpsUnavailable: 'Lokasi tidak dapat ditentukan. Periksa pengaturan lokasi perangkat atau pilih kota secara manual.', prayerGpsTimeout: 'Permintaan lokasi terlalu lama. Coba lagi atau pilih kota secara manual.', currentLocation: 'Lokasi saat ini', province: 'Provinsi', city: 'Kabupaten/kota', chooseProvince: 'Pilih provinsi', chooseCity: 'Pilih kabupaten/kota',
    prayerLoadingProvince: 'Memuat daftar provinsi…', prayerLoadingCity: 'Memuat kabupaten/kota…', prayerLoading: 'Menghitung jadwal di perangkat…', prayerError: 'Jadwal belum dapat dihitung. Periksa lokasi atau pilih kota secara manual.', chooseLocation: 'Gunakan lokasi saat ini atau pilih provinsi dan kabupaten/kota.',
    prayerSettings: 'Pengaturan perhitungan', prayerMethod: 'Metode waktu salat', prayerMadhab: 'Metode Asar', shafi: 'Syafi’i', hanafi: 'Hanafi', prayerSettingsNote: 'Pengaturan ini berlaku untuk lokasi GPS; jadwal kota mengikuti EQuran.id.', prayerNext: 'Salat berikutnya', prayerStartsIn: 'Menuju waktu salat', prayerTomorrow: 'besok', qibla: 'Arah kiblat', qiblaUnavailable: 'Tentukan lokasi GPS untuk menghitung arah kiblat.', onDevice: 'Dihitung di perangkat', noUpcoming: 'Jadwal salat berikutnya belum tersedia.',
    methodNames: { kemenag: 'Kemenag RI · 20°/18°', singapore: 'Singapura · 20°/18°', mwl: 'Muslim World League · 18°/17°', egyptian: 'Otoritas Survei Mesir · 19,5°/17,5°' },
    today: 'Jadwal hari ini', monthSchedule: 'Jadwal satu bulan', todayNone: 'Tidak ada jadwal untuk tanggal ini pada bulan yang dipilih.', previousMonth: 'Bulan sebelumnya', nextMonth: 'Bulan berikutnya', currentMonth: 'Kembali ke bulan ini',
    prayers: ['Imsak', 'Subuh', 'Terbit', 'Dhuha', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'], date: 'Tanggal', source: 'Jadwal GPS dihitung lokal dengan adhan-js; metode awal Kemenag RI (20°/18°). Jadwal kota manual dari EQuran.id.',
    cached: 'Data ditampilkan dari cache perangkat; sambungkan internet untuk memperbarui.', cachedShort: 'Data tersimpan di perangkat.',
  },
  en: {
    featureTitle: 'Worship tools', vectorTitle: 'Search by meaning', vectorSub: 'Find ayat and tafsir using everyday questions.',
    doaFeature: 'Dua, Wird, Mawlid & Tahlil', doaSub: 'Arabic readings and links to official collections.', prayerFeature: 'Prayer times', prayerSub: 'Calculate locally with GPS or choose a city manually.',
    vectorPanel: 'Quran meaning search', vectorHint: 'Ask in natural language. Your search is sent to EQuran.id.',
    vectorPlaceholder: 'Example: verses about patience in hardship', vectorButton: 'Search meaning', vectorType: 'Result type', vectorAll: 'Ayat and tafsir', vectorAyat: 'Ayat only', vectorTafsir: 'Tafsir only',
    vectorLoading: 'Searching ayat and tafsir…', vectorEmpty: 'No matching results. Try rephrasing or making your question more specific.', vectorError: 'Search failed. Check your connection and try again.',
    results: (n) => `${n} results`, ayah: (s, a) => `${s} · Ayah ${a}`, ayatType: 'Ayat', tafsirType: 'Tafsir', relevance: 'Match',
    openAyah: 'Open ayah', openTafsir: 'Open ayah tafsir', playAyah: 'Play ayah', latin: 'Latin', translation: 'Translation',
    doaPanel: 'Worship readings', doaHint: 'Browse duas with Arabic, transliteration, and meaning. Search or choose a category.', wiridHint: 'Wird and dhikr from the EQuran.id catalogue. Open NU Online for its full collection.', doaSearch: 'Search dua, wird, or a word…', doaCategory: 'Category', allGroups: 'All categories', doaLoading: 'Loading duas and dhikr…', doaError: 'The dua list is unavailable. Check your connection and try again.', doaEmpty: 'No readings match this search.', wiridEmpty: 'No matching wird readings. Try another word or open the official NU Online collection.',
    doaTab: 'Dua', wiridTab: 'Wird', maulidTab: 'Mawlid', tahlilTab: 'Tahlil', maulidTitle: 'Mawlid readings', maulidDescription: 'Open the Mawlid collection from the official Quran NU Online source.', maulidOpen: 'Open Mawlid readings', tahlilTitle: 'Tahlil readings', tahlilDescription: 'Open the Tahlil collection from the official Quran NU Online source.', tahlilOpen: 'Open Tahlil readings',
    readLatin: 'Latin transliteration', meaning: 'Meaning (Indonesian)', moreInfo: 'Notes and source', tags: 'Tags', sourceNoteLabel: 'Source note', sourceOnlyEntry: 'The catalogue source does not provide Arabic prayer text, Latin transliteration, or an Indonesian meaning for this entry.',
    prayerPanel: 'Prayer times', prayerHint: 'Calculate prayer times on your device with GPS, or choose a province and city.', prayerUseLocation: 'Use current location', prayerLocationPrivacy: 'Coordinates are used only on this device to calculate times; they are not sent to another service or saved.', prayerGpsLoading: 'Requesting location permission and calculating on device…', prayerGpsDenied: 'Location permission was denied. Allow location in your browser or choose a city manually.', prayerGpsUnavailable: 'Your location is unavailable. Check device location settings or choose a city manually.', prayerGpsTimeout: 'The location request took too long. Try again or choose a city manually.', currentLocation: 'Current location', province: 'Province', city: 'City / regency', chooseProvince: 'Choose a province', chooseCity: 'Choose a city / regency',
    prayerLoadingProvince: 'Loading provinces…', prayerLoadingCity: 'Loading cities…', prayerLoading: 'Calculating prayer times on device…', prayerError: 'Prayer times could not be calculated. Check the location or choose a city manually.', chooseLocation: 'Use your current location or choose a province and city.',
    prayerSettings: 'Calculation settings', prayerMethod: 'Prayer time method', prayerMadhab: 'Asr method', shafi: 'Shafi', hanafi: 'Hanafi', prayerSettingsNote: 'These settings apply to GPS locations; city schedules use EQuran.id.', prayerNext: 'Next prayer', prayerStartsIn: 'Time until prayer', prayerTomorrow: 'tomorrow', qibla: 'Qibla direction', qiblaUnavailable: 'Set a GPS location to calculate the Qibla direction.', onDevice: 'Calculated on device', noUpcoming: 'The next prayer time is not available.',
    methodNames: { kemenag: 'Kemenag RI · 20°/18°', singapore: 'Singapore · 20°/18°', mwl: 'Muslim World League · 18°/17°', egyptian: 'Egyptian Survey Authority · 19.5°/17.5°' },
    today: 'Today’s prayer times', monthSchedule: 'Monthly schedule', todayNone: 'No schedule for this date in the selected month.', previousMonth: 'Previous month', nextMonth: 'Next month', currentMonth: 'Back to this month',
    prayers: ['Imsak', 'Fajr', 'Sunrise', 'Duha', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'], date: 'Date', source: 'GPS schedules are calculated locally with adhan-js; Kemenag RI (20°/18°) is the default. Manual city schedules use EQuran.id.',
    cached: 'Showing saved device data; connect to the internet to refresh.', cachedShort: 'Data saved on this device.',
  },
};

const LOCAL_READER_TEXT = {
  id: {
    doaFeature: 'Doa, Wirid, Maulid & Tahlil', doaSub: 'Bacaan tersedia langsung di situs ini tanpa membuka halaman lain.',
    doaHint: 'Kumpulan doa dan wirid dengan teks Arab, Latin, dan arti. Cari bacaan atau pilih kategori.',
    wiridHint: 'Katalog doa dan wirid disimpan langsung di situs ini.', doaLoading: 'Memuat katalog lokal…',
    doaError: 'Katalog doa belum dapat dibuka. Coba muat ulang halaman.',
    wiridEmpty: 'Belum ada bacaan wirid yang cocok. Coba kata lain.',
    maulidDescription: 'Baca 18 bab Maulid Barzanji dan doa penutup tanpa meninggalkan situs ini.',
    tahlilDescription: 'Rangkaian Tahlil dan doa arwah tersedia di sini dalam Arab, Latin, dan arti.',
    localBadge: 'Tersimpan lokal', section: 'Pilih bagian', previous: 'Sebelumnya', next: 'Berikutnya', copy: 'Salin bacaan',
    copied: 'Bacaan disalin.', copyError: 'Fitur salin tidak tersedia di browser ini.',
    localLoading: 'Memuat bacaan lokal…', localError: 'Bacaan belum dapat dibuka. Coba muat ulang halaman.',
    localShort: 'tersedia langsung di situs ini',
  },
  en: {
    doaFeature: 'Dua, Wird, Mawlid & Tahlil', doaSub: 'Read everything here without opening another site.',
    doaHint: 'Browse duas and wird with Arabic, Latin transliteration, and meaning. Search or choose a category.',
    wiridHint: 'The dua and wird catalogue is stored directly on this site.', doaLoading: 'Loading the local catalogue…',
    doaError: 'The dua catalogue could not be opened. Reload the page and try again.',
    wiridEmpty: 'No matching wird readings. Try another word.',
    maulidDescription: 'Read all 18 chapters of Maulid Barzanji and its closing dua without leaving this site.',
    tahlilDescription: 'The Tahlil and funeral prayer sequence is available here in Arabic, Latin, and meaning.',
    localBadge: 'Saved locally', section: 'Choose a section', previous: 'Previous', next: 'Next', copy: 'Copy reading',
    copied: 'Reading copied.', copyError: 'Copy is unavailable in this browser.',
    localLoading: 'Loading the local reading…', localError: 'The reading could not be opened. Reload the page and try again.',
    localShort: 'available directly on this site',
  },
};
Object.assign(TEXT.id, LOCAL_READER_TEXT.id);
Object.assign(TEXT.en, LOCAL_READER_TEXT.en);

function openDatabase() {
  if (database) return database;
  database = new Promise((resolve) => {
    if (!globalThis.indexedDB) { resolve(null); return; }
    try {
      const request = indexedDB.open(CACHE_DB, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(CACHE_STORE)) request.result.createObjectStore(CACHE_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return database;
}

async function readCache(key) {
  if (memory.has(key)) return memory.get(key);
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const request = db.transaction(CACHE_STORE, 'readonly').objectStore(CACHE_STORE).get(key);
      request.onsuccess = () => {
        const value = request.result ?? null;
        if (value) memory.set(key, value);
        resolve(value);
      };
      request.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function writeCache(key, value) {
  memory.set(key, value);
  const db = await openDatabase();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const request = db.transaction(CACHE_STORE, 'readwrite').objectStore(CACHE_STORE).put(value, key);
      request.onsuccess = request.onerror = () => resolve();
    } catch { resolve(); }
  });
}

async function request(url, { method = 'GET', body, cache = true, validate = (x) => x } = {}) {
  const serialized = body ? JSON.stringify(body) : '';
  const key = `${method}:${url}:${serialized}`;
  const cached = cache ? await readCache(key) : null;
  const readSaved = () => {
    if (!cached) return null;
    return { data: validate(cached), cached: true };
  };
  if (globalThis.navigator?.onLine === false) {
    const saved = readSaved();
    if (saved) return saved;
    throw new Error('Offline');
  }
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), 16000) : 0;
  try {
    const response = await fetch(url, {
      method, mode: 'cors', credentials: 'omit', signal: controller?.signal,
      headers: body ? { Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json' },
      cache: cache ? 'default' : 'no-store',
      ...(body ? { body: serialized } : {}),
    });
    let payload;
    try { payload = await response.json(); } catch { throw new Error('Respons API bukan JSON.'); }
    if (!response.ok) throw new Error(payload?.message || `EQuran.id: HTTP ${response.status}`);
    const data = validate(payload);
    if (cache) await writeCache(key, payload);
    return { data, cached: false };
  } catch (error) {
    const saved = readSaved();
    if (saved) return saved;
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function localRequest(path, { validate = (x) => x, cache = true } = {}) {
  const url = new URL(path, document.baseURI).href;
  const key = `GET:${url}:`;
  const cached = cache ? await readCache(key) : null;
  const readSaved = () => cached ? { data: validate(cached), cached: true } : null;
  try {
    const response = await fetch(url, {
      method: 'GET', mode: 'same-origin', credentials: 'same-origin',
      headers: { Accept: 'application/json' }, cache: 'default',
    });
    if (!response.ok) throw new Error(`Local data: HTTP ${response.status}`);
    const payload = await response.json();
    const data = validate(payload);
    if (cache) await writeCache(key, payload);
    return { data, cached: false };
  } catch (error) {
    const saved = readSaved();
    if (saved) return saved;
    throw error;
  }
}

function doaList(payload) {
  if (payload?.status !== 'success' || !Array.isArray(payload.data)) throw new Error(payload?.message || 'Format daftar doa tidak valid.');
  return payload.data;
}
function localReadingEnvelope(payload) {
  if (payload?.schemaVersion !== 1 || !Array.isArray(payload.items) || !payload.items.length
    || !payload.items.every((item) => typeof item?.title === 'string' && typeof item?.ar === 'string' && typeof item?.idn === 'string')) {
    throw new Error('Format bacaan lokal tidak valid.');
  }
  return payload;
}
function arrayData(payload) {
  if (payload?.code !== 200 || !Array.isArray(payload.data)) throw new Error(payload?.message || 'Format daftar lokasi tidak valid.');
  return payload.data;
}
function scheduleData(payload) {
  if (payload?.code !== 200 || !payload.data || !Array.isArray(payload.data.jadwal)) throw new Error(payload?.message || 'Format jadwal salat tidak valid.');
  return payload.data;
}
const SHARED_PRAYER_KEYS = ['imsak', 'subuh', 'terbit', 'dhuha', 'dzuhur', 'ashar', 'maghrib', 'isya'];
export function encodeSharedPrayerSchedule(jadwal) {
  if (!Array.isArray(jadwal) || !jadwal.length || jadwal.length > 31) return '';
  const rows = jadwal.map((entry) => {
    const date = /-(\d{2})$/.exec(String(entry?.tanggal_lengkap ?? ''));
    const day = String(date?.[1] ?? entry?.tanggal ?? '').padStart(2, '0');
    if (!/^\d{2}$/.test(day) || Number(day) < 1 || Number(day) > 31) return '';
    const values = SHARED_PRAYER_KEYS.map((key) => {
      const match = /^(\d{1,2}):([0-5]\d)/.exec(String(entry?.[key] ?? '').trim());
      if (!match || Number(match[1]) > 23) return '---';
      const minutes = Number(match[1]) * 60 + Number(match[2]);
      return minutes.toString(36).padStart(3, '0');
    });
    return `${day}${values.join('')}`;
  });
  return rows.some((row) => !row) ? '' : rows.join('.');
}
export function decodeSharedPrayerSchedule(value, month) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(month));
  if (!match || !/^[0-9a-z.\-]{1,900}$/i.test(String(value ?? ''))) return null;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (year < 1900 || year > 2100 || monthNumber < 1 || monthNumber > 12) return null;
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const rows = String(value).split('.');
  if (!rows.length || rows.length > daysInMonth) return null;
  const seen = new Set();
  const jadwal = [];
  for (const row of rows) {
    if (row.length !== 2 + SHARED_PRAYER_KEYS.length * 3) return null;
    const day = Number(row.slice(0, 2));
    if (day < 1 || day > daysInMonth || seen.has(day)) return null;
    seen.add(day);
    const tanggal = String(day).padStart(2, '0');
    const entry = { tanggal, tanggal_lengkap: `${match[1]}-${match[2]}-${tanggal}` };
    for (let index = 0; index < SHARED_PRAYER_KEYS.length; index += 1) {
      const code = row.slice(2 + index * 3, 5 + index * 3);
      if (code === '---') { entry[SHARED_PRAYER_KEYS[index]] = '—'; continue; }
      if (!/^[0-9a-z]{3}$/i.test(code)) return null;
      const minutes = Number.parseInt(code, 36);
      if (!Number.isFinite(minutes) || minutes < 0 || minutes >= 1440) return null;
      entry[SHARED_PRAYER_KEYS[index]] = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    }
    jadwal.push(entry);
  }
  return jadwal;
}
function vectorResults(payload) {
  if (payload?.status !== 'sukses' || !Array.isArray(payload.hasil)) throw new Error(payload?.message || 'Format hasil pencarian tidak valid.');
  return payload.hasil;
}

const getDoa = () => localRequest('data/ibadah/doa.json', { validate: doaList });
const getProvinces = () => request(`${API}/api/v2/shalat/provinsi`, { validate: arrayData });
const getCities = (province) => request(`${API}/api/v2/shalat/kabkota`, { method: 'POST', body: { provinsi: province }, validate: arrayData });
const getSchedule = (province, city, month, year) => request(`${API}/api/v2/shalat`, {
  method: 'POST', body: { provinsi: province, kabkota: city, bulan: month, tahun: year }, validate: scheduleData,
});
const searchVector = (query, kind) => request(`${API}/api/vector`, {
  method: 'POST', body: { cari: query, batas: 8, ...(kind === 'ayat' || kind === 'tafsir' ? { tipe: [kind] } : {}) },
  cache: false, validate: vectorResults,
});

function readLocation() {
  try {
    const saved = JSON.parse(localStorage.getItem('quran-oyen-prayer-location') || 'null');
    return saved && typeof saved.province === 'string' && typeof saved.city === 'string' ? saved : { province: '', city: '' };
  } catch { return { province: '', city: '' }; }
}
function saveLocation(province, city) {
  try { localStorage.setItem('quran-oyen-prayer-location', JSON.stringify({ province, city })); } catch {}
}
function readPrayerSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('quran-oyen-prayer-settings') || 'null');
    return {
      method: ['kemenag', 'singapore', 'mwl', 'egyptian'].includes(saved?.method) ? saved.method : 'kemenag',
      madhab: saved?.madhab === 'hanafi' ? 'hanafi' : 'shafi',
    };
  } catch { return { method: 'kemenag', madhab: 'shafi' }; }
}
function savePrayerSettings(settings) {
  try { localStorage.setItem('quran-oyen-prayer-settings', JSON.stringify(settings)); } catch {}
}
function formatNumber(value, lang) { return new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US').format(value); }
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

const OBLIGATORY_PRAYERS = [
  ['subuh', 1], ['dzuhur', 4], ['ashar', 5], ['maghrib', 6], ['isya', 7],
];

function prayerCalculationParameters(adhan, method, madhab) {
  let params;
  if (method === 'singapore') params = adhan.CalculationMethod.Singapore();
  else if (method === 'mwl') params = adhan.CalculationMethod.MuslimWorldLeague();
  else if (method === 'egyptian') params = adhan.CalculationMethod.Egyptian();
  else {
    params = adhan.CalculationMethod.Other();
    params.fajrAngle = 20;
    params.ishaAngle = 18;
  }
  params.madhab = madhab === 'hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
  return params;
}

function prayerClock(date, timeZone) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date);
}

function subtractClockMinutes(clock, amount) {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(String(clock));
  if (!match) return '—';
  const minutes = (Number(match[1]) * 60 + Number(match[2]) - amount + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function coordinatePrayerRow(adhan, coordinates, date, params, timeZone) {
  const times = new adhan.PrayerTimes(coordinates, date, params);
  if (!['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].every((key) => times[key] instanceof Date && Number.isFinite(times[key].getTime()))) {
    throw new Error('Waktu salat tidak dapat dihitung untuk tanggal dan lokasi ini.');
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const key = `${year}-${month}-${day}`;
  const weekday = new Intl.DateTimeFormat('id-ID', { timeZone, weekday: 'long' }).format(date);
  const subuh = prayerClock(times.fajr, timeZone);
  return {
    tanggal_lengkap: key, tanggal: day, hari: weekday,
    imsak: subtractClockMinutes(subuh, 10), subuh,
    terbit: prayerClock(times.sunrise, timeZone),
    dzuhur: prayerClock(times.dhuhr, timeZone),
    ashar: prayerClock(times.asr, timeZone),
    maghrib: prayerClock(times.maghrib, timeZone),
    isya: prayerClock(times.isha, timeZone),
  };
}

export function calculateCoordinatePrayerMonth({ latitude, longitude, year, month, timeZone = 'Asia/Jakarta', method = 'kemenag', madhab = 'shafi' }, adhan = Adhan) {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180
    || !Number.isInteger(year) || year < 1900 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Lokasi atau bulan tidak valid.');
  }
  const coordinates = new adhan.Coordinates(latitude, longitude);
  const params = prayerCalculationParameters(adhan, method, madhab);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const jadwal = [];
  for (let day = 1; day <= days; day += 1) {
    jadwal.push(coordinatePrayerRow(adhan, coordinates, new Date(Date.UTC(year, month - 1, day, 12)), params, timeZone));
  }
  const nextDate = new Date(Date.UTC(year, month - 1, days + 1, 12));
  const nextDay = coordinatePrayerRow(adhan, coordinates, nextDate, params, timeZone);
  const qibla = adhan.Qibla(coordinates);
  if (!Number.isFinite(qibla)) throw new Error('Arah kiblat tidak dapat dihitung.');
  return { jadwal, nextDay, qibla, method, madhab, timeZone };
}

function localDateKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateAtZonedClock(key, clock, timeZone) {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key));
  const time = /^(\d{1,2}):([0-5]\d)$/.exec(String(clock));
  if (!date || !time) return null;
  const target = Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3]), Number(time[1]), Number(time[2]));
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(instant));
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
    const observed = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute);
    const adjustment = target - observed;
    instant += adjustment;
    if (!adjustment) break;
  }
  return new Date(instant);
}

function zoneForProvince(province) {
  const value = String(province || '').toLowerCase();
  if (/papua|maluku/.test(value)) return 'Asia/Jayapura';
  if (/bali|nusa tenggara|sulawesi|kalimantan (selatan|timur|utara)/.test(value)) return 'Asia/Makassar';
  return 'Asia/Jakarta';
}

export function createIbadahFeatures({ sheets, onNavigate }) {
  if (!$('doa-tabs') || !$('prayer-use-location')) return null;
  let lang = 'id';
  let doaEntries = [];
  const localReadingData = { maulid: null, tahlil: null };
  const localReadingRequests = { maulid: null, tahlil: null };
  const localReadingIndexes = { maulid: 0, tahlil: 0 };
  let provinces = [];
  let schedule = null;
  let scheduleCached = false;
  let lastVectorResults = [];
  let lastVectorCached = false;
  let location = readLocation();
  let prayerSettings = readPrayerSettings();
  let selectedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let provinceRequest = null;
  let cityRequest = 0;
  let scheduleRequest = 0;
  let prayerBusy = false;
  let coordinateLocation = null;
  let activeReadingTab = 'doa';
  const isWiridEntry = (item) => /dzikir|zikir|wirid|istighfar|istigfar|taubat|adhkar|adzan|azan/i.test(
    [item?.nama, item?.grup, item?.tentang, ...(Array.isArray(item?.tag) ? item.tag : [])].filter(Boolean).join(' '),
  );
  const hasPrayerLocation = () => !!coordinateLocation || !!(location.province && location.city);

  const text = () => TEXT[lang];
  const panels = [
    ['vector-search', 'vector-close'], ['doa-panel', 'doa-close'], ['shalat-panel', 'shalat-close'],
  ];
  for (const [panel, close] of panels) {
    sheets.own(panel, { handle: '.panel-head' });
    $(`${close}`).addEventListener('click', () => sheets.close(panel));
  }

  function setStatus(node, message, error = false) {
    node.textContent = message;
    node.classList.toggle('is-error', !!error);
  }

  function updateShortcuts() {
    $('ibadah-title').textContent = text().featureTitle;
    $('feature-vector-title').textContent = text().vectorTitle;
    $('feature-vector-sub').textContent = text().vectorSub;
    $('feature-doa-title').textContent = text().doaFeature;
    $('feature-doa-sub').textContent = text().doaSub;
    $('feature-prayer-title').textContent = text().prayerFeature;
    $('feature-prayer-sub').textContent = text().prayerSub;
  }

  function setPanelText() {
    const w = text();
    $('vector-title').textContent = w.vectorPanel;
    $('vector-query-label').textContent = lang === 'id' ? 'Pertanyaan' : 'Question';
    $('vector-close').textContent = lang === 'id' ? 'Tutup' : 'Close';
    $('vector-hint').textContent = w.vectorHint;
    $('vector-query').placeholder = w.vectorPlaceholder;
    $('vector-submit').textContent = w.vectorButton;
    $('vector-type-label').textContent = w.vectorType;
    const vectorType = $('vector-type');
    vectorType.options[0].textContent = w.vectorAll;
    vectorType.options[1].textContent = w.vectorAyat;
    vectorType.options[2].textContent = w.vectorTafsir;

    $('doa-title').textContent = w.doaPanel;
    $('doa-close').textContent = lang === 'id' ? 'Tutup' : 'Close';
    $('doa-hint').textContent = w.doaHint;
    $('doa-tab-doa').textContent = w.doaTab;
    $('doa-tab-wirid').textContent = w.wiridTab;
    $('doa-tab-maulid').textContent = w.maulidTab;
    $('doa-tab-tahlil').textContent = w.tahlilTab;
    $('doa-maulid-title').textContent = w.maulidTitle;
    $('doa-maulid-description').textContent = w.maulidDescription;
    $('doa-tahlil-title').textContent = w.tahlilTitle;
    $('doa-tahlil-description').textContent = w.tahlilDescription;
    for (const type of ['maulid', 'tahlil']) {
      $(`doa-${type}-local-badge`).textContent = w.localBadge;
      $(`doa-${type}-section-label`).textContent = w.section;
      $(`doa-${type}-prev`).textContent = w.previous;
      $(`doa-${type}-next`).textContent = w.next;
      $(`doa-${type}-copy`).textContent = w.copy;
      $(`doa-${type}-share`).textContent = lang === 'id' ? 'Bagikan bacaan' : 'Share reading';
      $(`doa-${type}-latin-label`).textContent = w.readLatin;
      $(`doa-${type}-meaning-label`).textContent = w.meaning;
    }
    $('doa-search').placeholder = w.doaSearch;
    $('doa-search-label').textContent = lang === 'id' ? 'Cari bacaan' : 'Search readings';
    $('doa-category-label').textContent = w.doaCategory;
    if ($('doa-category').options.length) $('doa-category').options[0].textContent = w.allGroups;

    $('shalat-title').textContent = w.prayerPanel;
    $('shalat-close').textContent = lang === 'id' ? 'Tutup' : 'Close';
    $('shalat-hint').textContent = w.prayerHint;
    $('prayer-use-location').textContent = w.prayerUseLocation;
    $('prayer-location-privacy').textContent = w.prayerLocationPrivacy;
    $('province-label').textContent = w.province;
    $('city-label').textContent = w.city;
    if ($('prayer-province').options.length) $('prayer-province').options[0].textContent = w.chooseProvince;
    if ($('prayer-city').options.length) $('prayer-city').options[0].textContent = w.chooseCity;
    $('prayer-prev').ariaLabel = w.previousMonth;
    $('prayer-next').ariaLabel = w.nextMonth;
    $('prayer-now').textContent = w.currentMonth;
    $('prayer-prev').parentElement.setAttribute('aria-label', lang === 'id' ? 'Pilih bulan' : 'Choose month');
    $('prayer-settings-label').textContent = w.prayerSettings;
    $('prayer-method-label').textContent = w.prayerMethod;
    $('prayer-madhab-label').textContent = w.prayerMadhab;
    $('prayer-settings-note').textContent = w.prayerSettingsNote;
    for (const option of $('prayer-method').options) option.textContent = w.methodNames[option.value] || option.textContent;
    $('prayer-madhab').options[0].textContent = w.shafi;
    $('prayer-madhab').options[1].textContent = w.hanafi;
    $('prayer-method').value = prayerSettings.method;
    $('prayer-madhab').value = prayerSettings.madhab;
    const apiLink = (href) => el('a', { href, target: '_blank', rel: 'noopener noreferrer', textContent: lang === 'id' ? 'Dokumentasi API' : 'API docs' });
    $('vector-source').replaceChildren(document.createTextNode(lang === 'id' ? 'EQuran.id Vector Search · hasil tafsir mengikuti konten API. ' : 'EQuran.id Vector Search · tafsir follows the API content. '), apiLink('https://equran.id/apidev/vector'));
    $('doa-source').textContent = lang === 'id'
      ? 'Sumber bacaan: katalog EQuran.id, naskah Barzanji Alkhoirot.org, dan teks Tahlil Quran NU Online. Semuanya disimpan di situs ini; pembaca tidak mengalihkan Anda ke situs sumber.'
      : 'Reading sources: the EQuran.id catalogue, the Barzanji text from Alkhoirot.org, and the Tahlil text from Quran NU Online. All are stored on this site; the reader does not redirect to the source sites.';
    $('shalat-source').replaceChildren(document.createTextNode(`${w.source} `), apiLink('https://github.com/batoulapps/adhan-js'), document.createTextNode(' · '), apiLink('https://equran.id/apidev/shalat'));

    updateShortcuts();
    setReadingTab(activeReadingTab);
    if (doaEntries.length) { updateDoaCategories(); renderDoa(); }
    if (lastVectorResults.length) renderVector(lastVectorResults);
    if (schedule) renderSchedule();
    renderMonthLabel();
  }

  function openVector() {
    sheets.open('vector-search');
    setTimeout(() => $('vector-query').focus({ preventScroll: true }), 90);
  }
  function setReadingTab(tab) {
    activeReadingTab = ['doa', 'wirid', 'maulid', 'tahlil'].includes(tab) ? tab : 'doa';
    const isCatalogue = activeReadingTab === 'doa' || activeReadingTab === 'wirid';
    for (const name of ['doa', 'wirid', 'maulid', 'tahlil']) {
      const button = $(`doa-tab-${name}`);
      button.setAttribute('aria-selected', String(activeReadingTab === name));
      button.tabIndex = activeReadingTab === name ? 0 : -1;
    }
    $('doa-tools').hidden = !isCatalogue;
    $('doa-hint').hidden = !isCatalogue;
    $('doa-list').hidden = !isCatalogue;
    $('doa-list').setAttribute('aria-labelledby', `doa-tab-${activeReadingTab}`);
    $('doa-maulid-view').hidden = activeReadingTab !== 'maulid';
    $('doa-tahlil-view').hidden = activeReadingTab !== 'tahlil';
    $('doa-hint').textContent = activeReadingTab === 'wirid' ? text().wiridHint : text().doaHint;
    if (!isCatalogue) {
      $('doa-status').textContent = '';
      if (activeReadingTab === 'maulid' || activeReadingTab === 'tahlil') loadLocalReading(activeReadingTab);
    }
    if (isCatalogue && doaEntries.length) { updateDoaCategories(); renderDoa(); }
  }
  function openDoa() {
    sheets.open('doa-panel');
    setReadingTab(activeReadingTab);
    if (activeReadingTab === 'doa' || activeReadingTab === 'wirid') {
      if (!doaEntries.length) loadDoa();
      else renderDoa();
    }
  }
  function openPrayer() {
    sheets.open('shalat-panel');
    updatePrayerCountdown();
    if (!provinces.length) loadProvinces();
    else if (hasPrayerLocation() && !schedule && !prayerBusy) loadPrayerSchedule();
  }

  $('feature-vector').addEventListener('click', openVector);
  $('feature-doa').addEventListener('click', openDoa);
  $('feature-prayer').addEventListener('click', openPrayer);
  $('prayer-use-location').addEventListener('click', useCurrentLocation);
  for (const id of ['prayer-method', 'prayer-madhab']) {
    $(`${id}`).addEventListener('change', () => {
      prayerSettings = { method: $('prayer-method').value, madhab: $('prayer-madhab').value };
      savePrayerSettings(prayerSettings);
      if (coordinateLocation) void loadPrayerSchedule();
      else if (schedule && !schedule.sharedSnapshot) setStatus($('prayer-status'), text().prayerSettingsNote);
    });
  }
  $('doa-tabs').addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) setReadingTab(tab.id.replace('doa-tab-', ''));
  });
  $('doa-tabs').addEventListener('keydown', (event) => {
    const tabs = [...$('doa-tabs').querySelectorAll('[role="tab"]')];
    const index = tabs.indexOf(event.target);
    if (index < 0) return;
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    tabs[next].focus();
    setReadingTab(tabs[next].id.replace('doa-tab-', ''));
  });

  $('vector-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = $('vector-query').value.trim();
    if (!query) { $('vector-query').focus(); return; }
    const submit = $('vector-submit');
    const status = $('vector-status');
    submit.disabled = true;
    $('vector-results').replaceChildren();
    setStatus(status, text().vectorLoading);
    $('vector-results').setAttribute('aria-busy', 'true');
    try {
      const response = await searchVector(query, $('vector-type').value);
      lastVectorResults = response.data;
      lastVectorCached = response.cached;
      renderVector(response.data);
      setStatus(status, response.cached ? text().cached : text().results(response.data.length));
    } catch (error) {
      lastVectorResults = [];
      setStatus(status, error?.name === 'AbortError' ? text().vectorError : text().vectorError, true);
    } finally {
      submit.disabled = false;
      $('vector-results').removeAttribute('aria-busy');
    }
  });

  function renderVector(results) {
    const w = text();
    const container = $('vector-results');
    container.replaceChildren();
    if (!Array.isArray(results) || !results.length) {
      container.append(el('p', { className: 'ibadah-empty', textContent: w.vectorEmpty }));
      return;
    }
    for (const result of results) {
      const data = result?.data ?? {};
      const type = result?.tipe === 'tafsir' ? 'tafsir' : 'ayat';
      const surahNumber = Number(data.id_surat ?? data.nomor_surat);
      const ayahNumber = Number(data.nomor_ayat ?? data.ayat);
      const surahName = String(data.nama_surat ?? data.namaLatin ?? data.nama_surat_latin ?? '');
      const card = el('article', { className: 'ibadah-card vector-card' });
      const head = el('div', { className: 'ibadah-card-head' });
      head.append(el('span', { className: `ibadah-badge ${type}`, textContent: type === 'tafsir' ? w.tafsirType : w.ayatType }));
      if (Number.isFinite(Number(result?.skor))) {
        const percent = Math.round(Math.max(0, Math.min(1, Number(result.skor))) * 100);
        head.append(el('span', { className: 'ibadah-score', textContent: `${w.relevance} · ${percent}%` }));
      } else if (result?.relevansi) head.append(el('span', { className: 'ibadah-score', textContent: String(result.relevansi) }));
      card.append(head);
      if (surahName || (Number.isInteger(surahNumber) && Number.isInteger(ayahNumber))) {
        const reference = surahName ? w.ayah(surahName, ayahNumber || '') : `${formatNumber(surahNumber, lang)}:${formatNumber(ayahNumber, lang)}`;
        card.append(el('h3', { className: 'ibadah-reference', textContent: reference }));
      }
      const arabic = data.teks_arab ?? data.ar ?? data.teksArab;
      if (arabic) card.append(el('p', { className: 'ibadah-arabic', lang: 'ar', dir: 'rtl', textContent: String(arabic) }));
      const latin = data.teks_latin ?? data.tr ?? data.transliterasi;
      if (latin) card.append(el('p', { className: 'ibadah-latin' }, el('b', { textContent: `${w.latin}: ` }), String(latin)));
      const translation = data.terjemahan_id ?? data.terjemahan ?? data.isi ?? data.teks ?? data.translation_id;
      if (translation) card.append(el('p', { className: 'ibadah-prose', dir: 'auto', textContent: String(translation) }));
      if (data.terjemahan_en && lang === 'en') card.append(el('p', { className: 'ibadah-prose ibadah-english', textContent: String(data.terjemahan_en) }));
      if (Number.isInteger(surahNumber) && surahNumber > 0 && Number.isInteger(ayahNumber) && ayahNumber > 0) {
        const actions = el('div', { className: 'ibadah-actions' });
        const open = el('button', { type: 'button', className: 'pill', textContent: type === 'tafsir' ? w.openTafsir : w.openAyah });
        open.addEventListener('click', () => { sheets.close('vector-search'); onNavigate(surahNumber, ayahNumber, type === 'tafsir' ? 'tafsir' : 'open'); });
        const play = el('button', { type: 'button', className: 'pill solid', textContent: w.playAyah });
        play.addEventListener('click', () => { sheets.close('vector-search'); onNavigate(surahNumber, ayahNumber, 'play'); });
        const share = makeShareButton({
          title: `${surahName || `QS. ${surahNumber}`} · Ayat ${ayahNumber}${type === 'tafsir' ? ' · Tafsir' : ''} · Quran Oyen`,
          text: [arabic && String(arabic), latin && `${w.latin}: ${latin}`, translation && `${w.translation}: ${translation}`, 'Sumber: EQuran.id Vector Search.'].filter(Boolean).join('\n\n'),
          url: makeShareUrl({ surah: surahNumber, ayah: ayahNumber, ...(type === 'tafsir' ? { tafsir: '1' } : {}) }),
        }, { className: 'pill', label: type === 'tafsir' ? 'Bagikan tafsir' : 'Bagikan ayat' });
        actions.append(open, play, share);
        card.append(actions);
      }
      container.append(card);
    }
  }

  async function loadDoa() {
    const status = $('doa-status');
    $('doa-list').setAttribute('aria-busy', 'true');
    setStatus(status, text().doaLoading);
    try {
      const response = await getDoa();
      doaEntries = response.data;
      updateDoaCategories();
      renderDoa();
      if (activeReadingTab === 'maulid' || activeReadingTab === 'tahlil') status.textContent = '';
    } catch {
      if (activeReadingTab === 'doa' || activeReadingTab === 'wirid') setStatus(status, text().doaError, true);
      else status.textContent = '';
      $('doa-list').replaceChildren(el('p', { className: 'ibadah-empty', textContent: text().doaError }));
    } finally { $('doa-list').removeAttribute('aria-busy'); }
  }

  function updateDoaCategories() {
    const entries = activeReadingTab === 'wirid' ? doaEntries.filter(isWiridEntry) : doaEntries;
    const groups = [...new Set(entries.map((entry) => String(entry.grup ?? '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, lang === 'id' ? 'id' : 'en'));
    const select = $('doa-category');
    const selected = select.value;
    select.replaceChildren(el('option', { value: '', textContent: text().allGroups }), ...groups.map((group) => el('option', { value: group, textContent: group })));
    if (groups.includes(selected)) select.value = selected;
  }

  function renderDoa() {
    const w = text();
    const query = $('doa-search').value.trim().toLocaleLowerCase(lang === 'id' ? 'id-ID' : 'en-US');
    const group = $('doa-category').value;
    const list = $('doa-list');
    list.replaceChildren();
    let shown = 0;
    const fragment = document.createDocumentFragment();
    const entries = activeReadingTab === 'wirid' ? doaEntries.filter(isWiridEntry) : doaEntries;
    for (const item of entries) {
      const searchable = [item.nama, item.grup, item.ar, item.tr, item.idn, item.tentang, ...(Array.isArray(item.tag) ? item.tag : [])].filter(Boolean).join(' ').toLocaleLowerCase(lang === 'id' ? 'id-ID' : 'en-US');
      if ((group && item.grup !== group) || (query && !searchable.includes(query))) continue;
      shown++;
      const card = el('article', { className: 'ibadah-card dua-card' });
      const heading = el('div', { className: 'ibadah-card-head' }, el('span', { className: 'ibadah-badge dua', textContent: String(item.grup ?? w.doaPanel) }));
      if (item.id != null) heading.append(el('span', { className: 'ibadah-score', textContent: `#${formatNumber(item.id, lang)}` }));
      card.append(heading, el('h3', { className: 'ibadah-reference', textContent: String(item.nama ?? w.doaPanel) }));
      if (item.ar && hasArabicScript(item.ar)) {
        card.append(el('p', { className: 'ibadah-arabic dua-arabic', lang: 'ar', dir: 'rtl', textContent: String(item.ar) }));
      } else if (item.ar) {
        card.append(el('p', { className: 'ibadah-prose dua-source-text', dir: 'auto' }, el('b', { className: 'ibadah-field-label', textContent: `${w.sourceNoteLabel}: ` }), String(item.ar)));
        if (!item.tr && !item.idn) card.append(el('p', { className: 'ibadah-note ibadah-data-note', textContent: w.sourceOnlyEntry }));
      }
      if (item.tr) card.append(el('p', { className: 'ibadah-latin' }, el('b', { textContent: `${w.readLatin}: ` }), String(item.tr)));
      if (item.idn) card.append(el('p', { className: 'ibadah-prose', dir: 'auto' }, el('b', { className: 'ibadah-field-label', textContent: `${w.meaning}: ` }), String(item.idn)));
      if (item.tentang) {
        const more = el('details', { className: 'ibadah-more' });
        more.append(el('summary', { textContent: w.moreInfo }), el('p', { className: 'ibadah-prose', textContent: String(item.tentang) }));
        card.append(more);
      }
      if (Array.isArray(item.tag) && item.tag.length) card.append(el('p', { className: 'ibadah-tags' }, el('b', { textContent: `${w.tags}: ` }), item.tag.map((tag) => `#${tag}`).join(' ')));
      card.dataset.shareId = item.id == null ? '' : String(item.id);
      const shareText = [item.nama, item.ar, item.tr && `${w.readLatin}: ${item.tr}`, item.idn && `${w.meaning}: ${item.idn}`, item.grup && `Kategori: ${item.grup}`, item.tentang && `Keterangan: ${item.tentang}`].filter(Boolean).join('\n\n');
      card.append(el('div', { className: 'ibadah-actions' }, makeShareButton({
        title: `${item.nama || w.doaPanel} · Quran Oyen`,
        text: shareText,
        url: makeShareUrl({ share: 'doa', id: item.id, tab: activeReadingTab }),
      }, { className: 'pill', label: activeReadingTab === 'wirid' ? 'Bagikan wirid' : 'Bagikan doa' })));
      fragment.append(card);
    }
    if (shown) list.append(fragment);
    else list.append(el('p', { className: 'ibadah-empty', textContent: activeReadingTab === 'wirid' ? w.wiridEmpty : w.doaEmpty }));
    const status = $('doa-status');
    if (doaEntries.length) status.textContent = `${formatNumber(shown, lang)} · ${w.localShort}`;
  }

  function renderLocalReading(type) {
    const reading = localReadingData[type];
    if (!reading?.items?.length) return;
    const items = reading.items;
    const select = $(`doa-${type}-select`);
    const index = Math.max(0, Math.min(items.length - 1, localReadingIndexes[type]));
    localReadingIndexes[type] = index;
    if (select.options.length !== items.length) {
      select.replaceChildren(...items.map((item, i) => el('option', { value: String(i), textContent: item.title || `${text().section} ${i + 1}` })));
    }
    select.value = String(index);
    const item = items[index];
    $(`doa-${type}-progress`).textContent = `${lang === 'id' ? 'Bagian' : 'Part'} ${formatNumber(index + 1, lang)} ${lang === 'id' ? 'dari' : 'of'} ${formatNumber(items.length, lang)}`;
    $(`doa-${type}-ar`).textContent = item.ar || '';
    $(`doa-${type}-ar`).hidden = !item.ar;
    const latinField = $(`doa-${type}-latin-field`);
    latinField.hidden = !item.latin;
    $(`doa-${type}-latin`).textContent = item.latin || '';
    const meaningField = $(`doa-${type}-meaning-field`);
    meaningField.hidden = !item.idn;
    $(`doa-${type}-meaning`).textContent = item.idn || '';
    $(`doa-${type}-prev`).disabled = index === 0;
    $(`doa-${type}-next`).disabled = index === items.length - 1;
    const sourceNames = Array.isArray(reading.sources) ? reading.sources.map((source) => source.name).filter(Boolean).join(' · ') : '';
    $(`doa-${type}-source`).textContent = [sourceNames && `${lang === 'id' ? 'Sumber' : 'Source'}: ${sourceNames}`, reading.sourceNote].filter(Boolean).join('. ');
    const shareButton = $(`doa-${type}-share`);
    if (!shareButton.dataset.shareReady) {
      const ready = makeShareButton(() => {
        const current = localReadingData[type]?.items?.[localReadingIndexes[type]];
        const currentReading = localReadingData[type];
        const currentSources = Array.isArray(currentReading?.sources) ? currentReading.sources.map((source) => source.name).filter(Boolean).join(' · ') : '';
        return {
          title: `${current?.title || (type === 'maulid' ? text().maulidTitle : text().tahlilTitle)} · Quran Oyen`,
          text: [current?.title, current?.ar, current?.latin && `${text().readLatin}: ${current.latin}`, current?.idn && `${text().meaning}: ${current.idn}`, currentSources && `Sumber: ${currentSources}`, currentReading?.sourceNote].filter(Boolean).join('\n\n'),
          url: makeShareUrl({ share: 'reading', type, section: localReadingIndexes[type] }),
        };
      }, { className: 'pill reading-share', label: lang === 'id' ? 'Bagikan bacaan' : 'Share reading' });
      ready.id = `doa-${type}-share`;
      ready.dataset.shareReady = 'true';
      shareButton.replaceWith(ready);
    } else {
      shareButton.textContent = lang === 'id' ? 'Bagikan bacaan' : 'Share reading';
      shareButton.setAttribute('aria-label', shareButton.textContent);
    }
  }

  async function loadLocalReading(type) {
    if (localReadingData[type]) { renderLocalReading(type); return localReadingData[type]; }
    if (localReadingRequests[type]) return localReadingRequests[type];
    const status = $(`doa-${type}-status`);
    setStatus(status, text().localLoading);
    localReadingRequests[type] = localRequest(`data/ibadah/${type}.json`, { validate: localReadingEnvelope })
      .then(({ data }) => {
        localReadingData[type] = data;
        renderLocalReading(type);
        setStatus(status, `${formatNumber(data.items.length, lang)} ${lang === 'id' ? 'bagian' : 'sections'} · ${text().localShort}`);
        return data;
      })
      .catch(() => {
        setStatus(status, text().localError, true);
        return null;
      })
      .finally(() => { localReadingRequests[type] = null; });
    return localReadingRequests[type];
  }

  async function copyLocalReading(type) {
    const reading = localReadingData[type];
    const item = reading?.items?.[localReadingIndexes[type]];
    if (!item) return;
    const value = [item.title, item.ar, item.latin && `${text().readLatin}: ${item.latin}`, item.idn && `${text().meaning}: ${item.idn}`].filter(Boolean).join('\n\n');
    try {
      if (!globalThis.navigator?.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setStatus($(`doa-${type}-status`), text().copied);
    } catch {
      setStatus($(`doa-${type}-status`), text().copyError, true);
    }
  }

  for (const type of ['maulid', 'tahlil']) {
    $(`doa-${type}-select`).addEventListener('change', (event) => {
      localReadingIndexes[type] = Number(event.currentTarget.value) || 0;
      renderLocalReading(type);
    });
    $(`doa-${type}-prev`).addEventListener('click', () => {
      localReadingIndexes[type] = Math.max(0, localReadingIndexes[type] - 1);
      renderLocalReading(type);
    });
    $(`doa-${type}-next`).addEventListener('click', () => {
      localReadingIndexes[type] = Math.min((localReadingData[type]?.items?.length || 1) - 1, localReadingIndexes[type] + 1);
      renderLocalReading(type);
    });
    $(`doa-${type}-copy`).addEventListener('click', () => copyLocalReading(type));
  }

  $('doa-search').addEventListener('input', renderDoa);
  $('doa-category').addEventListener('change', renderDoa);

  function setOptions(select, placeholder, values, selected = '') {
    select.replaceChildren(el('option', { value: '', textContent: placeholder }), ...values.map((value) => el('option', { value, textContent: value })));
    if (values.includes(selected)) select.value = selected;
  }

  async function loadProvinces() {
    if (provinceRequest) return provinceRequest;
    const status = $('prayer-status');
    setStatus(status, text().prayerLoadingProvince);
    provinceRequest = getProvinces().then(async (response) => {
      provinces = response.data.map(String);
      const select = $('prayer-province');
      setOptions(select, text().chooseProvince, provinces, location.province);
      select.disabled = false;
      if (coordinateLocation || schedule?.sharedSnapshot) {
        // Keep a GPS or shared snapshot schedule visible while manual locations load.
      } else if (location.province && provinces.includes(location.province)) {
        await loadCities(location.province, location.city);
      } else {
        location = { province: '', city: '' };
        setOptions($('prayer-city'), text().chooseCity, [], '');
        $('prayer-city').disabled = true;
        setStatus(status, text().chooseLocation);
      }
      if (response.cached && !coordinateLocation && !schedule?.sharedSnapshot) setStatus(status, text().cached);
      return response;
    }).catch(() => {
      provinceRequest = null;
      if (!schedule) setStatus(status, text().prayerError, true);
      return null;
    });
    return provinceRequest;
  }

  async function loadCities(province, selectedCity = '') {
    const token = ++cityRequest;
    const select = $('prayer-city');
    setOptions(select, text().chooseCity, [], '');
    select.disabled = true;
    schedule = null;
    $('prayer-results').replaceChildren();
    if (!province) { setStatus($('prayer-status'), text().chooseLocation); return; }
    setStatus($('prayer-status'), text().prayerLoadingCity);
    try {
      const response = await getCities(province);
      if (token !== cityRequest) return;
      const cities = response.data.map(String);
      setOptions(select, text().chooseCity, cities, selectedCity);
      select.disabled = false;
      if (cities.includes(selectedCity)) {
        location = { province, city: selectedCity };
        saveLocation(province, selectedCity);
        await loadPrayerSchedule();
      } else {
        location = { province, city: '' };
        saveLocation(province, '');
        setStatus($('prayer-status'), text().chooseLocation);
      }
      if (response.cached && !selectedCity) setStatus($('prayer-status'), text().cached);
    } catch {
      if (token === cityRequest) setStatus($('prayer-status'), text().prayerError, true);
    }
  }

  async function loadPrayerSchedule() {
    if (!hasPrayerLocation()) { setStatus($('prayer-status'), text().chooseLocation); return; }
    const token = ++scheduleRequest;
    const coordinate = coordinateLocation;
    const coordinateBased = !!coordinate;
    prayerBusy = true;
    const month = selectedMonth.getMonth() + 1;
    const year = selectedMonth.getFullYear();
    setStatus($('prayer-status'), text().prayerLoading);
    $('prayer-results').setAttribute('aria-busy', 'true');
    renderMonthLabel();
    try {
      const response = coordinateBased
        ? { data: calculateCoordinatePrayerMonth({
          latitude: coordinate.latitude, longitude: coordinate.longitude, month, year,
          timeZone: coordinate.timezone, ...prayerSettings,
        }), cached: false }
        : await getSchedule(location.province, location.city, month, year);
      if (token !== scheduleRequest) return;
      schedule = { ...response.data, coordinateBased };
      scheduleCached = !!response.cached;
      renderSchedule();
      const label = coordinateBased
        ? `${text().currentLocation} · ${text().methodNames[prayerSettings.method]} · ${text().onDevice}`
        : `${schedule.kabkota}, ${schedule.provinsi} · EQuran.id`;
      setStatus($('prayer-status'), response.cached ? text().cached : label);
    } catch {
      if (token === scheduleRequest) {
        schedule = null;
        $('prayer-results').replaceChildren(el('p', { className: 'ibadah-empty', textContent: text().prayerError }));
        setStatus($('prayer-status'), text().prayerError, true);
      }
    } finally {
      if (token === scheduleRequest) {
        prayerBusy = false;
        $('prayer-results').removeAttribute('aria-busy');
      }
    }
  }

  async function useCurrentLocation() {
    const button = $('prayer-use-location');
    if (!globalThis.navigator?.geolocation) {
      setStatus($('prayer-status'), text().prayerGpsUnavailable, true);
      return;
    }
    button.disabled = true;
    setStatus($('prayer-status'), text().prayerGpsLoading);
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false, maximumAge: 60000, timeout: 12000,
      }));
      const latitude = Number(position?.coords?.latitude);
      const longitude = Number(position?.coords?.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error('invalid-location');
      coordinateLocation = {
        latitude, longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
      };
      scheduleRequest++;
      cityRequest++;
      schedule = null;
      await loadPrayerSchedule();
    } catch (error) {
      const message = error?.code === 1 ? text().prayerGpsDenied
        : error?.code === 3 ? text().prayerGpsTimeout
          : text().prayerGpsUnavailable;
      setStatus($('prayer-status'), message, true);
    } finally {
      button.disabled = false;
    }
  }

  function prayerTimeZone() {
    return schedule?.timeZone || coordinateLocation?.timezone || zoneForProvince(schedule?.provinsi || location.province)
      || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  }

  function upcomingPrayer(today, timeZone, now = new Date()) {
    if (!schedule || schedule.sharedSnapshot) return null;
    const currentDay = schedule.jadwal.find((entry) => entry.tanggal_lengkap === today);
    if (!currentDay) return null;
    const tomorrowDate = new Date(`${today}T12:00:00Z`);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const tomorrowKey = `${tomorrowDate.getUTCFullYear()}-${String(tomorrowDate.getUTCMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getUTCDate()).padStart(2, '0')}`;
    const tomorrow = schedule.jadwal.find((entry) => entry.tanggal_lengkap === tomorrowKey)
      || (schedule.nextDay?.tanggal_lengkap === tomorrowKey ? schedule.nextDay : null);
    for (const row of [currentDay, tomorrow].filter(Boolean)) {
      for (const [key, nameIndex] of OBLIGATORY_PRAYERS) {
        const at = dateAtZonedClock(row.tanggal_lengkap, row[key], timeZone);
        if (at && at > now) return { key, name: text().prayers[nameIndex], time: row[key], at, tomorrow: row === tomorrow };
      }
    }
    return null;
  }

  function durationLabel(milliseconds) {
    const seconds = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
  }

  function qiblaDirection(degrees) {
    const labels = lang === 'id' ? ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut']
      : ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    return labels[Math.round(degrees / 45) % 8];
  }

  function updatePrayerCountdown() {
    const countdown = $('prayer-countdown');
    if (!countdown || $('shalat-panel').hidden || !$('shalat-panel').contains(countdown)) return;
    const timeZone = prayerTimeZone();
    const today = localDateKey(new Date(), timeZone);
    const next = upcomingPrayer(today, timeZone);
    if (!next) {
      countdown.textContent = '—';
      countdown.setAttribute('aria-label', text().noUpcoming);
      return;
    }
    countdown.textContent = durationLabel(next.at.getTime() - Date.now());
    countdown.setAttribute('aria-label', `${text().prayerStartsIn} ${next.name}${next.tomorrow ? ` ${text().prayerTomorrow}` : ''}: ${countdown.textContent}`);
    $('prayer-next-name').textContent = next.name;
    $('prayer-next-time').textContent = `${next.time}${next.tomorrow ? ` · ${text().prayerTomorrow}` : ''}`;
    for (const step of $('prayer-timeline').children) step.classList.toggle('is-next', step.dataset.prayer === next.key);
  }

  function prayerColumns() {
    const w = text();
    const keys = schedule?.coordinateBased
      ? [['imsak', 0], ['subuh', 1], ['terbit', 2], ['dzuhur', 4], ['ashar', 5], ['maghrib', 6], ['isya', 7]]
      : [['imsak', 0], ['subuh', 1], ['terbit', 2], ['dhuha', 3], ['dzuhur', 4], ['ashar', 5], ['maghrib', 6], ['isya', 7]];
    return keys.map(([key, nameIndex]) => ({ key, name: w.prayers[nameIndex] }));
  }
  function renderSchedule() {
    const w = text();
    const target = $('prayer-results');
    target.replaceChildren();
    if (!schedule || !Array.isArray(schedule.jadwal)) return;
    if (schedule.sharedSnapshot && schedule.sharedPlace) {
      target.append(el('p', { className: 'ibadah-status', textContent: `${lang === 'id' ? 'Jadwal untuk' : 'Schedule for'}: ${schedule.sharedPlace}` }));
    }
    const timeZone = prayerTimeZone();
    const today = localDateKey(new Date(), timeZone);
    const todaySchedule = schedule.jadwal.find((entry) => entry.tanggal_lengkap === today);
    if (todaySchedule) {
      const current = el('section', { className: 'prayer-today' });
      const localDate = new Date(`${today}T12:00:00Z`);
      current.append(el('div', { className: 'prayer-today-head' },
        el('b', { textContent: w.today }),
        el('span', { textContent: new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(localDate) })));

      const upcoming = upcomingPrayer(today, timeZone);
      const hero = el('section', { className: 'prayer-hero', ariaLabel: w.prayerNext });
      const heroHead = el('div', { className: 'prayer-hero-head' });
      const nextCopy = el('div', { className: 'prayer-next-copy' },
        el('span', { className: 'prayer-eyebrow', textContent: w.prayerNext }),
        el('b', { id: 'prayer-next-name', textContent: upcoming?.name || w.noUpcoming }),
        el('span', { id: 'prayer-next-time', className: 'prayer-next-time', textContent: upcoming ? `${upcoming.time}${upcoming.tomorrow ? ` · ${w.prayerTomorrow}` : ''}` : '' }));
      const counter = el('div', { className: 'prayer-countdown-wrap' },
        el('span', { className: 'prayer-eyebrow', textContent: w.prayerStartsIn }),
        el('b', { id: 'prayer-countdown', className: 'prayer-countdown', role: 'timer', ariaLive: 'off', textContent: upcoming ? durationLabel(upcoming.at.getTime() - Date.now()) : '—' }));
      heroHead.append(nextCopy, counter);
      hero.append(heroHead);

      const timeline = el('ol', { id: 'prayer-timeline', className: 'prayer-timeline', ariaLabel: w.today });
      OBLIGATORY_PRAYERS.forEach(([key, nameIndex]) => {
        const at = dateAtZonedClock(today, todaySchedule[key], timeZone);
        const classes = ['prayer-step'];
        if (at && at <= new Date()) classes.push('is-past');
        if (upcoming?.key === key) classes.push('is-next');
        const step = el('li', { className: classes.join(' ') });
        step.dataset.prayer = key;
        step.append(
          el('span', { className: 'prayer-dot' }),
          el('span', { className: 'prayer-step-name', textContent: w.prayers[nameIndex] }),
          el('b', { textContent: String(todaySchedule[key] ?? '—') }));
        timeline.append(step);
      });
      hero.append(timeline);

      const meta = el('div', { className: 'prayer-hero-meta' });
      if (schedule.coordinateBased && Number.isFinite(schedule.qibla)) {
        const method = schedule.method || prayerSettings.method;
        meta.append(el('span', { className: 'prayer-method-chip', textContent: w.methodNames[method] || w.methodNames.kemenag }));
        const needle = el('span', { className: 'prayer-needle' });
        needle.style.transform = `rotate(${schedule.qibla}deg)`;
        const compass = el('span', { className: 'prayer-compass' }, needle);
        compass.setAttribute('aria-hidden', 'true');
        const bearing = Math.round(schedule.qibla);
        const qibla = el('span', { className: 'prayer-qibla', title: `${w.qibla}: ${bearing}°` }, compass,
          el('span', {}, el('small', { textContent: w.qibla }), el('b', { textContent: `${bearing}° · ${qiblaDirection(schedule.qibla)}` })));
        qibla.setAttribute('aria-label', `${w.qibla}: ${bearing}° ${qiblaDirection(schedule.qibla)}`);
        meta.append(qibla);
      } else {
        meta.append(el('span', { className: 'prayer-method-chip', textContent: schedule.sharedPlace || `${schedule.kabkota || location.city} · ${schedule.provinsi || location.province}` }));
      }
      hero.append(meta);
      current.append(hero);

      const times = el('div', { className: 'prayer-time-grid' });
      prayerColumns().forEach(({ key, name }) => times.append(el('div', { className: 'prayer-time' }, el('span', { textContent: name }), el('b', { textContent: String(todaySchedule[key] ?? '—') }))));
      current.append(times);
      target.append(current);
    } else {
      target.append(el('p', { className: 'ibadah-empty' }, el('b', { textContent: w.today }), ` — ${w.todayNone}`));
    }
    const details = el('details', { className: 'prayer-month' });
    details.append(el('summary', { textContent: w.monthSchedule }));
    const scroll = el('div', { className: 'prayer-table-scroll', tabindex: '0', ariaLabel: w.monthSchedule });
    const table = el('table', { className: 'prayer-table' });
    const header = el('tr');
    header.append(el('th', { scope: 'col', textContent: w.date }));
    const columns = prayerColumns();
    columns.forEach(({ name }) => header.append(el('th', { scope: 'col', textContent: name })));
    table.append(el('thead', {}, header));
    const body = el('tbody');
    for (const entry of schedule.jadwal) {
      const row = el('tr', { className: entry.tanggal_lengkap === today ? 'is-today' : '' });
      const dayLabel = schedule.coordinateBased && entry.tanggal_lengkap
        ? new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { timeZone, weekday: 'short' }).format(new Date(`${entry.tanggal_lengkap}T12:00:00Z`))
        : String(entry.hari ?? '');
      row.append(el('th', { scope: 'row', textContent: `${dayLabel} ${formatNumber(entry.tanggal, lang)}`.trim() }));
      for (const { key } of columns) row.append(el('td', { textContent: String(entry[key] ?? '—') }));
      body.append(row);
    }
    table.append(body);
    scroll.append(table);
    details.append(scroll);
    target.append(details);
    const place = schedule.sharedPlace || (schedule.coordinateBased
      ? (schedule.sharedSnapshot
        ? (lang === 'id' ? 'Berdasarkan lokasi pengirim (koordinat tidak dibagikan)' : 'Based on sender location (coordinates not shared)')
        : (lang === 'id' ? 'Lokasi saat ini (koordinat tidak dicantumkan)' : 'Current location (coordinates omitted)'))
      : [schedule.kabkota || location.city, schedule.provinsi || location.province].filter(Boolean).join(', '));
    const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
    const scheduleText = schedule.jadwal.map((entry) => {
      const day = entry.tanggal_lengkap || entry.tanggal || '';
      const timesText = columns.map(({ key, name }) => `${name}: ${entry[key] ?? '—'}`).join(' · ');
      return `${day} — ${timesText}`;
    }).join('\n');
    target.append(el('div', { className: 'ibadah-actions' }, makeShareButton({
      title: `${w.monthSchedule} · ${place || 'Quran Oyen'}`,
      text: [place && `Lokasi: ${place}`, `${w.monthSchedule} (${monthKey})`, scheduleText, w.source].filter(Boolean).join('\n\n'),
      url: makeShareUrl({ share: 'prayer-times', month: monthKey, schedule: encodeSharedPrayerSchedule(schedule.jadwal), mode: schedule.coordinateBased ? 'coordinate' : 'city', place }),
    }, { className: 'pill', label: lang === 'id' ? 'Bagikan jadwal' : 'Share schedule' })));
    if (schedule.sharedSnapshot) {
      target.append(el('p', { className: 'ibadah-status', textContent: lang === 'id'
        ? 'Jadwal ini disertakan dalam tautan berbagi. Pilih lokasi Anda untuk memuat ulang jadwal berdasarkan tempat Anda.'
        : 'This schedule is embedded in the shared link. Choose your location to refresh times for your area.' }));
    } else if (scheduleCached) target.append(el('p', { className: 'ibadah-status' }, w.cached));
    updatePrayerCountdown();
  }

  function renderMonthLabel() {
    const date = selectedMonth;
    $('prayer-month-label').textContent = date.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });
  }
  function shiftMonth(delta) {
    selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + delta, 1);
    schedule = null;
    renderMonthLabel();
    if (hasPrayerLocation()) loadPrayerSchedule();
  }
  $('prayer-prev').addEventListener('click', () => shiftMonth(-1));
  $('prayer-next').addEventListener('click', () => shiftMonth(1));
  $('prayer-now').addEventListener('click', () => {
    selectedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    if (hasPrayerLocation()) loadPrayerSchedule();
    else renderMonthLabel();
  });
  $('prayer-province').addEventListener('change', () => {
    scheduleRequest++;
    prayerBusy = false;
    $('prayer-results').removeAttribute('aria-busy');
    coordinateLocation = null;
    const province = $('prayer-province').value;
    location = { province, city: '' };
    saveLocation(province, '');
    cityRequest++;
    scheduleRequest++;
    provinceRequest = provinceRequest || Promise.resolve();
    if (!province) {
      setOptions($('prayer-city'), text().chooseCity, [], '');
      $('prayer-city').disabled = true;
      schedule = null;
      $('prayer-results').replaceChildren();
      setStatus($('prayer-status'), text().chooseLocation);
      return;
    }
    loadCities(province);
  });
  $('prayer-city').addEventListener('change', () => {
    scheduleRequest++;
    prayerBusy = false;
    $('prayer-results').removeAttribute('aria-busy');
    coordinateLocation = null;
    const city = $('prayer-city').value;
    location = { province: $('prayer-province').value, city };
    saveLocation(location.province, city);
    schedule = null;
    if (city) loadPrayerSchedule();
    else { $('prayer-results').replaceChildren(); setStatus($('prayer-status'), text().chooseLocation); }
  });

  async function openShared({ kind, type = '', id = '', tab = '', section = '', month = '', schedule: sharedSchedule = '', mode = '', place = '' } = {}) {
    if (kind === 'doa') {
      sheets.open('doa-panel');
      setReadingTab(tab === 'wirid' ? 'wirid' : 'doa');
      $('doa-search').value = '';
      if (!doaEntries.length) await loadDoa();
      updateDoaCategories();
      $('doa-category').value = '';
      renderDoa();
      const card = [...$('doa-list').children].find((item) => id && item.dataset.shareId === String(id));
      card?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    if (kind === 'reading' && ['maulid', 'tahlil'].includes(type)) {
      sheets.open('doa-panel');
      setReadingTab(type);
      await loadLocalReading(type);
      const index = Number(section);
      if (Number.isInteger(index) && index >= 0 && index < (localReadingData[type]?.items?.length || 0)) localReadingIndexes[type] = index;
      renderLocalReading(type);
      $(`doa-${type}-view`).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    if (kind === 'prayer-times') {
      sheets.open('shalat-panel');
      const match = /^(\d{4})-(\d{2})$/.exec(String(month));
      if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) {
        selectedMonth = new Date(Number(match[1]), Number(match[2]) - 1, 1);
        renderMonthLabel();
      }
      const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
      const sharedRows = decodeSharedPrayerSchedule(sharedSchedule, monthKey);
      if (sharedRows) {
        const safePlace = String(place ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120);
        schedule = {
          jadwal: sharedRows,
          coordinateBased: mode === 'coordinate',
          sharedSnapshot: true,
          sharedPlace: safePlace || (lang === 'id' ? 'Jadwal dari tautan berbagi' : 'Shared schedule'),
        };
        scheduleCached = false;
        renderSchedule();
        if (!provinces.length) void loadProvinces();
        setStatus($('prayer-status'), lang === 'id' ? 'Jadwal dibuka dari tautan berbagi; koordinat GPS tidak disertakan.' : 'Opened from a shared link; no GPS coordinates were included.');
      } else if (hasPrayerLocation()) {
        await loadPrayerSchedule();
      } else {
        if (!provinces.length) void loadProvinces();
        setStatus($('prayer-status'), text().chooseLocation);
      }
    }
  }

  function relang(newLang) {
    lang = newLang === 'en' ? 'en' : 'id';
    setPanelText();
  }
  relang('id');
  setInterval(() => {
    if (!$('shalat-panel').hidden && schedule) updatePrayerCountdown();
  }, 1000);
  return { relang, openShared };
}
