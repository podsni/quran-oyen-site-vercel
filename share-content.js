const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function pageOrigin(origin) {
  const candidate = origin ?? globalThis.location?.origin;
  if (typeof candidate !== 'string' || !candidate.trim()) {
    throw new TypeError('origin harus berupa origin halaman yang valid');
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new TypeError('origin harus berupa URL yang valid');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new TypeError('origin harus menggunakan HTTP(S) tanpa kredensial');
  }

  // Share links are always HTTPS and never inherit a path/query/fragment.
  parsed.protocol = 'https:';
  parsed.pathname = '/';
  parsed.search = '';
  parsed.hash = '';
  return parsed;
}

function queryEntries(params) {
  if (params == null || typeof params !== 'object' || Array.isArray(params)) {
    throw new TypeError('params harus berupa object');
  }

  const entries = [];
  for (const key of Object.keys(params)) {
    if (!key.trim()) throw new TypeError('nama parameter tidak boleh kosong');
    const value = params[key];
    if (value == null) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item == null) continue;
      if (typeof item === 'object' || typeof item === 'function' || typeof item === 'symbol') {
        throw new TypeError(`nilai parameter ${key} harus primitif`);
      }
      entries.push([key, String(item)]);
    }
  }
  return entries;
}

/** Build a same-site HTTPS root URL with safely encoded query parameters. */
export function makeShareUrl(params = {}, origin) {
  const url = pageOrigin(origin);
  for (const [key, value] of queryEntries(params)) url.searchParams.append(key, value);
  return url.href;
}

function currentSiteOrigin() {
  return pageOrigin(globalThis.location?.origin).origin;
}

function safeContentUrl(value) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('url harus berupa URL string');
  const site = currentSiteOrigin();
  let parsed;
  try {
    parsed = new URL(value, site);
  } catch {
    throw new TypeError('url harus berupa URL yang valid');
  }
  if (parsed.username || parsed.password || parsed.origin !== site) {
    throw new TypeError('url share harus berasal dari origin halaman');
  }
  return parsed.href;
}

function text(value) {
  return value == null ? '' : String(value);
}

async function copyText(value, status) {
  try {
    if (globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(value);
    } else {
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      const copied = document.execCommand?.('copy');
      area.remove();
      if (!copied) throw new Error('copy tidak didukung');
    }
    status.textContent = 'Berhasil disalin.';
    return true;
  } catch {
    status.textContent = 'Tidak dapat menyalin otomatis.';
    return false;
  }
}

function actionButton(label, className = 'pill') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}

function createShareDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'share-content-dialog';
  dialog.setAttribute('aria-labelledby', 'share-content-title');
  dialog.style.maxWidth = 'min(92vw, 36rem)';
  dialog.style.width = 'calc(100% - 2rem)';
  dialog.style.boxSizing = 'border-box';
  dialog.style.padding = '1rem';

  const title = document.createElement('h2');
  title.id = 'share-content-title';
  title.textContent = 'Bagikan';
  dialog.append(title);

  const previewLabel = document.createElement('label');
  previewLabel.textContent = 'Pratinjau teks dan tautan';
  const preview = document.createElement('textarea');
  preview.readOnly = true;
  preview.rows = 7;
  preview.style.width = '100%';
  preview.style.boxSizing = 'border-box';
  previewLabel.append(preview);
  dialog.append(previewLabel);

  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  dialog.append(status);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.flexWrap = 'wrap';
  actions.style.gap = '.5rem';
  dialog.append(actions);

  const copyTextButton = actionButton('Salin teks', 'pill');
  const copyLinkButton = actionButton('Salin tautan', 'pill');
  const whatsappButton = actionButton('Bagikan via WhatsApp', 'pill');
  const nativeButton = actionButton('Bagikan', 'pill');
  const closeButton = actionButton('Tutup', 'pill');
  actions.append(copyTextButton, copyLinkButton, whatsappButton, nativeButton, closeButton);

  let state = { title: '', text: '', url: '' };
  const fullText = () => [state.title, state.text, state.url].filter(Boolean).join('\n\n');

  copyTextButton.addEventListener('click', () => { void copyText(fullText(), status); });
  copyLinkButton.addEventListener('click', () => { void copyText(state.url, status); });
  whatsappButton.addEventListener('click', () => {
    const target = `https://wa.me/?text=${encodeURIComponent(`${fullText()}`)}`;
    globalThis.open?.(target, '_blank', 'noopener,noreferrer');
  });
  nativeButton.addEventListener('click', async () => {
    if (!globalThis.navigator?.share) return;
    try {
      await globalThis.navigator.share({ title: state.title, text: [state.text, state.url].filter(Boolean).join('\n\n'), url: state.url });
      status.textContent = 'Berhasil dibagikan.';
    } catch (error) {
      if (error?.name !== 'AbortError') status.textContent = 'Berbagi tidak berhasil.';
    }
  });
  closeButton.addEventListener('click', () => dialog.close?.());

  dialog._setShareContent = (next) => {
    state = next;
    title.textContent = next.title || 'Bagikan';
    preview.value = fullText();
    nativeButton.hidden = typeof globalThis.navigator?.share !== 'function';
    status.textContent = '';
  };
  return dialog;
}

const dialogs = new WeakMap();
function reusableDialog() {
  let dialog = dialogs.get(document);
  if (!dialog) {
    dialog = createShareDialog();
    document.body.append(dialog);
    dialogs.set(document, dialog);
  }
  return dialog;
}

/** Create an accessible button that opens the shared, mobile-friendly dialog. */
export function makeShareButton(payload = {}, options = {}) {
  if (typeof document === 'undefined') throw new Error('makeShareButton membutuhkan document');
  if (typeof payload !== 'function' && (payload == null || typeof payload !== 'object' || Array.isArray(payload))) {
    throw new TypeError('payload share harus berupa object atau function');
  }
  const initial = typeof payload === 'function' ? {} : payload;
  if (options == null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options share harus berupa object');
  }
  const label = options.label ?? initial.label ?? 'Bagikan';
  const className = options.className ?? initial.className ?? 'pill';
  const button = actionButton(text(label), text(className));
  button.setAttribute('aria-label', text(label));
  button.addEventListener('click', () => {
    const current = typeof payload === 'function' ? payload() : payload;
    if (current == null || typeof current !== 'object' || Array.isArray(current)) {
      throw new TypeError('payload share function harus mengembalikan object');
    }
    const dialog = reusableDialog();
    dialog._setShareContent({
      title: text(current.title),
      text: text(current.text),
      url: safeContentUrl(current.url),
    });
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  });
  return button;
}
