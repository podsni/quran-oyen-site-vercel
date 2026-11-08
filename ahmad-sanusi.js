const HADITH_BOOKS = [
  'shahih_bukhari', 'shahih_muslim', 'sunan_abu_daud', 'sunan_tirmidzi',
  'sunan_nasai', 'sunan_ibnu_majah', 'musnad_ahmad', 'musnad_syafii',
  'riyadhus_shalihin', 'riyadhus_shalihin_arab',
];
const REQUESTS = new Map();
const $ = (id) => document.getElementById(id);
const node = (tag, props = {}, ...children) => {
  const result = Object.assign(document.createElement(tag), props);
  result.append(...children);
  return result;
};
const firstText = (record, keys) => {
  if (!record || typeof record !== 'object') return '';
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};
const NAME_KEYS = ['nama_id', 'nama_kitab', 'nama', 'judul', 'title', 'name', 'kitab_name', 'nama_arab'];
const SLUG_KEYS = ['slug', 'slug_kitab', 'kitab_slug', 'kode', 'key', 'id'];
const NUMBER_KEYS = ['nomor', 'nomor_bab', 'bab_no', 'no_bab', 'number', 'nomor_hadits', 'no', 'hadits_ke', 'chapter_number'];
const META_KEYS = ['pengarang', 'author', 'penulis', 'kategori', 'category', 'total_bab', 'jumlah_bab', 'total_hadits', 'jumlah_hadits'];
const ARABIC_KEYS = ['arab', 'arabic', 'teks_arab', 'teksArab', 'arab_text', 'text_arab', 'matan_arab', 'isi_arab', 'naskah_arab'];
const INDONESIAN_KEYS = ['terjemahan_id', 'terjemahan', 'indonesia', 'translation_id', 'translation', 'arti', 'arti_id', 'text_id', 'teks_indonesia', 'terjemah', 'isi_indonesia', 'matan', 'isi', 'teks', 'text', 'content', 'konten', 'hadits', 'hadith'];
const TITLE_KEYS = ['judul_bab', 'nama_bab', 'judul', 'title', 'bab', 'chapter_name', 'name', 'nama'];

function unwrap(payload) {
  let value = payload;
  for (let index = 0; index < 5 && value && typeof value === 'object' && !Array.isArray(value); index++) {
    if (value.success === false) throw new Error(value.message || 'Permintaan data gagal.');
    if (Object.prototype.hasOwnProperty.call(value, 'data')) { value = value.data; continue; }
    if (Object.prototype.hasOwnProperty.call(value, 'result')) { value = value.result; continue; }
    break;
  }
  if (value?.success === false) throw new Error(value.message || 'Permintaan data gagal.');
  return value;
}

function findList(payload, preferred = []) {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of preferred) if (Array.isArray(value[key])) return value[key];
  for (const key of ['items', 'results', 'records', 'kitab', 'kutub', 'books', 'bab', 'chapters', 'hadits', 'hadiths', 'data']) {
    if (Array.isArray(value[key])) return value[key];
  }
  const nested = Object.values(value).find((item) => Array.isArray(item));
  return nested || [];
}

function findRecord(payload, keys = ['hadits', 'hadith', 'bab', 'detail', 'item', 'record']) {
  let value = unwrap(payload);
  if (Array.isArray(value)) return value[0] || {};
  if (!value || typeof value !== 'object') return { text: typeof value === 'string' ? value : '' };
  for (const key of keys) {
    const item = value[key];
    if (item && typeof item === 'object' && !Array.isArray(item)) return item;
    if (Array.isArray(item) && item.length) return item[0];
  }
  return value;
}

function titleOf(item, fallback = '') {
  if (typeof item === 'string') return item;
  return firstText(item, NAME_KEYS) || fallback;
}
function slugOf(item, fallback = '') {
  return typeof item === 'string' ? fallback : firstText(item, SLUG_KEYS) || fallback;
}
function setStatus(id, message, isError = false) {
  const target = $(id);
  if (!target) return;
  target.textContent = message;
  target.classList.toggle('is-error', isError);
}
function textValue(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join('\n');
  if (value && typeof value === 'object') return firstText(value, ['text', 'teks', 'content', 'isi', 'terjemahan', 'arabic', 'arab']);
  return '';
}
function labeledLine(label, value, { arabic = false } = {}) {
  if (!value) return null;
  const paragraph = node('p', { className: arabic ? 'ibadah-arabic' : 'ibadah-prose', dir: arabic ? 'rtl' : 'auto', lang: arabic ? 'ar' : 'id' });
  if (!arabic) paragraph.append(node('b', { textContent: `${label}: ` }));
  paragraph.append(document.createTextNode(value));
  return paragraph;
}
function recordBody(record) {
  const arabic = firstText(record, ARABIC_KEYS);
  let translation = firstText(record, INDONESIAN_KEYS);
  if (translation === arabic) translation = '';
  if (!translation) {
    for (const [key, value] of Object.entries(record || {})) {
      if (typeof value !== 'string' || value.trim().length < 12) continue;
      if ([...ARABIC_KEYS, ...META_KEYS, ...TITLE_KEYS, ...SLUG_KEYS].includes(key)) continue;
      translation = value.trim();
      break;
    }
  }
  return { arabic, translation };
}
function renderTextCard(container, record, heading, sourceLabel = '') {
  const data = findRecord(record);
  const card = node('article', { className: 'ibadah-card library-card' });
  if (heading) card.append(node('h4', { className: 'library-card-title', textContent: heading }));
  const { arabic, translation } = recordBody(data);
  const arabicLine = labeledLine('', arabic, { arabic: true });
  const translationLine = labeledLine('Terjemahan / isi', translation);
  if (arabicLine) card.append(arabicLine);
  if (translationLine) card.append(translationLine);
  if (!arabicLine && !translationLine) {
    const fallback = Object.entries(data || {}).find(([key, value]) => typeof value === 'string' && value.trim() && ![...META_KEYS, ...SLUG_KEYS].includes(key));
    if (fallback) card.append(labeledLine('Isi', fallback[1]));
  }
  if (sourceLabel) card.append(node('p', { className: 'ibadah-note library-source', textContent: sourceLabel }));
  container.replaceChildren(card);
}
function metadataLine(item, skip = []) {
  if (!item || typeof item !== 'object') return '';
  return META_KEYS.filter((key) => !skip.includes(key) && item[key] != null)
    .map((key) => `${key.replaceAll('_', ' ')}: ${String(item[key])}`)
    .join(' · ');
}
function makeButton(label, callback, className = 'pill solid') {
  const button = node('button', { type: 'button', className, textContent: label });
  button.addEventListener('click', callback);
  return button;
}
function makeBookOption(item, index, fallbackSlug = '') {
  const label = titleOf(item, `Kitab ${index + 1}`);
  const slug = slugOf(item, fallbackSlug || label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  return { item, label, slug };
}
function pageInfo(payload) {
  let value;
  try { value = unwrap(payload); } catch { value = payload; }
  const roots = [payload, value].filter((item) => item && typeof item === 'object');
  const meta = roots.flatMap((root) => [root.meta, root.metadata, root.pagination, root.paginated])
    .find((candidate) => candidate && typeof candidate === 'object') || {};
  const page = Number(meta.page ?? meta.current_page ?? meta.currentPage ?? value?.page ?? payload?.page ?? 1) || 1;
  const total = Number(meta.total ?? meta.total_items ?? meta.totalItems ?? meta.count ?? value?.total ?? payload?.total ?? 0) || 0;
  const lastPage = Number(meta.total_pages ?? meta.last_page ?? meta.lastPage ?? Math.ceil(total / 20)) || 0;
  return { page, total, lastPage };
}

async function fetchData(resource, values = {}) {
  const params = new URLSearchParams({ resource, ...Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '' && value != null).map(([key, value]) => [key, String(value)])) });
  const url = `/api/ahmad-sanusi?${params}`;
  if (REQUESTS.has(url)) return REQUESTS.get(url);
  const task = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);
    try {
      const response = await fetch(url, { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: controller.signal });
      let payload;
      try { payload = await response.json(); } catch { throw new Error('Respons data tidak terbaca.'); }
      if (!response.ok) throw new Error(payload?.message || 'Layanan data belum dapat dibuka.');
      return payload;
    } finally {
      clearTimeout(timer);
    }
  })();
  REQUESTS.set(url, task);
  try { return await task; } catch (error) { REQUESTS.delete(url); throw error; }
}

export function createAhmadSanusiFeatures({ initialLang = 'id' } = {}) {
  const elRequired = [
    'ilm-tab-hadith-api', 'ilm-tab-kitab', 'ilm-hadith-api-view', 'ilm-kitab-view',
    'ilm-api-hadith-daily', 'ilm-kitab-books', 'ilm-api-hadith-list',
  ];
  if (elRequired.some((id) => !$(id))) return null;

  let lang = initialLang === 'en' ? 'en' : 'id';
  let hadithStarted = false;
  let kitabStarted = false;
  let hadithPage = 1;
  let searchPage = 1;
  let hadithCatalog = [];
  let kitabCatalog = [];
  let selectedKitab = '';
  let kitabDetail = null;
  let chapterResults = [];
  const isEnglish = () => lang === 'en';
  const labels = () => isEnglish() ? {
    daily: 'Hadith of the day', dailyLoading: 'Loading the hadith of the day…',
    booksLoading: 'Loading hadith books…', searchLoading: 'Searching hadith…',
    noResults: 'No matching results. Try another word.', noBooks: 'No books found.', bookMin: 'Enter at least 2 characters to search books.',
    detailLoading: 'Loading the selected text…', searchMin: 'Enter at least 3 characters to search hadith.',
    kitabLoading: 'Loading the yellow-book catalog…', categoriesLoading: 'Loading categories…',
    noKitab: 'No books match this search.', chapterMin: 'Enter at least 2 characters to search chapters.',
    chooseKitab: 'Choose a book to see its chapters.', noChapters: 'No chapters were found for this book.',
    openChapter: 'Open chapter', openHadith: 'Open hadith',
    source: 'Source: Ahmad Sanusi Open API.', unavailable: 'Data is temporarily unavailable. Check your connection and try again.',
  } : {
    daily: 'Hadis hari ini', dailyLoading: 'Memuat hadis harian…',
    booksLoading: 'Memuat daftar kitab hadis…', searchLoading: 'Mencari hadis…',
    noResults: 'Tidak ada hasil yang cocok. Coba kata lain.', noBooks: 'Kitab tidak ditemukan.', bookMin: 'Masukkan minimal 2 karakter untuk mencari kitab.',
    detailLoading: 'Memuat teks…', searchMin: 'Masukkan minimal 3 karakter untuk mencari hadis.',
    kitabLoading: 'Memuat katalog Kitab Kuning…', categoriesLoading: 'Memuat kategori…',
    noKitab: 'Tidak ada kitab yang cocok.', chapterMin: 'Masukkan minimal 2 karakter untuk mencari bab.',
    chooseKitab: 'Pilih kitab untuk melihat daftar bab.', noChapters: 'Daftar bab kitab ini belum ditemukan.',
    openChapter: 'Buka bab', openHadith: 'Buka hadis',
    source: 'Sumber: Ahmad Sanusi Open API.', unavailable: 'Data belum dapat dimuat. Periksa koneksi lalu coba lagi.',
  };

  function updateLabels() {
    const w = labels();
    $('ilm-tab-hadith-api').textContent = isEnglish() ? 'Hadith API' : 'Hadis API';
    $('ilm-tab-kitab').textContent = isEnglish() ? 'Kitab Kuning' : 'Kitab Kuning';
    $('ilm-api-hadith-search-label').textContent = isEnglish() ? 'Search topic' : 'Cari topik atau kata';
    $('ilm-api-hadith-search-book-label').textContent = isEnglish() ? 'Filter by book' : 'Filter kitab';
    $('ilm-api-hadith-query').placeholder = isEnglish() ? 'Example: patience, prayer' : 'Contoh: sabar, shalat';
    $('ilm-api-hadith-search-button').textContent = isEnglish() ? 'Search' : 'Cari hadis';
    $('ilm-api-hadith-book-label').textContent = isEnglish() ? 'Hadith book' : 'Kitab hadis';
    $('ilm-api-hadith-number-label').textContent = isEnglish() ? 'Hadith number' : 'Nomor hadis';
    $('ilm-api-hadith-open-number').textContent = isEnglish() ? 'Open hadith' : 'Buka hadis';
    $('ilm-api-hadith-prev').textContent = isEnglish() ? 'Previous' : 'Sebelumnya';
    $('ilm-api-hadith-next').textContent = isEnglish() ? 'Next' : 'Berikutnya';
    $('ilm-api-hadith-search-prev').textContent = isEnglish() ? 'Previous' : 'Sebelumnya';
    $('ilm-api-hadith-search-next').textContent = isEnglish() ? 'Next' : 'Berikutnya';
    $('ilm-kitab-query-label').textContent = isEnglish() ? 'Find a book, author, or topic' : 'Cari kitab, pengarang, atau topik';
    $('ilm-kitab-query').placeholder = isEnglish() ? 'Example: fiqh, Nawawi' : 'Contoh: fikih, Nawawi';
    $('ilm-kitab-category-label').textContent = isEnglish() ? 'Category' : 'Kategori';
    $('ilm-kitab-search-button').textContent = isEnglish() ? 'Search books' : 'Cari kitab';
    const searchingKitab = $('ilm-kitab-view').classList.contains('has-query');
    $('ilm-kitab-catalog-heading').textContent = isEnglish()
      ? (searchingKitab ? 'Search results' : 'Browse the collection')
      : (searchingKitab ? 'Hasil pencarian' : 'Jelajahi koleksi kitab');
    $('ilm-kitab-chapter-query-label').textContent = isEnglish() ? 'Search chapter title' : 'Cari judul bab';
    $('ilm-kitab-chapters-heading').textContent = isEnglish() ? 'Find a chapter' : 'Telusuri bab';
    $('ilm-kitab-chapter-query').placeholder = isEnglish() ? 'At least 2 characters' : 'Minimal 2 karakter';
    $('ilm-kitab-chapter-search-button').textContent = isEnglish() ? 'Search chapters' : 'Cari bab';
    $('ilm-kitab-chapter-select-label').textContent = isEnglish() ? 'Chapter' : 'Daftar bab';
    $('ilm-kitab-open-chapter').textContent = isEnglish() ? 'Open chapter' : 'Buka bab';
    $('ilm-api-hadith-search-title').textContent = isEnglish() ? 'Search Indonesian hadith' : 'Cari hadis berbahasa Indonesia';
    $('ilm-api-hadith-browse-title').textContent = isEnglish() ? 'Browse by hadith book' : 'Jelajahi berdasarkan kitab hadis';
    $('ilm-api-hadith-title').textContent = isEnglish() ? 'Hadith from Ahmad Sanusi API' : 'Hadis dari API Ahmad Sanusi';
    $('ilm-kitab-title').textContent = isEnglish() ? 'Classical Islamic books' : 'Kitab Kuning';
    $('ilm-kitab-selected-heading').textContent = isEnglish() ? 'Your selected book' : 'Kitab pilihan';
    const detailEmpty = $('ilm-kitab-detail-empty');
    if (detailEmpty) detailEmpty.textContent = isEnglish() ? 'Choose a book above to see its author and chapter list.' : 'Pilih salah satu kitab di atas untuk melihat pengarang dan daftar bab.';
    $('ilm-kitab-description').textContent = isEnglish()
      ? 'Browse classical books, filter by category, search chapters, and open the original text supplied by the API.'
      : 'Cari kitab klasik berdasarkan judul, pengarang, atau kategori. Buka sebuah kitab untuk menelusuri bab dan membaca teksnya.';
    $('ilm-api-hadith-description').textContent = isEnglish()
      ? 'Read a daily hadith, search Indonesian translations, browse books, and open a hadith by number.'
      : 'Baca hadis harian, cari terjemahan Indonesia, jelajahi kitab, dan buka hadis berdasarkan nomor.';
    $('ilm-api-hadith-source').textContent = w.source;
    $('ilm-kitab-source').textContent = w.source;
  }

  function renderDaily(payload) {
    const record = findRecord(payload, ['hadits', 'hadith', 'data', 'item', 'record']);
    const number = firstText(record, NUMBER_KEYS);
    const book = firstText(record, ['nama_kitab', 'kitab', 'kitab_name', 'collection_name']);
    const heading = [book, number ? `No. ${number}` : ''].filter(Boolean).join(' · ') || labels().daily;
    renderTextCard($('ilm-api-hadith-daily'), record, heading, labels().source);
  }

  function renderBookOptions(select, list, { includeAll = false } = {}) {
    const previous = select.value;
    const options = [];
    if (includeAll) options.push(node('option', { value: '', textContent: isEnglish() ? 'All books' : 'Semua kitab' }));
    list.forEach((item, index) => {
      const option = makeBookOption(item, index, HADITH_BOOKS[index] || '');
      if (!option.slug) return;
      options.push(node('option', { value: option.slug, textContent: option.label }));
    });
    select.replaceChildren(...options);
    if ([...select.options].some((option) => option.value === previous)) select.value = previous;
    else if (!includeAll && options.length) select.selectedIndex = 0;
  }

  function renderHadithItems(container, items, page, onOpen, emptyText) {
    if (!items.length) {
      container.replaceChildren(node('p', { className: 'ibadah-empty', textContent: emptyText }));
      return;
    }
    const cards = items.map((item, index) => {
      const num = firstText(item, NUMBER_KEYS) || String((page - 1) * 20 + index + 1);
      const book = firstText(item, ['kitab_name', 'nama_kitab', 'kitab', 'collection_name', 'name']);
      const title = [book, `No. ${num}`].filter(Boolean).join(' · ');
      const card = node('article', { className: 'ibadah-card library-card' });
      card.append(node('div', { className: 'ibadah-card-head' }, node('span', { className: 'ibadah-badge', textContent: title })));
      const body = recordBody(item);
      const arabic = labeledLine('', body.arabic, { arabic: true });
      const translated = labeledLine(isEnglish() ? 'Indonesian translation' : 'Terjemahan', body.translation);
      if (arabic) card.append(arabic);
      if (translated) card.append(translated);
      if (!arabic && !translated) {
        const text = firstText(item, ['text', 'teks', 'isi', 'hadits', 'terjemahan_id', 'terjemahan', 'matan']);
        if (text) card.append(labeledLine(isEnglish() ? 'Text' : 'Teks', text));
      }
      const slug = firstText(item, ['kitab', 'kitab_slug', 'slug', 'book_slug']);
      const actions = node('div', { className: 'ibadah-actions' });
      actions.append(makeButton(isEnglish() ? 'Open' : 'Buka', () => onOpen({ item, number: num, slug })));
      card.append(actions);
      return card;
    });
    container.replaceChildren(...cards);
  }

  async function loadDailyAndBooks() {
    const w = labels();
    setStatus('ilm-api-hadith-daily-status', w.dailyLoading);
    setStatus('ilm-api-hadith-books-status', w.booksLoading);
    try {
      const payload = await fetchData('hadits-daily');
      renderDaily(payload);
      setStatus('ilm-api-hadith-daily-status', '');
    } catch { setStatus('ilm-api-hadith-daily-status', w.unavailable, true); }
    try {
      const payload = await fetchData('hadits-books');
      hadithCatalog = findList(payload, ['kitab', 'books', 'items', 'results', 'data']);
      renderBookOptions($('ilm-api-hadith-book'), hadithCatalog);
      renderBookOptions($('ilm-api-hadith-search-book'), hadithCatalog, { includeAll: true });
      setStatus('ilm-api-hadith-books-status', hadithCatalog.length ? '' : w.noBooks, !hadithCatalog.length);
      if (hadithCatalog.length && $('ilm-api-hadith-book').value) await loadHadithList(1);
    } catch { setStatus('ilm-api-hadith-books-status', w.unavailable, true); }
  }

  async function loadHadithList(page = 1) {
    const book = $('ilm-api-hadith-book').value;
    if (!book) return;
    hadithPage = page;
    setStatus('ilm-api-hadith-books-status', labels().booksLoading);
    $('ilm-api-hadith-list').setAttribute('aria-busy', 'true');
    try {
      const payload = await fetchData('hadits-list', { kitab: book, page, limit: 20 });
      const list = findList(payload, ['hadits', 'hadiths', 'items', 'results', 'records', 'data']);
      const info = pageInfo(payload);
      renderHadithItems($('ilm-api-hadith-list'), list, page, ({ number }) => loadHadithDetail(book, number), labels().noResults);
      setStatus('ilm-api-hadith-books-status', info.total ? `${isEnglish() ? 'Page' : 'Halaman'} ${page}${info.lastPage ? ` / ${info.lastPage}` : ''} · ${info.total} ${isEnglish() ? 'items' : 'hadis'}` : '');
      $('ilm-api-hadith-prev').disabled = page <= 1;
      $('ilm-api-hadith-next').disabled = info.lastPage ? page >= info.lastPage : list.length < 20;
    } catch { setStatus('ilm-api-hadith-books-status', labels().unavailable, true); }
    finally { $('ilm-api-hadith-list').removeAttribute('aria-busy'); }
  }

  async function loadHadithDetail(book, number) {
    if (!book || !/^\d+$/.test(String(number)) || Number(number) < 1) return;
    setStatus('ilm-api-hadith-detail-status', labels().detailLoading);
    $('ilm-api-hadith-detail').replaceChildren();
    try {
      const payload = await fetchData('hadits-detail', { kitab: book, nomor: number });
      const record = findRecord(payload, ['hadits', 'hadith', 'detail', 'item', 'record']);
      const title = `${titleOf(hadithCatalog.find((item, index) => slugOf(item, HADITH_BOOKS[index] || '') === book), book)} · No. ${number}`;
      renderTextCard($('ilm-api-hadith-detail'), record, title, labels().source);
      setStatus('ilm-api-hadith-detail-status', '');
    } catch { setStatus('ilm-api-hadith-detail-status', labels().unavailable, true); }
  }

  async function searchHadith(event) {
    event.preventDefault();
    const query = $('ilm-api-hadith-query').value.trim();
    if (query.length < 3) { setStatus('ilm-api-hadith-search-status', labels().searchMin, true); $('ilm-api-hadith-query').focus(); return; }
    searchPage = 1;
    await runHadithSearch();
  }

  async function runHadithSearch() {
    const query = $('ilm-api-hadith-query').value.trim();
    if (query.length < 3) return;
    setStatus('ilm-api-hadith-search-status', labels().searchLoading);
    $('ilm-api-hadith-search-results').setAttribute('aria-busy', 'true');
    try {
      const payload = await fetchData('hadits-search', { q: query, kitab: $('ilm-api-hadith-search-book').value, page: searchPage, limit: 20 });
      const items = findList(payload, ['hadits', 'hadiths', 'items', 'results', 'records', 'data']);
      const info = pageInfo(payload);
      renderHadithItems($('ilm-api-hadith-search-results'), items, searchPage, ({ item, number, slug }) => {
        const book = slug || $('ilm-api-hadith-search-book').value || $('ilm-api-hadith-book').value;
        if (book) loadHadithDetail(book, number);
        else setStatus('ilm-api-hadith-detail-status', isEnglish() ? 'Choose a hadith book first.' : 'Pilih kitab hadis terlebih dahulu.', true);
      }, labels().noResults);
      setStatus('ilm-api-hadith-search-status', items.length ? `${items.length} ${isEnglish() ? 'results' : 'hasil'}${info.total ? ` · ${info.total} total` : ''}` : labels().noResults, !items.length);
      $('ilm-api-hadith-search-prev').disabled = searchPage <= 1;
      $('ilm-api-hadith-search-next').disabled = info.lastPage ? searchPage >= info.lastPage : items.length < 20;
    } catch { setStatus('ilm-api-hadith-search-status', labels().unavailable, true); }
    finally { $('ilm-api-hadith-search-results').removeAttribute('aria-busy'); }
  }

  async function loadKitabCategories() {
    setStatus('ilm-kitab-category-status', labels().categoriesLoading);
    try {
      const payload = await fetchData('kitab-categories');
      const categories = findList(payload, ['kategori', 'categories', 'items', 'results', 'data']);
      const select = $('ilm-kitab-category');
      const old = select.value;
      const options = [node('option', { value: '', textContent: isEnglish() ? 'All categories' : 'Semua kategori' })];
      for (const category of categories) {
        const name = typeof category === 'string' ? category : firstText(category, ['kategori', 'nama', 'name', 'category', 'title']);
        if (name) options.push(node('option', { value: name, textContent: name }));
      }
      select.replaceChildren(...options);
      if ([...select.options].some((option) => option.value === old)) select.value = old;
      setStatus('ilm-kitab-category-status', '');
    } catch { setStatus('ilm-kitab-category-status', labels().unavailable, true); }
  }

  function renderKitabBooks(items) {
    const container = $('ilm-kitab-books');
    if (!items.length) { container.replaceChildren(node('p', { className: 'ibadah-empty', textContent: labels().noKitab })); return; }
    const cards = items.map((item, index) => {
      const book = makeBookOption(item, index);
      const card = node('article', { className: 'ibadah-card library-card kitab-book-card' });
      const icon = node('span', { className: 'kitab-book-icon', textContent: 'ك', ariaHidden: 'true' });
      const titles = node('div', { className: 'kitab-book-titles' },
        node('span', { className: 'kitab-book-kicker', textContent: isEnglish() ? 'CLASSICAL TEXT' : 'KITAB KLASIK' }),
        node('h4', { className: 'kitab-book-title', textContent: book.label, dir: 'auto' }));
      card.append(node('div', { className: 'kitab-book-head' }, icon, titles));
      const author = firstText(item, ['pengarang', 'author', 'penulis', 'muallif']);
      const category = firstText(item, ['kategori', 'category']);
      const summary = firstText(item, ['deskripsi', 'description', 'ringkasan', 'summary']);
      if (author) card.append(node('p', { className: 'ibadah-prose kitab-book-author', dir: 'auto' }, node('b', { textContent: isEnglish() ? 'Author: ' : 'Pengarang: ' }), document.createTextNode(author)));
      if (category) card.append(node('p', { className: 'ibadah-note kitab-book-category', textContent: category }));
      if (summary) card.append(node('p', { className: 'ibadah-prose kitab-book-summary', dir: 'auto', textContent: summary }));
      const actions = node('div', { className: 'ibadah-actions' });
      actions.append(makeButton(isEnglish() ? 'Read this book' : 'Baca kitab ini', () => loadKitab(book.slug, item), 'pill solid kitab-open-button'));
      card.append(actions);
      return card;
    });
    container.replaceChildren(...cards);
  }

  function scrollKitabFocus(target) {
    if (!target || !window.matchMedia('(max-width: 640px)').matches) return;
    const body = $('ilm-panel').querySelector('.panel-body');
    requestAnimationFrame(() => {
      const bodyRect = body.getBoundingClientRect();
      const tabsHeight = $('ilm-tabs').getBoundingClientRect().height;
      const searchHeight = $('ilm-kitab-view').classList.contains('has-query')
        ? $('ilm-kitab-search-form').getBoundingClientRect().height : 0;
      const topInContent = target.getBoundingClientRect().top - bodyRect.top + body.scrollTop;
      const stickySpace = tabsHeight + searchHeight + 12;
      const nextTop = Math.max(0, Math.min(topInContent - stickySpace, body.scrollHeight - body.clientHeight));
      body.scrollTo({ top: nextTop, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  }

  async function searchKitabBooks(event) {
    event?.preventDefault();
    const q = $('ilm-kitab-query').value.trim();
    const category = $('ilm-kitab-category').value;
    if (q && q.length < 2) { setStatus('ilm-kitab-status', labels().bookMin, true); return; }
    const searching = Boolean(q || category);
    const view = $('ilm-kitab-view');
    view.classList.toggle('has-query', searching);
    view.classList.remove('has-selected');
    $('ilm-kitab-catalog-heading').textContent = isEnglish()
      ? (searching ? 'Search results' : 'Browse the collection')
      : (searching ? 'Hasil pencarian' : 'Jelajahi koleksi kitab');
    selectedKitab = null;
    kitabDetail = null;
    chapterResults = [];
    $('ilm-kitab-detail').replaceChildren(node('p', {
      id: 'ilm-kitab-detail-empty', className: 'ibadah-empty',
      textContent: isEnglish() ? 'Choose a book above to see its author and chapter list.' : 'Pilih salah satu kitab di atas untuk melihat pengarang dan daftar bab.'
    }));
    setStatus('ilm-kitab-detail-status', '');
    setStatus('ilm-kitab-chapter-status', '');
    $('ilm-kitab-chapter-results').replaceChildren();
    $('ilm-kitab-chapter-select').replaceChildren(node('option', { value: '', textContent: isEnglish() ? 'Choose a book first' : 'Pilih kitab terlebih dahulu' }));
    $('ilm-kitab-open-chapter').disabled = true;
    $('ilm-kitab-books').replaceChildren();
    setStatus('ilm-kitab-status', labels().kitabLoading);
    $('ilm-kitab-books').setAttribute('aria-busy', 'true');
    try {
      const payload = await fetchData('kitab-list', { q: q.length >= 2 ? q : '', kategori: category });
      kitabCatalog = findList(payload, ['kitab', 'books', 'items', 'results', 'records', 'data']);
      renderKitabBooks(kitabCatalog);
      setStatus('ilm-kitab-status', kitabCatalog.length ? `${kitabCatalog.length} ${isEnglish() ? 'books' : 'kitab'}` : labels().noKitab, !kitabCatalog.length);
    } catch { setStatus('ilm-kitab-status', labels().unavailable, true); }
    finally {
      const books = $('ilm-kitab-books');
      books.removeAttribute('aria-busy');
      if (searching) scrollKitabFocus(books.firstElementChild || $('ilm-kitab-status'));
    }
  }

  function chapterNumber(item, index) {
    return firstText(item, NUMBER_KEYS) || String(index + 1);
  }
  function chapterTitle(item, index) {
    if (typeof item === 'string') return item;
    const title = firstText(item, TITLE_KEYS);
    return `${chapterNumber(item, index)}. ${title || (isEnglish() ? 'Chapter' : 'Bab')}`;
  }
  function findChapters(payload, depth = 0) {
    const value = unwrap(payload);
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object' || depth > 3) return [];
    for (const key of ['bab', 'babs', 'chapters', 'daftar_bab', 'daftar_bab_hadits', 'items', 'results', 'contents']) {
      if (Array.isArray(value[key])) return value[key];
      if (value[key] && typeof value[key] === 'object') {
        for (const nested of ['items', 'data', 'bab', 'chapters']) if (Array.isArray(value[key][nested])) return value[key][nested];
      }
    }
    for (const key of ['kitab', 'book', 'detail', 'data', 'result']) {
      const nested = value[key];
      if (nested && typeof nested === 'object') {
        const chapters = findChapters(nested, depth + 1);
        if (chapters.length) return chapters;
      }
    }
    return [];
  }

  function showChapters() {
    const select = $('ilm-kitab-chapter-select');
    const choices = chapterResults;
    if (!choices.length) {
      select.replaceChildren(node('option', { value: '', textContent: labels().noChapters }));
      return;
    }
    const options = choices.map((chapter, index) => node('option', { value: chapterNumber(chapter, index), textContent: chapterTitle(chapter, index) }));
    select.replaceChildren(...options);
    $('ilm-kitab-open-chapter').disabled = false;
  }

  async function loadKitab(slug, item = null) {
    if (!slug) { setStatus('ilm-kitab-detail-status', labels().unavailable, true); return; }
    selectedKitab = slug;
    kitabDetail = item;
    $('ilm-kitab-view').classList.add('has-selected');
    $('ilm-kitab-detail').replaceChildren();
    $('ilm-kitab-chapter-results').replaceChildren();
    $('ilm-kitab-open-chapter').disabled = true;
    setStatus('ilm-kitab-detail-status', labels().detailLoading);
    try {
      const payload = await fetchData('kitab-detail', { slug, page: 1, limit: 200 });
      const record = findRecord(payload, ['kitab', 'detail', 'item', 'record']);
      const detailName = titleOf(record, titleOf(item, slug));
      const author = firstText(record, ['pengarang', 'author', 'penulis', 'muallif']) || firstText(item, ['pengarang', 'author', 'penulis']);
      const summary = firstText(record, ['deskripsi', 'description', 'ringkasan', 'summary']);
      const metadata = node('article', { className: 'ibadah-card library-card' });
      metadata.append(node('h4', { className: 'library-card-title', textContent: detailName }));
      if (author) metadata.append(node('p', { className: 'ibadah-prose' }, node('b', { textContent: isEnglish() ? 'Author: ' : 'Pengarang: ' }), document.createTextNode(author)));
      if (summary) metadata.append(node('p', { className: 'ibadah-prose', textContent: summary }));
      const meta = metadataLine(record);
      if (meta) metadata.append(node('p', { className: 'ibadah-note', textContent: meta }));
      $('ilm-kitab-detail').replaceChildren(metadata);
      chapterResults = findChapters(payload);
      showChapters();
      setStatus('ilm-kitab-detail-status', chapterResults.length ? `${chapterResults.length} ${isEnglish() ? 'chapters' : 'bab'}` : labels().noChapters, !chapterResults.length);
    } catch { setStatus('ilm-kitab-detail-status', labels().unavailable, true); }
    finally { scrollKitabFocus($('ilm-kitab-selected-heading')); }
  }

  async function searchChapters(event) {
    event.preventDefault();
    const q = $('ilm-kitab-chapter-query').value.trim();
    if (q.length < 2) { setStatus('ilm-kitab-chapter-status', labels().chapterMin, true); return; }
    if (!selectedKitab) { setStatus('ilm-kitab-chapter-status', labels().chooseKitab, true); return; }
    setStatus('ilm-kitab-chapter-status', labels().searchLoading);
    try {
      const payload = await fetchData('kitab-search', { slug: selectedKitab, q });
      chapterResults = findChapters(payload);
      if (!chapterResults.length) chapterResults = findList(payload, ['bab', 'chapters', 'items', 'results', 'data']);
      showChapters();
      setStatus('ilm-kitab-chapter-status', chapterResults.length ? `${chapterResults.length} ${isEnglish() ? 'chapters' : 'bab'}` : labels().noResults, !chapterResults.length);
    } catch { setStatus('ilm-kitab-chapter-status', labels().unavailable, true); }
  }

  async function loadChapter() {
    const number = $('ilm-kitab-chapter-select').value;
    if (!selectedKitab || !/^\d+$/.test(number) || Number(number) < 1) return;
    setStatus('ilm-kitab-chapter-status', labels().detailLoading);
    $('ilm-kitab-chapter-results').replaceChildren();
    try {
      const payload = await fetchData('kitab-chapter', { slug: selectedKitab, nomor: number });
      const record = findRecord(payload, ['bab', 'chapter', 'detail', 'item', 'record']);
      const title = chapterTitle(chapterResults.find((item, index) => chapterNumber(item, index) === number), Number(number) - 1);
      renderTextCard($('ilm-kitab-chapter-results'), record, title, labels().source);
      setStatus('ilm-kitab-chapter-status', '');
    } catch { setStatus('ilm-kitab-chapter-status', labels().unavailable, true); }
  }

  async function activate(tab) {
    if (tab === 'hadithApi' && !hadithStarted) {
      hadithStarted = true;
      await loadDailyAndBooks();
    }
    if (tab === 'kitab' && !kitabStarted) {
      kitabStarted = true;
      await Promise.all([loadKitabCategories(), searchKitabBooks()]);
    }
  }

  $('ilm-api-hadith-search-form').addEventListener('submit', searchHadith);
  $('ilm-api-hadith-search-book').addEventListener('change', () => { searchPage = 1; });
  $('ilm-api-hadith-book').addEventListener('change', () => loadHadithList(1));
  $('ilm-api-hadith-prev').addEventListener('click', () => loadHadithList(Math.max(1, hadithPage - 1)));
  $('ilm-api-hadith-next').addEventListener('click', () => loadHadithList(hadithPage + 1));
  $('ilm-api-hadith-search-prev').addEventListener('click', () => { searchPage = Math.max(1, searchPage - 1); runHadithSearch(); });
  $('ilm-api-hadith-search-next').addEventListener('click', () => { searchPage += 1; runHadithSearch(); });
  $('ilm-api-hadith-detail-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const number = $('ilm-api-hadith-number').value.trim();
    if (!/^\d+$/.test(number) || Number(number) < 1) { setStatus('ilm-api-hadith-detail-status', isEnglish() ? 'Enter a valid hadith number.' : 'Masukkan nomor hadis yang valid.', true); return; }
    loadHadithDetail($('ilm-api-hadith-book').value, number);
  });
  $('ilm-kitab-search-form').addEventListener('submit', searchKitabBooks);
  $('ilm-kitab-category').addEventListener('change', () => searchKitabBooks());
  $('ilm-kitab-chapter-search-form').addEventListener('submit', searchChapters);
  $('ilm-kitab-open-chapter').addEventListener('click', loadChapter);

  updateLabels();
  $('ilm-api-hadith-prev').disabled = true;
  $('ilm-api-hadith-next').disabled = true;
  $('ilm-api-hadith-search-prev').disabled = true;
  $('ilm-api-hadith-search-next').disabled = true;
  $('ilm-kitab-open-chapter').disabled = true;

  return {
    activate,
    setLanguage(nextLang) { lang = nextLang === 'en' ? 'en' : 'id'; updateLabels(); },
  };
}
