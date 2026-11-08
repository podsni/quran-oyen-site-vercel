#!/usr/bin/env python3
"""Browser regression checks for Gulir Ayat search; serve the repository on port 8080."""
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('QURAN_TEST_BASE', 'http://127.0.0.1:8080').rstrip('/')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for label, viewport in [('mobile', {'width': 390, 'height': 844}), ('desktop', {'width': 1440, 'height': 900})]:
        context = browser.new_context(viewport=viewport, device_scale_factor=1, reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + '/gulir.html', wait_until='domcontentloaded')
        page.locator('#feed .verse').first.wait_for(timeout=30000)
        page.locator('[data-view="library"]').click()
        search = page.locator('#gulir-quran-search')
        search.wait_for()
        assert search.is_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'{label}: horizontal overflow before search'

        search.fill('Maha Pemurah')
        page.wait_for_function("document.querySelector('#gulir-quran-search').value === 'Maha Pemurah' && document.querySelector('#gulir-quran-search').parentElement.parentElement.querySelector('.quran-search-results')?.textContent.includes('Ditemukan')", timeout=30000)
        hits = page.locator('[data-search-ref]').evaluate_all('(els) => els.map(el => el.dataset.searchRef)')
        assert '1:1' in hits, f'{label}: Indonesian translation search missed Al-Fatihah 1:1: {hits[:10]}'
        assert page.locator('.quran-search-result mark').count() > 0, f'{label}: matched phrase was not highlighted'

        search.fill('2:255')
        page.locator('[data-search-ref="2:255"]').wait_for(timeout=10000)
        assert page.locator('[data-search-ref="2:255"] .quran-search-arabic').inner_text().strip()

        search.fill('بسم الله')
        page.locator('[data-search-ref="1:1"]').wait_for(timeout=30000)
        assert page.locator('[data-search-ref="1:1"] .quran-search-translation').inner_text()

        search.fill('Al Baqara 255')
        page.locator('[data-search-ref="2:255"]').wait_for(timeout=10000)
        page.locator('[data-search-ref="2:255"]').click()
        page.locator('#reader .verse[data-key="2:255"]').wait_for(timeout=30000)
        assert page.locator('#reader').is_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'{label}: horizontal overflow after opening a search result'
        assert not errors, f'{label}: browser errors: {errors}'
        context.close()
        print(f'{label} search browser tests: ok')
    browser.close()

print('gulir search browser tests: Indonesian text, Arabic, citation, named citation, result navigation, and mobile/desktop layout: ok')
