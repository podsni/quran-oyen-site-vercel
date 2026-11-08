#!/usr/bin/env python3
"""Browser smoke test for the Ahmad Sanusi Kitab/Hadith UI using mocked API responses."""
from __future__ import annotations
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = {
    'hadits-daily': {'success': True, 'data': {'kitab': 'shahih_bukhari', 'nomor': 1, 'arabic': 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', 'terjemahan': 'Sesungguhnya amal itu bergantung pada niat.'}},
    'hadits-books': {'success': True, 'data': [{'slug': 'shahih_bukhari', 'nama': 'Shahih Bukhari', 'jumlah_hadits': 10}]},
    'hadits-list': {'success': True, 'data': [{'kitab': 'shahih_bukhari', 'nomor': 1, 'arabic': 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', 'terjemahan': 'Amal bergantung pada niat.'}], 'meta': {'page': 1, 'total': 1, 'total_pages': 1}},
    'hadits-search': {'success': True, 'data': [{'kitab': 'shahih_bukhari', 'nomor': 1, 'arabic': 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', 'terjemahan': 'Amal bergantung pada niat.'}], 'meta': {'page': 1, 'total': 1, 'total_pages': 1}},
    'hadits-detail': {'success': True, 'data': {'kitab': 'shahih_bukhari', 'nomor': 1, 'arabic': 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', 'terjemahan': 'Hadis lengkap dari kitab yang dipilih.'}},
    'kitab-categories': {'success': True, 'data': ['Fiqih', 'Hadis']},
    'kitab-list': {'success': True, 'data': [{'slug': 'fathul-qarib', 'nama': 'Fathul Qarib', 'pengarang': 'Ibnu Qasim al-Ghazzi', 'kategori': 'Fiqih', 'deskripsi': 'Pengantar fikih Syafi’i.'}]},
    'kitab-detail': {'success': True, 'data': {'kitab': {'slug': 'fathul-qarib', 'nama': 'Fathul Qarib', 'pengarang': 'Ibnu Qasim al-Ghazzi'}, 'bab': [{'nomor': 1, 'judul': 'Bab Thaharah'}]}},
    'kitab-search': {'success': True, 'data': [{'nomor': 1, 'judul': 'Bab Thaharah'}]},
    'kitab-chapter': {'success': True, 'data': {'bab': {'nomor': 1, 'judul': 'Bab Thaharah', 'arabic': 'كتاب الطهارة', 'terjemahan': 'Bab ini membahas bersuci.'}}},
}

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main() -> None:
    server = ThreadingHTTPServer(('127.0.0.1', 0), lambda *args, **kwargs: QuietHandler(*args, directory=str(ROOT), **kwargs))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            context = browser.new_context(viewport={'width': 360, 'height': 800}, service_workers='block')
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            def mock_api(route):
                resource = route.request.url.split('resource=', 1)[1].split('&', 1)[0]
                route.fulfill(status=200, content_type='application/json', body=json.dumps(FIXTURES.get(resource, {'success': False, 'message': 'Unexpected mock resource'}), ensure_ascii=False))
            page.route('**/api/ahmad-sanusi?*', mock_api)
            page.goto(f'http://127.0.0.1:{server.server_port}/index.html', wait_until='domcontentloaded', timeout=30000)
            page.locator('#feature-ilm').wait_for(timeout=30000)
            page.locator('#feature-ilm').click()
            page.locator('#ilm-tab-hadith-api').click()
            page.get_by_text('Sesungguhnya amal itu bergantung pada niat.').wait_for(timeout=15000)
            page.locator('#ilm-api-hadith-query').fill('niat')
            page.locator('#ilm-api-hadith-search-button').click()
            page.get_by_text('Amal bergantung pada niat.', exact=False).first.wait_for(timeout=15000)
            page.locator('#ilm-api-hadith-search-results button').first.click()
            page.get_by_text('Hadis lengkap dari kitab yang dipilih.').wait_for(timeout=15000)
            page.locator('#ilm-tab-kitab').click()
            page.get_by_text('Fathul Qarib', exact=True).first.wait_for(timeout=15000)
            page.locator('#ilm-kitab-books button').first.click()
            page.locator('#ilm-kitab-chapter-select option[value="1"]').wait_for(state='attached', timeout=15000)
            page.locator('#ilm-kitab-chapter-query').fill('thaharah')
            page.locator('#ilm-kitab-chapter-search-button').click()
            page.locator('#ilm-kitab-open-chapter').click()
            page.get_by_text('Bab ini membahas bersuci.').wait_for(timeout=15000)
            overflow = page.evaluate('document.documentElement.scrollWidth > window.innerWidth')
            assert not overflow, 'Horizontal overflow on a 360px viewport.'
            assert not errors, f'Browser errors: {errors}'
            browser.close()
        print('Mobile UI smoke test passed: daily hadith, search, detail, Kitab catalog/category, chapter search/detail, and no horizontal overflow or browser errors.')
    finally:
        server.shutdown()

if __name__ == '__main__':
    main()
