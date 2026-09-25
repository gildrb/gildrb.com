# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools[woff]==4.60.1", "certifi"]
# ///
"""Builds the site's two Inter files from the official Inter release.

    uv run scripts/inter.py

public/fonts/inter.woff2, for the page: the site's characters (the ranges in `interRanges`,
src/layout.tsx), the features the page uses (`fontFeatures`, src/tokens.stylex.ts; `tnum` for
dates), weights 380 to 600, and the grotesque G (Inter's cv10) built into the character map.

src/fonts/inter-share.woff2, for the link-preview image (src/og.tsx), whose renderer cannot turn
on OpenType features: the same font with the case forms the page turns on built in as well, for
the hyphen and the arrows, which the image only sets beside capitals and figures. The @ keeps its
default form, as in the page's email address.
"""

import io
import ssl
import urllib.request
import zipfile
from pathlib import Path

import certifi
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

RELEASE = "https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip"
ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "public/fonts/inter.woff2"
SHARE = ROOT / "src/fonts/inter-share.woff2"
# Must match `interRanges` in src/layout.tsx.
RANGES = [
    (0x0020, 0x007E), (0x00A0, 0x00FF), (0x0100, 0x017F), (0x0131, 0x0131), (0x0152, 0x0153),
    (0x02C6, 0x02C6), (0x02DA, 0x02DA), (0x02DC, 0x02DC), (0x2010, 0x205E), (0x20AC, 0x20AC),
    (0x2122, 0x2122), (0x2190, 0x21FF), (0x2212, 0x2212), (0x2500, 0x257F),
]
FEATURES = ["calt", "case", "dnom", "frac", "kern", "locl", "numr", "tnum"]
# The hyphen and every arrow the font has a case form for.
SHARE_CASE = {0x002D} | set(range(0x2190, 0x2200))


def single_substitutions(font: TTFont, tag: str) -> dict[str, str]:
    table = font["GSUB"].table
    mapping: dict[str, str] = {}
    for record in table.FeatureList.FeatureRecord:
        if record.FeatureTag != tag:
            continue
        for index in record.Feature.LookupListIndex:
            for sub in table.LookupList.Lookup[index].SubTable:
                inner = getattr(sub, "ExtSubTable", sub)
                mapping.update(getattr(inner, "mapping", None) or {})
    if not mapping:
        raise SystemExit(f"Inter has no single substitutions for {tag}")
    return mapping


def build(source: bytes, output: Path, case: set[int]) -> None:
    font = TTFont(io.BytesIO(source), lazy=False)
    characters = sorted({c for start, end in RANGES for c in range(start, end + 1)} & set(font.getBestCmap()))
    grotesque = single_substitutions(font, "cv10")
    case_forms = single_substitutions(font, "case")
    for cmap in font["cmap"].tables:
        if cmap.isUnicode():
            for codepoint, glyph in list(cmap.cmap.items()):
                glyph = grotesque.get(glyph, glyph)
                if codepoint in case:
                    glyph = case_forms.get(glyph, glyph)
                cmap.cmap[codepoint] = glyph

    options = subset.Options()
    options.layout_features = FEATURES
    options.name_IDs = ["*"]
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=characters)
    subsetter.subset(font)
    font = instancer.instantiateVariableFont(font, {"wght": (380, 600)})
    font.flavor = "woff2"
    output.parent.mkdir(parents=True, exist_ok=True)
    font.save(output)
    print(f"{output.relative_to(ROOT)}: {len(characters)} characters, {output.stat().st_size} bytes")


def main() -> None:
    # certifi's CA bundle, so the download verifies on any machine, whatever its system store.
    context = ssl.create_default_context(cafile=certifi.where())
    with urllib.request.urlopen(RELEASE, context=context) as response:
        source = zipfile.ZipFile(io.BytesIO(response.read())).read("InterVariable.ttf")
    build(source, PAGE, case=set())
    build(source, SHARE, case=SHARE_CASE)


if __name__ == "__main__":
    main()
