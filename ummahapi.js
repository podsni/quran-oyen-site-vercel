const PROXY = '/api/ummahapi';
const CACHE_KEY = 'quran-oyen.ummahapi.responses.v1';
const MEMORY_CACHE = new Map();
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};
const string = (value) => typeof value === 'string' ? value.trim() : '';
const pickText = (object, keys) => {
  if (!object || typeof object !== 'object') return '';
  for (const key of keys) {
    const value = string(object[key]);
    if (value) return value;
  }
  return '';
};
const safeNumber = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
};
function hadithNumber(value) {
  const number = String(value ?? '').trim();
  return /^(?:[1-9]\d{0,7})(?:\.\d{1,3})?$/.test(number) ? number : '';
}
function apiUrl(resource, params = {}) {
  const url = new URL(PROXY, globalThis.location.origin);
  url.searchParams.set('resource', resource);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value) !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function readSaved(url) {
  if (MEMORY_CACHE.has(url)) return MEMORY_CACHE.get(url);
  try {
    const records = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const payload = records[url]?.payload;
    if (payload?.success === true) {
      MEMORY_CACHE.set(url, payload);
      return payload;
    }
  } catch { /* Storage is optional; memory and network may still work. */ }
  return null;
}
function saveResponse(url, payload) {
  MEMORY_CACHE.set(url, payload);
  try {
    const records = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    records[url] = { savedAt: Date.now(), payload };
    const sorted = Object.entries(records).sort((a, b) => (b[1]?.savedAt || 0) - (a[1]?.savedAt || 0));
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(sorted.slice(0, 12))));
  } catch { /* Storage is optional; network results remain usable. */ }
}
async function requestJson(url, { force = false } = {}) {
  const cached = readSaved(url);
  if (globalThis.navigator?.onLine === false) {
    if (cached) return { payload: cached, cached: true };
    throw new Error('offline');
  }
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 14000) : 0;
  try {
    const response = await fetch(url, {
      method: 'GET', mode: 'same-origin', credentials: 'omit', signal: controller?.signal,
      headers: { Accept: 'application/json' }, cache: force ? 'reload' : 'default',
    });
    let payload;
    try { payload = await response.json(); } catch { throw new Error('invalid-json'); }
    if (!response.ok || payload?.success !== true) throw new Error(`http-${response.status}`);
    saveResponse(url, payload);
    return { payload, cached: false };
  } catch (error) {
    if (cached) return { payload: cached, cached: true };
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function setStatus(node, text, error = false) {
  if (!node) return;
  node.textContent = text;
  node.classList.toggle('is-error', error);
}
function jakartaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function localDailyDuaIndex(date, length) {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  return length ? ((day % length) + length) % length : 0;
}
async function getLocalDailyDua(date) {
  const url = new URL('/data/ibadah/doa.json', globalThis.location.origin);
  const response = await fetch(url, { method: 'GET', mode: 'same-origin', credentials: 'same-origin' });
  if (!response.ok) throw new Error('local-dua-unavailable');
  const payload = await response.json();
  if (payload?.status !== 'success' || !Array.isArray(payload.data)) throw new Error('invalid-local-dua');
  const entries = payload.data.filter((item) => string(item?.ar) && string(item?.tr) && string(item?.idn));
  if (!entries.length) throw new Error('empty-local-dua');
  const item = entries[localDailyDuaIndex(date, entries.length)];
  return {
    id: item.id,
    title_id: string(item.nama) || `Doa pilihan #${item.id}`,
    text_arabic: string(item.ar),
    transliteration: string(item.tr),
    translation_id: string(item.idn),
    source: `EQuran.id · katalog doa #${item.id}`,
  };
}

const DAILY_WORDS = {
  id: {
    title: 'Konten Hari Ini', close: 'Tutup', refresh: 'Muat ulang',
    loading: 'Memuat ayat, Asmaul Husna, doa, dan hadis pilihan…',
    error: 'Konten online hari ini belum dapat dimuat. Periksa koneksi lalu coba lagi.',
    partial: 'Layanan online belum terhubung; doa dari katalog lokal tetap tersedia.',
    cached: 'Menampilkan salinan tersimpan di perangkat; sambungkan internet untuk memeriksa pembaruan.',
    ayah: 'Ayat hari ini', asma: 'Asmaul Husna hari ini', dua: 'Doa hari ini', quote: 'Hadis pilihan',
    englishMeaning: 'Makna (Inggris dari UmmahAPI)', englishText: 'Teks Inggris dari UmmahAPI',
    read: 'Baca ayat di Quran Oyen', source: 'Sumber ayat, Asmaul Husna, dan hadis: UmmahAPI. Doa: katalog EQuran.id yang tersimpan di Quran Oyen. Terjemahan ayat mengutamakan data Kemenag lokal; makna Asma dan teks hadis dari API berbahasa Inggris.',
    feature: 'Konten Hari Ini', featureSub: 'Ayat, Asmaul Husna, doa Indonesia, dan hadis pilihan.',
    grade: 'Derajat',
    fallbackReference: (surah, ayah) => `Surah ${surah} · Ayat ${ayah}`,
  },
  en: {
    title: 'Today’s Content', close: 'Close', refresh: 'Refresh',
    loading: 'Loading today’s ayah, Asmaul Husna, dua, and hadith…',
    error: 'Today’s online content is unavailable. Check your connection and try again.',
    partial: 'The online service is unavailable; a dua from the local catalogue is still available.',
    cached: 'Showing a copy saved on this device; connect to check for updates.',
    ayah: 'Ayah of the day', asma: 'Asmaul Husna of the day', dua: 'Dua of the day', quote: 'Hadith to reflect on',
    englishMeaning: 'Meaning (English from UmmahAPI)', englishText: 'English text from UmmahAPI',
    read: 'Read ayah in Quran Oyen', source: 'Ayah, Asmaul Husna, and hadith: UmmahAPI. Dua: the EQuran.id catalogue saved in Quran Oyen. The local Ministry of Religious Affairs data is preferred for ayah translation; Asma meanings and hadith text from the API are in English.',
    feature: 'Today’s Content', featureSub: 'A daily ayah, Asmaul Husna, Indonesian dua, and hadith.',
    grade: 'Grade',
    fallbackReference: (surah, ayah) => `Surah ${surah} · Ayah ${ayah}`,
  },
};

export function createDailyContentFeature({ sheets, onNavigate, getSurahs, getAyahTranslation, initialLang = 'id' }) {
  if (!$('feature-daily') || !$('daily-panel') || !$('daily-content')) return null;
  let lang = initialLang === 'en' ? 'en' : 'id';
  let loaded = false;
  let dailyData = null;
  let activeRequest = 0;
  const words = () => DAILY_WORDS[lang];
  sheets.own('daily-panel', { handle: '.panel-head' });
  $('feature-daily').addEventListener('click', () => {
    sheets.open('daily-panel');
    if (!loaded) loadDaily();
  });
  $('daily-close').addEventListener('click', () => sheets.close('daily-panel'));
  $('daily-refresh').addEventListener('click', () => loadDaily(true));

  function updateText() {
    $('feature-daily-title').textContent = words().feature;
    $('feature-daily-sub').textContent = words().featureSub;
    $('daily-title').textContent = words().title;
    $('daily-close').textContent = words().close;
    $('daily-refresh').textContent = words().refresh;
    if (dailyData) {
      renderDaily(dailyData.data, dailyData.cached);
      setStatus($('daily-status'), dailyData.partial ? words().partial : (dailyData.cached ? words().cached : ''));
    }
  }
  async function loadDaily(force = false) {
    const ticket = ++activeRequest;
    $('daily-refresh').disabled = true;
    setStatus($('daily-status'), words().loading);
    if (!dailyData) $('daily-content').replaceChildren();
    const date = jakartaDate();
    const [remote, localDua] = await Promise.all([
      requestJson(apiUrl('daily', { date }), { force }).then((result) => ({ result })).catch((error) => ({ error })),
      getLocalDailyDua(date).catch(() => null),
    ]);
    if (ticket !== activeRequest) return;
    try {
      const result = remote.result;
      const data = result?.payload?.data && typeof result.payload.data === 'object' ? { ...result.payload.data } : {};
      if (localDua) data.dua = localDua;
      const ayah = data.ayah;
      const arabic = pickText(ayah, ['text_uthmani', 'text_arabic', 'arab']);
      if (result && arabic) {
        dailyData = { data, cached: result.cached, partial: false };
        loaded = true;
        await renderDaily(data, result.cached);
        setStatus($('daily-status'), result.cached ? words().cached : '');
      } else if (localDua) {
        dailyData = { data: { dua: localDua }, cached: true, partial: true };
        loaded = false;
        await renderDaily(dailyData.data, true);
        setStatus($('daily-status'), words().partial);
      } else {
        throw remote.error || new Error('invalid-daily');
      }
    } catch {
      if (ticket !== activeRequest) return;
      loaded = false;
      setStatus($('daily-status'), words().error, true);
      if (dailyData) await renderDaily(dailyData.data, true);
    } finally {
      if (ticket === activeRequest) $('daily-refresh').disabled = false;
    }
  }
  async function renderDaily(data, cached) {
    const sections = [];
    const ayah = data?.ayah || {};
    const ayahArabic = pickText(ayah, ['text_uthmani', 'text_arabic', 'arab']);
    if (ayahArabic) {
      const surahNumber = safeNumber(ayah.surah_id ?? ayah.surah);
      const ayahNumber = safeNumber(ayah.number_in_surah ?? ayah.ayah ?? ayah.number);
      let translation = '';
      if (surahNumber && ayahNumber && typeof getAyahTranslation === 'function') {
        try { translation = string(await getAyahTranslation(surahNumber, ayahNumber)); } catch { /* Use the API translation below. */ }
      }
      if (!translation) translation = pickText(ayah, ['translation_id', 'text_translation_id', 'indonesian_translation']);
      let surahName = '';
      if (surahNumber && typeof getSurahs === 'function') {
        try {
          const surahs = await getSurahs();
          const surah = Array.isArray(surahs) ? surahs[surahNumber - 1] : null;
          surahName = string(surah?.latin ?? surah?.namaLatin ?? surah?.name ?? surah?.id);
        } catch { /* Fall back to the numeric reference. */ }
      }
      const reference = (surahName && ayahNumber)
        ? `${surahName} · ${lang === 'id' ? 'Ayat' : 'Ayah'} ${ayahNumber}`
        : pickText(ayah, ['reference', 'surah_name_id', 'surah_name', 'surah_name_en'])
          || (surahNumber ? words().fallbackReference(surahNumber, ayahNumber || '—') : '');
      const ayahCard = el('article', { className: 'daily-item daily-ayah' },
        el('h3', { textContent: words().ayah }),
        el('p', { className: 'daily-arabic', lang: 'ar', dir: 'rtl', textContent: ayahArabic }),
        ...(translation ? [el('p', { className: 'daily-translation', lang: 'id', textContent: translation })] : []),
        ...(reference ? [el('p', { className: 'daily-reference', textContent: reference })] : []));
      if (surahNumber && ayahNumber) {
        const readButton = el('button', { className: 'pill solid', type: 'button', textContent: words().read });
        readButton.addEventListener('click', () => {
          sheets.close('daily-panel');
          onNavigate?.(surahNumber, ayahNumber, 'reader');
        });
        ayahCard.append(el('div', { className: 'daily-actions' }, readButton));
      }
      sections.push(ayahCard);
    }

    const asma = data?.asma && typeof data.asma === 'object' ? data.asma : null;
    if (asma) {
      const asmaName = pickText(asma, ['arabic', 'name_arabic', 'name_ar']);
      const transliteration = pickText(asma, ['transliteration', 'name_latin']);
      const meaning = pickText(asma, ['meaning_id', 'meaning_en', 'english', 'meaning', 'translation_id']);
      const englishMeaning = !!pickText(asma, ['meaning_en', 'english']);
      const card = el('article', { className: 'daily-item' }, el('h3', { textContent: words().asma }));
      if (asmaName) card.append(el('p', { className: 'daily-arabic', lang: 'ar', dir: 'rtl', textContent: asmaName }));
      if (transliteration) card.append(el('p', { className: 'daily-transliteration', textContent: transliteration }));
      if (meaning) {
        if (englishMeaning) card.append(el('p', { className: 'daily-reference', textContent: words().englishMeaning }));
        card.append(el('p', { className: 'daily-translation', lang: englishMeaning ? 'en' : 'id', textContent: meaning }));
      }
      if (card.children.length > 1) sections.push(card);
    }

    const dua = data?.dua && typeof data.dua === 'object' ? data.dua : null;
    if (dua) {
      const arabic = pickText(dua, ['text_arabic', 'arabic', 'ar', 'text_uthmani']);
      const latin = pickText(dua, ['transliteration', 'text_latin', 'latin', 'tr']);
      const meaning = pickText(dua, ['translation_id', 'meaning_id', 'idn', 'text_id']);
      const title = pickText(dua, ['title_id', 'title', 'nama', 'name_id', 'name']);
      const card = el('article', { className: 'daily-item daily-dua' }, el('h3', { textContent: words().dua }));
      if (title) card.append(el('p', { className: 'daily-reference', textContent: title }));
      if (arabic) card.append(el('p', { className: 'daily-arabic', lang: 'ar', dir: 'rtl', textContent: arabic }));
      if (latin) card.append(el('p', { className: 'daily-transliteration', textContent: latin }));
      if (meaning) card.append(el('p', { className: 'daily-translation', lang: 'id', textContent: meaning }));
      const source = pickText(dua, ['source']);
      if (source) card.append(el('p', { className: 'daily-reference', textContent: source }));
      if (card.children.length > 1) sections.push(card);
    }

    const quote = data?.quote && typeof data.quote === 'object' ? data.quote : null;
    if (quote) {
      const text = pickText(quote, ['text', 'english', 'translation_en', 'translation']);
      const arabic = pickText(quote, ['arabic', 'arab', 'text_arabic']);
      const author = pickText(quote, ['reference', 'source', 'collection_name', 'author', 'attribution']);
      const grade = pickText(quote, ['grade']);
      const card = el('article', { className: 'daily-item daily-quote' }, el('h3', { textContent: words().quote }));
      if (arabic) card.append(el('p', { className: 'daily-arabic', lang: 'ar', dir: 'rtl', textContent: arabic }));
      if (text) card.append(el('p', { className: 'daily-reference', textContent: words().englishText }), el('p', { className: 'daily-translation', lang: 'en', textContent: `“${text}”` }));
      if (author) card.append(el('p', { className: 'daily-reference', textContent: author }));
      if (grade) card.append(el('p', { className: 'daily-reference', textContent: `${words().grade}: ${grade}` }));
      if (card.children.length > 1) sections.push(card);
    } else if (typeof data?.quote === 'string' && data.quote.trim()) {
      sections.push(el('article', { className: 'daily-item daily-quote' }, el('h3', { textContent: words().quote }), el('p', { className: 'daily-translation', textContent: `“${data.quote.trim()}”` })));
    }

    $('daily-content').replaceChildren(...sections);
    $('daily-source').textContent = words().source;
  }
  updateText();
  return { relang(nextLang) { lang = nextLang === 'en' ? 'en' : 'id'; updateText(); } };
}

const BOOK_NAMES = {
  bukhari: 'Shahih Bukhari', muslim: 'Shahih Muslim', abudawud: 'Sunan Abu Dawud',
  tirmidhi: 'Jami at-Tirmidzi', ibnmajah: 'Sunan Ibnu Majah', nasai: "Sunan an-Nasa'i",
  malik: 'Muwatha Malik', nawawi: "Arba'in Nawawi", qudsi: '40 Hadis Qudsi', dehlawi: '40 Hadis Shah Waliullah',
};
const PER_PAGE = 10;
const SEARCH_LIMIT = 100;
const HADITH_WORDS = {
  id: {
    title: 'Jelajahi 10 koleksi hadis', note: 'Teks tersedia dalam bahasa Arab dan Inggris. Pencarian API memakai kata bahasa Inggris; untuk pencarian Indonesia, gunakan tab Hadis.',
    book: 'Koleksi hadis', query: 'Kata kunci (Inggris)', placeholder: 'Contoh: intention, patience, prayer', search: 'Cari hadis',
    loadingBooks: 'Memuat daftar koleksi…', loading: 'Memuat hadis…', failed: 'Hadis belum dapat dimuat. Periksa koneksi lalu coba lagi.',
    booksFailed: 'Daftar koleksi belum dapat dimuat. Coba buka tab ini lagi.', empty: 'Belum ada hadis pada halaman ini.',
    cached: 'Menampilkan salinan tersimpan di perangkat.', page: (page, pages, total) => `Halaman ${page} dari ${pages} · ${total.toLocaleString('id-ID')} hadis`,
    results: (n) => `${n.toLocaleString('id-ID')} hadis ditemukan`, limited: (n) => `Menampilkan ${SEARCH_LIMIT} hasil pertama dari ${n.toLocaleString('id-ID')}; persempit pencarian untuk hasil lainnya.`,
    previous: 'Sebelumnya', next: 'Berikutnya', open: 'Buka detail', detailTitle: 'Teks hadis lengkap', closeDetail: 'Tutup detail', copy: 'Salin hadis', copied: 'Teks hadis disalin.', copyFailed: 'Teks belum dapat disalin di browser ini.',
    translation: 'Teks Inggris', grade: 'Derajat dari sumber', source: 'Sumber: UmmahAPI · koleksi Hadith API dari fawazahmed0/hadith-api melalui jsDelivr. Teks Arab, Inggris, dan derajat ditampilkan sebagaimana diberikan sumber; cek edisi rujukan untuk kajian.',
    selectBook: 'Pilih koleksi untuk mulai menjelajah.',
  },
  en: {
    title: 'Browse 10 hadith collections', note: 'Texts are available in Arabic and English. API search uses English keywords; use the Hadis tab for Indonesian search.',
    book: 'Hadith collection', query: 'Keyword (English)', placeholder: 'Example: intention, patience, prayer', search: 'Search hadith',
    loadingBooks: 'Loading collections…', loading: 'Loading hadith…', failed: 'Hadith is unavailable. Check your connection and try again.',
    booksFailed: 'The collection list could not load. Open this tab again to retry.', empty: 'There are no hadith on this page.',
    cached: 'Showing a copy saved on this device.', page: (page, pages, total) => `Page ${page} of ${pages} · ${total.toLocaleString('en-US')} hadith`,
    results: (n) => `${n.toLocaleString('en-US')} hadith found`, limited: (n) => `Showing the first ${SEARCH_LIMIT} of ${n.toLocaleString('en-US')} results; narrow your search for more.`,
    previous: 'Previous', next: 'Next', open: 'Open details', detailTitle: 'Full hadith text', closeDetail: 'Close details', copy: 'Copy hadith', copied: 'Hadith text copied.', copyFailed: 'This browser could not copy the text.',
    translation: 'English text', grade: 'Source grade', source: 'Source: UmmahAPI · hadith collection data from fawazahmed0/hadith-api via jsDelivr. Arabic, English, and grades are shown as supplied; check a reference edition for study.',
    selectBook: 'Choose a collection to start browsing.',
  },
};

export function createUmmahApiHadithFeature({ initialLang = 'id' } = {}) {
  if (!$('ilm-ummah-view') || !$('ilm-ummah-book') || !$('ilm-ummah-results')) return null;
  let lang = initialLang === 'en' ? 'en' : 'id';
  let books = [];
  let booksLoaded = false;
  let activeBook = 'bukhari';
  let page = 1;
  let total = 0;
  let totalPages = 1;
  let searchResults = null;
  let searchCache = null;
  let listTicket = 0;
  let detailTicket = 0;
  const words = () => HADITH_WORDS[lang];
  const book = () => books.find((item) => item.slug === activeBook) || null;

  function updateText() {
    const w = words();
    $('ilm-ummah-title').textContent = w.title;
    $('ilm-ummah-note').textContent = w.note;
    $('ilm-ummah-book-label').textContent = w.book;
    $('ilm-ummah-query-label').textContent = w.query;
    $('ilm-ummah-query').placeholder = w.placeholder;
    $('ilm-ummah-search-button').textContent = w.search;
    $('ilm-ummah-prev').textContent = w.previous;
    $('ilm-ummah-next').textContent = w.next;
    $('ilm-ummah-source').textContent = w.source;
    if (books.length) renderBookOptions();
    renderItems();
    if ($('ilm-ummah-detail').dataset.open === 'true') renderDetailCard($('ilm-ummah-detail')._item);
  }
  function renderBookOptions() {
    const selected = activeBook;
    $('ilm-ummah-book').replaceChildren(el('option', { value: '', textContent: words().selectBook }), ...books.map((item) => el('option', {
      value: item.slug,
      textContent: `${item.name} · ${Number(item.total || 0).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')}`,
    })));
    if (books.some((item) => item.slug === selected)) $('ilm-ummah-book').value = selected;
  }
  function renderItems(items = $('ilm-ummah-results')._items || []) {
    const container = $('ilm-ummah-results');
    container._items = Array.isArray(items) ? items : [];
    if (!container._items.length) {
      container.replaceChildren(el('p', { className: 'ibadah-empty', textContent: words().empty }));
      return;
    }
    const name = book()?.name || activeBook;
    container.replaceChildren(...container._items.map((item) => {
      const number = hadithNumber(item.hadithnumber ?? item.number ?? item.id?.split('-').at(-1));
      const card = el('article', { className: 'ibadah-card ummah-hadith-card' },
        el('div', { className: 'ibadah-card-head' }, el('span', { className: 'ibadah-badge', textContent: `${name} · #${number || '—'}` })));
      const arabic = pickText(item, ['arabic', 'arab', 'text_arabic']);
      const english = pickText(item, ['english', 'translation_en', 'translation']);
      const grade = pickText(item, ['grade', 'grading']);
      if (arabic) card.append(el('p', { className: 'ibadah-arabic', lang: 'ar', dir: 'rtl', textContent: arabic }));
      if (english) card.append(el('p', { className: 'ibadah-prose', lang: 'en' }, el('b', { textContent: `${words().translation}: ` }), english));
      if (grade) card.append(el('p', { className: 'ibadah-reference', textContent: `${words().grade}: ${grade}` }));
      const button = el('button', { className: 'pill', type: 'button', textContent: words().open, disabled: !number });
      button.addEventListener('click', () => number && loadDetail(number));
      card.append(el('div', { className: 'ibadah-actions' }, button));
      return card;
    }));
  }
  function renderDetailCard(item) {
    const container = $('ilm-ummah-detail');
    container.replaceChildren();
    if (!item) { container.dataset.open = 'false'; return; }
    container.dataset.open = 'true';
    const name = book()?.name || activeBook;
    const number = hadithNumber(item.hadithnumber ?? item.number ?? item.id?.split('-').at(-1));
    const card = el('article', { className: 'ibadah-card ummah-detail-card' },
      el('div', { className: 'ibadah-card-head' },
        el('h3', { className: 'ibadah-reference', textContent: `${words().detailTitle} · ${name} #${number || '—'}` }),
        el('button', { className: 'pill', type: 'button', textContent: words().closeDetail, onclick: () => { container.dataset.open = 'false'; container._item = null; container.replaceChildren(); } })));
    const arabic = pickText(item, ['arabic', 'arab', 'text_arabic']);
    const english = pickText(item, ['english', 'translation_en', 'translation']);
    const grade = pickText(item, ['grade', 'grading']);
    if (arabic) card.append(el('p', { className: 'ibadah-arabic', lang: 'ar', dir: 'rtl', textContent: arabic }));
    if (english) card.append(el('p', { className: 'ibadah-prose', lang: 'en' }, el('b', { textContent: `${words().translation}: ` }), english));
    if (grade) card.append(el('p', { className: 'ibadah-reference', textContent: `${words().grade}: ${grade}` }));
    const copyButton = el('button', { className: 'pill', type: 'button', textContent: words().copy });
    copyButton.addEventListener('click', async () => {
      const copyText = [arabic, english, grade ? `${words().grade}: ${grade}` : ''].filter(Boolean).join('\n\n');
      try {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
        await navigator.clipboard.writeText(copyText);
        setStatus($('ilm-ummah-detail-status'), words().copied);
      } catch { setStatus($('ilm-ummah-detail-status'), words().copyFailed, true); }
    });
    card.append(el('div', { className: 'ibadah-actions' }, copyButton));
    container._item = item;
    container.replaceChildren(card);
  }
  function setPagerStatus(text, error = false) { setStatus($('ilm-ummah-status'), text, error); }
  function updatePager() {
    totalPages = Math.max(1, Number(totalPages) || 1);
    $('ilm-ummah-prev').disabled = page <= 1;
    $('ilm-ummah-next').disabled = page >= totalPages;
    $('ilm-ummah-page').textContent = total ? words().page(page, totalPages, total) : '';
  }
  async function loadBooks() {
    if (booksLoaded) return;
    const ticket = ++listTicket;
    setPagerStatus(words().loadingBooks);
    try {
      const result = await requestJson(apiUrl('collections'));
      if (ticket !== listTicket) return;
      const data = result.payload?.data?.collections;
      if (!Array.isArray(data) || !data.every((item) => typeof item?.key === 'string' && typeof item?.name === 'string')) throw new Error('invalid-books');
      books = data.map((item) => ({
        slug: item.key,
        name: BOOK_NAMES[item.key] || item.name,
        total: Number(item.total_hadiths) || 0,
        reliability: string(item.reliability),
      }));
      booksLoaded = true;
      activeBook = books.some((item) => item.slug === activeBook) ? activeBook : (books[0]?.slug || '');
      renderBookOptions();
      if (activeBook) await loadItems();
      else setPagerStatus(words().booksFailed, true);
    } catch {
      if (ticket === listTicket) setPagerStatus(words().booksFailed, true);
    }
  }
  async function loadItems({ force = false } = {}) {
    if (!activeBook) return;
    const ticket = ++listTicket;
    const query = $('ilm-ummah-query').value.trim();
    setPagerStatus(words().loading);
    $('ilm-ummah-results').replaceChildren();
    $('ilm-ummah-detail').dataset.open = 'false';
    $('ilm-ummah-detail').replaceChildren();
    try {
      if (query) {
        const cacheKey = `${activeBook}\n${query}`;
        if (!force && searchCache?.key === cacheKey) {
          if (ticket !== listTicket) return;
          searchResults = searchCache.data.hadiths;
          total = searchCache.data.total_found;
          totalPages = Math.max(1, Math.ceil(Math.min(total || searchResults.length, SEARCH_LIMIT) / PER_PAGE));
          renderItems(searchResults.slice((page - 1) * PER_PAGE, page * PER_PAGE));
          updatePager();
          setPagerStatus(total > SEARCH_LIMIT ? words().limited(total) : words().results(total || searchResults.length));
          return;
        }
        const result = await requestJson(apiUrl('search', { collection: activeBook, q: query, limit: SEARCH_LIMIT }), { force });
        if (ticket !== listTicket) return;
        const data = result.payload?.data;
        if (!Array.isArray(data?.hadiths)) throw new Error('invalid-search');
        searchResults = data.hadiths;
        total = Number(data.total_found) || searchResults.length;
        totalPages = Math.max(1, Math.ceil(Math.min(total || searchResults.length, SEARCH_LIMIT) / PER_PAGE));
        searchCache = { key: cacheKey, data: { hadiths: searchResults, total_found: total }, cached: result.cached };
        renderItems(searchResults.slice((page - 1) * PER_PAGE, page * PER_PAGE));
        updatePager();
        const status = total > SEARCH_LIMIT ? words().limited(total) : words().results(total);
        setPagerStatus(result.cached ? `${status} · ${words().cached}` : status);
      } else {
        searchResults = null;
        const result = await requestJson(apiUrl('collection', { collection: activeBook, page, limit: PER_PAGE }), { force });
        if (ticket !== listTicket) return;
        const data = result.payload?.data;
        if (!Array.isArray(data?.hadiths)) throw new Error('invalid-hadith-list');
        total = Number(data.total) || 0;
        page = Number(data.page) || page;
        totalPages = Number(data.total_pages) || Math.max(1, Math.ceil(total / PER_PAGE));
        renderItems(data.hadiths);
        updatePager();
        const status = words().page(page, totalPages, total);
        setPagerStatus(result.cached ? `${status} · ${words().cached}` : status);
      }
    } catch {
      if (ticket !== listTicket) return;
      updatePager();
      setPagerStatus(words().failed, true);
      renderItems([]);
    }
  }
  async function loadDetail(number) {
    const ticket = ++detailTicket;
    setStatus($('ilm-ummah-detail-status'), words().loading);
    $('ilm-ummah-detail').replaceChildren();
    try {
      const result = await requestJson(apiUrl('detail', { collection: activeBook, number }));
      if (ticket !== detailTicket) return;
      const item = result.payload?.data;
      if (!item || !hadithNumber(item.hadithnumber ?? item.number ?? number)) throw new Error('invalid-hadith-detail');
      $('ilm-ummah-detail')._item = item;
      renderDetailCard(item);
      setStatus($('ilm-ummah-detail-status'), result.cached ? words().cached : '');
    } catch {
      if (ticket === detailTicket) setStatus($('ilm-ummah-detail-status'), words().failed, true);
    }
  }
  function activate(tab) {
    if (tab !== 'ummahapi') return;
    if (!booksLoaded) loadBooks();
    else if (!$('ilm-ummah-results')._items?.length) loadItems();
  }
  $('ilm-ummah-book').addEventListener('change', () => {
    activeBook = $('ilm-ummah-book').value;
    page = 1;
    searchResults = null;
    searchCache = null;
    total = 0;
    totalPages = 1;
    $('ilm-ummah-detail').dataset.open = 'false';
    $('ilm-ummah-detail').replaceChildren();
    if (activeBook) loadItems();
    else $('ilm-ummah-results').replaceChildren();
  });
  $('ilm-ummah-search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    page = 1;
    searchCache = null;
    $('ilm-ummah-detail').dataset.open = 'false';
    $('ilm-ummah-detail').replaceChildren();
    if (!activeBook) { loadBooks(); return; }
    loadItems();
  });
  $('ilm-ummah-prev').addEventListener('click', () => { if (page > 1) { page -= 1; loadItems(); } });
  $('ilm-ummah-next').addEventListener('click', () => { if (page < totalPages) { page += 1; loadItems(); } });
  $('ilm-ummah-title').textContent = words().title;
  $('ilm-ummah-note').textContent = words().note;
  $('ilm-ummah-source').textContent = words().source;
  $('ilm-ummah-page').textContent = '';
  return {
    activate,
    setLanguage(nextLang) {
      lang = nextLang === 'en' ? 'en' : 'id';
      updateText();
      updatePager();
    },
  };
}
