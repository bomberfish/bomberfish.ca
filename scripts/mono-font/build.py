#!/usr/bin/env python3
"""Cuts the site's monospace web fonts from Cascadia Code.

Cascadia Code is a big font (4,300 glyphs upright), most of it for scripts and
symbols that no code on this site uses. So, like the Segoe UI in
public/typography.css, each style is served as two files:

  CascadiaCode[-Italic]-core.woff2   what code is nearly always made of:
                                     Latin, punctuation, arrows, maths, the
                                     technical and box-drawing symbols
  CascadiaCode[-Italic].woff2        the whole font, which unicode-range
                                     keeps off the wire unless something on
                                     the page needs the rest (Greek,
                                     Cyrillic, braille, ...)

Both keep the weight axis (200 to 700), every layout feature (the coding
ligatures are `calt`) and the hinting.

    python3 scripts/mono-font/build.py \
        --upright ~/Library/Fonts/CascadiaCode.ttf \
        --italic ~/Library/Fonts/CascadiaCodeItalic.ttf

It prints the unicode-range for each file, to paste into typography.css.
Needs fontTools with brotli.
"""

import argparse
import os

from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "public", "fonts", "mono")

# What goes in the core file.
CORE = [
    (0x0020, 0x007E),  # Basic Latin
    (0x00A0, 0x017F),  # Latin-1 and Latin Extended-A
    (0x2000, 0x206F),  # general punctuation
    (0x20A0, 0x20BF),  # currency
    (0x2100, 0x214F),  # letterlike
    (0x2190, 0x21FF),  # arrows
    (0x2200, 0x22FF),  # mathematical operators
    (0x2300, 0x23FF),  # technical
    (0x2500, 0x259F),  # box drawing and blocks
    (0x25A0, 0x25FF),  # geometric shapes
    (0xFFFD, 0xFFFD),  # the replacement character
]


def in_core(cp):
    return any(lo <= cp <= hi for lo, hi in CORE)


def ranges(cps):
    """Codepoints as CSS unicode-range terms: runs, bridging small gaps the
    font has nothing in anyway (a gap is harmless as long as no other face of
    the family claims it)."""
    out = []
    for cp in sorted(cps):
        if out and cp - out[-1][1] <= 16:
            out[-1][1] = cp
        else:
            out.append([cp, cp])
    return ", ".join(
        f"U+{lo:04X}" if lo == hi else f"U+{lo:04X}-{hi:04X}" for lo, hi in out
    )


def cut(source, name):
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.hinting = True
    options.notdef_outline = True
    options.name_IDs = ["*"]
    options.glyph_names = False

    covered = set(TTFont(source).getBestCmap())
    core = {cp for cp in covered if in_core(cp)}
    rest = covered - core

    for label, cps, keep in (("-core", core, core), ("", rest, covered)):
        font = TTFont(source)
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=sorted(keep))
        subsetter.subset(font)
        path = os.path.join(OUT, f"{name}{label}.woff2")
        font.flavor = "woff2"
        font.save(path)
        print(f"{os.path.relpath(path)}  {os.path.getsize(path) / 1024:.0f} kB")
        print(f"  unicode-range: {ranges(cps)};\n")


if __name__ == "__main__":
    args = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    args.add_argument("--upright", required=True)
    args.add_argument("--italic", required=True)
    paths = args.parse_args()
    os.makedirs(OUT, exist_ok=True)
    cut(os.path.expanduser(paths.upright), "CascadiaCode")
    cut(os.path.expanduser(paths.italic), "CascadiaCode-Italic")
