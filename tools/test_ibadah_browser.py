#!/usr/bin/env python3
"""Mobile browser regression for local worship readings, hadith, and prayer times."""
import datetime as dt
import os
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

BASE = os.environ.get('QURAN_TEST_BASE', 'http://127.0.0.1:8000').rstrip('/')
TODAY = dt.datetime.now().astimezone().strftime('%d-%m-%Y')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 390, 'height': 844},
        is_mobile=True, has_touch=True,
        locale='id-ID', timezone_id='Asia/Jakarta',
        permissions=['geolocation'], geolocation={'latitude': -6.2, 'longitude': 106.8167},
        reduced_motion='reduce', service_workers='block',
    )
    page = context.new_page()
    errors = []
    remote_prayer_calculation_requests = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def fulfill(route, payload):
        route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, json=payload)

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

    page.route('https://equran.id/api/v2/shalat/provinsi', provinces)
    page.route('https://equran.id/api/v2/shalat/kabkota', cities)
    page.route('https://equran.id/api/v2/shalat', manual_schedule)
    page.on('request', lambda request: remote_prayer_calculation_requests.append(request.url) if 'aladhan.com' in request.url else None)
    page.goto(BASE + '/', wait_until='domcontentloaded')
    page.locator('#feature-doa').wait_for(state='visible')

    page.locator('#feature-doa').click()
    page.locator('#doa-panel').wait_for(state='visible')
    page.wait_for_function("document.querySelectorAll('#doa-list .dua-card').length === 227")
    assert page.locator('#doa-list .dua-card').count() == 227
    assert '227' in page.locator('#doa-status').inner_text()

    source_entry = page.locator('#doa-list .dua-card').filter(has_text='Bila Ada Sesuatu Yang Menggembirakan')
    assert source_entry.count() == 1
    assert source_entry.locator('.dua-arabic').count() == 0
    assert source_entry.locator('.dua-source-text').is_visible()
    assert 'Nabi Shallallahu' in source_entry.inner_text()
    assert 'tidak menyertakan teks doa Arab' in source_entry.inner_text()
    source_entry.locator('button[aria-label="Bagikan doa"]').click()
    dua_preview = page.locator('.share-content-dialog textarea').input_value()
    assert 'share=doa' in dua_preview and 'Bila Ada Sesuatu Yang Menggembirakan' in dua_preview
    page.locator('.share-content-dialog button').filter(has_text='Tutup').click()

    page.locator('#doa-tab-wirid').click()
    page.wait_for_function("document.querySelectorAll('#doa-list .dua-card').length > 0")
    assert page.locator('#doa-list .dua-card').count() > 0

    page.locator('#doa-tab-maulid').click()
    page.locator('#doa-maulid-view').wait_for(state='visible')
    page.wait_for_function("document.querySelector('#doa-maulid-select').options.length === 19")
    assert page.locator('#doa-maulid-status').inner_text().startswith('19 bagian')
    assert page.locator('#doa-maulid-ar').inner_text().strip()
    assert page.locator('#doa-maulid-latin-field').is_hidden()
    assert page.locator('#doa-maulid-meaning-field').is_visible()
    assert 'Alkhoirot.org' in page.locator('#doa-maulid-source').inner_text()
    page.locator('#doa-maulid-select').select_option('18')
    assert '19 dari 19' in page.locator('#doa-maulid-progress').inner_text()
    assert page.locator('#doa-maulid-ar').inner_text().strip()
    page.locator('#doa-maulid-share').click()
    maulid_preview = page.locator('.share-content-dialog textarea').input_value()
    assert 'share=reading' in maulid_preview and 'type=maulid' in maulid_preview and 'section=18' in maulid_preview
    page.locator('.share-content-dialog button').filter(has_text='Tutup').click()

    page.locator('#doa-tab-tahlil').click()
    page.locator('#doa-tahlil-view').wait_for(state='visible')
    page.wait_for_function("document.querySelector('#doa-tahlil-select').options.length === 28")
    assert page.locator('#doa-tahlil-status').inner_text().startswith('28 bagian')
    assert page.locator('#doa-tahlil-ar').inner_text().strip()
    assert page.locator('#doa-tahlil-latin-field').is_visible()
    assert page.locator('#doa-tahlil-meaning-field').is_visible()
    assert 'Quran NU Online' in page.locator('#doa-tahlil-source').inner_text()
    page.locator('#doa-tahlil-select').select_option('27')
    assert '28 dari 28' in page.locator('#doa-tahlil-progress').inner_text()
    assert page.locator('#doa-tahlil-ar').inner_text().strip()
    assert not page.locator('#doa-panel a[href*="quran.nu.or.id"]').count()
    assert page.url == BASE + '/'
    page.locator('#doa-close').click()

    page.locator('#feature-ilm').click()
    page.locator('#ilm-collections .hadith-collection-chip').nth(1).click()
    assert page.locator('#ilm-book').input_value() == 'muslim'
    page.locator('#ilm-close').click()

    context.set_offline(True)
    assert page.evaluate('navigator.onLine') is False
    page.locator('#feature-prayer').click()
    page.locator('#prayer-use-location').click()
    page.wait_for_function("document.querySelector('#prayer-status').textContent.includes('Kemenag RI')")
    assert page.locator('#prayer-results .prayer-time').count() == 7
    assert 'Dhuha' not in page.locator('#prayer-results').inner_text()
    assert page.locator('#prayer-results .prayer-step').count() == 5
    assert page.locator('#prayer-countdown').inner_text() != '—'
    assert page.locator('#prayer-next-name').inner_text()
    assert page.locator('.prayer-qibla').count() == 1
    page.emulate_media(reduced_motion='no-preference')
    assert page.locator('#prayer-results .prayer-hero').evaluate("element => getComputedStyle(element).animationName") == 'prayer-rise'
    assert page.locator('#prayer-results .prayer-step.is-next .prayer-dot').evaluate("element => getComputedStyle(element).animationName") == 'prayer-dot-pulse'
    page.emulate_media(reduced_motion='reduce')
    assert page.locator('#prayer-results .prayer-hero').evaluate("element => getComputedStyle(element).animationName") == 'none'
    assert not remote_prayer_calculation_requests, remote_prayer_calculation_requests
    assert not page.evaluate("Object.keys(localStorage).some((key) => key.includes('prayer-location'))")
    page.locator('#prayer-settings-label').click()
    page.locator('#prayer-method').select_option('mwl')
    page.wait_for_function("document.querySelector('#prayer-status').textContent.includes('Muslim World League')")
    page.locator('#prayer-madhab').select_option('hanafi')
    assert page.evaluate("JSON.parse(localStorage.getItem('quran-oyen-prayer-settings')).madhab") == 'hanafi'
    page.locator('#prayer-results button[aria-label="Bagikan jadwal"]').click()
    gps_preview = page.locator('.share-content-dialog textarea').input_value()
    assert 'mode=coordinate' in gps_preview
    assert '-6.2' not in gps_preview and '106.8167' not in gps_preview
    page.locator('.share-content-dialog button').filter(has_text='Tutup').click()
    context.set_offline(False)
    page.locator('#shalat-close').click()
    page.locator('#feature-prayer').click()
    page.wait_for_function("!document.querySelector('#prayer-province').disabled")
    page.locator('#prayer-province').select_option('DKI Jakarta')
    page.wait_for_function("!document.querySelector('#prayer-city').disabled")
    page.locator('#prayer-city').select_option('Jakarta Selatan')
    page.wait_for_function("document.querySelector('#prayer-status').textContent.includes('EQuran.id')")
    assert page.locator('#prayer-results .prayer-time').count() == 8
    assert 'Dhuha' in page.locator('#prayer-results').inner_text()
    page.locator('#prayer-results button[aria-label="Bagikan jadwal"]').click()
    prayer_preview = page.locator('.share-content-dialog textarea').input_value()
    assert 'share=prayer-times' in prayer_preview and 'Jakarta Selatan' in prayer_preview
    assert 'schedule=' in prayer_preview
    assert '-6.2' not in prayer_preview and '106.8167' not in prayer_preview
    page.locator('.share-content-dialog button').filter(has_text='Tutup').click()
    shared_url = prayer_preview.strip().splitlines()[-1]
    shared_query = urlparse(shared_url).query
    assert shared_query and len(shared_query) < 1200, f'Share URL should remain compact: {len(shared_query)} characters.'
    page.evaluate("localStorage.removeItem('quran-oyen-prayer-location')")
    page.goto(BASE + '/?' + shared_query, wait_until='domcontentloaded')
    page.locator('#shalat-panel').wait_for(state='visible')
    page.wait_for_function("document.querySelectorAll('#prayer-results .prayer-time').length === 8")
    assert 'Jakarta Selatan' in page.locator('#prayer-results').inner_text()
    assert not page.evaluate("localStorage.getItem('quran-oyen-prayer-location')")
    assert not errors, errors
    context.close()
    browser.close()

print('ibadah browser tests: ok · local readings, hadith, offline adhan-js GPS calculations, Qibla, countdown, settings and manual city schedules')
