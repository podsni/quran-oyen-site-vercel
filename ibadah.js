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

const TEXT = {
  id: {
    featureTitle: 'Fitur ibadah', vectorTitle: 'Cari berdasarkan makna', vectorSub: 'Temukan ayat dan tafsir dengan pertanyaan sehari-hari.',
    doaFeature: 'Doa, Wirid, Maulid & Tahlil', doaSub: 'Kumpulan bacaan Arab dan tautan sumber resmi.', prayerFeature: 'Jadwal sholat', prayerSub: 'Gunakan lokasi saat ini atau pilih kota secara manual.',
    vectorPanel: 'Pencarian makna Al-Qur’an', vectorHint: 'Tulis pertanyaan dalam bahasa sehari-hari. Pencarian dikirim ke EQuran.id.',
    vectorPlaceholder: 'Contoh: ayat tentang sabar menghadapi cobaan', vectorButton: 'Cari makna', vectorType: 'Jenis hasil', vectorAll: 'Ayat dan tafsir', vectorAyat: 'Ayat saja', vectorTafsir: 'Tafsir saja',
    vectorLoading: 'Mencari ayat dan tafsir…', vectorEmpty: 'Belum ada hasil yang cocok. Coba ubah pertanyaan atau gunakan kata yang lebih spesifik.', vectorError: 'Pencarian belum berhasil. Periksa koneksi lalu coba lagi.',
    results: (n) => `${n} hasil`, ayah: (s, a) => `${s} · Ayat ${a}`, ayatType: 'Ayat', tafsirType: 'Tafsir', relevance: 'Kecocokan',
    openAyah: 'Buka ayat', openTafsir: 'Buka tafsir ayat', playAyah: 'Putar ayat', latin: 'Latin', translation: 'Terjemahan',
    doaPanel: 'Bacaan ibadah', doaHint: 'Kumpulan doa dengan teks Arab, Latin, dan arti. Cari bacaan atau pilih kategori.', wiridHint: 'Wirid dan dzikir dari katalog EQuran.id. Untuk koleksi lengkap, buka sumber resmi NU Online.', doaSearch: 'Cari doa, wirid, atau kata…', doaCategory: 'Kategori', allGroups: 'Semua kategori', doaLoading: 'Memuat daftar doa dan dzikir…', doaError: 'Daftar doa belum dapat dimuat. Periksa koneksi lalu coba lagi.', doaEmpty: 'Tidak ada bacaan yang cocok dengan pencarian ini.', wiridEmpty: 'Belum ada bacaan wirid yang cocok. Coba kata lain atau buka koleksi resmi NU Online.',
    doaTab: 'Doa', wiridTab: 'Wirid', maulidTab: 'Maulid', tahlilTab: 'Tahlil', maulidTitle: 'Bacaan Maulid', maulidDescription: 'Buka kumpulan Maulid dari sumber resmi Quran NU Online.', maulidOpen: 'Buka bacaan Maulid', tahlilTitle: 'Bacaan Tahlil', tahlilDescription: 'Buka kumpulan Tahlil dari sumber resmi Quran NU Online.', tahlilOpen: 'Buka bacaan Tahlil',
    readLatin: 'Bacaan Latin', meaning: 'Arti', moreInfo: 'Keterangan dan sumber', tags: 'Tag',
    prayerPanel: 'Jadwal sholat', prayerHint: 'Pakai lokasi saat ini atau pilih provinsi dan kota secara manual.', prayerUseLocation: 'Gunakan lokasi saat ini', prayerLocationPrivacy: 'Jika Anda menekan tombol ini, koordinat akan dikirim ke AlAdhan untuk menghitung jadwal; koordinat tidak disimpan di perangkat.', prayerGpsLoading: 'Meminta izin lokasi dan menghitung jadwal…', prayerGpsDenied: 'Izin lokasi ditolak. Izinkan akses lokasi di browser atau pilih kota secara manual.', prayerGpsUnavailable: 'Lokasi tidak dapat ditentukan. Periksa pengaturan lokasi perangkat atau pilih kota secara manual.', prayerGpsTimeout: 'Permintaan lokasi terlalu lama. Coba lagi atau pilih kota secara manual.', currentLocation: (lat, lon) => `Lokasi saat ini · ${lat.toFixed(2)}, ${lon.toFixed(2)}`, province: 'Provinsi', city: 'Kabupaten/kota', chooseProvince: 'Pilih provinsi', chooseCity: 'Pilih kabupaten/kota',
    prayerLoadingProvince: 'Memuat daftar provinsi…', prayerLoadingCity: 'Memuat kabupaten/kota…', prayerLoading: 'Memuat jadwal sholat…', prayerError: 'Jadwal belum dapat dimuat. Periksa koneksi lalu coba lagi.', chooseLocation: 'Gunakan lokasi saat ini atau pilih provinsi dan kabupaten/kota.',
    today: 'Jadwal hari ini', monthSchedule: 'Jadwal satu bulan', todayNone: 'Tidak ada jadwal untuk tanggal ini pada bulan yang dipilih.', previousMonth: 'Bulan sebelumnya', nextMonth: 'Bulan berikutnya', currentMonth: 'Kembali ke bulan ini',
    prayers: ['Imsak', 'Subuh', 'Terbit', 'Dhuha', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'], date: 'Tanggal', source: 'Jadwal manual dari EQuran.id; jadwal koordinat dari AlAdhan dengan metode Kementerian Agama RI (20).',
    cached: 'Data ditampilkan dari cache perangkat; sambungkan internet untuk memperbarui.', cachedShort: 'Data tersimpan di perangkat.',
  },
  en: {
    featureTitle: 'Worship tools', vectorTitle: 'Search by meaning', vectorSub: 'Find ayat and tafsir using everyday questions.',
    doaFeature: 'Dua, Wird, Mawlid & Tahlil', doaSub: 'Arabic readings and links to official collections.', prayerFeature: 'Prayer times', prayerSub: 'Use your current location or choose a city manually.',
    vectorPanel: 'Quran meaning search', vectorHint: 'Ask in natural language. Your search is sent to EQuran.id.',
    vectorPlaceholder: 'Example: verses about patience in hardship', vectorButton: 'Search meaning', vectorType: 'Result type', vectorAll: 'Ayat and tafsir', vectorAyat: 'Ayat only', vectorTafsir: 'Tafsir only',
    vectorLoading: 'Searching ayat and tafsir…', vectorEmpty: 'No matching results. Try rephrasing or making your question more specific.', vectorError: 'Search failed. Check your connection and try again.',
    results: (n) => `${n} results`, ayah: (s, a) => `${s} · Ayah ${a}`, ayatType: 'Ayat', tafsirType: 'Tafsir', relevance: 'Match',
    openAyah: 'Open ayah', openTafsir: 'Open ayah tafsir', playAyah: 'Play ayah', latin: 'Latin', translation: 'Translation',
    doaPanel: 'Worship readings', doaHint: 'Browse duas with Arabic, transliteration, and meaning. Search or choose a category.', wiridHint: 'Wird and dhikr from the EQuran.id catalogue. Open NU Online for its full collection.', doaSearch: 'Search dua, wird, or a word…', doaCategory: 'Category', allGroups: 'All categories', doaLoading: 'Loading duas and dhikr…', doaError: 'The dua list is unavailable. Check your connection and try again.', doaEmpty: 'No readings match this search.', wiridEmpty: 'No matching wird readings. Try another word or open the official NU Online collection.',
    doaTab: 'Dua', wiridTab: 'Wird', maulidTab: 'Mawlid', tahlilTab: 'Tahlil', maulidTitle: 'Mawlid readings', maulidDescription: 'Open the Mawlid collection from the official Quran NU Online source.', maulidOpen: 'Open Mawlid readings', tahlilTitle: 'Tahlil readings', tahlilDescription: 'Open the Tahlil collection from the official Quran NU Online source.', tahlilOpen: 'Open Tahlil readings',
    readLatin: 'Latin transliteration', meaning: 'Meaning (Indonesian)', moreInfo: 'Notes and source', tags: 'Tags',
    prayerPanel: 'Prayer times', prayerHint: 'Use your current location or choose a province and city manually.', prayerUseLocation: 'Use current location', prayerLocationPrivacy: 'If you tap this button, your coordinates are sent to AlAdhan to calculate the schedule; they are not saved on this device.', prayerGpsLoading: 'Requesting location permission and calculating times…', prayerGpsDenied: 'Location permission was denied. Allow location in your browser or choose a city manually.', prayerGpsUnavailable: 'Your location is unavailable. Check device location settings or choose a city manually.', prayerGpsTimeout: 'The location request took too long. Try again or choose a city manually.', currentLocation: (lat, lon) => `Current location · ${lat.toFixed(2)}, ${lon.toFixed(2)}`, province: 'Province', city: 'City / regency', chooseProvince: 'Choose a province', chooseCity: 'Choose a city / regency',
    prayerLoadingProvince: 'Loading provinces…', prayerLoadingCity: 'Loading cities…', prayerLoading: 'Loading prayer times…', prayerError: 'Prayer times are unavailable. Check your connection and try again.', chooseLocation: 'Use your current location or choose a province and city.',
    today: 'Today’s prayer times', monthSchedule: 'Monthly schedule', todayNone: 'No schedule for this date in the selected month.', previousMonth: 'Previous month', nextMonth: 'Next month', currentMonth: 'Back to this month',
    prayers: ['Imsak', 'Fajr', 'Sunrise', 'Duha', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'], date: 'Date', source: 'Manual schedules use EQuran.id; coordinate-based schedules use AlAdhan, Kementerian Agama RI method (20).',
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
  if (payload?.code !== 200 || !payload.data || !Array.isArray(payload.data.jadwal)) throw new Error(payload?.message || 'Format jadwal sholat tidak valid.');
  return payload.data;
}
export function normalizeAladhanCalendar(payload) {
  if (payload?.code !== 200 || !Array.isArray(payload.data)) throw new Error(payload?.status || 'Format kalender jadwal salat tidak valid.');
  const cleanTime = (value) => String(value ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  return {
    jadwal: payload.data.map((day) => {
      const rawDate = String(day?.date?.gregorian?.date ?? '');
      const match = rawDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (!match || !day?.timings) throw new Error('Tanggal atau waktu salat tidak tersedia.');
      const [, dd, mm, yyyy] = match;
      const timings = day.timings;
      return {
        tanggal_lengkap: `${yyyy}-${mm}-${dd}`, tanggal: dd,
        hari: String(day?.date?.gregorian?.weekday?.en ?? ''),
        imsak: cleanTime(timings.Imsak), subuh: cleanTime(timings.Fajr),
        terbit: cleanTime(timings.Sunrise), dzuhur: cleanTime(timings.Dhuhr),
        ashar: cleanTime(timings.Asr), maghrib: cleanTime(timings.Maghrib),
        isya: cleanTime(timings.Isha),
      };
    }),
  };
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
const getCoordinateSchedule = (latitude, longitude, month, year, timezone) => {
  const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), method: '20', timezonestring: timezone });
  return request(`https://api.aladhan.com/v1/calendar/${year}/${month}?${params}`, { cache: false, validate: normalizeAladhanCalendar });
};
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
function formatNumber(value, lang) { return new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US').format(value); }
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

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
    const apiLink = (href) => el('a', { href, target: '_blank', rel: 'noopener noreferrer', textContent: lang === 'id' ? 'Dokumentasi API' : 'API docs' });
    $('vector-source').replaceChildren(document.createTextNode(lang === 'id' ? 'EQuran.id Vector Search · hasil tafsir mengikuti konten API. ' : 'EQuran.id Vector Search · tafsir follows the API content. '), apiLink('https://equran.id/apidev/vector'));
    $('doa-source').textContent = lang === 'id'
      ? 'Sumber bacaan: katalog EQuran.id, naskah Barzanji Alkhoirot.org, dan teks Tahlil Quran NU Online. Semuanya disimpan di situs ini; pembaca tidak mengalihkan Anda ke situs sumber.'
      : 'Reading sources: the EQuran.id catalogue, the Barzanji text from Alkhoirot.org, and the Tahlil text from Quran NU Online. All are stored on this site; the reader does not redirect to the source sites.';
    $('shalat-source').replaceChildren(document.createTextNode(`${w.source} `), apiLink('https://equran.id/apidev/shalat'), document.createTextNode(' · '), apiLink('https://aladhan.com/prayer-times-api'));

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
    if (!provinces.length) loadProvinces();
    else if (hasPrayerLocation() && !schedule && !prayerBusy) loadPrayerSchedule();
  }

  $('feature-vector').addEventListener('click', openVector);
  $('feature-doa').addEventListener('click', openDoa);
  $('feature-prayer').addEventListener('click', openPrayer);
  $('prayer-use-location').addEventListener('click', useCurrentLocation);
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
        actions.append(open, play);
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
      if (item.ar) card.append(el('p', { className: 'ibadah-arabic dua-arabic', lang: 'ar', dir: 'rtl', textContent: String(item.ar) }));
      if (item.tr) card.append(el('p', { className: 'ibadah-latin' }, el('b', { textContent: `${w.readLatin}: ` }), String(item.tr)));
      if (item.idn) card.append(el('p', { className: 'ibadah-prose', dir: 'auto' }, el('b', { className: 'ibadah-field-label', textContent: `${w.meaning}: ` }), String(item.idn)));
      if (item.tentang) {
        const more = el('details', { className: 'ibadah-more' });
        more.append(el('summary', { textContent: w.moreInfo }), el('p', { className: 'ibadah-prose', textContent: String(item.tentang) }));
        card.append(more);
      }
      if (Array.isArray(item.tag) && item.tag.length) card.append(el('p', { className: 'ibadah-tags' }, el('b', { textContent: `${w.tags}: ` }), item.tag.map((tag) => `#${tag}`).join(' ')));
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
      if (coordinateLocation) {
        // Keep the GPS-selected schedule and its status while manual locations load in the background.
      } else if (location.province && provinces.includes(location.province)) {
        await loadCities(location.province, location.city);
      } else {
        location = { province: '', city: '' };
        setOptions($('prayer-city'), text().chooseCity, [], '');
        $('prayer-city').disabled = true;
        setStatus(status, text().chooseLocation);
      }
      if (response.cached && !coordinateLocation) setStatus(status, text().cached);
      return response;
    }).catch(() => {
      provinceRequest = null;
      setStatus(status, text().prayerError, true);
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
        ? await getCoordinateSchedule(coordinate.latitude, coordinate.longitude, month, year, coordinate.timezone)
        : await getSchedule(location.province, location.city, month, year);
      if (token !== scheduleRequest) return;
      schedule = coordinateBased
        ? { ...response.data, coordinateBased: true }
        : { ...response.data, coordinateBased: false };
      scheduleCached = response.cached;
      renderSchedule();
      const label = coordinateBased
        ? `${text().currentLocation(coordinate.latitude, coordinate.longitude)} · AlAdhan · Kemenag RI (20)`
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
    const today = dateKey(new Date());
    const todaySchedule = schedule.jadwal.find((entry) => entry.tanggal_lengkap === today);
    if (todaySchedule) {
      const current = el('section', { className: 'prayer-today' });
      const localDate = new Date(`${today}T12:00:00`);
      current.append(el('div', { className: 'prayer-today-head' },
        el('b', { textContent: w.today }),
        el('span', { textContent: localDate.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) })));
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
        ? new Date(`${entry.tanggal_lengkap}T12:00:00`).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short' })
        : String(entry.hari ?? '');
      row.append(el('th', { scope: 'row', textContent: `${dayLabel} ${formatNumber(entry.tanggal, lang)}`.trim() }));
      for (const { key } of columns) row.append(el('td', { textContent: String(entry[key] ?? '—') }));
      body.append(row);
    }
    table.append(body);
    scroll.append(table);
    details.append(scroll);
    target.append(details);
    if (scheduleCached) target.append(el('p', { className: 'ibadah-status' }, w.cached));
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

  function relang(newLang) {
    lang = newLang === 'en' ? 'en' : 'id';
    setPanelText();
  }
  relang('id');
  return { relang };
}
