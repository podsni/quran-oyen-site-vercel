#!/usr/bin/env python3
"""Functional browser checks for the standalone Indonesian learning plans feature.
Run a local HTTP server first; optional BASE_URL overrides http://127.0.0.1:8765.
All interaction state stays inside fresh, temporary browser profiles.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('BASE_URL', 'http://127.0.0.1:8765').rstrip('/')
URL = BASE + '/learning-plans.html'
PLANS = json.loads((ROOT / 'data/learning-plans.json').read_text())['plans']
SOURCE_PLANS = [plan for plan in PLANS if plan.get('sourceUrl')]
assert len(SOURCE_PLANS) == 8
assert all(plan['lessons'] and plan.get('topics') and plan.get('sourceCredit') for plan in SOURCE_PLANS)
ARTIFACTS = Path(os.environ.get('TEST_ARTIFACTS', '/workspace/quran-learning-test-artifacts'))
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def ready(page):
    page.goto(URL)
    expect(page.locator('#plan-grid .plan-card')).to_have_count(len(PLANS))


def navigate(page, fragment):
    page.evaluate('(hash) => { location.hash = hash; }', fragment)


def no_overflow(page):
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), 'Horizontal overflow'


def lesson(page, plan_id, day, count):
    navigate(page, f'rencana/{plan_id}/hari/{day}')
    expect(page.locator('#lesson-view')).to_be_visible()
    expected = next(plan for plan in PLANS if plan['id'] == plan_id)['lessons'][day-1]['title']
    expect(page.locator('#lesson-view h1')).to_have_text(expected)
    expect(page.locator('#lesson-verses .verse-card')).to_have_count(count)
    assert all(text.strip() for text in page.locator('.verse-translation').all_text_contents())
    assert all(text.strip() for text in page.locator('.verse-arabic').all_text_contents())


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    errors = []
    for width, height in [(1440,1000),(768,1024),(390,844),(320,780)]:
        context = browser.new_context(viewport={'width':width,'height':height}, locale='id-ID')
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        ready(page)
        no_overflow(page)
        page.screenshot(path=str(ARTIFACTS / f'catalog-{width}.png'))
        page.locator('#filter-toggle').click()
        expect(page.locator('#filter-panel')).to_be_visible()
        page.locator('#filter-surah').select_option('112')
        surah_plans = [plan for plan in PLANS if 112 in plan['surahs']]
        expect(page.locator('#plan-grid .plan-card')).to_have_count(len(surah_plans))
        expect(page.locator('#plan-grid [data-plan-id="al-ikhlas"]')).to_be_visible()
        page.locator('#filter-category').select_option('Tematik')
        thematic_plans = [plan for plan in surah_plans if plan['category'] == 'Tematik']
        expect(page.locator('#plan-grid .plan-card')).to_have_count(len(thematic_plans))
        page.locator('#clear-filters').click()
        expect(page.locator('#plan-grid .plan-card')).to_have_count(len(PLANS))
        page.locator('#plan-search').fill('zzzz-no-match')
        expect(page.locator('#empty-state')).to_be_visible()
        page.locator('[data-clear-all]').click()
        page.locator('#plan-sort').select_option('shortest')
        shortest_duration = min(len(plan['lessons']) for plan in PLANS)
        assert page.locator('#plan-grid .card-meta').first.inner_text().startswith(f'{shortest_duration} hari')
        page.locator('#filter-toggle').click()
        navigate(page, 'diikuti')
        expect(page.locator('#empty-state')).to_contain_text('Perjalananmu')
        navigate(page, 'rencana/al-ikhlas')
        expect(page.locator('#detail-view h1')).to_contain_text('Al-Ikhlas')
        no_overflow(page)
        page.locator('#detail-tab-outline').click()
        expect(page.locator('#detail-outline .outline-link')).to_have_count(3)
        expect(page.locator('#detail-tab-outline')).to_have_attribute('aria-selected','true')
        page.locator('#detail-tab-outline').press('ArrowLeft')
        expect(page.locator('#detail-tab-overview')).to_have_attribute('aria-selected','true')
        page.locator('#detail-view [data-share]').click()
        expect(page.locator('#share-dialog')).to_be_visible()
        assert page.locator('#share-url').input_value().endswith('learning-plans.html#rencana/al-ikhlas')
        assert 'notes' not in page.locator('#share-url').input_value()
        page.locator('[data-close="share-dialog"]').click()
        page.locator('#detail-view [data-start]').click()
        expect(page.locator('#lesson-verses .verse-card')).to_have_count(2)
        no_overflow(page)
        text = 'Renungan pribadi <img src=x onerror="alert(1)"> & niat yang baik'
        page.locator('#lesson-note').fill(text)
        page.locator('#save-note').click()
        expect(page.locator('#note-status')).to_contain_text('tersimpan')
        page.reload()
        expect(page.locator('#lesson-note')).to_have_value(text)
        assert page.locator('#lesson-note img').count() == 0
        page.locator('#lesson-view [data-complete]').click()
        expect(page.locator('#lesson-view')).to_contain_text('Hari ini sudah ditandai selesai')
        navigate(page, 'diikuti')
        expect(page.locator('#plan-grid .plan-card')).to_have_count(1)
        expect(page.locator('#plan-grid')).to_contain_text('1 dari 3 hari')
        for day in (2,3):
            count = len(next(plan for plan in PLANS if plan['id'] == 'al-ikhlas')['lessons'][day-1]['refs'])
            lesson(page, 'al-ikhlas', day, count)
            page.locator('#lesson-view [data-complete]').click()
        expect(page.locator('.completion-box')).to_be_visible()
        navigate(page, 'selesai')
        expect(page.locator('#plan-grid .plan-card')).to_have_count(1)
        lesson(page, 'al-ikhlas', 1, 2)
        expect(page.locator('#lesson-note')).to_have_value(text)
        page.locator('[data-uncomplete]').click()
        navigate(page,'selesai')
        expect(page.locator('#plan-grid .plan-card')).to_have_count(0)
        navigate(page,'rencana/al-fatihah')
        expect(page.locator('#detail-view h1')).to_contain_text('Al-Fatihah')
        page.locator('#detail-view [data-start]').click()
        expect(page.locator('#lesson-note')).to_be_visible()
        navigate(page,'rencana/al-ikhlas')
        page.locator('[data-reset]').click()
        expect(page.locator('#reset-dialog')).to_be_visible()
        page.locator('[data-close="reset-dialog"]').click()
        expect(page.locator('#detail-view')).to_contain_text('2 dari 3 hari selesai')
        page.locator('[data-reset]').click()
        page.locator('#confirm-reset').click()
        navigate(page,'diikuti')
        expect(page.locator('#plan-grid .plan-card')).to_have_count(1)
        expect(page.locator('#plan-grid')).to_contain_text('Al-Fatihah')
        navigate(page,'rencana/al-ikhlas/hari/999')
        expect(page.locator('#error-view')).to_contain_text('Rencana tidak ditemukan')
        navigate(page,'rencana/missing')
        expect(page.locator('#error-view')).to_be_visible()
        lesson(page,'al-ikhlas',1,2)
        page.screenshot(path=str(ARTIFACTS / f'lesson-{width}.png'))
        if width == 1440:
            for source_plan in SOURCE_PLANS:
                navigate(page, f"rencana/{source_plan['id']}")
                expect(page.locator('#detail-view h1')).to_have_text(source_plan['title'])
                expect(page.locator('#detail-overview .source-note a')).to_have_attribute('href', source_plan['sourceUrl'])
                expect(page.locator('#detail-overview .prose')).to_contain_text('Topik yang dibahas')
                if source_plan.get('purpose'):
                    expect(page.locator('#detail-overview .prose')).to_contain_text('Tujuan rencana')
                if source_plan.get('keyVerses'):
                    expect(page.locator('#detail-overview .prose')).to_contain_text('Ayat kunci')
                no_overflow(page)
            for plan in PLANS:
                for day, item in enumerate(plan['lessons'],1):
                    lesson(page,plan['id'],day,len(item['refs']))
                    expect(page.locator('#lesson-view h1')).to_have_text(item['title'])
                    no_overflow(page)
            lesson_count = sum(len(plan['lessons']) for plan in PLANS)
            print(f'PASS: all {lesson_count} lessons render valid Arabic/Indonesian verses', flush=True)
        print(f'PASS: catalogue, filters, notes, progress, sharing, reset and layout at {width}px', flush=True)
        context.close()

    # Different days in two tabs must not overwrite progress or trigger an event loop.
    context = browser.new_context(service_workers='block')
    context.add_init_script("window.__storageEvents=0;addEventListener('storage',()=>window.__storageEvents++);")
    first = context.new_page(); ready(first)
    lesson(first,'al-ikhlas',1,2)
    first.locator('#lesson-note').fill('Catatan tab pertama')
    first.locator('#save-note').click()
    second = context.new_page(); ready(second)
    count = len(next(plan for plan in PLANS if plan['id'] == 'al-ikhlas')['lessons'][1]['refs'])
    lesson(second,'al-ikhlas',2,count)
    second.locator('#lesson-note').fill('Catatan tab kedua')
    second.locator('#save-note').click()
    second.locator('#lesson-view [data-complete]').click()
    first.locator('#lesson-view [data-complete]').click()
    first.wait_for_function("JSON.parse(localStorage.getItem('quran-oyen.learning-plans.v1')).plans['al-ikhlas'].completed.length===2")
    state = first.evaluate("JSON.parse(localStorage.getItem('quran-oyen.learning-plans.v1')).plans['al-ikhlas']")
    assert state['notes']['1'] == 'Catatan tab pertama'
    assert state['notes']['2'] == 'Catatan tab kedua'
    first.wait_for_timeout(250)
    events = first.evaluate('window.__storageEvents') + second.evaluate('window.__storageEvents')
    first.wait_for_timeout(350)
    assert events == first.evaluate('window.__storageEvents') + second.evaluate('window.__storageEvents')
    assert events < 20, 'Storage event feedback loop'
    print('PASS: two-tab notes/progress merge, no storage event feedback loop',flush=True)
    context.close()

    # Explicit quota failure: the UI must not claim permanent storage.
    context = browser.new_context()
    context.add_init_script("Storage.prototype.setItem = function(){ throw new DOMException('Quota','QuotaExceededError'); };")
    page = context.new_page(); ready(page); lesson(page,'al-ikhlas',1,2)
    page.locator('#lesson-note').fill('Catatan dalam memori')
    page.locator('#save-note').click()
    expect(page.locator('#note-status')).to_contain_text('hanya bertahan')
    print('PASS: quota/storage unavailable uses in-memory fallback and honest warning',flush=True)
    context.close()

    # Offline shell and requested surah, plus graceful failure for an uncached surah.
    context = browser.new_context(viewport={'width':390,'height':844})
    page = context.new_page(); ready(page)
    page.wait_for_function('navigator.serviceWorker.controller !== null',timeout=60000)
    navigate(page,'rencana/al-ikhlas')
    page.locator('[data-cache-plan]').click()
    expect(page.locator('#offline-ready')).to_contain_text('tersedia di cache',timeout=45000)
    lesson(page,'al-ikhlas',1,2)
    page.locator('#lesson-note').fill('Tetap belajar saat offline')
    page.locator('#save-note').click()
    context.set_offline(True)
    page.reload()
    expect(page.locator('#lesson-verses .verse-card')).to_have_count(2,timeout=30000)
    expect(page.locator('#lesson-note')).to_have_value('Tetap belajar saat offline')
    page.locator('#lesson-view [data-complete]').click()
    navigate(page,'jelajahi')
    expect(page.locator('#plan-grid .plan-card')).to_have_count(len(PLANS))
    navigate(page,'rencana/tawakal/hari/1')
    count = len(next(plan for plan in PLANS if plan['id'] == 'tawakal')['lessons'][0]['refs'])
    expect(page.locator('#lesson-view .load-error')).to_have_count(count,timeout=30000)
    assert all(item.is_visible() for item in page.locator('#lesson-view .load-error').all())
    expect(page.locator('#lesson-view h1')).to_be_visible()
    expect(page.locator('.lesson-body')).to_be_visible()
    no_overflow(page)
    print('PASS: offline shell, cached verses/notes/progress, graceful uncached verse failure',flush=True)
    context.close()
    browser.close()
    assert not errors, '\n'.join(errors)
    print('PASS: no uncaught browser errors',flush=True)
