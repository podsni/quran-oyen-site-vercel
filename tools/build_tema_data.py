#!/usr/bin/env python3
"""Build the local topical Quran explorer dataset from the site's canonical texts."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "tema-tematik.json"

THEMES = [
    {
        "id": "sabar", "title": "Sabar", "icon": "صَبْر", "description": "Menemukan daya tahan, keteguhan, dan kelapangan hati ketika menghadapi keadaan sulit.",
        "subtopics": [
            {"id": "saat-diuji", "title": "Saat menghadapi ujian", "intro": "Ayat-ayat ini menempatkan sabar dan salat sebagai pegangan, mengingatkan bahwa kesulitan adalah bagian dari kehidupan, dan mengajak berdoa dengan harap.", "hadithQuery": "sabar", "refs": [[2,153],[2,155],[2,286]], "questions": ["Apa satu hal yang sedang terasa berat, dan langkah kecil apa yang masih mampu kamu lakukan hari ini?", "Dukungan apa yang bisa kamu minta melalui doa, ibadah, atau orang tepercaya?"]},
            {"id": "menahan-amarah", "title": "Menahan marah dan memaafkan", "intro": "Telusuri ajakan untuk mengendalikan amarah, merespons keburukan dengan cara yang lebih baik, dan memilih memaafkan tanpa mengabaikan batas yang sehat.", "hadithQuery": "marah", "refs": [[3,134],[42,43],[41,34]], "questions": ["Apa jeda yang bisa membantumu merespons, bukan bereaksi, saat emosi meningkat?", "Apakah ada kebaikan yang dapat dilakukan tanpa membenarkan perlakuan yang menyakitkan?"]},
        ]
    },
    {
        "id": "ketenangan", "title": "Ketenangan", "icon": "سَكِينَة", "description": "Merenungi dzikir, doa, dan harapan sebagai jalan kembali kepada Allah saat hati gelisah.",
        "subtopics": [
            {"id": "dzikir-hati", "title": "Dzikir dan hati yang tenteram", "intro": "Ayat-ayat ini mengaitkan ingat kepada Allah dengan ketenteraman, sekaligus mengajak membaca dan merenungkan wahyu.", "hadithQuery": "dzikir", "refs": [[13,28],[2,152],[39,23]], "questions": ["Kapan kamu paling mudah memberi ruang untuk mengingat Allah hari ini?", "Ayat atau kalimat dzikir apa yang ingin kamu bawa sepanjang hari?"]},
            {"id": "doa-dan-harap", "title": "Berdoa dan tetap berharap", "intro": "Baca tentang dekatnya Allah, keleluasaan berdoa, dan pengingat bahwa kesulitan tidak selalu menjadi akhir cerita.", "hadithQuery": "doa", "refs": [[2,186],[94,5],[40,60]], "questions": ["Apa yang ingin kamu sampaikan dalam doa dengan kata-katamu sendiri?", "Kesulitan apa yang mungkin terasa sedikit lebih ringan jika kamu melihatnya satu langkah demi satu langkah?"]},
        ]
    },
    {
        "id": "syukur", "title": "Syukur", "icon": "شُكْر", "description": "Mengenali nikmat, mengucap syukur, lalu menerjemahkannya menjadi amal yang baik.",
        "subtopics": [
            {"id": "mengenali-nikmat", "title": "Mengenali nikmat", "intro": "Ayat-ayat ini mengajak mengenali karunia Allah dan menyadari bahwa nikmat sering hadir dalam hal yang dekat dengan kehidupan sehari-hari.", "hadithQuery": "syukur", "refs": [[14,7],[16,18],[55,13]], "questions": ["Nikmat sederhana apa yang baru kamu sadari hari ini?", "Bagaimana rasa syukur itu bisa tampak dalam satu tindakan nyata?"]},
            {"id": "syukur-dalam-amal", "title": "Syukur melalui amal", "intro": "Syukur tidak berhenti pada ucapan; ayat-ayat ini menghubungkannya dengan hikmah, kebaikan, dan penggunaan karunia secara bertanggung jawab.", "hadithQuery": "bersyukur", "refs": [[31,12],[34,13],[2,172]], "questions": ["Karunia apa yang dapat kamu gunakan untuk membantu orang lain?", "Kebiasaan kecil apa yang ingin kamu rawat sebagai bentuk syukur?"]},
        ]
    },
    {
        "id": "pernikahan", "title": "Pernikahan", "icon": "مَوَدَّة", "description": "Membaca ayat tentang ketenteraman, kasih sayang, dan sikap baik dalam kehidupan bersama.",
        "subtopics": [
            {"id": "sakinah-mawaddah", "title": "Sakinah, kasih, dan sayang", "intro": "Ayat-ayat ini menggambarkan ketenteraman dan kasih sayang sebagai tanda kebesaran Allah dalam relasi pasangan.", "hadithQuery": "keluarga", "refs": [[30,21],[7,189],[2,187]], "questions": ["Perhatian kecil apa yang membuat pasangan atau keluarga merasa didengar?", "Bagaimana membangun ketenteraman tanpa menuntut kesempurnaan satu sama lain?"]},
            {"id": "berbuat-baik", "title": "Berbuat baik dan bermusyawarah", "intro": "Baca pengingat tentang perlakuan yang patut, pemenuhan hak, dan mengupayakan penyelesaian dengan melibatkan pihak yang adil.", "hadithQuery": "istri", "refs": [[4,19],[2,228],[4,35]], "questions": ["Apakah kebutuhan dan batas masing-masing sudah dibicarakan dengan saling menghormati?", "Siapa pihak netral dan tepercaya yang dapat membantu bila percakapan buntu?"]},
        ]
    },
    {
        "id": "konflik-keluarga", "title": "Konflik Keluarga", "icon": "أُسْرَة", "description": "Mencari cara meredakan konflik, berlaku adil, dan menjaga keselamatan serta martabat semua pihak.",
        "subtopics": [
            {"id": "damai-mediasi", "title": "Berdamai dan mencari penengah", "intro": "Ayat-ayat ini mendorong upaya islah, musyawarah, dan penengah yang beritikad baik ketika konflik sulit diselesaikan sendiri.", "hadithQuery": "damai", "refs": [[4,35],[4,128],[49,10]], "questions": ["Apa tujuan bersama yang masih bisa disepakati oleh pihak-pihak yang berselisih?", "Apakah bantuan mediator yang aman dan netral akan membuat percakapan lebih baik?"]},
            {"id": "memaafkan-dengan-batas", "title": "Memaafkan tanpa mengabaikan batas", "intro": "Al-Qur’an memuji sikap menahan amarah dan memaafkan, serta tetap mengakui bahwa menuntut keadilan dan menjaga diri adalah penting.", "hadithQuery": "memaafkan", "refs": [[3,134],[42,40],[64,14]], "questions": ["Batas aman apa yang perlu dijaga agar percakapan tidak kembali melukai?", "Adakah bentuk kebaikan yang dapat dilakukan tanpa menghapus tanggung jawab atas kesalahan?"]},
        ]
    },
    {
        "id": "perceraian", "title": "Perceraian", "icon": "طَلَاق", "description": "Mempelajari tuntunan tentang proses talak, masa idah, nafkah, dan perlakuan yang bermartabat.",
        "subtopics": [
            {"id": "talak-tertib", "title": "Talak dengan tertib dan patut", "intro": "Ayat-ayat ini membahas aturan waktu dan langkah talak serta larangan menjadikan prosesnya sebagai alat untuk menyakiti.", "hadithQuery": "talak", "refs": [[65,1],[2,229],[2,231]], "questions": ["Informasi hukum dan dukungan tepercaya apa yang perlu dicari sebelum mengambil langkah?", "Bagaimana memastikan keputusan dan komunikasi tidak digunakan untuk membalas atau merugikan?"]},
            {"id": "iddah-nafkah", "title": "Idah, nafkah, dan tanggung jawab", "intro": "Baca tentang tempat tinggal, nafkah, dan penyelesaian hubungan dengan ma’ruf; rincian penerapan perlu merujuk ahli yang kompeten.", "hadithQuery": "nafkah", "refs": [[65,2],[65,6],[2,241]], "questions": ["Kebutuhan praktis apa yang perlu dijaga untuk semua pihak, terutama anak?", "Siapa ahli agama dan hukum setempat yang dapat menjelaskan keadaanmu secara utuh?"]},
        ]
    },
    {
        "id": "pengasuhan", "title": "Pengasuhan", "icon": "أَوْلَاد", "description": "Merenungi doa untuk keluarga, tanggung jawab pengasuhan, dan mendampingi anak dengan kasih sayang.",
        "subtopics": [
            {"id": "doa-keluarga", "title": "Doa untuk keluarga dan anak", "intro": "Ayat-ayat ini menghadirkan doa agar keluarga menjadi penyejuk hati dan keturunan menjaga salat serta kebaikan.", "hadithQuery": "anak", "refs": [[25,74],[14,40],[3,38]], "questions": ["Kebaikan apa yang kamu harapkan tumbuh dalam diri anak, tanpa membandingkannya dengan orang lain?", "Doa apa yang ingin kamu panjatkan untuk keluarga hari ini?"]},
            {"id": "amanah-pendidikan", "title": "Amanah dan pendidikan", "intro": "Baca pengingat tentang tanggung jawab menjaga keluarga, menanamkan tauhid, dan memenuhi kebutuhan anak dengan bijak.", "hadithQuery": "keluarga", "refs": [[66,6],[31,13],[17,31]], "questions": ["Nilai apa yang bisa diajarkan melalui teladan, bukan hanya nasihat?", "Bagaimana memberi ruang aman bagi anak untuk bertanya dan bercerita?"]},
        ]
    },
    {
        "id": "rezeki", "title": "Rezeki", "icon": "رِزْق", "description": "Membaca tentang jaminan rezeki Allah, ikhtiar, tawakal, dan keseimbangan dalam menggunakan harta.",
        "subtopics": [
            {"id": "jaminan-rezeki", "title": "Rezeki dan tawakal", "intro": "Ayat-ayat ini menguatkan tawakal tanpa meniadakan ikhtiar, serta mengingatkan bahwa Allah mengetahui keadaan makhluk-Nya.", "hadithQuery": "rezeki", "refs": [[11,6],[29,60],[65,2]], "questions": ["Langkah ikhtiar paling realistis apa yang bisa kamu lakukan sekarang?", "Kekhawatiran mana yang dapat kamu titipkan dalam doa setelah berusaha?"]},
            {"id": "ikhtiar-dan-seimbang", "title": "Bekerja dan menggunakan harta", "intro": "Baca ajakan berusaha, mencari karunia Allah, dan menjaga keseimbangan serta kebaikan dalam harta yang dimiliki.", "hadithQuery": "bekerja", "refs": [[62,10],[28,77],[2,267]], "questions": ["Bagaimana menjaga keseimbangan antara mencari penghasilan, keluarga, dan istirahat?", "Bagian mana dari rezekimu yang dapat dibagikan dengan cara yang bermanfaat?"]},
        ]
    },
    {
        "id": "taubat", "title": "Taubat", "icon": "تَوْبَة", "description": "Menguatkan harapan pada ampunan, kembali kepada Allah, dan memperbaiki akibat perbuatan.",
        "subtopics": [
            {"id": "jangan-putus-asa", "title": "Jangan berputus asa dari rahmat", "intro": "Ayat-ayat ini menyeru manusia agar tidak berputus asa, memohon ampun, dan kembali dengan taubat yang sungguh-sungguh.", "hadithQuery": "ampunan", "refs": [[39,53],[66,8],[4,17]], "questions": ["Apa yang perlu kamu akui dengan jujur di hadapan Allah?", "Langkah apa yang dapat menunjukkan kesungguhan untuk berubah?"]},
            {"id": "memperbaiki-diri", "title": "Berubah dan memperbaiki", "intro": "Taubat juga mengarah pada amal baik, meninggalkan kesalahan, dan menjaga kebersihan diri serta hubungan dengan sesama.", "hadithQuery": "taubat", "refs": [[25,70],[3,135],[2,222]], "questions": ["Jika ada orang yang terdampak, apa bentuk tanggung jawab atau perbaikan yang aman dan patut?", "Dukungan siapa yang dapat membantu menjaga perubahan ini?"]},
        ]
    },
    {
        "id": "keadilan", "title": "Keadilan", "icon": "عَدْل", "description": "Merenungi sikap adil, kesaksian yang jujur, dan pemenuhan hak dalam hubungan maupun muamalah.",
        "subtopics": [
            {"id": "kesaksian-adil", "title": "Adil, bahkan pada diri sendiri", "intro": "Ayat-ayat ini memerintahkan keadilan dan kesaksian yang jujur, meskipun hal itu menuntut kita menghadapi kepentingan sendiri.", "hadithQuery": "adil", "refs": [[4,135],[5,8],[16,90]], "questions": ["Informasi apa yang belum kamu miliki sebelum menilai persoalan ini?", "Apakah standar yang sama akan kamu terapkan jika posisinya tertukar?"]},
            {"id": "menunaikan-hak", "title": "Menunaikan hak dan amanah", "intro": "Baca tentang pencatatan hak, ukuran yang jujur, dan balasan yang setara tanpa melampaui batas.", "hadithQuery": "hak", "refs": [[2,282],[17,35],[42,40]], "questions": ["Hak siapa yang perlu kamu pastikan tidak terabaikan?", "Catatan atau kesepakatan apa yang dapat mencegah kesalahpahaman?"]},
        ]
    },
    {
        "id": "ilmu", "title": "Ilmu dan Hikmah", "icon": "عِلْم", "isNew": True, "tags": ["belajar", "pengetahuan", "berpikir", "tabayyun"], "description": "Menumbuhkan semangat belajar, sikap rendah hati, dan kebiasaan memeriksa pengetahuan serta informasi.",
        "subtopics": [
            {"id": "mencari-ilmu", "title": "Belajar dan memohon ilmu", "intro": "Ayat-ayat ini mengajak terus belajar, menghargai ilmu, dan menyadari bahwa pengetahuan perlu disertai penghambaan serta kerendahan hati.", "hadithQuery": "ilmu", "refs": [[20,114],[58,11],[39,9]], "questions": ["Hal apa yang ingin kamu pelajari dengan niat yang baik?", "Siapa atau sumber tepercaya apa yang bisa membantumu belajar selangkah demi selangkah?"]},
            {"id": "berpikir-dan-memeriksa", "title": "Berpikir dan memeriksa informasi", "intro": "Sebelum mengikuti atau menyebarkan sesuatu, Al-Qur’an mengingatkan tanggung jawab atas pengetahuan dan pentingnya memeriksa berita.", "hadithQuery": "ilmu", "refs": [[17,36],[49,6],[3,190]], "questions": ["Informasi apa yang perlu kamu cek sumber dan konteksnya sebelum mempercayainya?", "Apa yang dapat kamu amati hari ini untuk menumbuhkan rasa ingin tahu yang bermanfaat?"]},
        ]
    },
    {
        "id": "menjaga-lisan", "title": "Menjaga Lisan", "icon": "كَلَام", "isNew": True, "tags": ["ucapan", "bicara", "komunikasi", "ghibah", "prasangka"], "description": "Merenungi ucapan yang baik, jujur, dan tidak melukai martabat orang lain.",
        "subtopics": [
            {"id": "ucapan-baik", "title": "Berkata baik dan benar", "intro": "Ayat-ayat ini mengajak memilih kata yang lebih baik, berkata benar, dan menjaga hubungan melalui ucapan yang bertanggung jawab.", "hadithQuery": "berkata baik", "refs": [[2,83],[17,53],[33,70]], "questions": ["Kalimat apa yang bisa kamu sampaikan dengan lebih lembut dan tetap jujur?", "Kapan sebaiknya kamu berhenti sejenak sebelum menjawab?"]},
            {"id": "menjauhi-ghibah", "title": "Menjauhi ejekan dan ghibah", "intro": "Baca pengingat agar tidak merendahkan, mencela, berprasangka buruk, atau membicarakan keburukan orang lain.", "hadithQuery": "ghibah", "refs": [[49,11],[49,12],[24,15]], "questions": ["Apakah ucapan yang ingin kamu bagikan bermanfaat dan sudah dipastikan benar?", "Bagaimana mengalihkan obrolan yang mulai merendahkan seseorang?"]},
        ]
    },
    {
        "id": "persaudaraan", "title": "Persaudaraan", "icon": "أُخُوَّة", "isNew": True, "tags": ["persatuan", "damai", "saling mengenal", "menghormati"], "description": "Merawat persatuan, memperbaiki hubungan, dan menghormati perbedaan serta martabat sesama.",
        "subtopics": [
            {"id": "persatuan-dan-damai", "title": "Menjaga persatuan dan perdamaian", "intro": "Ayat-ayat ini mengingatkan pentingnya berpegang pada kebaikan bersama, meredakan perselisihan, dan menghindari pertikaian.", "hadithQuery": "persaudaraan", "refs": [[49,10],[8,46],[3,103]], "questions": ["Apa titik temu yang bisa membantu memperbaiki hubungan yang sedang renggang?", "Langkah damai apa yang aman dan mungkin dilakukan oleh semua pihak?"]},
            {"id": "menghormati-sesama", "title": "Mengenal dan menghormati sesama", "intro": "Keberagaman manusia menjadi ruang untuk saling mengenal; setiap orang tetap memiliki martabat yang perlu dihormati.", "hadithQuery": "sesama", "refs": [[49,13],[17,70],[4,36]], "questions": ["Apa yang bisa kamu pelajari dari seseorang yang latar belakangnya berbeda?", "Siapa di sekitarmu yang perlu didengar atau diperlakukan dengan lebih hormat?"]},
        ]
    },
    {
        "id": "berbagi", "title": "Berbagi dan Peduli", "icon": "عَطَاء", "isNew": True, "tags": ["sedekah", "infak", "yatim", "miskin", "kepedulian"], "description": "Menerjemahkan iman menjadi kepedulian, berbagi rezeki, dan perhatian kepada orang yang membutuhkan.",
        "subtopics": [
            {"id": "berbagi-harta", "title": "Berbagi dengan tulus", "intro": "Ayat-ayat ini mengajak memberi dari rezeki yang baik dan tidak hanya menunggu sampai sesuatu terasa berlebih.", "hadithQuery": "sedekah", "refs": [[2,261],[2,267],[3,92]], "questions": ["Apa yang bisa kamu bagikan—harta, waktu, tenaga, atau ilmu—dengan ikhlas?", "Bagaimana memastikan bantuan yang diberikan benar-benar bermanfaat dan menghormati penerimanya?"]},
            {"id": "peduli-yatim-miskin", "title": "Peduli kepada yatim dan yang membutuhkan", "intro": "Al-Qur’an menautkan kepedulian kepada orang yang rentan dengan tanggung jawab sosial, bukan sekadar ucapan.", "hadithQuery": "anak yatim", "refs": [[2,215],[90,14],[107,3]], "questions": ["Adakah kebutuhan di lingkunganmu yang dapat kamu bantu dengan cara yang tepat?", "Bagaimana memberi bantuan tanpa merendahkan atau membuka privasi penerimanya?"]},
        ]
    },
]


def arabic_verse(words: list) -> str:
    tokens: list[str] = []
    for word in words:
        if not isinstance(word, list) or not word or not isinstance(word[0], str):
            raise ValueError("Invalid word data")
        marks = word[7] if len(word) > 7 and isinstance(word[7], str) else ""
        if marks.startswith("۞"):
            tokens.append("۞")
            marks = marks[1:]
        tokens.append(word[0])
        tokens.extend(list(marks))
    return " ".join(tokens)


def main() -> None:
    index_rows = json.loads((ROOT / "data" / "index.json").read_text(encoding="utf-8"))
    index = {row["n"]: row for row in index_rows}
    verse_cache: dict[str, dict] = {}
    for theme in THEMES:
        for subtopic in theme["subtopics"]:
            if not 3 <= len(subtopic["refs"]) <= 5:
                raise ValueError(f"{theme['id']}/{subtopic['id']} must contain 3–5 verses")
            subtopic["refs"] = [f"{s}:{a}" for s, a in subtopic["refs"]]
            for ref in subtopic["refs"]:
                s, a = map(int, ref.split(":"))
                meta = index.get(s)
                if not meta or a < 1 or a > meta["ayat"]:
                    raise ValueError(f"Invalid verse reference: {ref}")
                key = f"{s}:{a}"
                if key in verse_cache:
                    continue
                surah_data = json.loads((ROOT / "data" / f"s{s:03}.json").read_text(encoding="utf-8"))
                translation_data = json.loads((ROOT / "data" / "id" / f"t{s:03}.json").read_text(encoding="utf-8"))
                muntakhab = json.loads((ROOT / "tafsir" / "muntakhab" / f"t{s:03}.json").read_text(encoding="utf-8"))
                jalalayn = json.loads((ROOT / "tafsir" / "jalalayn" / f"t{s:03}.json").read_text(encoding="utf-8"))
                verse_cache[key] = {
                    "s": s, "a": a, "surah": meta["latin"], "arabic": arabic_verse(surah_data["ayat"][a - 1]),
                    "translation": translation_data["ayat"][a - 1],
                    "tafsir": {"muntakhab": muntakhab["ayat"][a - 1], "jalalayn": jalalayn["ayat"][a - 1]},
                }
    payload = {
        "version": 1,
        "sources": {
            "arabic": "Tanzil Quran Text (Uthmani) · teks verbatim; tidak diubah.",
            "translation": "Terjemahan Kementerian Agama Republik Indonesia, melalui Tanzil.",
            "tafsir": "Tafsir al-Muntakhab (Muhammad Quraish Shihab et al.) dan Tafsir Jalalayn, salinan Indonesia dari Tanzil.",
            "hadith": "Hadis terkait dicari secara langsung melalui proxy server-side Ahmad Sanusi Open API; hasil bergantung pada ketersediaan dan pencarian API.",
            "notice": "Konten Quran/tafsir adalah bacaan tematik awal, bukan fatwa atau pengganti bimbingan ahli. Rincian hukum keluarga, talak, nafkah, dan hak anak perlu dikonsultasikan kepada ahli yang kompeten dan mempertimbangkan keadaan setempat.",
        },
        "themes": THEMES,
        "verses": verse_cache,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Built {OUT.relative_to(ROOT)}: {len(THEMES)} themes, {sum(len(t['subtopics']) for t in THEMES)} subtopics, {len(verse_cache)} unique verses.")

if __name__ == "__main__":
    main()
