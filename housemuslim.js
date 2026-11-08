const API = 'https://api.housemuslim.org/api/v1';
const CACHE_KEY = 'quran-oyen.housemuslim.responses.v1';
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

function readSaved(url) {
  if (MEMORY_CACHE.has(url)) return MEMORY_CACHE.get(url);
  try {
    const records = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const record = records[url];
    if (record?.payload && record.payload.success === true) {
      MEMORY_CACHE.set(url, record.payload);
      return record.payload;
    }
  } catch { /* Storage may be disabled or full; in-memory use still works. */ }
  return null;
}
function saveResponse(url, payload) {
  MEMORY_CACHE.set(url, payload);
  try {
    const records = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    records[url] = { savedAt: Date.now(), payload };
    const sorted = Object.entries(records).sort((a, b) => (b[1]?.savedAt || 0) - (a[1]?.savedAt || 0));
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(sorted.slice(0, 10))));
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
      method: 'GET', mode: 'cors', credentials: 'omit', signal: controller?.signal,
      headers: { Accept: 'application/json' }, cache: force ? 'reload' : 'default',
    });
    let payload;
    try { payload = await response.json(); } catch { throw new Error('invalid-json'); }
    if (!response.ok) throw new Error(`http-${response.status}`);
    if (payload?.success !== true) throw new Error('invalid-response');
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
function safeNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
}

const DAILY_WORDS = {
  id: {
    title: 'Konten Hari Ini', close: 'Tutup', refresh: 'Muat ulang',
    loading: 'Memuat ayat, doa, Asmaul Husna, dan kutipan hari ini…',
    error: 'Konten hari ini belum dapat dimuat. Periksa koneksi lalu coba lagi.',
    cached: 'Menampilkan salinan tersimpan di perangkat; sambungkan internet untuk memeriksa pembaruan.',
    ayah: 'Ayat hari ini', asma: 'Asmaul Husna hari ini', dua: 'Doa hari ini', quote: 'Kutipan hari ini',
    read: 'Baca ayat di Quran Oyen', source: 'Sumber konten harian: HouseMuslim API. Terjemahan ayat: Kementerian Agama RI dari data lokal Quran Oyen.',
    feature: 'Konten Hari Ini', featureSub: 'Ayat, Asmaul Husna, doa, dan kutipan pilihan harian.',
    fallbackReference: (surah, ayah) => `Surah ${surah} · Ayat ${ayah}`,
  },
  en: {
    title: 'Today’s Content', close: 'Close', refresh: 'Refresh',
    loading: 'Loading today’s ayah, dua, Asmaul Husna, and quote…',
    error: 'Today’s content is unavailable. Check your connection and try again.',
    cached: 'Showing a copy saved on this device; connect to check for updates.',
    ayah: 'Ayah of the day', asma: 'Asmaul Husna of the day', dua: 'Dua of the day', quote: 'Quote of the day',
    read: 'Read ayah in Quran Oyen', source: 'Daily content: HouseMuslim API. Ayah translation: Ministry of Religious Affairs of Indonesia, from Quran Oyen’s local data.',
    feature: 'Today’s Content', featureSub: 'A daily ayah, Asmaul Husna, dua, and quote.',
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
  const panelReady = sheets.own('daily-panel', { handle: '.panel-head' });
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
    if (dailyData) renderDaily(dailyData.data, dailyData.cached);
  }
  async function loadDaily(force = false) {
    const ticket = ++activeRequest;
    $('daily-refresh').disabled = true;
    setStatus($('daily-status'), words().loading);
    if (!dailyData) $('daily-content').replaceChildren();
    try {
      const result = await requestJson(`${API}/daily/today`, { force });
      if (ticket !== activeRequest) return;
      const data = result.payload?.data;
      if (!data?.ayah || !pickText(data.ayah, ['text_uthmani', 'text_arabic', 'arab'])) throw new Error('invalid-daily');
      dailyData = { data, cached: result.cached };
      loaded = true;
      await renderDaily(data, result.cached);
      setStatus($('daily-status'), result.cached ? words().cached : '');
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
    const ayah = data.ayah || {};
    const surahNumber = safeNumber(ayah.surah_id ?? ayah.surah);
    const ayahNumber = safeNumber(ayah.number_in_surah ?? ayah.number);
    let translation = pickText(ayah, ['translation_id', 'text_translation_id', 'translation']);
    if (!translation && surahNumber && ayahNumber && typeof getAyahTranslation === 'function') {
      try { translation = string(await getAyahTranslation(surahNumber, ayahNumber)); } catch { /* Arabic text remains useful. */ }
    }
    let surahName = '';
    if (surahNumber && typeof getSurahs === 'function') {
      try {
        const surahs = await getSurahs();
        const surah = Array.isArray(surahs) ? surahs[surahNumber - 1] : null;
        surahName = string(surah?.latin ?? surah?.namaLatin ?? surah?.name ?? surah?.id);
      } catch { /* Fall back to the numeric reference. */ }
    }
    const reference = pickText(ayah, ['reference', 'surah_name_id', 'surah_name', 'surah_name_en'])
      || (surahName ? `${surahName} · ${lang === 'id' ? 'Ayat' : 'Ayah'} ${ayahNumber || '—'}` : words().fallbackReference(surahNumber || '—', ayahNumber || '—'));
    const sections = [];
    const ayahCard = el('article', { className: 'daily-item daily-ayah' },
      el('h3', { textContent: words().ayah }),
      el('p', { className: 'daily-arabic', lang: 'ar', dir: 'rtl', textContent: pickText(ayah, ['text_uthmani', 'text_arabic', 'arab']) }),
      ...(translation ? [el('p', { className: 'daily-translation', lang: 'id', textContent: translation })] : []),
      el('p', { className: 'daily-reference', textContent: reference }));
    if (surahNumber && ayahNumber) {
      const readButton = el('button', { className: 'pill solid', type: 'button', textContent: words().read });
      readButton.addEventListener('click', () => {
        sheets.close('daily-panel');
        onNavigate?.(surahNumber, ayahNumber, 'reader');
      });
      ayahCard.append(el('div', { className: 'daily-actions' }, readButton));
    }
    sections.push(ayahCard);

    const asma = data.asma && typeof data.asma === 'object' ? data.asma : null;
    if (asma) {
      const asmaName = pickText(asma, ['name_arabic', 'arabic', 'name_ar', 'name']);
      const transliteration = pickText(asma, ['transliteration', 'transliteration_id', 'name_latin']);
      const meaning = pickText(asma, ['meaning_id', 'meaning', 'meaning_en', 'translation_id']);
      const card = el('article', { className: 'daily-item' }, el('h3', { textContent: words().asma }));
      if (asmaName) card.append(el('p', { className: 'daily-arabic', lang: 'ar', dir: 'rtl', textContent: asmaName }));
      if (transliteration) card.append(el('p', { className: 'daily-transliteration', textContent: transliteration }));
      if (meaning) card.append(el('p', { className: 'daily-translation', textContent: meaning }));
      if (card.children.length > 1) sections.push(card);
    }

    const dua = data.dua && typeof data.dua === 'object' ? data.dua : null;
    if (dua) {
      const arabic = pickText(dua, ['text_arabic', 'arabic', 'arab', 'dua_arabic', 'text_uthmani']);
      const latin = pickText(dua, ['transliteration', 'text_latin', 'latin', 'transliteration_id']);
      const meaning = pickText(dua, ['translation_id', 'meaning_id', 'text_id', 'translation', 'meaning']);
      const title = pickText(dua, ['title_id', 'title', 'name_id', 'name']);
      const card = el('article', { className: 'daily-item' }, el('h3', { textContent: words().dua }));
      if (title) card.append(el('p', { className: 'daily-reference', textContent: title }));
      if (arabic) card.append(el('p', { className: 'daily-arabic', lang: 'ar', dir: 'rtl', textContent: arabic }));
      if (latin) card.append(el('p', { className: 'daily-transliteration', textContent: latin }));
      if (meaning) card.append(el('p', { className: 'daily-translation', textContent: meaning }));
      if (card.children.length > 1) sections.push(card);
    }

    const quote = data.quote && typeof data.quote === 'object' ? data.quote : null;
    if (quote) {
      const flexibleText = Object.entries(quote).find(([key, value]) => /text|quote|content|translation|meaning/i.test(key) && string(value));
      const text = pickText(quote, ['text_id', 'quote_id', 'text', 'content', 'quote', 'body', 'translation_id', 'text_en']) || string(flexibleText?.[1]);
      const author = pickText(quote, ['source', 'author', 'attribution', 'narrator', 'narrated_by', 'reference']);
      const card = el('article', { className: 'daily-item daily-quote' }, el('h3', { textContent: words().quote }));
      if (text) card.append(el('p', { className: 'daily-translation', textContent: `“${text}”` }));
      if (author) card.append(el('p', { className: 'daily-reference', textContent: author }));
      if (card.children.length > 1) sections.push(card);
    } else if (typeof data.quote === 'string' && data.quote.trim()) {
      sections.push(el('article', { className: 'daily-item daily-quote' }, el('h3', { textContent: words().quote }), el('p', { className: 'daily-translation', textContent: `“${data.quote.trim()}”` })));
    }

    $('daily-content').replaceChildren(...sections);
    $('daily-source').textContent = words().source;
    if (cached) $('daily-status').textContent = words().cached;
  }
  updateText();
  return { relang(nextLang) { lang = nextLang === 'en' ? 'en' : 'id'; updateText(); } };
}

const HADITH_WORDS = {
  id: {
    title: 'Kutubut Tis’ah · sembilan kitab hadis', note: 'Cari dalam bahasa Arab atau Indonesia pada kitab yang dipilih. Tanpa kata kunci, jelajahi hadis berurutan.',
    book: 'Kitab hadis', query: 'Kata kunci', placeholder: 'Contoh: niat, sabar, الصلاة…', search: 'Cari hadis',
    loadingBooks: 'Memuat daftar kitab…', loading: 'Memuat hadis…', failed: 'Hadis belum dapat dimuat. Periksa koneksi lalu coba lagi.',
    booksFailed: 'Daftar kitab belum dapat dimuat. Coba buka tab ini lagi.', empty: 'Belum ada hadis pada halaman ini.',
    cached: 'Menampilkan salinan tersimpan di perangkat.', page: (page, pages, total) => `Halaman ${page} dari ${pages} · ${total.toLocaleString('id-ID')} hadis`,
    results: (n) => `${n.toLocaleString('id-ID')} hadis ditemukan`, previous: 'Sebelumnya', next: 'Berikutnya',
    open: 'Buka detail', detailTitle: 'Teks hadis lengkap', closeDetail: 'Tutup detail', copy: 'Salin hadis', copied: 'Teks hadis disalin.', copyFailed: 'Teks belum dapat disalin di browser ini.',
    translation: 'Terjemahan Indonesia', source: 'Sumber: HouseMuslim Hadith API · Sembilan kitab (Kutubut Tis’ah). Teks dan terjemahan ditampilkan sebagaimana diberikan oleh API; periksa edisi rujukan untuk kajian ilmiah.',
    selectBook: 'Pilih kitab untuk mulai menjelajah.',
  },
  en: {
    title: 'Kutubut Tis’ah · nine hadith books', note: 'Search Arabic or Indonesian within the selected book. Leave the query empty to browse in order.',
    book: 'Hadith book', query: 'Keyword', placeholder: 'Example: intention, patience, الصلاة…', search: 'Search hadith',
    loadingBooks: 'Loading the book list…', loading: 'Loading hadith…', failed: 'Hadith is unavailable. Check your connection and try again.',
    booksFailed: 'The book list could not load. Open this tab again to retry.', empty: 'There are no hadith on this page.',
    cached: 'Showing a copy saved on this device.', page: (page, pages, total) => `Page ${page} of ${pages} · ${total.toLocaleString('en-US')} hadith`,
    results: (n) => `${n.toLocaleString('en-US')} hadith found`, previous: 'Previous', next: 'Next',
    open: 'Open details', detailTitle: 'Full hadith text', closeDetail: 'Close details', copy: 'Copy hadith', copied: 'Hadith text copied.', copyFailed: 'This browser could not copy the text.',
    translation: 'Indonesian translation', source: 'Source: HouseMuslim Hadith API · Nine books (Kutubut Tis’ah). Text and translation are shown as supplied by the API; check a scholarly edition for academic study.',
    selectBook: 'Choose a book to start browsing.',
  },
};
const BOOKS_URL = `${API}/hadith/books`;
const PER_PAGE = 10;

export function createHouseMuslimHadithFeature({ initialLang = 'id' } = {}) {
  if (!$('ilm-housemuslim-view') || !$('ilm-housemuslim-book') || !$('ilm-housemuslim-results')) return null;
  let lang = initialLang === 'en' ? 'en' : 'id';
  let books = [];
  let booksLoaded = false;
  let activeBook = '';
  let page = 1;
  let total = 0;
  let lastQuery = '';
  let listTicket = 0;
  let detailTicket = 0;
  const words = () => HADITH_WORDS[lang];
  const book = () => books.find((item) => item.slug === activeBook) || null;

  function updateText() {
    const w = words();
    $('ilm-housemuslim-title').textContent = w.title;
    $('ilm-housemuslim-note').textContent = w.note;
    $('ilm-housemuslim-book-label').textContent = w.book;
    $('ilm-housemuslim-query-label').textContent = w.query;
    $('ilm-housemuslim-query').placeholder = w.placeholder;
    $('ilm-housemuslim-search-button').textContent = w.search;
    $('ilm-housemuslim-prev').textContent = w.previous;
    $('ilm-housemuslim-next').textContent = w.next;
    $('ilm-housemuslim-source').textContent = w.source;
    if (books.length) renderBookOptions();
    renderItems();
    if ($('ilm-housemuslim-detail').dataset.open === 'true') renderDetailCard($('ilm-housemuslim-detail')._item);
  }
  function renderBookOptions() {
    const selected = activeBook;
    $('ilm-housemuslim-book').replaceChildren(el('option', { value: '', textContent: words().selectBook }), ...books.map((item) => el('option', {
      value: item.slug,
      textContent: `${item.name} · ${Number(item.total || 0).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')}`,
    })));
    if (books.some((item) => item.slug === selected)) $('ilm-housemuslim-book').value = selected;
  }
  function renderItems(items = $('ilm-housemuslim-results')._items || []) {
    const container = $('ilm-housemuslim-results');
    container._items = Array.isArray(items) ? items : [];
    if (!container._items.length) {
      container.replaceChildren(el('p', { className: 'ibadah-empty', textContent: words().empty }));
      return;
    }
    const name = book()?.name || activeBook;
    container.replaceChildren(...container._items.map((item) => {
      const number = safeNumber(item.number);
      const card = el('article', { className: 'ibadah-card housemuslim-hadith-card' },
        el('div', { className: 'ibadah-card-head' }, el('span', { className: 'ibadah-badge', textContent: `${name} · #${number || '—'}` })));
      const arabic = pickText(item, ['arab', 'arabic', 'text_arabic']);
      const translation = pickText(item, ['translation_id', 'indonesian', 'translation']);
      if (arabic) card.append(el('p', { className: 'ibadah-arabic', lang: 'ar', dir: 'rtl', textContent: arabic }));
      if (translation) card.append(el('p', { className: 'ibadah-prose', lang: 'id', textContent: translation }));
      const button = el('button', { className: 'pill', type: 'button', textContent: words().open, disabled: !number });
      button.addEventListener('click', () => number && loadDetail(number));
      card.append(el('div', { className: 'ibadah-actions' }, button));
      return card;
    }));
  }
  function renderDetailCard(item) {
    const container = $('ilm-housemuslim-detail');
    container.replaceChildren();
    if (!item) { container.dataset.open = 'false'; return; }
    container.dataset.open = 'true';
    const name = book()?.name || activeBook;
    const number = safeNumber(item.number);
    const card = el('article', { className: 'ibadah-card housemuslim-detail-card' },
      el('div', { className: 'ibadah-card-head' },
        el('h3', { className: 'ibadah-reference', textContent: `${words().detailTitle} · ${name} #${number || '—'}` }),
        el('button', { className: 'pill', type: 'button', textContent: words().closeDetail, onclick: () => { container.dataset.open = 'false'; container._item = null; container.replaceChildren(); } })));
    const arabic = pickText(item, ['arab', 'arabic', 'text_arabic']);
    const translation = pickText(item, ['translation_id', 'indonesian', 'translation']);
    if (arabic) card.append(el('p', { className: 'ibadah-arabic', lang: 'ar', dir: 'rtl', textContent: arabic }));
    if (translation) card.append(el('p', { className: 'ibadah-prose', lang: 'id' }, el('b', { textContent: `${words().translation}: ` }), translation));
    const copyButton = el('button', { className: 'pill', type: 'button', textContent: words().copy });
    copyButton.addEventListener('click', async () => {
      const copyText = [arabic, translation].filter(Boolean).join('\n\n');
      try {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
        await navigator.clipboard.writeText(copyText);
        setStatus($('ilm-housemuslim-detail-status'), words().copied);
      } catch { setStatus($('ilm-housemuslim-detail-status'), words().copyFailed, true); }
    });
    card.append(el('div', { className: 'ibadah-actions' }, copyButton));
    container._item = item;
    container.replaceChildren(card);
  }
  function setPagerStatus(text, error = false) { setStatus($('ilm-housemuslim-status'), text, error); }
  function updatePager() {
    const pages = total ? Math.max(1, Math.ceil(total / PER_PAGE)) : 1;
    $('ilm-housemuslim-prev').disabled = page <= 1;
    $('ilm-housemuslim-next').disabled = page >= pages;
    $('ilm-housemuslim-page').textContent = total ? words().page(page, pages, total) : '';
  }
  async function loadBooks() {
    if (booksLoaded) return;
    const ticket = ++listTicket;
    setPagerStatus(words().loadingBooks);
    try {
      const result = await requestJson(BOOKS_URL);
      if (ticket !== listTicket) return;
      const data = result.payload?.data;
      if (!Array.isArray(data) || !data.every((item) => typeof item?.slug === 'string' && typeof item?.name === 'string')) throw new Error('invalid-books');
      books = data.slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
      booksLoaded = true;
      activeBook = books.some((item) => item.slug === activeBook) ? activeBook : (books.find((item) => item.slug === 'bukhari')?.slug || books[0]?.slug || '');
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
    const query = $('ilm-housemuslim-query').value.trim();
    lastQuery = query;
    const path = query
      ? `${API}/hadith/books/${encodeURIComponent(activeBook)}/search?q=${encodeURIComponent(query)}&page=${page}&per_page=${PER_PAGE}`
      : `${API}/hadith/books/${encodeURIComponent(activeBook)}/items?page=${page}&per_page=${PER_PAGE}`;
    setPagerStatus(words().loading);
    $('ilm-housemuslim-results').replaceChildren();
    try {
      const result = await requestJson(path, { force });
      if (ticket !== listTicket) return;
      const data = result.payload?.data;
      if (!Array.isArray(data)) throw new Error('invalid-hadith-list');
      total = Number(result.payload?.meta?.total) || 0;
      page = Number(result.payload?.meta?.page) || page;
      renderItems(data);
      updatePager();
      const status = query ? words().results(total || data.length) : words().page(page, total ? Math.max(1, Math.ceil(total / PER_PAGE)) : 1, total);
      setPagerStatus(result.cached ? `${status} · ${words().cached}` : status);
    } catch {
      if (ticket !== listTicket) return;
      updatePager();
      setPagerStatus(words().failed, true);
      renderItems([]);
    }
  }
  async function loadDetail(number) {
    const ticket = ++detailTicket;
    setStatus($('ilm-housemuslim-detail-status'), words().loading);
    $('ilm-housemuslim-detail').replaceChildren();
    try {
      const url = `${API}/hadith/books/${encodeURIComponent(activeBook)}/items/${encodeURIComponent(String(number))}`;
      const result = await requestJson(url);
      if (ticket !== detailTicket) return;
      const item = result.payload?.data;
      if (!item || !safeNumber(item.number)) throw new Error('invalid-hadith-detail');
      $('ilm-housemuslim-detail')._item = item;
      renderDetailCard(item);
      setStatus($('ilm-housemuslim-detail-status'), result.cached ? words().cached : '');
    } catch {
      if (ticket === detailTicket) setStatus($('ilm-housemuslim-detail-status'), words().failed, true);
    }
  }
  function activate(tab) {
    if (tab !== 'housemuslim') return;
    if (!booksLoaded) loadBooks();
    else if (!$('ilm-housemuslim-results')._items?.length) loadItems();
  }
  $('ilm-housemuslim-book').addEventListener('change', () => {
    activeBook = $('ilm-housemuslim-book').value;
    page = 1;
    $('ilm-housemuslim-detail').dataset.open = 'false';
    $('ilm-housemuslim-detail').replaceChildren();
    if ($('ilm-housemuslim-query').value.trim()) loadItems();
    else loadItems();
  });
  $('ilm-housemuslim-search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    page = 1;
    $('ilm-housemuslim-detail').dataset.open = 'false';
    $('ilm-housemuslim-detail').replaceChildren();
    if (!activeBook) { loadBooks(); return; }
    loadItems();
  });
  $('ilm-housemuslim-prev').addEventListener('click', () => { if (page > 1) { page -= 1; loadItems(); } });
  $('ilm-housemuslim-next').addEventListener('click', () => {
    const pages = total ? Math.ceil(total / PER_PAGE) : page;
    if (page < pages) { page += 1; loadItems(); }
  });
  $('ilm-housemuslim-title').textContent = words().title;
  $('ilm-housemuslim-note').textContent = words().note;
  $('ilm-housemuslim-source').textContent = words().source;
  $('ilm-housemuslim-page').textContent = '';
  return {
    activate,
    setLanguage(nextLang) { lang = nextLang === 'en' ? 'en' : 'id'; updateText(); },
  };
}
