# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools[woff]==4.60.1", "certifi"]
# ///
"""Builds public/fonts/inter.woff2 from the official Inter release.

    uv run scripts/inter.py

Keeps the site's characters (the ranges in `interRanges`, src/layout.tsx), the features the page
uses (`fontFeatures`, src/tokens.stylex.ts; `tnum` for dates), weights 380 to 600, and builds
the grotesque G (Inter's cv10) into the character map, so every renderer draws it, the share
image included, with no setting to remember.
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
OUTPUT = Path(__file__).resolve().parent.parent / "public/fonts/inter.woff2"
# Must match `interRanges` in src/layout.tsx.
RANGES = [
    (0x0020, 0x007E), (0x00A0, 0x00FF), (0x0100, 0x017F), (0x0131, 0x0131), (0x0152, 0x0153),
    (0x02C6, 0x02C6), (0x02DA, 0x02DA), (0x02DC, 0x02DC), (0x2010, 0x205E), (0x20AC, 0x20AC),
    (0x2122, 0x2122), (0x2190, 0x21FF), (0x2212, 0x2212), (0x2500, 0x257F),
]
FEATURES = ["calt", "case", "dnom", "frac", "kern", "locl", "numr", "tnum"]
BUILT_IN = "cv10"


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


def main() -> None:
    # certifi's CA bundle, so the download verifies on any machine, whatever its system store.
    context = ssl.create_default_context(cafile=certifi.where())
    with urllib.request.urlopen(RELEASE, context=context) as response:
        archive = zipfile.ZipFile(io.BytesIO(response.read()))
    font = TTFont(io.BytesIO(archive.read("InterVariable.ttf")), lazy=False)

    characters = sorted({c for start, end in RANGES for c in range(start, end + 1)} & set(font.getBestCmap()))
    alternates = single_substitutions(font, BUILT_IN)
    for cmap in font["cmap"].tables:
        if cmap.isUnicode():
            for codepoint, glyph in list(cmap.cmap.items()):
                if glyph in alternates:
                    cmap.cmap[codepoint] = alternates[glyph]

    options = subset.Options()
    options.layout_features = FEATURES
    options.name_IDs = ["*"]
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=characters)
    subsetter.subset(font)
    font = instancer.instantiateVariableFont(font, {"wght": (380, 600)})
    font.flavor = "woff2"
    font.save(OUTPUT)
    print(f"{OUTPUT}: {len(characters)} characters, {OUTPUT.stat().st_size} bytes")


if __name__ == "__main__":
    main()
