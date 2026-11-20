"""Unit tests of tools/prepare.py:  python3 -m pytest test"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import prepare  # noqa: E402


def test_match_words_survives_repeated_choruses():
    lyrics = "la la hold me up la la hold me up the end".split()
    heard = "la la hold me up hold me up the end".split()  # one "la la" not heard
    pairs = prepare.match_words(lyrics, heard)
    assert pairs == sorted(pairs)
    matched = {i for i, _ in pairs}
    assert {8, 9, 10, 11} <= matched  # the end still matches after the gap


def test_match_words_accepts_similar_spellings():
    pairs = prepare.match_words(["colour", "gold"], ["color", "gold"])
    assert pairs == [(0, 0), (1, 1)]


def test_parse_lyrics_keeps_adlibs_out_of_the_words(tmp_path):
    f = tmp_path / "lyrics.lrc"
    f.write_text("[Chorus]\n[01:02.00] Gold turning to rust (Turning to rust, baby!)\n[01:05.00] Again (<01:07.50>yeah)\n")
    lines = prepare.parse_lyrics(f)
    assert [w["w"] for w in lines[0]["words"]] == ["Gold", "turning", "to", "rust"]
    assert lines[0]["adlibs"] == [{"text": "Turning to rust, baby!", "at": None}]
    assert lines[1]["adlibs"] == [{"text": "yeah", "at": 67.5}]
    assert lines[0]["section"] == "chorus" and lines[0]["lrc"] == 62.0


def line(t, n=3, d=0.5):
    words = [{"w": f"w{i}", "t": t + i * d, "e": t + i * d + d * 0.8} for i in range(n)]
    return {"words": words, "t": words[0]["t"], "e": words[-1]["e"]}


def test_overrides_shift_rescale_and_set_words():
    lines = [line(10), line(20), line(30)]
    prepare.apply_overrides(lines, {
        "lines": {"1": {"shift": -0.5}, "2": {"start": 21, "end": 23}},
        "words": {"3.2": {"t": 30.7}},
    })
    assert lines[0]["t"] == 9.5
    assert (lines[1]["t"], lines[1]["e"]) == (21, 23)
    assert lines[2]["words"][1]["t"] == 30.7


def test_overrides_reject_unknown_lines():
    import pytest
    with pytest.raises(SystemExit):
        prepare.apply_overrides([line(1)], {"lines": {"5": {"shift": 1}}})
