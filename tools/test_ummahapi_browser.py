#!/usr/bin/env python3
"""Responsive browser smoke test for UmmahAPI content and hadith integration."""
import os
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

BASE = os.environ.get('QURAN_TEST_BASE', 'http://127.0.0.1:8765').rstrip('/')
PROXY = '**/api/ummahapi**'
allow_api = True
requests = []
BOOKS = [
    {'key': slug, 'name': name, 'arabic_name': '', 'total_hadiths': total}
    for slug, name, total in [
        ('bukhari', 'Sahih al-Bukhari', 7580), ('muslim', 'Sahih Muslim', 7360),
        ('abudawud', 'Sunan Abu Dawud', 5272), ('tirmidhi', 'Jami at-Tirmidhi', 3926),
        ('ibnmajah', 'Sunan Ibn Majah', 4340), ('nasai', "Sunan an-Nasa'i", 5679),
        ('malik', 'Muwatta Malik', 1829), ('nawawi', "Nawawi's 40 Hadith", 42),
        ('qudsi', '40 Hadith Qudsi', 40), ('dehlawi', "Shah Waliullah's 40 Hadith", 40),
    ]
]


def fulfill(route, payload):
    route.fulfill(status=200, content_type='application/json', json=payload)


def api_route(route):
    if not allow_api:
        route.abort()
        return
    url = route.request.url
    requests.append(url)
    query = parse_qs(urlparse(url).query)
    resource = query.get('resource', [''])[0]
    if resource == 'daily':
        fulfill(route, {'success': True, 'data': {
            'date': '2026-11-08',
            'ayah': {'surah_id': 1, 'number_in_surah': 1, 'text_uthmani': 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 'translation_id': 'Dengan menyebut nama Allah Yang Maha Pengasih lagi Maha Penyayang.'},
            'asma': {'number': 1, 'arabic': 'الرَّحْمَٰنُ', 'transliteration': 'Ar-Rahman', 'meaning_en': 'The Most Merciful'},
            'quote': {'arabic': 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', 'text': 'Actions are judged by intentions.', 'language': 'en', 'reference': 'Sahih al-Bukhari #1', 'grade': 'Sahih'},
        }})
        return
    if resource == 'collections':
        fulfill(route, {'success': True, 'data': {'collections': BOOKS}})
        return
    if resource == 'collection':
        page = int(query.get('page', ['1'])[0])
        fulfill(route, {'success': True, 'data': {
            'collection': 'bukhari', 'collection_name': 'Sahih al-Bukhari', 'page': page,
            'limit': 10, 'total': 21, 'total_pages': 3,
            'hadiths': [{'id': 'bukhari-1', 'collection': 'bukhari', 'collection_name': 'Sahih al-Bukhari', 'hadithnumber': 1 if page == 1 else 11, 'arabic': 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', 'english': 'Actions are judged by intentions.', 'grade': 'Sahih'}],
        }})
        return
    if resource == 'search':
        q = query.get('q', [''])[0]
        fulfill(route, {'success': True, 'service': 'hadith-search', 'data': {
            'query': q, 'collection': 'bukhari', 'limit': 100, 'total_found': 21,
            'hadiths': [{'id': 'bukhari-1', 'collection': 'bukhari', 'collection_name': 'Sahih al-Bukhari', 'hadithnumber': 1, 'arabic': 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', 'english': f'Found for {q}: actions are judged by intentions.', 'grade': 'Sahih'}],
        }})
        return
    if resource == 'detail':
        fulfill(route, {'success': True, 'data': {
            'id': 'bukhari-1', 'collection': 'bukhari', 'collection_name': 'Sahih al-Bukhari',
            'hadithnumber': 1, 'arabic': 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ',
            'english': 'Actions are judged by intentions; every person will have what they intended.', 'grade': 'Sahih',
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
    external_api_requests = []
    page.on('request', lambda request: external_api_requests.append(request.url) if 'ummahapi.com' in request.url or 'housemuslim.org' in request.url else None)
    page.route(PROXY, api_route)
    page.goto(BASE + '/', wait_until='domcontentloaded')
    page.locator('#feature-daily').wait_for(state='visible')

    page.locator('#feature-daily').click()
    page.locator('#daily-panel').wait_for(state='visible')
    page.locator('#daily-content .daily-ayah').wait_for(state='visible')
    daily_text = page.locator('#daily-content').inner_text()
    assert 'بِسْمِ اللَّهِ' in daily_text
    assert 'The Most Merciful' in daily_text
    assert 'Actions are judged by intentions.' in daily_text
    assert page.locator('#daily-content .daily-dua').is_visible()
    assert page.locator('#daily-content .daily-dua .daily-translation').first.get_attribute('lang') == 'id'
    assert 'UmmahAPI' in page.locator('#daily-source').inner_text()
    assert page.locator('#daily-content .daily-translation').first.get_attribute('lang') == 'id'
    page.locator('#daily-content .daily-ayah button').click()
    page.locator('#reader-view').wait_for(state='visible')
    current_url = urlparse(page.url)
    assert current_url.netloc == urlparse(BASE).netloc and current_url.path == '/', page.url

    page.goto(BASE + '/', wait_until='domcontentloaded')
    page.locator('#feature-ilm').click()
    page.locator('#ilm-tab-ummah').click()
    page.locator('#ilm-ummah-results .ummah-hadith-card').wait_for(state='visible')
    assert page.locator('#ilm-ummah-book option').count() == 11  # placeholder + ten collections
    assert page.locator('#ilm-ummah-book').input_value() == 'bukhari'
    page.locator('#ilm-ummah-query').fill('intention')
    page.locator('#ilm-ummah-search-button').click()
    page.wait_for_function("document.querySelector('#ilm-ummah-results').innerText.includes('Found for intention')")
    assert any(parse_qs(urlparse(url).query).get('resource') == ['search'] and parse_qs(urlparse(url).query).get('q') == ['intention'] for url in requests)
    assert 'Halaman 1 dari 3' in page.locator('#ilm-ummah-page').inner_text()
    page.locator('#ilm-ummah-results button').first.click()
    page.wait_for_function("document.querySelector('#ilm-ummah-detail').innerText.includes('every person will have what they intended')")
    assert 'Teks hadis lengkap' in page.locator('#ilm-ummah-detail').inner_text()
    page.locator('#ilm-ummah-next').click()
    page.wait_for_function("document.querySelector('#ilm-ummah-page').innerText.includes('Halaman 2')")

    # The existing cross-collection search also goes through the same-origin proxy.
    page.locator('#ilm-tab-hadith').click()
    page.locator('#ilm-search-scope').select_option('global')
    page.locator('#ilm-query').fill('intention')
    page.locator('#ilm-search-button').click()
    page.wait_for_function("document.querySelector('#ilm-search-results').innerText.includes('Found for intention')")
    global_calls = [parse_qs(urlparse(url).query) for url in requests if parse_qs(urlparse(url).query).get('resource') == ['search'] and parse_qs(urlparse(url).query).get('q') == ['intention']]
    assert any('collection' not in params for params in global_calls), global_calls
    assert not errors, errors

    # Verify the five-tab panel and three-column pager fit narrow phones.
    page.set_viewport_size({'width': 320, 'height': 740})
    assert page.locator('#ilm-tab-ummah').is_visible()
    panel_width = page.locator('#ilm-panel').evaluate('(node) => node.getBoundingClientRect().width')
    assert panel_width <= 320, panel_width
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
    page.locator('#ilm-close').click()

    # Language switch updates the shortcut and new collection tab.
    page.locator('#tab-aa').click()
    page.locator('#lang button[data-lang="en"]').click()
    assert page.locator('#feature-daily-title').inner_text() == 'Today’s Content'
    page.locator('#aa-done').click()
    page.locator('#feature-ilm').click()
    assert page.locator('#ilm-tab-ummah').inner_text() == '10 Collections'
    page.locator('#ilm-close').click()

    # A failed refresh falls back to the already saved daily response.
    allow_api = False
    page.locator('#feature-daily').click()
    page.locator('#daily-refresh').click()
    page.wait_for_function("document.querySelector('#daily-status').innerText.includes('saved on this device')")
    assert 'Actions are judged by intentions.' in page.locator('#daily-content').inner_text()
    assert not errors, errors
    assert not external_api_requests, external_api_requests
    context.close()
    browser.close()

print('UmmahAPI browser tests: ok · daily content, local Indonesian dua, in-app Quran navigation, ten collections, English search, paging, detail, localization, mobile layout, offline fallback')
