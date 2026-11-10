#!/usr/bin/env python3
"""Regressions for the offline thematic Quran catalog."""
import importlib.util
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILDER = ROOT / "tools" / "build_tema_data.py"
spec = importlib.util.spec_from_file_location("build_tema_data", BUILDER)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
subprocess.run(["python3", str(BUILDER)], cwd=ROOT, check=True, capture_output=True, text=True)
payload = json.loads((ROOT / "data" / "tema-tematik.json").read_text(encoding="utf-8"))
expected = ["sabar", "ketenangan", "syukur", "pernikahan", "konflik-keluarga", "perceraian", "pengasuhan", "rezeki", "taubat", "keadilan", "ilmu", "menjaga-lisan", "persaudaraan", "berbagi"]
assert [theme["id"] for theme in payload["themes"]] == expected
assert sum(len(theme["subtopics"]) for theme in payload["themes"]) == 28
assert len(payload["verses"]) == 78
index = {row["n"]: row for row in json.loads((ROOT / "data" / "index.json").read_text(encoding="utf-8"))}
for theme in payload["themes"]:
    assert len(theme["subtopics"]) == 2
    for subtopic in theme["subtopics"]:
        assert 3 <= len(subtopic["refs"]) <= 5
        assert len(subtopic["questions"]) >= 2
        assert len(subtopic["hadithQuery"]) >= 3
        for reference in subtopic["refs"]:
            surah, ayah = map(int, reference.split(":"))
            verse = payload["verses"][reference]
            assert 1 <= ayah <= index[surah]["ayat"]
            assert verse["surah"] == index[surah]["latin"]
            source = json.loads((ROOT / "data" / f"s{surah:03}.json").read_text(encoding="utf-8"))
            translation = json.loads((ROOT / "data" / "id" / f"t{surah:03}.json").read_text(encoding="utf-8"))
            muntakhab = json.loads((ROOT / "tafsir" / "muntakhab" / f"t{surah:03}.json").read_text(encoding="utf-8"))
            jalalayn = json.loads((ROOT / "tafsir" / "jalalayn" / f"t{surah:03}.json").read_text(encoding="utf-8"))
            assert verse["arabic"] == builder.arabic_verse(source["ayat"][ayah - 1])
            assert verse["translation"] == translation["ayat"][ayah - 1]
            assert verse["tafsir"]["muntakhab"] == muntakhab["ayat"][ayah - 1]
            assert verse["tafsir"]["jalalayn"] == jalalayn["ayat"][ayah - 1]

html = (ROOT / "index.html").read_text(encoding="utf-8")
page = (ROOT / "tema.html").read_text(encoding="utf-8")
script = (ROOT / "tema.js").read_text(encoding="utf-8")
sw = (ROOT / "sw.js").read_text(encoding="utf-8")
assert 'href="tema.html"' in html
assert 'src="tema.js"' in page and 'href="tema.css"' in page
assert page.index('id="theme-search"') < page.index('id="theme-grid"') < page.index('id="reflection-title"')
assert 'id="search-chips"' in page and 'id="theme-search-clear"' in page
assert "data/tema-tematik.json" in sw and "p === 'tema.html'" in sw and "p === 'tema.css'" in sw
assert "fetch(`/api/ahmad-sanusi?${params}`" in script
assert "AHMAD_SANUSI_API_KEY" not in script and "X-API-Key" not in script
print("Thematic catalog checks passed: 14 themes, 28 subtopics, 78 source-verified verses, local tafsir, same-origin hadith search, and offline shell entries.")
