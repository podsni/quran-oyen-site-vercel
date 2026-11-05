#!/usr/bin/env python3
"""Mobile browser regression for worship-reading, hadith, and GPS prayer features."""
import datetime as dt
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('QURAN_TEST_BASE', 'http://127.0.0.1:8000').rstrip('/')
TODAY = dt.datetime.now().astimezone().strftime('%d-%m-%Y')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 390, 'height': 844},
        locale='id-ID', timezone_id='Asia/Jakarta',
        permissions=['geolocation'], geolocation={'latitude': -6.2, 'longitude': 106.8167},
        reduced_motion='reduce',
    )
    page = context.new_page()
    errors = []
    calendar_requests = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def fulfill(route, payload):
        route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, json=payload)

    def doa(route):
        fulfill(route, {'status': 'success', 'data': [
            {'id': 1, 'grup': 'Lafal Dzikir Dan Keutamaannya', 'nama': 'Dzikir pagi', 'ar': 'ذِكْرٌ', 'tr': 'dzikir', 'idn': 'Mengingat Allah', 'tag': ['dzikir']},
            {'id': 2, 'grup': 'Doa Harian', 'nama': 'Doa belajar', 'ar': 'دُعَاءٌ', 'tr': 'doa belajar', 'idn': 'Tambahkan ilmu', 'tag': ['doa']},
        ]})

    def provinces(route):
        fulfill(route, {'code': 200, 'data': ['DKI Jakarta']})

    def cities(route):
        fulfill(route, {'code': 200, 'data': ['Jakarta Selatan']})

    def manual_schedule(route):
        fulfill(route, {'code': 200, 'data': {
            'provinsi': 'DKI Jakarta', 'kabkota': 'Jakarta Selatan',
            'jadwal': [{'tanggal_lengkap': f"{TODAY[6:10]}-{TODAY[3:5]}-{TODAY[:2]}", 'tanggal': TODAY[:2], 'hari': 'Kamis',
                'imsak': '03:55', 'subuh': '04:05', 'terbit': '05:25', 'dhuha': '06:10',
                'dzuhur': '11:35', 'ashar': '14:52', 'maghrib': '17:45', 'isya': '18:57'}],
        }})

    def calendar(route):
        calendar_requests.append(route.request.url)
        fulfill(route, {'code': 200, 'status': 'OK', 'data': [{
            'date': {'gregorian': {'date': TODAY, 'weekday': {'en': 'Thursday'}}},
            'timings': {'Imsak': '03:55 (WIB)', 'Fajr': '04:05 (WIB)', 'Sunrise': '05:25 (WIB)', 'Dhuhr': '11:35 (WIB)', 'Asr': '14:52 (WIB)', 'Maghrib': '17:45 (WIB)', 'Isha': '18:57 (WIB)'},
        }]})

    page.route('https://equran.id/api/doa', doa)
    page.route('https://equran.id/api/v2/shalat/provinsi', provinces)
    page.route('https://equran.id/api/v2/shalat/kabkota', cities)
    page.route('https://equran.id/api/v2/shalat', manual_schedule)
    page.route('https://api.aladhan.com/v1/calendar/**', calendar)
    page.goto(BASE + '/', wait_until='domcontentloaded')
    page.locator('#feature-doa').wait_for(state='visible')

    page.locator('#feature-doa').click()
    page.locator('#doa-panel').wait_for(state='visible')
    page.locator('#doa-list .ibadah-card').first.wait_for()
    assert page.locator('#doa-list .ibadah-card').count() == 2
    page.locator('#doa-tab-wirid').click()
    assert page.locator('#doa-list .ibadah-card').count() == 1
    assert 'Dzikir pagi' in page.locator('#doa-list').inner_text()
    assert page.locator('#doa-wirid-link').is_visible()
    assert page.locator('#doa-wirid-link').get_attribute('href') == 'https://quran.nu.or.id/wirid'
    page.locator('#doa-tab-maulid').click()
    assert page.locator('#doa-maulid-view').is_visible()
    assert page.locator('#doa-maulid-link').get_attribute('href') == 'https://quran.nu.or.id/maulid'
    page.locator('#doa-tab-tahlil').click()
    assert page.locator('#doa-tahlil-link').get_attribute('href') == 'https://quran.nu.or.id/tahlil'
    page.locator('#doa-close').click()

    page.locator('#feature-ilm').click()
    page.locator('#ilm-collections .hadith-collection-chip').nth(1).click()
    assert page.locator('#ilm-book').input_value() == 'muslim'
    page.locator('#ilm-close').click()

    page.locator('#feature-prayer').click()
    page.locator('#prayer-use-location').click()
    page.wait_for_function("document.querySelector('#prayer-status').textContent.includes('AlAdhan')")
    assert page.locator('#prayer-results .prayer-time').count() == 7
    assert 'Dhuha' not in page.locator('#prayer-results').inner_text()
    assert calendar_requests and 'latitude=-6.2' in calendar_requests[0]
    assert 'method=20' in calendar_requests[0]
    assert 'timezonestring=Asia%2FJakarta' in calendar_requests[0]
    assert not page.evaluate("Object.keys(localStorage).some((key) => key.includes('prayer-location'))")
    page.locator('#prayer-province').select_option('DKI Jakarta')
    page.wait_for_function("!document.querySelector('#prayer-city').disabled")
    page.locator('#prayer-city').select_option('Jakarta Selatan')
    page.wait_for_function("document.querySelector('#prayer-status').textContent.includes('EQuran.id')")
    assert page.locator('#prayer-results .prayer-time').count() == 8
    assert 'Dhuha' in page.locator('#prayer-results').inner_text()
    assert not errors, errors
    context.close()
    browser.close()
print('ibadah browser tests: ok · mobile readings/wirid/maulid/tahlil, hadith collection chips, GPS prayer schedule')
