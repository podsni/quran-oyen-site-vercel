import assert from 'node:assert/strict';
import { makeShareUrl } from '../share-content.js';

const originalLocation = globalThis.location;
try {
  globalThis.location = { origin: 'https://quran.example.test/surah/2?ignored=yes' };

  assert.equal(
    makeShareUrl({ surah: 2, ayah: 255 }, 'https://share.example.test/anything'),
    'https://share.example.test/?surah=2&ayah=255',
    'origin parameter menghasilkan HTTPS site root',
  );

  assert.equal(
    makeShareUrl({ q: 'Al-Fātiḥah & doa', empty: '', enabled: false, count: 0 }),
    'https://quran.example.test/?q=Al-F%C4%81ti%E1%B8%A5ah+%26+doa&empty=&enabled=false&count=0',
    'default location.origin dan query encoding berjalan',
  );

  assert.equal(
    makeShareUrl({ tag: ['satu', 'dua'], omitted: null, alsoOmitted: undefined }),
    'https://quran.example.test/?tag=satu&tag=dua',
    'array menjadi parameter berulang dan nullish diabaikan',
  );

  assert.throws(() => makeShareUrl(null, 'https://quran.example.test'), TypeError);
  assert.throws(() => makeShareUrl({ bad: { nested: true } }, 'https://quran.example.test'), TypeError);
  assert.throws(() => makeShareUrl({ bad: Symbol('value') }, 'https://quran.example.test'), TypeError);
  assert.throws(() => makeShareUrl({ ok: 'x' }, 'javascript:alert(1)'), TypeError);
  assert.throws(() => makeShareUrl({ ok: 'x' }, 'https://user:pass@quran.example.test'), TypeError);

  delete globalThis.location;
  assert.throws(() => makeShareUrl({ ok: 'x' }), TypeError, 'tanpa origin eksplisit harus gagal tanpa location');
} finally {
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
}

console.log('share-content tests: ok');
