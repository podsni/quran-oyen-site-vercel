import { createLearningStore } from './learning-plans-state.js';
import { createGulirData, cachedSurahNumbers } from './gulir-data.js';
import { getEquranSurah, getEquranTafsir, audioForQari } from './equran.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const normalize = value => String(value || '').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const planURL = id => `#rencana/${id}`;
const dayURL = (id, day) => `#rencana/${id}/hari/${day}`;
let plans = [], index = [], store, data, route = { view:'catalog', tab:'jelajahi' }, run = 0, detailTab = 'overview';
let audio = null, playingKey = '', audioRun = 0, toastTimer = 0, noteTimer = 0, noteDirty = false, sharedPlan = null, resetPlan = null;
const filters = { query:'', surah:'', category:'', duration:'', sort:'recommended' };

function notice(message) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4300);
}
function progressBar(progress) {
  return `<div class="progress-track" role="progressbar" aria-label="Progres rencana" aria-valuemin="0" aria-valuemax="${progress.total}" aria-valuenow="${progress.done}" aria-valuetext="${progress.done} dari ${progress.total} hari selesai"><span style="width:${progress.percent}%"></span></div>`;
}
function cover(plan, large = false) {
  return `<div class="cover${large ? ' detail-cover' : ''}" data-color="${esc(plan.color)}" aria-hidden="true"><span class="cover-label">${plan.category === 'Surah' ? 'MENYELAMI SURAH' : 'BELAJAR TEMATIK'}</span><div class="cover-title">${esc(plan.subtitle)}</div><div class="cover-foot"><span>${plan.lessons.length} hari untuk bertumbuh</span><span>Quran Oyen</span></div></div>`;
}
function card(plan) {
  const p = store.progress(plan.id);
  return `<article class="plan-card" data-plan-id="${esc(plan.id)}"><a href="${planURL(plan.id)}" aria-label="${esc(plan.title)}">${cover(plan)}<div class="card-content"><h3>${esc(plan.title)}</h3><p class="card-meta"><span>${plan.lessons.length} hari</span><span class="dot" aria-hidden="true">·</span><span>±${plan.minutes} menit/hari</span><span class="language-tag">· Indonesia</span></p>${p.started ? `<div class="card-status"><span>${p.finished ? 'Selesai dipelajari' : `${p.done} dari ${p.total} hari selesai`}</span><span>${p.percent}%</span></div>${progressBar(p)}` : ''}</div></a></article>`;
}
function sources() {
  return '<p class="source-note"><strong>Tentang materi ini.</strong> Renungan dan latihan disusun khusus untuk Quran Oyen dalam Bahasa Indonesia, bukan salinan materi Quran.com dan bukan tafsir resmi. Teks Arab serta terjemahan diambil dari dataset lokal pembaca Quran Oyen. Gunakan tombol <strong>Tafsir</strong> untuk membaca tafsir Kemenag melalui EQuran.id. Jadwal harian adalah saran; kamu boleh belajar dengan ritmemu sendiri. Audio memerlukan internet.</p>';
}
function readRoute() {
  const hash = location.hash.slice(1);
  if (!hash || ['jelajahi','diikuti','selesai'].includes(hash)) return { view:'catalog', tab:hash || 'jelajahi' };
  const match = /^rencana\/([a-z0-9-]+)(?:\/hari\/([1-9]\d*))?$/.exec(hash);
  if (!match) return { view:'missing' };
  const plan = plans.find(p => p.id === match[1]);
  if (!plan) return { view:'missing' };
  const day = match[2] ? Number(match[2]) : null;
  if (day !== null && (day < 1 || day > plan.lessons.length)) return { view:'missing' };
  return { view:day ? 'lesson' : 'detail', plan, day };
}
function flushNote() {
  clearTimeout(noteTimer);
  if (!noteDirty || route.view !== 'lesson' || !$('lesson-note')) return;
  store.saveNote(route.plan.id, route.day, $('lesson-note').value);
  noteDirty = false;
  const status = $('note-status');
  if (status) status.textContent = store.persistent ? 'Catatan tersimpan di perangkat ini.' : 'Penyimpanan tidak tersedia. Catatan hanya bertahan selama halaman ini terbuka.';
  updateStorageNote();
}
function updateStorageNote() {
  if (!store) return;
  $('local-note').textContent = store.persistent
    ? 'Progres dan catatan hanya tersimpan di browser perangkat ini, tanpa akun atau sinkronisasi. Menghapus data situs akan menghapus keduanya.'
    : 'Penyimpanan browser tidak tersedia. Progres dan catatan hanya bertahan selama halaman ini terbuka; jangan mengandalkannya setelah memuat ulang.';
}
function stopAudio() {
  audioRun++;
  if (audio) { audio.pause(); audio.src = ''; audio = null; }
  playingKey = '';
  document.querySelectorAll('[data-play]').forEach(button => { button.textContent = 'Dengarkan'; button.setAttribute('aria-pressed','false'); });
}
function setAction(content) {
  $('action-bar').innerHTML = content ? `<div class="action-inner">${content}</div>` : '';
  $('action-bar').hidden = !content;
  document.body.classList.toggle('has-actions', !!content);
}
function renderRoute({ keepScroll = false, recordVisit = true } = {}) {
  flushNote(); stopAudio(); run++;
  const previous = route;
  route = readRoute();
  if (route.plan?.id !== previous.plan?.id) detailTab = 'overview';
  for (const view of ['catalog','detail','lesson','error']) $(`${view}-view`).hidden = true;
  setAction('');
  if (route.view === 'catalog') { $('catalog-view').hidden = false; renderCatalog(); document.title = 'Rencana Belajar · Quran Oyen'; }
  else if (route.view === 'detail') { $('detail-view').hidden = false; renderDetail(); }
  else if (route.view === 'lesson') { $('lesson-view').hidden = false; renderLesson({recordVisit}); }
  else {
    $('error-view').hidden = false;
    $('error-view').innerHTML = '<div class="empty-state"><span class="empty-mark" aria-hidden="true">?</span><h1>Rencana tidak ditemukan</h1><p>Tautan rencana atau nomor hari ini tidak tersedia. Pilih rencana lain untuk mulai belajar.</p><a class="button primary" href="#jelajahi">Jelajahi rencana</a></div>';
    document.title = 'Rencana tidak ditemukan · Quran Oyen';
  }
  if (!keepScroll) { window.scrollTo(0,0); $('main').focus({ preventScroll:true }); }
}
function renderCatalog() {
  const enrolled = plans.filter(plan => { const p = store.progress(plan.id); return p.started && !p.finished; });
  const completed = plans.filter(plan => store.progress(plan.id).finished);
  $('count-explore').textContent = plans.length;
  $('count-enrolled').textContent = enrolled.length;
  $('count-completed').textContent = completed.length;
  document.querySelectorAll('[data-tab]').forEach(link => { if (link.dataset.tab === route.tab) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); });
  let selected = route.tab === 'diikuti' ? enrolled : route.tab === 'selesai' ? completed : [...plans];
  const query = normalize(filters.query);
  selected = selected.filter(plan => (!query || normalize([plan.title,plan.description,plan.category,...plan.surahs.map(s => index[s-1].latin)].join(' ')).includes(query)) && (!filters.surah || plan.surahs.includes(Number(filters.surah))) && (!filters.category || plan.category === filters.category) && (!filters.duration || (filters.duration === 'short' ? plan.lessons.length <= 4 : plan.lessons.length >= 5)));
  if (filters.sort === 'shortest') selected.sort((a,b) => a.lessons.length-b.lessons.length || a.title.localeCompare(b.title,'id'));
  if (filters.sort === 'alphabet') selected.sort((a,b) => a.title.localeCompare(b.title,'id'));
  $('plan-grid').innerHTML = selected.map(card).join('');
  $('results-heading').textContent = route.tab === 'diikuti' ? 'Lanjutkan perjalananmu' : route.tab === 'selesai' ? 'Langkah yang sudah kamu tuntaskan' : 'Temukan langkah kecilmu';
  $('results-count').textContent = `${selected.length} rencana${query || filters.surah || filters.category || filters.duration ? ' ditemukan' : ' tersedia'}`;
  const filtering = !!(query || filters.surah || filters.category || filters.duration);
  $('empty-state').hidden = !!selected.length;
  if (!selected.length) {
    const title = filtering ? 'Belum ada yang cocok' : route.tab === 'diikuti' ? 'Perjalananmu bisa dimulai hari ini' : 'Setiap langkah kecil berarti';
    const description = filtering ? 'Coba kata lain atau hapus filter untuk melihat lebih banyak rencana.' : route.tab === 'diikuti' ? 'Pilih rencana di Jelajahi, lalu ketuk Mulai belajar. Semua rencana gratis dan bisa diikuti tanpa akun.' : 'Rencana yang seluruh harinya kamu tandai selesai akan muncul di sini. Tidak perlu terburu-buru.';
    $('empty-state').innerHTML = `<span class="empty-mark" aria-hidden="true">✦</span><h3>${title}</h3><p>${description}</p>${filtering ? '<button class="button secondary" data-clear-all type="button">Hapus pencarian dan filter</button>' : '<a class="button primary" href="#jelajahi">Jelajahi rencana</a>'}`;
  }
  const activeFilters = [filters.surah,filters.category,filters.duration].filter(Boolean).length;
  $('filter-count').textContent = activeFilters; $('filter-count').hidden = !activeFilters;
  const recent = [...enrolled].sort((a,b) => String(store.get(b.id).startedAt).localeCompare(String(store.get(a.id).startedAt)))[0];
  $('continue-card').hidden = !recent || route.tab !== 'jelajahi';
  if (recent) {
    const p = store.progress(recent.id);
    $('continue-card').innerHTML = `<div class="continue-copy"><span class="continue-label">Rencana yang sedang kamu ikuti</span><h2>${esc(recent.title)}</h2><p>${p.done} dari ${p.total} hari selesai · lanjutkan hari ${p.nextDay}</p></div><a class="button primary" href="${dayURL(recent.id,p.nextDay)}">Lanjut belajar <span aria-hidden="true">→</span></a>`;
  }
  updateStorageNote();
}
function outline(plan) {
  const state = store.get(plan.id);
  return `<ol class="outline-list">${plan.lessons.map((lesson,i) => {
    const done = state?.completed.includes(i+1);
    return `<li><a class="outline-link${done ? ' done' : ''}" href="${dayURL(plan.id,i+1)}"><span class="day-number" aria-label="${done ? 'Selesai' : `Hari ${i+1}`}">${done ? '✓' : i+1}</span><span><span class="outline-title">${esc(lesson.title)}</span><span class="outline-sub">Hari ${i+1} · ${lesson.refs.length} ayat · ±${plan.minutes} menit${done ? ' · Selesai' : ''}</span></span><span class="chevron" aria-hidden="true">›</span></a></li>`;
  }).join('')}</ol>`;
}
function renderDetail() {
  const plan = route.plan, p = store.progress(plan.id), state = store.get(plan.id);
  const actionText = p.finished ? 'Ulangi pelajaran' : p.started ? `Lanjutkan hari ${p.nextDay}` : 'Mulai belajar';
  const related = plans.filter(other => other.id !== plan.id).sort((a,b) => Number(b.surahs.some(s => plan.surahs.includes(s)))-Number(a.surahs.some(s => plan.surahs.includes(s))) || Number(b.category === plan.category)-Number(a.category === plan.category)).slice(0,3);
  document.title = `${plan.title} · Quran Oyen`;
  $('detail-view').innerHTML = `<a class="breadcrumb" href="#jelajahi"><span aria-hidden="true">←</span> Semua rencana belajar</a><header class="detail-head"><h1>${esc(plan.title)}</h1><div class="detail-meta-line"><div class="meta-row"><span class="badge${p.finished ? ' completed' : ''}">${p.finished ? 'Selesai' : 'Gratis'}</span><span>${plan.lessons.length} hari</span><span>±${plan.minutes} menit/hari</span><span>Bahasa Indonesia</span></div><div class="detail-actions"><button class="button secondary" data-share="${plan.id}" type="button">Bagikan</button><button class="button primary" data-start="${plan.id}" type="button">${actionText}</button></div></div></header>${cover(plan,true)}<div class="detail-tabs" role="tablist" aria-label="Informasi rencana"><button type="button" role="tab" id="detail-tab-overview" data-detail-tab="overview" aria-selected="${detailTab === 'overview'}" aria-controls="detail-overview" tabindex="${detailTab === 'overview' ? 0 : -1}">Detail rencana</button><button type="button" role="tab" id="detail-tab-outline" data-detail-tab="outline" aria-selected="${detailTab === 'outline'}" aria-controls="detail-outline" tabindex="${detailTab === 'outline' ? 0 : -1}">Garis besar · ${plan.lessons.length} hari</button></div><div class="detail-layout"><div>${p.started ? `<section class="progress-summary" aria-label="Progres belajarmu"><strong>${p.finished ? 'Alhamdulillah, rencana ini sudah selesai.' : `Progresmu: ${p.done} dari ${p.total} hari`}</strong>${progressBar(p)}<p>${p.finished ? 'Kamu tetap bisa membuka kembali setiap pelajaran dan catatan.' : 'Tandai setiap pelajaran yang sudah kamu baca. Progres tidak dihitung otomatis.'}</p></section>` : ''}<section id="detail-overview" role="tabpanel" aria-labelledby="detail-tab-overview"${detailTab === 'overview' ? '' : ' hidden'}><div class="prose"><h2>Tentang rencana ini</h2><p>${esc(plan.description)}</p><h3>Yang akan kamu pelajari</h3><ul>${plan.objectives.map(text => `<li>${esc(text)}</li>`).join('')}</ul><h3>Langkah sederhana, setiap hari</h3><p>Luangkan sekitar ${plan.minutes} menit: baca ayat dan terjemahannya, renungkan satu pertanyaan, lalu coba satu langkah kecil. Jadwal ${plan.lessons.length} hari ini fleksibel—tidak ada hari yang dikunci atau tenggat untuk mengejar.</p></div>${sources()}</section><section id="detail-outline" role="tabpanel" aria-labelledby="detail-tab-outline"${detailTab === 'outline' ? '' : ' hidden'}><h2 class="sr-only">Daftar pelajaran</h2>${outline(plan)}</section></div><aside class="info-card" aria-label="Ringkasan rencana"><h2>Belajar sesuai ritmemu</h2><dl><div><dt>Durasi</dt><dd>${plan.lessons.length} hari · ${plan.lessons.length} pelajaran</dd></div><div><dt>Waktu per hari</dt><dd>Sekitar ${plan.minutes} menit</dd></div><div><dt>Jenis rencana</dt><dd>${plan.category === 'Surah' ? 'Belajar surah' : 'Belajar tematik'}</dd></div><div><dt>Bahasa</dt><dd>Bahasa Indonesia</dd></div><div><dt>Progres</dt><dd>${p.started ? `${p.done} dari ${p.total} hari selesai` : 'Belum dimulai'}</dd></div><div><dt>Penyimpanan</dt><dd>Hanya di perangkat ini</dd></div></dl><button class="button secondary" type="button" data-cache-plan="${plan.id}">Siapkan bacaan offline</button><p id="offline-ready" class="small muted" role="status">Materi rencana tersedia setelah halaman dimuat; ayat perlu dibuka atau disiapkan dahulu.</p>${state ? `<button class="text-button" type="button" data-reset="${plan.id}">Hapus progres rencana ini</button>` : ''}</aside></div><section class="related"><h2>Lanjutkan dengan rencana lain</h2><div class="plan-grid">${related.map(card).join('')}</div></section><p class="local-note">Progres dan catatan hanya di browser ini. Tidak ada akun atau sinkronisasi antarperangkat.</p>`;
  setAction(`<div class="action-title">${esc(plan.title)}<span class="action-caption">${p.started ? `${p.done}/${p.total} hari selesai` : `${plan.lessons.length} hari · Gratis · Bahasa Indonesia`}</span></div><button class="button primary" type="button" data-start="${plan.id}">${actionText} <span aria-hidden="true">→</span></button>`);
  const thisRun = run;
  cachedSurahNumbers().then(cached => { if (run === thisRun && plan.surahs.every(s => cached.includes(s))) $('offline-ready').textContent = 'Bacaan rencana ini sudah tersedia di cache offline perangkat.'; }).catch(() => {});
}
function lessonAction(plan, day, done) {
  const p = store.progress(plan.id);
  if (!done) return `<button class="button primary" type="button" data-complete="${day}">Tandai hari ini selesai <span aria-hidden="true">✓</span></button>`;
  if (day < plan.lessons.length) return `<a class="button primary" href="${dayURL(plan.id,day+1)}">Hari berikutnya <span aria-hidden="true">→</span></a>`;
  if (!p.finished) return `<a class="button primary" href="${dayURL(plan.id,p.nextDay)}">Lanjutkan hari ${p.nextDay} <span aria-hidden="true">→</span></a>`;
  return `<a class="button primary" href="#selesai">Lihat rencana selesai <span aria-hidden="true">→</span></a>`;
}
function renderLesson({recordVisit = true} = {}) {
  const {plan,day} = route, lesson = plan.lessons[day-1];
  if (recordVisit) store.visit(plan.id,day);
  const p = store.progress(plan.id), state = store.get(plan.id), done = !!state?.completed.includes(day);
  document.title = `Hari ${day}: ${lesson.title} · Quran Oyen`;
  const options = plan.lessons.map((l,i) => `<option value="${i+1}"${i+1 === day ? ' selected' : ''}>Hari ${i+1}: ${esc(l.title)}${state?.completed.includes(i+1) ? ' (selesai)' : ''}</option>`).join('');
  const nav = plan.lessons.map((l,i) => `<a href="${dayURL(plan.id,i+1)}"${day === i+1 ? ' aria-current="step"' : ''}><span class="lesson-tick" aria-hidden="true">${state?.completed.includes(i+1) ? '✓' : `${i+1}.`}</span><span>${esc(l.title)}</span></a>`).join('');
  $('lesson-view').innerHTML = `<a class="breadcrumb" href="${planURL(plan.id)}"><span aria-hidden="true">←</span> Kembali ke rencana</a>${navigator.onLine === false ? '<p class="offline-bar">Sedang offline. Materi tetap tersedia; ayat dan tafsir hanya bisa dibuka jika sudah disimpan di cache.</p>' : ''}<div class="lesson-layout"><aside class="lesson-sidebar"><h2>${esc(plan.title)}</h2>${progressBar(p)}<p class="small muted">${p.done} dari ${p.total} hari selesai</p><nav aria-label="Daftar hari">${nav}</nav></aside><article class="lesson-article"><div class="mobile-day-select"><label for="lesson-day-select">Pilih pelajaran</label><select id="lesson-day-select">${options}</select></div><div class="lesson-eyebrow"><span>Hari ${day} dari ${plan.lessons.length}</span><span>· ±${plan.minutes} menit</span>${done ? '<span class="badge completed">Sudah selesai</span>' : ''}</div><h1>${esc(lesson.title)}</h1><section aria-labelledby="verses-title"><h2 id="verses-title">Baca ayatnya</h2><div id="lesson-verses"><p class="loading" role="status">Memuat ayat dan terjemahan…</p></div></section><section class="lesson-body" aria-labelledby="reflection-title"><h2 id="reflection-title">Pelajaran &amp; renungan</h2>${lesson.paragraphs.map(text => `<p>${esc(text)}</p>`).join('')}</section><section class="reflection-box"><h3>Berhenti sejenak, renungkan</h3><p>${esc(lesson.reflect)}</p></section><section class="practice-box"><h3>Langkah kecil hari ini</h3><p>${esc(lesson.practice)}</p></section><section class="notes-box"><h2>Catatan pribadimu</h2><p>Tulis pikiran atau langkah yang ingin kamu ingat. Catatan tidak dikirim ke server.</p><label class="field" for="lesson-note"><span>Renunganku (opsional, maksimal 2.000 karakter)</span><textarea id="lesson-note" maxlength="2000" rows="5" placeholder="Apa yang paling berkesan dari pelajaran ini?">${esc(state?.notes[day] || '')}</textarea></label><div class="notes-footer"><p id="note-status" role="status" aria-live="polite">${store.persistent ? 'Tersimpan otomatis ketika kamu menulis.' : 'Penyimpanan tidak tersedia; catatan hanya bertahan selama halaman terbuka.'}</p><button class="button secondary" id="save-note" type="button">Simpan catatan</button></div></section>${p.finished ? `<section class="completion-box"><h2>Alhamdulillah, satu rencana tuntas.</h2><p>Kamu telah menandai seluruh ${p.total} pelajaran selesai. Semoga langkah kecil ini terus menemani keseharianmu. Kamu boleh kembali membaca kapan saja.</p><a class="button secondary" href="#jelajahi">Temukan rencana berikutnya</a></section>` : ''}<div class="lesson-complete">${done ? '<span class="badge completed">Hari ini sudah ditandai selesai</span><button class="text-button" type="button" data-uncomplete>Batalkan tanda selesai</button>' : `<button class="button primary" type="button" data-complete="${day}">Tandai hari ini selesai ✓</button>`}</div><nav class="lesson-navigation" aria-label="Navigasi pelajaran">${day > 1 ? `<a class="button secondary" href="${dayURL(plan.id,day-1)}">← Hari sebelumnya</a>` : `<a class="button secondary" href="${planURL(plan.id)}">← Detail rencana</a>`}${day < plan.lessons.length ? `<a class="button secondary" href="${dayURL(plan.id,day+1)}">Hari berikutnya →</a>` : `<a class="button secondary" href="${planURL(plan.id)}">Kembali ke rencana →</a>`}</nav>${sources()}<p class="small muted">Menandai selesai adalah catatan belajar pribadi, bukan penilaian pemahaman atau ibadah.</p></article></div>`;
  setAction(`<div class="action-title">Hari ${day} · ${esc(lesson.title)}<span class="action-caption">${p.done} dari ${p.total} hari selesai · Progres lokal</span></div>${lessonAction(plan,day,done)}`);
  loadVerses();
}
async function loadVerses() {
  if (route.view !== 'lesson') return;
  const thisRun = run, refs = route.plan.lessons[route.day-1].refs;
  const result = await Promise.all(refs.map(async ref => { try { return {verse:await data.verse(ref)}; } catch { return {ref}; } }));
  if (run !== thisRun || route.view !== 'lesson') return;
  $('lesson-verses').innerHTML = result.map(({verse:v,ref}) => v ? `<article class="verse-card" data-verse="${v.s}:${v.a}"><div class="verse-ref"><span>${esc(v.name)} · ${v.s}:${v.a}</span><span>Ayat ${v.a}</span></div><p class="verse-arabic" lang="ar" dir="rtl">${esc(v.arabic)} <span>${Number(v.a).toLocaleString('ar-SA')}</span></p><p class="verse-translation">${esc(v.translation)}</p><div class="verse-actions"><button type="button" data-play="${v.s}:${v.a}" aria-label="Dengarkan ${esc(v.name)} ayat ${v.a}" aria-pressed="false">Dengarkan</button><button type="button" data-tafsir="${v.s}:${v.a}" aria-expanded="false" aria-controls="tafsir-${v.s}-${v.a}">Tafsir</button><a href="gulir.html?s=${v.s}&amp;a=${v.a}&amp;mode=reader" aria-label="Buka ${esc(v.name)} ayat ${v.a} di pembaca">Buka ayat ↗</a></div><div class="taf-wrap" id="tafsir-${v.s}-${v.a}" hidden></div></article>` : `<div class="load-error"><strong>Ayat ${ref.s}:${ref.a} belum bisa dimuat.</strong><p>Periksa koneksi atau siapkan bacaan saat online. Renungan di bawah tetap bisa dibaca.</p><button class="button secondary" type="button" data-retry-verses>Coba muat ayat lagi</button></div>`).join('');
}
async function toggleTafsir(button) {
  const [s,a] = button.dataset.tafsir.split(':').map(Number), container = $(`tafsir-${s}-${a}`);
  if (!container) return;
  const open = container.hidden; container.hidden = !open; button.setAttribute('aria-expanded',String(open));
  if (!open || container.dataset.loaded) return;
  container.innerHTML = '<p class="loading" role="status">Memuat tafsir Kemenag…</p>';
  try {
    const {data:value,cached} = await getEquranTafsir(s), text = value.tafsir.find(entry => entry.ayat === a)?.teks;
    if (!text) throw Error('Tafsir ayat tidak ditemukan.');
    if (!container.isConnected) return;
    container.innerHTML = `<p class="small muted">Tafsir Kemenag · EQuran.id${cached ? ' · Dari cache' : ''}</p><div class="taf-text"></div>`;
    container.querySelector('.taf-text').textContent = text; container.dataset.loaded = 'true';
  } catch {
    if (!container.isConnected) return;
    container.innerHTML = '<p class="load-error">Tafsir belum tersedia. Hubungkan internet atau buka kembali tafsir yang pernah dimuat. Tutup lalu buka tombol Tafsir untuk mencoba lagi.</p>';
  }
}
async function playVerse(button) {
  const key = button.dataset.play;
  if (playingKey === key) { stopAudio(); return; }
  stopAudio(); const token = audioRun; playingKey = key; button.textContent = 'Memuat…';
  const [s,a] = key.split(':').map(Number);
  let qari = '05'; try { const saved = JSON.parse(localStorage.getItem('qwbw.qari')); if (/^0[1-6]$/.test(saved)) qari = saved; } catch {}
  try {
    const {data:surah} = await getEquranSurah(s), url = audioForQari(surah.ayat[a-1].audio,qari);
    if (token !== audioRun || !button.isConnected) return;
    if (!url) throw Error('Audio tidak tersedia.');
    audio = new Audio(url); audio.onended = stopAudio; audio.onerror = () => { stopAudio(); notice('Audio belum bisa diputar. Periksa koneksi lalu coba lagi.'); };
    await audio.play();
    if (token !== audioRun) return;
    button.textContent = 'Hentikan'; button.setAttribute('aria-pressed','true');
  } catch { if (token === audioRun) { stopAudio(); notice('Audio memerlukan koneksi dan belum bisa diputar. Coba lagi saat online.'); } }
}
async function cachePlan(button) {
  const plan = plans.find(p => p.id === button.dataset.cachePlan); if (!plan) return;
  if (!navigator.onLine) { notice('Hubungkan internet untuk menyiapkan bacaan offline.'); return; }
  if (!('serviceWorker' in navigator)) { notice('Browser ini belum mendukung penyimpanan bacaan offline.'); return; }
  const original = button.textContent; button.disabled = true; button.textContent = 'Menyiapkan…';
  try {
    await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject) => setTimeout(() => reject(Error('timeout')),15000))]);
    if (!navigator.serviceWorker.controller) throw Error('worker');
    for (const s of plan.surahs) {
      const n = String(s).padStart(3,'0');
      await Promise.all([`data/s${n}.json`,`data/id/t${n}.json`,`data/links/l${n}.json`].map(async path => {
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(),15000);
        try { const response = await fetch(path,{signal:controller.signal}); if (!response.ok) throw Error('network'); await response.arrayBuffer(); } finally { clearTimeout(timeout); }
      }));
    }
    const cached = await cachedSurahNumbers();
    if (!plan.surahs.every(s => cached.includes(s))) throw Error('cache');
    if ($('offline-ready')) $('offline-ready').textContent = 'Bacaan rencana ini sudah tersedia di cache offline perangkat.';
    notice('Bacaan siap untuk offline. Audio tetap memerlukan internet.');
  } catch { notice('Cache offline belum lengkap. Muat ulang saat online, periksa ruang penyimpanan, lalu coba lagi.'); }
  finally { button.disabled = false; button.textContent = original; }
}
function openShare(id) {
  sharedPlan = plans.find(p => p.id === id); if (!sharedPlan) return;
  const url = new URL('./learning-plans.html',location.href); url.hash = `rencana/${id}`;
  $('share-url').value = url.href;
  $('native-share').hidden = typeof navigator.share !== 'function';
  const text = `${sharedPlan.title} — Rencana Belajar Quran Oyen`;
  $('social-links').innerHTML = `<a target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent(text+' '+url.href)}">WhatsApp ↗</a><a target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url.href)}">Facebook ↗</a><a target="_blank" rel="noopener noreferrer" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&amp;url=${encodeURIComponent(url.href)}">X ↗</a>`;
  $('share-dialog').showModal();
}
function resetFilters(all = false) {
  filters.surah = filters.category = filters.duration = '';
  $('filter-surah').value = $('filter-category').value = $('filter-duration').value = '';
  if (all) { filters.query = ''; $('plan-search').value = ''; }
  renderCatalog();
}
function setupEvents() {
  window.addEventListener('hashchange',() => renderRoute());
  $('filter-toggle').onclick = () => { const open = $('filter-panel').hidden; $('filter-panel').hidden = !open; $('filter-toggle').setAttribute('aria-expanded',String(open)); };
  for (const key of ['surah','category','duration']) $(`filter-${key}`).onchange = event => { filters[key] = event.target.value; renderCatalog(); };
  $('plan-search').oninput = event => { filters.query = event.target.value; renderCatalog(); };
  $('plan-sort').onchange = event => { filters.sort = event.target.value; renderCatalog(); };
  $('clear-filters').onclick = () => resetFilters();
  document.addEventListener('input',event => {
    if (event.target.id !== 'lesson-note') return;
    noteDirty = true; $('note-status').textContent = 'Menyimpan catatan…'; clearTimeout(noteTimer); noteTimer = setTimeout(flushNote,600);
  });
  document.addEventListener('change',event => { if (event.target.id === 'lesson-day-select') location.hash = dayURL(route.plan.id,Number(event.target.value)); });
  document.addEventListener('click',event => {
    const close = event.target.closest('[data-close]'); if (close) { $(close.dataset.close).close(); return; }
    if (event.target.closest('[data-clear-all]')) { resetFilters(true); return; }
    const start = event.target.closest('[data-start]');
    if (start) { const p = plans.find(plan => plan.id === start.dataset.start); if (p) { store.enroll(p.id); const progress = store.progress(p.id); location.hash = dayURL(p.id,progress.finished ? 1 : progress.nextDay); } return; }
    const tab = event.target.closest('[data-detail-tab]');
    if (tab && route.view === 'detail') {
      detailTab = tab.dataset.detailTab;
      document.querySelectorAll('[data-detail-tab]').forEach(button => { const selected = button.dataset.detailTab === detailTab; button.setAttribute('aria-selected',String(selected)); button.tabIndex = selected ? 0 : -1; });
      $('detail-overview').hidden = detailTab !== 'overview'; $('detail-outline').hidden = detailTab !== 'outline'; return;
    }
    const complete = event.target.closest('[data-complete]');
    if (complete && route.view === 'lesson') { flushNote(); store.complete(route.plan.id,route.day); const finished = store.progress(route.plan.id).finished; renderRoute({keepScroll:true}); notice(finished ? 'Alhamdulillah, rencana selesai. Kamu bisa mengulang kapan saja.' : 'Hari ini ditandai selesai. Lanjutkan sesuai ritmemu.'); return; }
    if (event.target.closest('[data-uncomplete]') && route.view === 'lesson') { flushNote(); store.uncomplete(route.plan.id,route.day); renderRoute({keepScroll:true}); notice('Tanda selesai dibatalkan. Catatanmu tetap tersimpan.'); return; }
    if (event.target.closest('#save-note')) { noteDirty = true; flushNote(); notice(store.persistent ? 'Catatan tersimpan di perangkat ini.' : 'Penyimpanan browser tidak tersedia. Catatan belum bisa disimpan permanen.'); return; }
    if (event.target.closest('[data-retry-verses]')) { $('lesson-verses').innerHTML = '<p class="loading" role="status">Mencoba memuat ayat…</p>'; loadVerses(); return; }
    const tafsir = event.target.closest('[data-tafsir]'); if (tafsir) { toggleTafsir(tafsir); return; }
    const play = event.target.closest('[data-play]'); if (play) { playVerse(play); return; }
    const cache = event.target.closest('[data-cache-plan]'); if (cache) { cachePlan(cache); return; }
    const share = event.target.closest('[data-share]'); if (share) { openShare(share.dataset.share); return; }
    const reset = event.target.closest('[data-reset]'); if (reset) { resetPlan = plans.find(p => p.id === reset.dataset.reset); if (resetPlan) { $('reset-description').textContent = resetPlan.title; $('reset-dialog').showModal(); } }
  });
  document.addEventListener('keydown',event => {
    if (!event.target.matches('[data-detail-tab]') || !['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
    event.preventDefault(); const next = event.key === 'Home' ? 'overview' : event.key === 'End' ? 'outline' : detailTab === 'overview' ? 'outline' : 'overview';
    $(`detail-tab-${next}`).click(); $(`detail-tab-${next}`).focus();
  });
  $('confirm-reset').onclick = () => { if (!resetPlan) return; store.reset(resetPlan.id); $('reset-dialog').close(); resetPlan = null; renderRoute({keepScroll:true}); notice('Progres dan catatan rencana ini dihapus dari perangkat.'); };
  $('copy-link').onclick = async () => {
    try { await navigator.clipboard.writeText($('share-url').value); notice('Tautan rencana disalin.'); }
    catch { $('share-url').focus(); $('share-url').select(); notice('Pilih Salin pada kolom tautan untuk menyalinnya.'); }
  };
  $('native-share').onclick = async () => { if (!sharedPlan || !navigator.share) return; try { await navigator.share({title:sharedPlan.title,text:'Belajar Al-Qur’an sedikit setiap hari bersama Quran Oyen.',url:$('share-url').value}); } catch (error) { if (error.name !== 'AbortError') notice('Menu berbagi belum tersedia. Coba Salin tautan.'); } };
  document.addEventListener('visibilitychange',() => { if (document.hidden) { flushNote(); stopAudio(); } });
  window.addEventListener('pagehide',flushNote);
  window.addEventListener('storage',event => { if (event.key === 'quran-oyen.learning-plans.v1' || event.key === null) { store.reload(); flushNote(); renderRoute({keepScroll:true,recordVisit:false}); } });
  window.addEventListener('offline',() => { stopAudio(); notice('Sedang offline. Bacaan yang sudah disiapkan tetap bisa dibuka.'); });
  window.addEventListener('online',() => notice('Koneksi kembali tersedia.'));
}
function validateCatalog(payload) {
  if (payload?.version !== 1 || !Array.isArray(payload.plans) || !payload.plans.length) throw Error('Katalog tidak tersedia.');
  const ids = new Set();
  for (const plan of payload.plans) {
    if (!/^[a-z0-9-]+$/.test(plan.id) || ids.has(plan.id) || !['amber','sage','night','rose'].includes(plan.color) || !['Surah','Tematik'].includes(plan.category) || !Array.isArray(plan.surahs) || !plan.surahs.length || plan.surahs.some(s => !Number.isInteger(s) || !index[s-1]) || !Array.isArray(plan.objectives) || !plan.objectives.length || !Array.isArray(plan.lessons) || !plan.lessons.length || !Number.isInteger(plan.minutes) || plan.minutes < 1 || plan.minutes > 60) throw Error('Katalog rencana tidak valid.');
    for (const key of ['title','subtitle','description']) if (typeof plan[key] !== 'string' || !plan[key]) throw Error('Materi rencana tidak lengkap.');
    if (plan.objectives.some(text => typeof text !== 'string')) throw Error('Tujuan belajar tidak valid.');
    for (const lesson of plan.lessons) {
      if (typeof lesson.title !== 'string' || typeof lesson.reflect !== 'string' || typeof lesson.practice !== 'string' || !Array.isArray(lesson.paragraphs) || lesson.paragraphs.some(text => typeof text !== 'string') || !Array.isArray(lesson.refs) || !lesson.refs.length || lesson.refs.length > 20) throw Error('Pelajaran tidak valid.');
      if (lesson.refs.some(ref => !Number.isInteger(ref.s) || !Number.isInteger(ref.a) || !plan.surahs.includes(ref.s) || ref.a < 1 || ref.a > index[ref.s-1].ayat)) throw Error('Referensi ayat tidak valid.');
    }
    ids.add(plan.id);
  }
  return payload.plans;
}
async function start() {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(),12000);
  try {
    const [indexResponse,plansResponse] = await Promise.all([fetch('./data/index.json',{signal:controller.signal}),fetch('./data/learning-plans.json',{signal:controller.signal})]);
    if (!indexResponse.ok || !plansResponse.ok) throw Error('Berkas belum tersedia.');
    index = await indexResponse.json();
    if (!Array.isArray(index) || index.length !== 114 || index.some((meta,i) => meta.n !== i+1 || !Number.isInteger(meta.ayat))) throw Error('Indeks surah tidak valid.');
    plans = validateCatalog(await plansResponse.json()); store = createLearningStore(plans); data = createGulirData(index);
    const surahs = [...new Set(plans.flatMap(plan => plan.surahs))].sort((a,b) => a-b);
    for (const s of surahs) { const option = document.createElement('option'); option.value = s; option.textContent = `${s}. ${index[s-1].latin}`; $('filter-surah').append(option); }
    const requestedSurah = new URLSearchParams(location.search).get('surah');
    if (surahs.includes(Number(requestedSurah))) { filters.surah = requestedSurah; $('filter-surah').value = requestedSurah; $('filter-panel').hidden = false; $('filter-toggle').setAttribute('aria-expanded','true'); }
    setupEvents(); renderRoute();
  } catch {
    $('catalog-view').hidden = true; $('error-view').hidden = false;
    $('error-view').innerHTML = '<div class="empty-state"><h1>Rencana belum bisa dimuat</h1><p>Periksa koneksi dan coba lagi. Setelah halaman berhasil dimuat, materi rencana dapat dibuka dari cache offline.</p><button class="button primary" type="button" id="retry-start">Coba lagi</button> <a class="button secondary" href="./">Kembali ke beranda</a></div>';
    $('retry-start').onclick = () => { $('retry-start').disabled = true; start(); };
  } finally { clearTimeout(timeout); }
}
function setupWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    const activate = () => { if (document.hidden && reg.waiting && navigator.serviceWorker.controller) reg.waiting.postMessage({type:'skip-waiting'}); };
    const watch = worker => worker?.addEventListener('statechange',() => { if (worker.state === 'installed') activate(); });
    watch(reg.installing); reg.addEventListener('updatefound',() => watch(reg.installing)); document.addEventListener('visibilitychange',activate); reg.update().catch(() => {}); activate();
  }).catch(() => {});
}
setupWorker();
start();
