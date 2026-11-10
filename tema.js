import { getEquranSurah, audioForQari } from './equran.js';

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const normalize = (value) => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const DATA_URL = new URL('./data/tema-tematik.json', import.meta.url);
const SAVED_KEY = 'quran-oyen.tema.saved.v1';
const PROGRESS_KEY = 'quran-oyen.renungan5.progress.v1';
let catalog, activeTheme = null, activeSubtopic = null;
let audio = null, playingKey = '', audioButton = null, audioRun = 0, toastTimer = 0;
let saved = readSaved(), progress = readProgress();

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    return new Set(Array.isArray(value) ? value.filter((item) => /^\d{1,3}:\d{1,3}$/.test(item)).slice(0, 200) : []);
  } catch { return new Set(); }
}
function writeSaved() { try { localStorage.setItem(SAVED_KEY, JSON.stringify([...saved])); } catch { notice('Penyimpanan browser tidak tersedia; koleksi ini mungkin tidak bertahan setelah halaman ditutup.'); } }
function readProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    const dates = Array.isArray(value?.doneDates) ? value.doneDates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).slice(-365) : [];
    const notes = value?.notes && typeof value.notes === 'object' ? value.notes : {};
    return { doneDates: new Set(dates), notes };
  } catch { return { doneDates: new Set(), notes: {} }; }
}
function writeProgress() {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify({ doneDates: [...progress.doneDates].slice(-365), notes: progress.notes })); }
  catch { setStatus('reflection-status', 'Penyimpanan browser penuh atau tidak tersedia. Progres hanya berlaku sampai halaman ditutup.', true); }
}
function notice(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3600);
}
function setStatus(id, text = '', error = false) {
  const node = $(id);
  if (!node) return;
  node.textContent = text;
  node.classList.toggle('is-error', error);
}
function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function dateOffset(offset) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - offset);
  return date;
}
function dateLabel(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
function dailySubtopic() {
  const all = catalog.themes.flatMap((theme) => theme.subtopics.map((subtopic) => ({ theme, subtopic })));
  const date = new Date();
  const seed = date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate();
  return all[seed % all.length];
}
function topicById(id) { return catalog.themes.find((theme) => theme.id === id) || null; }
function subtopicById(theme, id) { return theme?.subtopics.find((subtopic) => subtopic.id === id) || null; }
function verseByRef(ref) { return catalog.verses[ref] || null; }
function tafsirSnippet(value, max = 300) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const sentenceEnd = text.search(/[.!?؟](?:\s|$)/u);
  if (sentenceEnd > 70 && sentenceEnd <= max) return text.slice(0, sentenceEnd + 1);
  const cut = text.slice(0, max - 1).lastIndexOf(' ');
  return `${text.slice(0, cut > 120 ? cut : max - 1).trim()}…`;
}
function verseCard(ref, { daily = false } = {}) {
  const verse = verseByRef(ref);
  if (!verse) return '';
  const key = `${verse.s}:${verse.a}`;
  const fromMuntakhab = verse.tafsir?.muntakhab || '';
  const fromJalalayn = verse.tafsir?.jalalayn || '';
  const savedNow = saved.has(key);
  return `<article class="verse-card" data-verse-card="${esc(key)}">
    <div class="verse-ref"><span>${esc(verse.surah)} · ${verse.s}:${verse.a}</span><a href="gulir.html?s=${verse.s}&amp;a=${verse.a}&amp;mode=reader" aria-label="Buka ${esc(verse.surah)} ayat ${verse.a} di pembaca">Baca di mushaf ↗</a></div>
    <p class="verse-arabic" lang="ar" dir="rtl">${esc(verse.arabic)}</p>
    <p class="verse-translation" lang="id">${esc(verse.translation)}</p>
    <div class="explanation"><span class="explanation-label">PENJELASAN SINGKAT · TAFSIR AL-MUNTAKHAB</span><p>${esc(tafsirSnippet(fromMuntakhab))}</p></div>
    <div class="verse-actions"><button class="action-chip" type="button" data-play-verse="${esc(key)}" aria-pressed="false">Dengarkan</button><button class="action-chip" type="button" data-save-verse="${esc(key)}" aria-pressed="${savedNow}">${savedNow ? 'Tersimpan ✓' : 'Simpan'}</button><button class="action-chip" type="button" data-share-verse="${esc(key)}">Bagikan</button></div>
    <details class="tafsir-details"><summary>Baca teks tafsir lengkap</summary><h4 class="tafsir-source">Tafsir al-Muntakhab · Muhammad Quraish Shihab et al. · QS ${verse.surah} ${verse.s}:${verse.a}</h4><p class="tafsir-text" lang="id">${esc(fromMuntakhab)}</p><details class="tafsir-secondary"><summary>Bandingkan dengan Tafsir Jalalayn</summary><p class="tafsir-text" lang="id">${esc(fromJalalayn)}</p><p class="tafsir-source">Jalal ad-Din al-Mahalli dan Jalal ad-Din as-Suyuti. Salinan Indonesia dari Tanzil.</p></details><p class="tafsir-source">Teks Arab dan tafsir disimpan di Quran Oyen. Ringkasan merupakan cuplikan awal teks tafsir, bukan fatwa atau tafsir baru.</p></details>
  </article>`;
}
function renderThemeGrid(query = $('theme-search').value) {
  const rawQuery = query.trim();
  const term = normalize(rawQuery);
  const themes = catalog.themes.filter((theme) => {
    if (!term) return true;
    const searchable = [theme.title, theme.description, ...(theme.tags || []), ...theme.subtopics.flatMap((item) => [item.title, item.intro, item.hadithQuery, ...item.refs, ...item.questions])].join(' ');
    return normalize(searchable).includes(term);
  });
  $('theme-grid').innerHTML = themes.length ? themes.map((theme) => {
    const verseCount = new Set(theme.subtopics.flatMap((item) => item.refs)).size;
    return `<button class="theme-card" type="button" data-theme="${esc(theme.id)}" aria-label="Tema ${esc(theme.title)}, ${theme.subtopics.length} subtopik, ${verseCount} ayat pilihan" aria-pressed="${activeTheme?.id === theme.id}"><span class="theme-card-top"><span class="theme-icon" aria-hidden="true">${esc(theme.icon)}</span>${theme.isNew ? '<span class="new-badge">BARU</span>' : ''}</span><strong>${esc(theme.title)}</strong><small>${esc(theme.description)}</small><span class="theme-card-bottom"><span>${theme.subtopics.length} subtopik · ${verseCount} ayat</span><span class="arrow" aria-hidden="true">→</span></span></button>`;
  }).join('') : `<div class="empty-results"><strong>Belum menemukan tema yang cocok</strong><p>Coba kata yang lebih umum seperti “doa”, “keluarga”, atau “ilmu”.</p><button type="button" data-reset-search>Hapus pencarian</button></div>`;
  $('theme-search-clear').hidden = !rawQuery;
  document.querySelectorAll('[data-search-query]').forEach((button) => button.setAttribute('aria-pressed', String(normalize(button.dataset.searchQuery) === term)));
  const subtopicCount = themes.reduce((count, theme) => count + theme.subtopics.length, 0);
  const status = rawQuery
    ? (themes.length ? `${themes.length} tema dan ${subtopicCount} subtopik cocok dengan “${rawQuery}”.` : `Tidak ada tema yang cocok dengan “${rawQuery}”.`)
    : `${catalog.themes.length} tema · ${catalog.themes.reduce((count, theme) => count + theme.subtopics.length, 0)} subtopik · ${Object.keys(catalog.verses).length} ayat pilihan.`;
  setStatus('theme-status', status);
}
function renderTheme(theme) {
  activeTheme = theme;
  activeSubtopic = null;
  $('topic-detail').hidden = false;
  $('topic-results').hidden = true;
  $('topic-kicker').textContent = `${theme.subtopics.length} subtopik`;
  $('topic-detail-title').textContent = theme.title;
  $('topic-description').textContent = theme.description;
  $('subtopic-list').innerHTML = theme.subtopics.map((subtopic) => `<button class="subtopic-card" type="button" data-subtopic="${esc(subtopic.id)}"><span><strong>${esc(subtopic.title)}</strong><small>${subtopic.refs.length} ayat · hadis terkait</small></span><span class="chevron" aria-hidden="true">›</span></button>`).join('');
  renderThemeGrid();
}
function renderSubtopic(theme, subtopic) {
  activeTheme = theme;
  activeSubtopic = subtopic;
  $('topic-detail').hidden = false;
  $('topic-results').hidden = false;
  $('results-kicker').textContent = theme.title;
  $('results-title').textContent = subtopic.title;
  $('results-intro').textContent = subtopic.intro;
  $('verse-list').innerHTML = subtopic.refs.map((ref) => verseCard(ref)).join('');
  $('topic-sources').textContent = `Sumber ayat dan terjemahan: Tanzil · Terjemahan Kementerian Agama RI. Rujukan tafsir: al-Muntakhab (Quraish Shihab et al.) dan Jalalayn. ${catalog.sources.notice}`;
  $('hadith-intro').textContent = `Pencarian hadis berbahasa Indonesia dengan kata kunci “${subtopic.hadithQuery}”.`;
  $('hadith-list').replaceChildren();
  setStatus('hadith-status', 'Memuat hadis terkait…');
  renderThemeGrid();
  loadHadith(subtopic);
}
function statusMessage(payload, fallback) {
  return typeof payload?.message === 'string' && payload.message.trim() ? payload.message : fallback;
}
function unwrapHadith(payload) {
  let value = payload;
  for (let depth = 0; depth < 5 && value && typeof value === 'object' && !Array.isArray(value); depth++) {
    if (value.success === false) throw new Error(statusMessage(value, 'Layanan hadis belum dapat diakses.'));
    if ('data' in value) { value = value.data; continue; }
    if ('result' in value) { value = value.result; continue; }
    break;
  }
  if (value?.success === false) throw new Error(statusMessage(value, 'Layanan hadis belum dapat diakses.'));
  return value;
}
function extractHadithList(payload) {
  const value = unwrapHadith(payload);
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of ['hadits', 'hadiths', 'items', 'results', 'records', 'data']) if (Array.isArray(value[key])) return value[key];
  const nested = Object.values(value).find((item) => Array.isArray(item));
  return nested || [];
}
function firstText(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}
function plainHadithText(value) {
  if (typeof value !== 'string') return '';
  const source = value.trim();
  if (!/<[a-z][^>]*>/i.test(source)) return source.replace(/\u00a0/g, ' ').replace(/\r/g, '').trim();
  const documentCopy = new DOMParser().parseFromString(source, 'text/html');
  documentCopy.querySelectorAll('script,style,iframe,object,embed').forEach((node) => node.remove());
  const blocks = new Set(['ADDRESS','ARTICLE','BLOCKQUOTE','DIV','H1','H2','H3','H4','LI','P','SECTION']);
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    if (node.tagName === 'BR') return '\n';
    const inner = [...node.childNodes].map(walk).join('');
    return blocks.has(node.tagName) ? `${inner}\n` : inner;
  };
  return walk(documentCopy.body).replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function shortHadithText(value, max = 1000) {
  const text = plainHadithText(value);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1).lastIndexOf(' ');
  return `${text.slice(0, cut > 200 ? cut : max - 1).trim()}…`;
}
function hadithCard(record) {
  const arabic = shortHadithText(firstText(record, ['arab', 'arabic', 'teks_arab', 'teksArab', 'arab_text', 'text_arab', 'matan_arab', 'isi_arab', 'naskah_arab']), 650);
  let text = shortHadithText(firstText(record, ['terjemahan_id', 'terjemahan', 'indonesia', 'translation_id', 'arti', 'arti_id', 'text_id', 'teks_indonesia', 'terjemah', 'isi_indonesia', 'matan', 'isi', 'teks', 'text', 'content', 'konten', 'hadits', 'hadith']));
  if (text === arabic) text = '';
  if (!text) {
    for (const [key, value] of Object.entries(record || {})) {
      if (typeof value === 'string' && value.trim().length > 30 && !/arab|kitab|book|slug|grade|derajat|nomor|number|id/i.test(key)) { text = shortHadithText(value); break; }
    }
  }
  const book = firstText(record, ['nama_kitab', 'kitab_name', 'kitab', 'collection_name', 'collection', 'book', 'nama', 'title']) || 'Koleksi hadis';
  const number = firstText(record, ['nomor_hadits', 'nomor_hadis', 'hadithnumber', 'number', 'nomor', 'no', 'id']);
  const grade = firstText(record, ['derajat', 'grade', 'status', 'grading']);
  if (!text && !arabic) return '';
  return `<article class="hadith-card"><span class="hadith-result-label">Cuplikan hasil pencarian</span>${arabic ? `<p class="hadith-arabic" lang="ar" dir="rtl">${esc(arabic)}</p>` : ''}${text ? `<p lang="id">${esc(text)}</p>` : ''}<p class="hadith-meta">${esc(book)}${number ? ` · No./bab ${esc(number)}` : ''}${grade ? ` · Derajat: ${esc(grade)}` : ''}</p></article>`;
}
async function loadHadith(subtopic) {
  const requestKey = `${subtopic.id}:${subtopic.hadithQuery}`;
  $('hadith-title').dataset.request = requestKey;
  const params = new URLSearchParams({ resource: 'hadits-search', q: subtopic.hadithQuery, page: '1', limit: '3' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch(`/api/ahmad-sanusi?${params}`, { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(statusMessage(payload, response.status === 503 ? 'Integrasi hadis belum dikonfigurasi di server.' : 'Hadis terkait belum dapat dimuat.'));
    if (!activeSubtopic || activeSubtopic.id !== subtopic.id) return;
    const cards = extractHadithList(payload).slice(0, 3).map(hadithCard).filter(Boolean);
    $('hadith-list').innerHTML = cards.join('');
    setStatus('hadith-status', cards.length ? `Menampilkan ${cards.length} hasil dari Ahmad Sanusi Open API.` : 'Belum ada hasil untuk kata kunci ini. Coba tab Hadis API di beranda Quran Oyen.');
  } catch (error) {
    if (!activeSubtopic || activeSubtopic.id !== subtopic.id) return;
    const message = error?.name === 'AbortError' ? 'Pencarian hadis terlalu lama. Coba lagi saat koneksi lebih baik.' : (error?.message || 'Hadis terkait belum dapat dimuat.');
    setStatus('hadith-status', `${message} Ayat dan tafsir tetap bisa dibaca.`, true);
  } finally { clearTimeout(timer); }
}
function renderProgress() {
  const today = todayKey();
  const labels = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = dateOffset(offset), key = todayKey(date), day = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(date).slice(0, 2);
    labels.push(`<span class="day-dot${progress.doneDates.has(key) ? ' is-done' : ''}${key === today ? ' today' : ''}" role="img" aria-label="${esc(dateLabel(date))}: ${progress.doneDates.has(key) ? 'selesai' : 'belum selesai'}"><span class="day-dot-label">${esc(day)}</span></span>`);
  }
  $('reflection-progress').innerHTML = labels.join('');
  const finished = progress.doneDates.has(today);
  $('reflection-done').textContent = finished ? 'Renungan hari ini selesai ✓' : 'Tandai renungan selesai';
  $('reflection-done').setAttribute('aria-pressed', String(finished));
  const count = progress.doneDates.size;
  setStatus('reflection-status', `${dateLabel()} · ${count.toLocaleString('id-ID')} hari renungan selesai${finished ? ' · hari ini tuntas' : ''}.`);
}
function renderDaily() {
  const { theme, subtopic } = dailySubtopic();
  const refs = subtopic.refs.slice(0, 3);
  $('reflection-date').textContent = dateLabel();
  $('reflection-content').innerHTML = `<p class="reflection-context"><strong>${esc(theme.title)} · ${esc(subtopic.title)}.</strong> ${esc(subtopic.intro)}</p><div class="verse-list">${refs.map((ref) => verseCard(ref, { daily: true })).join('')}</div><section class="question-card"><h3>Berhenti sejenak, renungkan</h3><ol>${subtopic.questions.map((question) => `<li>${esc(question)}</li>`).join('')}</ol></section><label class="note-field"><span>Catatan renungan (opsional · tersimpan di perangkat)</span><textarea id="daily-note" maxlength="1200" rows="2" placeholder="Satu hal yang ingin kamu ingat…">${esc(progress.notes[todayKey()] || '')}</textarea></label><section class="hadith-section"><div class="hadith-head"><div><span class="eyebrow">PELENGKAP BACAAN</span><h3>Hadis terkait · ${esc(theme.title)}</h3><p>Pencarian dengan kata kunci “${esc(subtopic.hadithQuery)}”.</p></div><span class="hadith-mark" aria-hidden="true">حديث</span></div><p class="status" id="daily-hadith-status" role="status" aria-live="polite">Memuat hadis terkait…</p><div class="hadith-list" id="daily-hadith-list"></div></section>`;
  renderProgress();
  loadDailyHadith(subtopic);
}
async function loadDailyHadith(subtopic) {
  const status = $('daily-hadith-status');
  if (!status) return;
  const currentDate = todayKey();
  const params = new URLSearchParams({ resource: 'hadits-search', q: subtopic.hadithQuery, page: '1', limit: '2' });
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch(`/api/ahmad-sanusi?${params}`, { headers: { Accept: 'application/json' }, credentials: 'same-origin', signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(statusMessage(payload, 'Hadis terkait belum tersedia.'));
    if (currentDate !== todayKey() || !status.isConnected) return;
    const cards = extractHadithList(payload).slice(0, 2).map(hadithCard).filter(Boolean);
    $('daily-hadith-list').innerHTML = cards.join('');
    status.textContent = cards.length ? `Hasil terkait dari Ahmad Sanusi Open API · ${subtopic.hadithQuery}.` : 'Belum ada hasil hadis untuk tema ini saat ini.';
  } catch (error) {
    if (status.isConnected) status.textContent = `${error?.message || 'Hadis terkait belum dapat dimuat.'} Renungan tetap bisa dilanjutkan.`;
  } finally { clearTimeout(timer); }
}
function renderSaved() {
  const refs = [...saved].filter((ref) => verseByRef(ref));
  $('saved-count').textContent = String(refs.length);
  $('saved-empty').hidden = refs.length > 0;
  $('saved-list').innerHTML = refs.map((ref) => verseCard(ref)).join('');
}
function showSaved(open) {
  $('saved-view').hidden = !open;
  if (open) {
    renderSaved();
    $('saved-view').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('saved-title').focus?.({ preventScroll: true });
  }
}
function updateSave(ref) {
  if (saved.has(ref)) saved.delete(ref); else saved.add(ref);
  writeSaved();
  renderSaved();
  document.querySelectorAll(`[data-save-verse="${CSS.escape(ref)}"]`).forEach((button) => {
    const state = saved.has(ref);
    button.textContent = state ? 'Tersimpan ✓' : 'Simpan';
    button.setAttribute('aria-pressed', String(state));
  });
  notice(saved.has(ref) ? 'Ayat disimpan ke Koleksiku di perangkat ini.' : 'Ayat dihapus dari Koleksiku.');
}
function verseShareInfo(ref) {
  const verse = verseByRef(ref);
  const url = new URL('./gulir.html', location.href);
  url.searchParams.set('s', String(verse.s)); url.searchParams.set('a', String(verse.a)); url.searchParams.set('mode', 'reader');
  const text = `${verse.arabic}\n\n${verse.translation}\n\n${verse.surah} ${verse.s}:${verse.a} · Quran Oyen`;
  return { title: `${verse.surah} ${verse.s}:${verse.a} · Quran Oyen`, text, url: url.href };
}
async function shareVerse(ref) {
  const item = verseShareInfo(ref);
  try {
    if (typeof navigator.share === 'function') await navigator.share(item);
    else {
      const wa = `https://wa.me/?text=${encodeURIComponent(`${item.text}\n${item.url}`)}`;
      window.open(wa, '_blank', 'noopener,noreferrer');
      notice('Tautan ayat siap dibagikan melalui WhatsApp.');
    }
  } catch (error) {
    if (error?.name !== 'AbortError') notice('Ayat belum dapat dibagikan dari browser ini.');
  }
}
function stopAudio() {
  audioRun++;
  if (audio) { audio.pause(); audio.src = ''; audio = null; }
  if (audioButton?.isConnected) { audioButton.textContent = 'Dengarkan'; audioButton.setAttribute('aria-pressed', 'false'); }
  audioButton = null; playingKey = '';
}
async function playVerse(button) {
  const key = button.dataset.playVerse;
  if (playingKey === key) { stopAudio(); return; }
  stopAudio(); const token = audioRun;
  playingKey = key; audioButton = button; button.disabled = true; button.textContent = 'Memuat audio…';
  const [s, a] = key.split(':').map(Number);
  let qari = '05';
  try { const stored = JSON.parse(localStorage.getItem('qwbw.qari')); if (/^0[1-6]$/.test(stored)) qari = stored; } catch {}
  try {
    const { data } = await getEquranSurah(s);
    const url = audioForQari(data.ayat[a - 1]?.audio, qari);
    if (token !== audioRun || !button.isConnected) return;
    if (!url) throw new Error('Audio ayat belum tersedia.');
    audio = new Audio(url);
    audio.onended = stopAudio;
    audio.onerror = () => { stopAudio(); notice('Audio belum dapat diputar. Periksa koneksi lalu coba lagi.'); };
    await audio.play();
    if (token !== audioRun) return;
    button.textContent = 'Hentikan audio'; button.setAttribute('aria-pressed', 'true');
  } catch { if (token === audioRun) { stopAudio(); notice('Audio ayat memerlukan koneksi internet. Coba lagi saat online.'); } }
  finally { if (button.isConnected) button.disabled = false; }
}
function renderRoute() {
  const match = /^#?tema\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/.exec(location.hash);
  if (!match) {
    activeTheme = null; activeSubtopic = null;
    $('topic-detail').hidden = true; $('topic-results').hidden = true;
    renderThemeGrid(); return;
  }
  const theme = topicById(match[1]);
  if (!theme) { location.hash = ''; return; }
  const subtopic = match[2] ? subtopicById(theme, match[2]) : null;
  renderTheme(theme);
  if (subtopic) renderSubtopic(theme, subtopic);
  requestAnimationFrame(() => (subtopic ? $('topic-results') : $('topic-detail')).scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
function bind() {
  $('theme-search').addEventListener('input', () => renderThemeGrid());
  $('theme-grid').addEventListener('click', (event) => {
    if (event.target.closest('[data-reset-search]')) {
      $('theme-search').value = '';
      renderThemeGrid('');
      $('theme-search').focus({ preventScroll: true });
      return;
    }
    const button = event.target.closest('[data-theme]');
    if (button) location.hash = `tema/${button.dataset.theme}`;
  });
  $('search-chips').addEventListener('click', (event) => {
    const button = event.target.closest('[data-search-query]');
    if (!button) return;
    $('theme-search').value = button.dataset.searchQuery;
    renderThemeGrid();
    $('theme-search').focus({ preventScroll: true });
  });
  $('theme-search-clear').addEventListener('click', () => {
    $('theme-search').value = '';
    renderThemeGrid('');
    $('theme-search').focus({ preventScroll: true });
  });
  $('subtopic-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-subtopic]');
    if (button && activeTheme) location.hash = `tema/${activeTheme.id}/${button.dataset.subtopic}`;
  });
  $('back-to-themes').addEventListener('click', () => { location.hash = ''; $('theme-search').focus({ preventScroll: true }); });
  $('change-subtopic').addEventListener('click', () => { if (activeTheme) location.hash = `tema/${activeTheme.id}`; });
  $('saved-open').addEventListener('click', () => showSaved(true));
  $('saved-close').addEventListener('click', () => { $('saved-view').hidden = true; $('saved-open').focus(); });
  $('reflection-another').addEventListener('click', () => { $('topic-explorer').scrollIntoView({ behavior: 'smooth' }); $('theme-search').focus({ preventScroll: true }); });
  $('reflection-done').addEventListener('click', () => {
    const today = todayKey();
    if (progress.doneDates.has(today)) progress.doneDates.delete(today); else progress.doneDates.add(today);
    writeProgress(); renderProgress();
  });
  $('reflection-content').addEventListener('input', (event) => {
    if (event.target.id !== 'daily-note') return;
    progress.notes[todayKey()] = event.target.value.slice(0, 1200);
    writeProgress();
  });
  document.addEventListener('click', (event) => {
    const play = event.target.closest('[data-play-verse]');
    if (play) { playVerse(play); return; }
    const save = event.target.closest('[data-save-verse]');
    if (save) { updateSave(save.dataset.saveVerse); return; }
    const share = event.target.closest('[data-share-verse]');
    if (share) shareVerse(share.dataset.shareVerse);
  });
  window.addEventListener('hashchange', renderRoute);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio(); });
}

async function init() {
  try {
    const response = await fetch(DATA_URL, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Katalog tema belum dapat dimuat.');
    catalog = await response.json();
    if (catalog?.version !== 1 || !Array.isArray(catalog.themes) || !catalog.verses) throw new Error('Format katalog tema tidak valid.');
    $('theme-total').textContent = String(catalog.themes.length);
    $('subtopic-total').textContent = String(catalog.themes.reduce((count, theme) => count + theme.subtopics.length, 0));
    $('verse-total').textContent = String(Object.keys(catalog.verses).length);
    bind();
    renderDaily();
    renderSaved();
    renderThemeGrid('');
    renderRoute();
  } catch {
    setStatus('theme-status', 'Katalog ayat tematik belum dapat dimuat. Periksa koneksi, lalu muat ulang halaman.', true);
    $('reflection-content').innerHTML = '<p class="status is-error">Renungan belum dapat dimuat. Coba muat ulang saat online.</p>';
  }
}

init();
