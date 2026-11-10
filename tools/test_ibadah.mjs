import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCoordinatePrayerMonth, decodeSharedPrayerSchedule, encodeSharedPrayerSchedule } from '../ibadah.js';

test('calculates a full GPS prayer calendar locally with Kemenag defaults, imsak, sunrise, and Qibla', () => {
  const result = calculateCoordinatePrayerMonth({ latitude: -6.2, longitude: 106.8167, year: 2026, month: 11, timeZone: 'Asia/Jakarta' });
  assert.equal(result.jadwal.length, 30);
  assert.equal(result.jadwal[0].tanggal_lengkap, '2026-11-01');
  assert.equal(result.jadwal.at(-1).tanggal_lengkap, '2026-11-30');
  assert.equal(result.nextDay.tanggal_lengkap, '2026-12-01');
  assert.match(result.jadwal[0].subuh, /^\d{2}:\d{2}$/);
  assert.match(result.jadwal[0].terbit, /^\d{2}:\d{2}$/);
  const fajrMinutes = Number(result.jadwal[0].subuh.slice(0, 2)) * 60 + Number(result.jadwal[0].subuh.slice(3));
  const imsakMinutes = Number(result.jadwal[0].imsak.slice(0, 2)) * 60 + Number(result.jadwal[0].imsak.slice(3));
  assert.equal((fajrMinutes - imsakMinutes + 1440) % 1440, 10, 'Imsak defaults to 10 minutes before Subuh');
  assert.ok(result.qibla >= 0 && result.qibla < 360);
  assert.equal(result.method, 'kemenag');
  assert.equal(result.madhab, 'shafi');
});

test('supports alternate calculation angles and Hanafi Asr without network dependencies', () => {
  const location = { latitude: -6.2, longitude: 106.8167, year: 2026, month: 11, timeZone: 'Asia/Jakarta' };
  const kemenag = calculateCoordinatePrayerMonth(location);
  const mwl = calculateCoordinatePrayerMonth({ ...location, method: 'mwl' });
  const hanafi = calculateCoordinatePrayerMonth({ ...location, madhab: 'hanafi' });
  assert.notEqual(mwl.jadwal[0].subuh, kemenag.jadwal[0].subuh);
  assert.notEqual(hanafi.jadwal[0].ashar, kemenag.jadwal[0].ashar);
  assert.throws(() => calculateCoordinatePrayerMonth({ ...location, latitude: 95 }), /tidak valid/);
});

test('encodes and validates a compact share snapshot without coordinates', () => {
  const schedule = [{
    tanggal: '05', tanggal_lengkap: '2026-11-05', imsak: '03:55', subuh: '04:05',
    terbit: '05:25', dhuha: '06:10', dzuhur: '11:35', ashar: '14:52', maghrib: '17:45', isya: '18:57',
  }];
  const packed = encodeSharedPrayerSchedule(schedule);
  assert.ok(packed.length < 40);
  assert.deepEqual(decodeSharedPrayerSchedule(packed, '2026-11'), [{
    tanggal: '05', tanggal_lengkap: '2026-11-05', imsak: '03:55', subuh: '04:05',
    terbit: '05:25', dhuha: '06:10', dzuhur: '11:35', ashar: '14:52', maghrib: '17:45', isya: '18:57',
  }]);
  assert.equal(decodeSharedPrayerSchedule(`${packed}.${packed}`, '2026-11'), null, 'duplicate days are rejected');
  const day31 = encodeSharedPrayerSchedule([{ ...schedule[0], tanggal: '31', tanggal_lengkap: '2026-11-31' }]);
  assert.equal(decodeSharedPrayerSchedule(day31, '2026-02'), null, 'dates outside the linked month are rejected');
  assert.equal(decodeSharedPrayerSchedule(packed, 'not-a-month'), null, 'invalid month references are rejected');
  assert.equal(decodeSharedPrayerSchedule('x'.repeat(901), '2026-11'), null, 'oversized payloads are rejected');
});
