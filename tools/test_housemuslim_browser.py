#!/usr/bin/env python3
"""Responsive browser smoke test for HouseMuslim content and hadith integration."""
import os
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

BASE = os.environ.get('QURAN_TEST_BASE', 'http://127.0.0.1:8765').rstrip('/')
API = 'https://api.housemuslim.org/api/v1'
allow_api = True
requests = []
BOOKS = [
    {'slug': slug, 'name': name, 'name_arabic': '', 'total': total, 'sort_order': order}
    for order, (slug, name, total) in enumerate([
        ('bukhari', 'Shahih Bukhari', 6638), ('muslim', 'Shahih Muslim', 4930),
        ('abu-dawud', 'Sunan Abu Dawud', 5274), ('tirmidzi', 'Jami at-Tirmidzi', 3956),
        ('nasai', 'Sunan an-Nasai', 5761), ('ibnu-majah', 'Sunan Ibnu Majah', 4341),
        ('ahmad', 'Musnad Ahmad', 12000), ('malik', 'Muwatta Malik', 1594),
        ('darimi', 'Sunan Darimi', 3608),
    ], start=1)
]


def fulfill(route, payload):
    route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, json=payload)


def api_route(route):
    if not allow_api:
        route.abort()
        return
    url = route.request.url
    requests.append(url)
    parsed = urlparse(url)
    path = parsed.path.removeprefix('/api/v1')
    query = parse_qs(parsed.query)
    if path == '/daily/today':
        fulfill(route, {'success': True, 'data': {
            'date': '2026-11-08',
            'ayah': {'id': 1, 'surah_id': 1, 'number_in_surah': 1, 'text_uthmani': 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'},
            'asma': {'id': 1, 'name_arabic': 'الرَّحْمَٰنُ', 'transliteration': 'Ar Rahmaan', 'meaning_id': 'Yang Maha Pengasih'},
            'dua': {'title_id': 'Doa kebaikan', 'text_arabic': 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً', 'text_latin': 'Rabbana atina', 'translation_id': 'Ya Tuhan kami, berilah kami kebaikan di dunia.'},
            'quote': {'text_id': 'Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia.', 'source': 'Hadis · contoh uji'},
        }})
        return
    if path == '/hadith/books':
        fulfill(route, {'success': True, 'data': BOOKS})
        return
    if path == '/hadith/books/bukhari/search':
        page = int(query.get('page', ['1'])[0])
        q = query.get('q', [''])[0]
        fulfill(route, {'success': True, 'data': [
            {'book': 'bukhari', 'number': 1 if page == 1 else 11, 'arab': 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', 'translation_id': f'Hadis tentang {q} · halaman {page}.'}
        ], 'meta': {'page': page, 'per_page': 10, 'total': 21}})
        return
    if path == '/hadith/books/bukhari/items':
        page = int(query.get('page', ['1'])[0])
        fulfill(route, {'success': True, 'data': [
            {'book': 'bukhari', 'number': 1 if page == 1 else 11, 'arab': 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', 'translation_id': f'Hadis urutan · halaman {page}.'}
        ], 'meta': {'page': page, 'per_page': 10, 'total': 21}})
        return
    if path == '/hadith/books/bukhari/items/1':
        fulfill(route, {'success': True, 'data': {
            'book': 'bukhari', 'number': 1, 'arab': 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ',
            'translation_id': 'Sesungguhnya setiap amal bergantung pada niatnya.'
        }})
        return
    fulfill(route, {'success': False, 'message': 'Unexpected test endpoint'})


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True,
        locale='id-ID', timezone_id='Asia/Jakarta', reduced_motion='reduce', service_workers='block',
    )
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route(f'{API}/**', api_route)
    page.goto(BASE + '/', wait_until='domcontentloaded')
    page.locator('#feature-daily').wait_for(state='visible')

    page.locator('#feature-daily').click()
    page.locator('#daily-panel').wait_for(state='visible')
    page.locator('#daily-content .daily-ayah').wait_for(state='visible')
    assert 'بِسْمِ اللَّهِ' in page.locator('#daily-content').inner_text()
    assert 'Pembukaan' not in page.locator('#daily-content').inner_text()
    assert 'Yang Maha Pengasih' in page.locator('#daily-content').inner_text()
    assert 'Rabbana atina' in page.locator('#daily-content').inner_text()
    assert 'Sebaik-baik manusia' in page.locator('#daily-content').inner_text()
    assert page.locator('#daily-content .daily-translation').first.get_attribute('lang') == 'id'
    assert 'Dengan menyebut nama Allah' in page.locator('#daily-content .daily-translation').first.inner_text()
    page.locator('#daily-content button').click()
    page.locator('#reader-view').wait_for(state='visible')
    current_url = urlparse(page.url)
    assert current_url.netloc == urlparse(BASE).netloc and current_url.path == '/', page.url

    page.goto(BASE + '/', wait_until='domcontentloaded')
    page.locator('#feature-ilm').click()
    page.locator('#ilm-tab-housemuslim').click()
    page.locator('#ilm-housemuslim-results .housemuslim-hadith-card').wait_for(state='visible')
    assert page.locator('#ilm-housemuslim-book option').count() == 10  # placeholder + nine books
    assert 'Shahih Bukhari' in page.locator('#ilm-housemuslim-book').input_value() or page.locator('#ilm-housemuslim-book').input_value() == 'bukhari'
    page.locator('#ilm-housemuslim-query').fill('niat')
    page.locator('#ilm-housemuslim-search-button').click()
    page.wait_for_function("document.querySelector('#ilm-housemuslim-results').innerText.includes('Hadis tentang niat')")
    assert any('/search?q=niat' in url for url in requests)
    assert 'Halaman 1 dari 3' in page.locator('#ilm-housemuslim-page').inner_text()
    page.locator('#ilm-housemuslim-results button').first.click()
    page.wait_for_function("document.querySelector('#ilm-housemuslim-detail').innerText.includes('Sesungguhnya setiap amal')")
    assert 'Teks hadis lengkap' in page.locator('#ilm-housemuslim-detail').inner_text()
    page.locator('#ilm-housemuslim-next').click()
    page.wait_for_function("document.querySelector('#ilm-housemuslim-page').innerText.includes('Halaman 2')")
    assert not errors, errors

    # Verify the five-tab panel and three-column pager fit narrow phones.
    page.set_viewport_size({'width': 320, 'height': 740})
    assert page.locator('#ilm-tab-housemuslim').is_visible()
    panel_width = page.locator('#ilm-panel').evaluate('(node) => node.getBoundingClientRect().width')
    assert panel_width <= 320, panel_width
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
    page.locator('#ilm-close').click()

    # Language switch updates the new home shortcut and tab without changing content sources.
    page.locator('#tab-aa').click()
    page.locator('#lang button[data-lang="en"]').click()
    assert page.locator('#feature-daily-title').inner_text() == 'Today’s Content'
    page.locator('#aa-done').click()
    page.locator('#feature-ilm').click()
    assert page.locator('#ilm-tab-housemuslim').inner_text() == '9 Books'
    page.locator('#ilm-close').click()

    # A failed refresh falls back to the already saved daily response.
    allow_api = False
    page.locator('#feature-daily').click()
    page.locator('#daily-refresh').click()
    page.wait_for_function("document.querySelector('#daily-status').innerText.includes('saved on this device')")
    assert 'Sebaik-baik manusia' in page.locator('#daily-content').inner_text()
    assert not errors, errors
    context.close()
    browser.close()

print('HouseMuslim browser tests: ok · daily bundle, in-app ayah navigation, nine books, search, paging, detail, English labels, narrow phone, offline fallback')
