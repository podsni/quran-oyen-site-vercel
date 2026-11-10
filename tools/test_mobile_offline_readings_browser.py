#!/usr/bin/env python3
"""Responsive and offline-cache regression for the site's local worship readers."""
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('QURAN_TEST_BASE', 'http://127.0.0.1:8000').rstrip('/')
VIEWPORTS = [
    (320, 568),   # narrow phone
    (360, 780),   # compact Android
    (390, 844),   # common phone
    (430, 932),   # large phone
    (844, 390),   # phone landscape
    (768, 1024),  # tablet portrait
    (1280, 800),  # desktop
]

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 390, 'height': 844},
        is_mobile=True, has_touch=True, locale='id-ID', timezone_id='Asia/Jakarta',
        permissions=['geolocation'], geolocation={'latitude': -6.2, 'longitude': 106.8167},
        reduced_motion='reduce', service_workers='allow',
    )
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE + '/', wait_until='load')
    page.wait_for_function(
        "navigator.serviceWorker.getRegistration().then((reg) => Boolean(reg?.active))",
        timeout=60000,
    )
    page.reload(wait_until='load')
    page.wait_for_function('Boolean(navigator.serviceWorker.controller)', timeout=30000)

    for width, height in VIEWPORTS:
        page.set_viewport_size({'width': width, 'height': height})
        page.locator('#feature-doa').click()
        page.locator('#doa-panel').wait_for(state='visible')
        page.wait_for_function("document.querySelectorAll('#doa-list .dua-card').length === 227")
        page.locator('#doa-tab-doa').click()
        input_height = page.locator('#doa-search').evaluate('(el) => el.getBoundingClientRect().height')
        page.locator('#doa-tab-maulid').click()
        page.wait_for_function("document.querySelector('#doa-maulid-ar').textContent.length > 100")
        page.locator('#doa-tab-tahlil').click()
        page.wait_for_function("document.querySelector('#doa-tahlil-ar').textContent.length > 100")

        result = page.evaluate('''() => {
          const panel = document.querySelector('#doa-panel');
          const rect = (selector) => {
            const r = document.querySelector(selector).getBoundingClientRect();
            return { width: r.width, height: r.height, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
          };
          return {
            viewport: innerWidth,
            rootWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            panel: rect('#doa-panel'),
            panelScrollWidth: panel.scrollWidth,
            panelClientWidth: panel.clientWidth,
            close: rect('#doa-close'),
            tabHeights: [...document.querySelectorAll('#doa-tabs button')].map((el) => el.getBoundingClientRect().height),
            input: rect('#doa-search'),
            nav: [rect('#doa-tahlil-prev'), rect('#doa-tahlil-next')],
            readingCard: rect('#doa-tahlil-view .reading-card'),
            panelBody: { clientHeight: panel.querySelector('.panel-body').clientHeight, scrollHeight: panel.querySelector('.panel-body').scrollHeight },
          };
        }''')
        assert result['rootWidth'] <= width, (width, result)
        assert result['bodyWidth'] <= width, (width, result)
        assert result['panel']['left'] >= 0 and result['panel']['right'] <= width, (width, result)
        assert result['panelScrollWidth'] <= result['panelClientWidth'], (width, result)
        assert result['close']['width'] >= 44 and result['close']['height'] >= 44, (width, result)
        assert all(h >= 44 for h in result['tabHeights']), (width, result)
        assert input_height >= 44, (width, input_height)
        assert all(button['height'] >= 44 for button in result['nav']), (width, result)
        assert result['readingCard']['left'] >= 0 and result['readingCard']['right'] <= width, (width, result)
        assert result['panelBody']['scrollHeight'] >= result['panelBody']['clientHeight'], (width, result)
        page.locator('#doa-close').click()

    # Open every dataset while controlled by the worker. The GETs should be cached under their release hashes.
    page.set_viewport_size({'width': 390, 'height': 844})
    page.locator('#feature-doa').click()
    page.wait_for_function("document.querySelectorAll('#doa-list .dua-card').length === 227")
    page.locator('#doa-tab-maulid').click()
    page.wait_for_function("document.querySelector('#doa-maulid-ar').textContent.length > 100")
    page.locator('#doa-tab-tahlil').click()
    page.wait_for_function("document.querySelector('#doa-tahlil-ar').textContent.length > 100")
    cached = page.evaluate('''async () => {
      const cacheNames = await caches.keys();
      const cache = await caches.open(cacheNames.find((name) => name.startsWith('quran-')));
      const requests = await cache.keys();
      return ['doa', 'maulid', 'tahlil'].map((type) => requests.some((request) => request.url.includes(`/data/ibadah/${type}.json?`)));
    }''')
    assert cached == [True, True, True], cached

    # Simulate a later offline visit, including navigation reload and all three local datasets.
    context.set_offline(True)
    page.reload(wait_until='load')
    page.wait_for_function("Boolean(document.querySelector('#feature-doa'))")
    page.locator('#feature-doa').click()
    page.wait_for_function("document.querySelectorAll('#doa-list .dua-card').length === 227")
    page.locator('#doa-tab-maulid').click()
    page.wait_for_function("document.querySelector('#doa-maulid-ar').textContent.length > 100")
    page.locator('#doa-tab-tahlil').click()
    page.wait_for_function("document.querySelector('#doa-tahlil-ar').textContent.length > 100")
    assert page.locator('#doa-maulid-select').locator('option').count() == 19
    assert page.locator('#doa-tahlil-select').locator('option').count() == 28
    page.locator('#doa-close').click()
    page.locator('#feature-prayer').click()
    page.locator('#prayer-use-location').click()
    page.wait_for_function("document.querySelector('#prayer-status').textContent.includes('Kemenag RI')")
    assert page.locator('.prayer-qibla').count() == 1
    assert page.locator('#prayer-countdown').inner_text() != '—'
    page.locator('#prayer-settings-label').click()
    adhan_cached = page.evaluate('''async () => {
      const cacheName = (await caches.keys()).find((name) => name.startsWith('quran-'));
      const requests = await (await caches.open(cacheName)).keys();
      return requests.some((request) => request.url.includes('/vendor/adhan-4.4.6/adhan.esm.min.js'));
    }''')
    assert adhan_cached, 'the self-hosted adhan-js module must be in the service-worker cache'
    for width, height in VIEWPORTS:
        page.set_viewport_size({'width': width, 'height': height})
        metrics = page.evaluate('''() => {
          const panel = document.querySelector('#shalat-panel');
          const body = panel.querySelector('.panel-body');
          const box = panel.getBoundingClientRect();
          return {
            rootWidth: document.documentElement.scrollWidth,
            panelLeft: box.left, panelRight: box.right,
            panelClient: panel.clientWidth, panelScroll: panel.scrollWidth,
            bodyClient: body.clientWidth, bodyScroll: body.scrollWidth,
            buttonHeight: document.querySelector('#prayer-use-location').getBoundingClientRect().height,
            fieldHeights: [...panel.querySelectorAll('.prayer-settings select')].map((field) => field.getBoundingClientRect().height),
          };
        }''')
        assert metrics['rootWidth'] <= width, (width, metrics)
        assert metrics['panelLeft'] >= 0 and metrics['panelRight'] <= width, (width, metrics)
        assert metrics['panelScroll'] <= metrics['panelClient'], (width, metrics)
        assert metrics['bodyScroll'] <= metrics['bodyClient'], (width, metrics)
        assert metrics['buttonHeight'] >= 44, (width, metrics)
        assert all(height >= 44 for height in metrics['fieldHeights']), (width, metrics)
    assert not errors, errors
    context.close()
    browser.close()

print(f'responsive/offline browser tests: ok · {len(VIEWPORTS)} viewports, 44px targets, local readings, adhan-js and GPS prayer times after an offline reload')
