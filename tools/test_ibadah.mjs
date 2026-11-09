import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeSharedPrayerSchedule, encodeSharedPrayerSchedule, normalizeAladhanCalendar } from '../ibadah.js';

const aladhanDay = {
  date: { gregorian: { date: '05-11-2026', weekday: { en: 'Thursday' } } },
  timings: {
    Imsak: '03:55 (WIB)', Fajr: '04:05 (WIB)', Sunrise: '05:25 (WIB)',
    Dhuhr: '11:35 (WIB)', Asr: '14:52 (WIB)', Maghrib: '17:45 (WIB)', Isha: '18:57 (WIB)',
  },
};

test('normalizes AlAdhan calendar dates and removes timezone annotations from displayed times', () => {
  const result = normalizeAladhanCalendar({ code: 200, status: 'OK', data: [aladhanDay] });
  assert.equal(result.jadwal.length, 1);
  assert.equal(result.jadwal[0].tanggal_lengkap, '2026-11-05');
  assert.equal(result.jadwal[0].tanggal, '05');
  assert.equal(result.jadwal[0].subuh, '04:05');
  assert.equal(result.jadwal[0].terbit, '05:25');
  assert.equal(result.jadwal[0].dzuhur, '11:35');
  assert.equal(result.jadwal[0].isya, '18:57');
  assert.equal('dhuha' in result.jadwal[0], false);
});

test('rejects invalid AlAdhan calendar envelopes and malformed day dates', () => {
  assert.throws(() => normalizeAladhanCalendar({ code: 500, data: [] }), /tidak valid/);
  assert.throws(() => normalizeAladhanCalendar({ code: 200, data: [{ ...aladhanDay, date: {} }] }), /Tanggal/);
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
