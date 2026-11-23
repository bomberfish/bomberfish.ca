#!/usr/bin/env python3
"""Builds the site's icon font, "Metro Symbols" (public/fonts/icons/).

Icons on the site are written the Material Symbols way: the icon's name as
text in an element with class "material-symbols", which the font turns into
the icon with a ligature:

    <span class="material-symbols">refresh</span>

This font keeps that, but the names draw Windows' own glyphs. Three fonts
go into it, in this order of preference:

  1. Segoe UI Symbol, the Windows 8.1 version: the app bar icons in its
     private use area, and the solid pictographs it has for the rest
     (headphones, a trophy, a game controller...). This is the Metro set.
  2. Segoe MDL2 Assets, Windows 10's icon font, for what the first hasn't
     got. Thinner lines, the same family of shapes.
  3. Material Symbols Sharp for every name neither covers, so that any
     Material icon name still draws something. Instanced filled and heavy
     (MATERIAL_AXES below) so it sits as close to the solid Segoe glyphs as
     Material gets.

All of both Segoe icon sets is in there, not just what the site uses today,
and there are four ways to ask for a glyph:

  a Material name       refresh, favorite, calendar_month
        Drawn with a Segoe glyph where one means the same: the ALIASES
        table below, plus every Material name that is also one of
        Microsoft's names (delete, save, wifi...). Otherwise Material's.
  Microsoft's name      Refresh, GlobalNavigationButton, RepeatAll
        As written in Microsoft's own lists (the Symbol enum for Segoe UI
        Symbol, the "Segoe MDL2 Assets icons" page for MDL2; both are in
        the .json files beside this script), so a name can be copied
        straight from there. Segoe UI Symbol's glyph where both fonts have
        the name. The same names work in snake_case too
        (global_navigation_button).
  a Segoe codepoint     &#xE149; &#xE700;
        Each glyph at its own codepoint, as in Microsoft's documentation:
        E000-E2FF is Segoe UI Symbol (with MDL2 for the few it lacks),
        E700 and up is MDL2. The only way to reach the app bar glyphs
        Microsoft never named.
  the character itself  🎧 ⏱ ⚠
        Segoe UI Symbol's arrows, dingbats and emoji, in a second file
        (MetroSymbols-Pictographs.woff2) that the stylesheet only loads
        when a page actually has one of those characters in an icon.

To change what a name draws, edit ALIASES (or TWEAKS, for a glyph's size)
and run this again:

    scripts/icon-font/build.py \\
        --symbol   path/to/SegoeUISymbol-8.1.ttf \\
        --mdl2     path/to/SegoeMDL2Assets.ttf \\
        --material "path/to/MaterialSymbolsSharp[FILL,GRAD,opsz,wght].ttf"

The Material variable font is in github.com/google/material-design-icons,
under variablefont/. Needs fontTools and brotli (pip install fonttools
brotli). Add --preview FILE to also write an HTML page of everything in
the font, with the names to use: the way to look for an icon.
"""

import argparse
import html
import json
import os
import re
import sys
from pathlib import Path

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / "public/fonts/icons"
FAMILY = "Metro Symbols"

# The Material instance used for every name that isn't given a Segoe glyph.
MATERIAL_AXES = {"FILL": 1, "wght": 600, "GRAD": 0, "opsz": 24}

# What the site's vocabulary (Material's names, lowercase) draws.
#   name: "MicrosoftName"   a glyph by Microsoft's name, Segoe UI Symbol's
#                           if it has one by that name, else MDL2's
#   name: 0xE0A5            a glyph by codepoint, for the ones Microsoft
#                           never named and for the pictographs; again
#                           Segoe UI Symbol's if it has that codepoint
# Only needed where the names differ, or where Microsoft's icon of the same
# name means something else (its "Favorite" is a star; here, as in
# Material, "favorite" is a heart).
ALIASES = {
	# ---- getting around ----
	"search": "Find",
	"settings": "Setting",
	"menu": "GlobalNavigationButton",
	"more_horiz": "More",
	"more_vert": 0xE0C3,
	"close": "Cancel",
	"check": "Accept",
	"done": "Accept",
	"arrow_back": "Back",
	"arrow_forward": "Forward",
	"arrow_upward": "Up",
	"arrow_downward": 0xE1FD,
	"arrow_drop_down": 0xE2B5,
	"chevron_left": 0xE016,
	"chevron_right": 0xE017,
	"keyboard_arrow_left": 0xE016,
	"keyboard_arrow_right": 0xE017,
	"keyboard_arrow_up": 0xE018,
	"keyboard_arrow_down": 0xE019,
	"expand_less": 0xE018,
	"expand_more": 0xE019,
	"keyboard_double_arrow_left": 0x23EA,
	"keyboard_double_arrow_right": 0x23E9,
	"north_east": "Go",
	"arrow_outward": "Go",
	"open_in_new": 0xE2B4,
	"launch": 0xE2B4,
	"fullscreen": "FullScreen",
	"fullscreen_exit": "BackToWindow",
	# ---- time ----
	# (Windows 8's "recent" was a plain clock; MDL2's thin clock-with-arrow
	# is still there as "History")
	"history": "Clock",
	"schedule": "Clock",
	"acute": 0x23F1,  # a stopwatch, for "just now"
	"timer": 0x23F1,
	"alarm": 0x23F0,
	"calendar_month": "Calendar",
	"calendar_today": "Calendar",
	"event": "Calendar",
	"today": "GoToToday",
	# ---- likes, replies and the rest of a post ----
	"favorite": 0xE0A5,  # the heart
	"heart_broken": 0xE007,
	"star": "Favorite",  # Microsoft's "Favorite" is the star
	"grade": "Favorite",
	"thumb_up": "Like",
	"thumb_down": "Dislike",
	"thumbs_up_down": "LikeDislike",
	"reply": 0xE248,
	"reply_all": "MailReplyAll",
	"forward": "MailForward",
	"repeat": "ReShare",  # the two arrows of a repost, as Material's is
	"visibility": "View",
	"attachment": "Attach",
	"attach_file": "Attach",
	"bookmark": 0x1F516,
	"label": "Tag",
	"label_important": "Tag",
	"sell": "Tag",
	"push_pin": "Pin",
	"keep": "Pin",
	# ---- people and getting in touch ----
	"email": "Mail",
	"alternate_email": "Account",  # the @
	"chat": "Comment",
	"chat_bubble": "Message",
	"sms": "Message",
	"forum": "ChatBubbles",
	"person": "Contact",
	"account_circle": "Contact",
	"group": "People",
	"groups": "People",
	"person_add": "AddFriend",
	"contacts": "ContactInfo",
	"call": "Phone",
	"call_end": "HangUp",
	"notifications": 0xE1FA,
	"notifications_off": 0xE1FB,
	# ---- places ----
	"public": "Globe",
	"language": "Globe",
	"location_on": "MapPin",
	"place": "MapPin",
	"pin_drop": "MapPin",
	"my_location": "Target",
	"business": 0x1F3E2,
	"domain": 0x1F3E2,
	"apartment": 0x1F3E2,
	"school": "Education",
	"account_balance": "Bank",
	"work": 0x1F4BC,
	# ---- sound and pictures ----
	"play_arrow": "Play",
	# (in Metro the ring round a play button is the button's, not the glyph's)
	"play_circle": "Play",
	"pause_circle": "Pause",
	"stop_circle": "Stop",
	"skip_next": "Next",
	"skip_previous": "Previous",
	"fast_forward": 0x23E9,
	"fast_rewind": 0x23EA,
	# the speakers are the pictographs rather than the app bar's Volume and
	# Mute: those have nothing for "quieter", and the three have to match
	"volume_up": 0x1F50A,
	"volume_down": 0x1F509,
	"volume_mute": 0x1F508,
	"volume_off": 0x1F507,
	"music_note": "Audio",
	"library_music": "MusicInfo",
	"headphones": 0x1F3A7,
	"mic": "Microphone",
	"videocam": "Video",
	"photo_camera": "Camera",
	"cameraswitch": "RotateCamera",
	"image": "BrowsePhotos",  # one frame
	"photo": "BrowsePhotos",
	"photo_library": "Pictures",  # a stack of them
	"movie": "Movies",
	"slideshow": "SlideShow",
	"rotate_right": "Rotate",
	"palette": 0xE2B1,
	# ---- files and editing ----
	"article": "Document",
	"description": "Page2",
	"draft": "Page2",
	"create_new_folder": "NewFolder",
	"content_copy": "Copy",
	"content_cut": "Cut",
	"content_paste": "Paste",
	"file_download": "Download",
	"file_upload": "Upload",
	"filter_list": "Filter",
	"filter_alt": "Filter",
	"format_list_bulleted": "Bullets",
	"format_bold": "Bold",
	"format_italic": "Italic",
	"format_underlined": "Underline",
	"format_align_left": "AlignLeft",
	"format_align_center": "AlignCenter",
	"format_align_right": "AlignRight",
	"format_size": "FontSize",
	"format_color_text": "FontColor",
	"text_fields": "Font",
	"local_library": "Library",
	"newspaper": 0x1F4F0,
	"calculate": "Calculator",
	# ---- machines ----
	"computer": 0x1F4BB,
	"laptop": 0x1F4BB,
	"smartphone": "CellPhone",
	"phone_iphone": "CellPhone",
	"tv": "TVMonitor",
	"stadia_controller": 0x1F3AE,
	"sports_esports": 0x1F3AE,
	"videogame_asset": 0x1F3AE,
	"power_settings_new": 0xE07D,
	"battery_full": "Battery10",
	"terminal": "CommandPrompt",
	"data_object": "Code",
	"bug_report": "Bug",
	"build": "Repair",
	"construction": "Repair",  # (MDL2's "Construction" is roadworks)
	"handyman": "Repair",
	"extension": "Puzzle",
	"key": 0x1F511,
	# ---- state of things ----
	"info": "InfoSolid",
	"question_mark": "Help",
	"warning": 0x26A0,
	"priority_high": "Important",
	"check_circle": "CompletedSolid",
	"add_circle": 0xE0C8,
	"do_not_disturb_on": 0xE0C9,
	"block": 0xE25B,
	"lock": 0xE1F6,
	"lock_open": 0xE1F7,
	"light_mode": 0xE284,
	"dark_mode": 0xE28C,
	"cloud": 0xE28D,
	"bolt": 0x26A1,
	"lightbulb": 0x1F4A1,
	"mood": "Emoji2",
	"sentiment_satisfied": "Emoji2",
	"trophy": 0x1F3C6,
	"emoji_events": 0x1F3C6,
	"shopping_bag": "Shop",
	"credit_card": "PaymentCard",
	# ---- nothing in either Segoe font: left to Material ----
	# rss_feed, panorama_photosphere
}

# Adjustments to single source glyphs, wherever they end up being used.
#   fit=N    scale so the longer side is N units of the 960 box
#   scale=F  multiply the usual scale by F
#   left=N   put the left edge at N instead of centring
TWEAKS = {
	# the bold chevrons: a little smaller than they'd come out
	**{("sym", cp): {"fit": 520} for cp in (0xE016, 0xE017, 0xE018, 0xE019)},
	**{("sym", cp): {"fit": 600} for cp in (0x23E9, 0x23EA)},
	# the speakers: one scale and one left edge between them, so the
	# speaker itself stays put as the volume changes the icon
	**{
		("sym", cp): {"scale": 1.2, "left": 105}
		for cp in (0x1F507, 0x1F508, 0x1F509, 0x1F50A)
	},
}

# Segoe UI Symbol's pictographs, for the second file: the Unicode blocks of
# arrows, symbols and emoji. (Not its maths, its braille or its runes.)
PICTOGRAPHS = [
	(0x2190, 0x21FF),  # arrows
	(0x2300, 0x23FF),  # technical: ⌂ ⌚ ⏩ ⏱
	(0x25A0, 0x25FF),  # geometric shapes
	(0x2600, 0x27BF),  # miscellaneous symbols, dingbats
	(0x2900, 0x297F),  # more arrows
	(0x2B00, 0x2BFF),  # more arrows and shapes
	(0x1F300, 0x1F5FF),  # pictographs
	(0x1F600, 0x1F64F),  # emoticons
	(0x1F680, 0x1F6FF),  # transport and map symbols
]

# ---- geometry ----
# Everything is drawn in Material's box: 960 x 960, icons centred on
# (480, 480) and about 710 across at full size.
#
# Segoe UI Symbol's app bar icons have an advance of 2509 and are drawn
# around (1254.5, 826), a standard one 1952 across. Those keep their place
# in that frame (the designers' own optical centring: a play triangle sits
# right of centre), scaled so 1952 becomes 720. Its other private use
# glyphs are drawn at text size, to no common frame; they're centred by
# their bounding box and brought up to SMALL_FIT if they'd be smaller. Its
# pictographs are centred at the same scale as the app bar icons.
#
# Segoe MDL2 Assets draws every icon in its 2048 em square, padding
# included, so the whole square is scaled to 720 and centred.
BOX = 960
CENTRE = BOX / 2
ASCENT, DESCENT = 1056, -96  # Material's
SYM_ADVANCE = 2509
SYM_FRAME = (SYM_ADVANCE / 2, 826)
SYM_SCALE = 720 / 1952
SMALL_FIT = 600
MDL2_EM = 2048
MDL2_SCALE = 720 / MDL2_EM
LIMIT = 820  # nothing larger than this, or nearer the edge than its margin


def is_private(codepoint):
	return 0xE000 <= codepoint <= 0xF8FF


def snake(name):
	"""GlobalNavigationButton -> global_navigation_button"""
	name = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "_", name)
	name = re.sub(r"(?<=[A-Z])(?=[A-Z][a-z])", "_", name)
	return name.lower()


class Source:
	"""One of the two Segoe fonts, with Microsoft's names for its glyphs."""

	def __init__(self, key, label, path, names_file):
		self.key = key
		self.label = label
		self.font = TTFont(path)
		self.cmap = self.font.getBestCmap()
		self.glyphset = self.font.getGlyphSet()
		self.names = {}
		for codepoint, name in json.loads((HERE / names_file).read_text()).items():
			if codepoint != "//" and int(codepoint, 16) in self.cmap:
				self.names.setdefault(name, int(codepoint, 16))

	def bounds(self, codepoint):
		pen = BoundsPen(self.glyphset)
		self.glyphset[self.cmap[codepoint]].draw(pen)
		return pen.bounds

	def private(self):
		return sorted(cp for cp in self.cmap if is_private(cp))


def placement(source, codepoint):
	"""The transform that puts one of a source's glyphs in the 960 box, or
	None if the glyph is empty."""
	box = source.bounds(codepoint)
	if box is None:
		return None
	x0, y0, x1, y1 = box
	longest = max(x1 - x0, y1 - y0)
	if longest <= 0:
		return None
	cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
	advance = source.font["hmtx"][source.cmap[codepoint]][0]
	tweak = TWEAKS.get((source.key, codepoint), {})

	frame = None
	if source.key == "mdl2":
		scale = MDL2_SCALE
		frame = (advance / 2, MDL2_EM / 2)
	elif is_private(codepoint) and advance == SYM_ADVANCE:
		scale = SYM_SCALE
		frame = SYM_FRAME
	elif is_private(codepoint):
		scale = max(SYM_SCALE, SMALL_FIT / longest)
	else:
		scale = SYM_SCALE
	if "fit" in tweak:
		scale = tweak["fit"] / longest
		frame = None
	scale *= tweak.get("scale", 1)
	scale = min(scale, LIMIT / longest)

	# where the glyph's centre goes: where it sat in its source frame, if
	# that keeps it inside the box; otherwise dead centre
	tx, ty = CENTRE, CENTRE
	if frame:
		fx = CENTRE + (cx - frame[0]) * scale
		fy = CENTRE + (cy - frame[1]) * scale
		half_w, half_h = (x1 - x0) * scale / 2, (y1 - y0) * scale / 2
		low, high = (BOX - LIMIT) / 2, (BOX + LIMIT) / 2
		if (
			fx - half_w >= low
			and fx + half_w <= high
			and fy - half_h >= low
			and fy + half_h <= high
		):
			tx, ty = fx, fy
	if "left" in tweak:
		tx = tweak["left"] + (x1 - x0) * scale / 2
	return (scale, 0, 0, scale, tx - cx * scale, ty - cy * scale)


def redraw(glyphset, glyph, transform=None):
	"""A glyph as a fresh TrueType outline: composites flattened, hinting
	gone, moved by `transform`."""
	recording = DecomposingRecordingPen(glyphset)
	glyphset[glyph].draw(recording)
	pen = TTGlyphPen(None)
	recording.replay(TransformPen(pen, transform) if transform else pen)
	outline = pen.glyph()
	if outline.numberOfContours:
		outline.recalcBounds(None)
	return outline


class Font:
	"""A font being put together, every glyph one box wide."""

	def __init__(self):
		self.glyphs = {}
		self.cmap = {}

	def add(self, name, outline):
		self.glyphs[name] = outline

	def save(self, path, features=None):
		order = [".notdef"] + sorted(n for n in self.glyphs if n != ".notdef")
		builder = FontBuilder(BOX, isTTF=True)
		builder.setupGlyphOrder(order)
		builder.setupCharacterMap(self.cmap)
		builder.setupGlyf(self.glyphs)
		builder.setupHorizontalMetrics(
			{
				name: (BOX, outline.xMin if outline.numberOfContours else 0)
				for name, outline in self.glyphs.items()
			}
		)
		builder.setupHorizontalHeader(ascent=ASCENT, descent=DESCENT)
		builder.setupNameTable({"familyName": FAMILY, "styleName": "Regular"})
		builder.setupOS2(
			sTypoAscender=ASCENT,
			sTypoDescender=DESCENT,
			sTypoLineGap=0,
			usWinAscent=ASCENT,
			usWinDescent=-DESCENT,
		)
		builder.setupPost(keepGlyphNames=False)
		if features:
			addOpenTypeFeaturesFromString(builder.font, features)
		path.parent.mkdir(parents=True, exist_ok=True)
		builder.font.flavor = "woff2"
		builder.font.save(path)
		return len(order)


def material(path):
	"""Material Symbols, instanced: the font, its letters (character ->
	glyph), and what every icon name draws (name -> glyph)."""
	font = instancer.instantiateVariableFont(TTFont(path), MATERIAL_AXES)
	letters = {chr(cp): glyph for cp, glyph in font.getBestCmap().items() if cp < 0x80}
	spelt = {glyph: char for char, glyph in letters.items()}
	ligatures, filled = {}, {}
	for lookup in font["GSUB"].table.LookupList.Lookup:
		for table in lookup.SubTable:
			table = getattr(table, "ExtSubTable", table)
			kind = getattr(table, "LookupType", None)
			if kind == 1:
				# a filled instance swaps most icons for a ".fill" twin
				# after the ligature; that twin is the glyph to take
				filled.update(table.mapping)
			elif kind == 4:
				for first, entries in table.ligatures.items():
					for entry in entries:
						parts = [first, *entry.Component]
						if all(part in spelt for part in parts):
							ligatures["".join(spelt[part] for part in parts)] = entry.LigGlyph
	names = {name: filled.get(glyph, glyph) for name, glyph in ligatures.items()}
	return font, letters, names


def build(args):
	symbol = Source("sym", "Segoe UI Symbol", args.symbol, "segoe-ui-symbol.json")
	mdl2 = Source("mdl2", "Segoe MDL2 Assets", args.mdl2, "segoe-mdl2.json")
	sources = (symbol, mdl2)  # in order of preference

	print("instancing Material Symbols Sharp", MATERIAL_AXES, "...")
	material_font, letters, material_names = material(args.material)
	material_glyphs = material_font.getGlyphSet()

	core = Font()
	core.add(".notdef", redraw(material_glyphs, ".notdef"))

	# the letters icon names are spelt with; a name the font doesn't know
	# shows up as these, spelt out
	letter = {}
	for char, glyph in letters.items():
		letter[char] = f"chr.{ord(char):02X}"
		core.add(letter[char], redraw(material_glyphs, glyph))
		core.cmap[ord(char)] = letter[char]

	# ---- Segoe glyphs, made as they're asked for ----
	made = {}

	def segoe(source, codepoint):
		key = (source.key, codepoint)
		if key not in made:
			move = placement(source, codepoint)
			made[key] = None
			if move:
				made[key] = f"{source.key}.{codepoint:04X}"
				glyph = source.cmap[codepoint]
				core.add(made[key], redraw(source.glyphset, glyph, move))
		return made[key]

	def find(target, name):
		"""An ALIASES target as (source, codepoint)."""
		for source in sources:
			codepoint = source.names.get(target) if isinstance(target, str) else target
			if codepoint in source.cmap and source.bounds(codepoint):
				return source, codepoint
		shown = target if isinstance(target, str) else f"U+{target:04X}"
		sys.exit(f'ALIASES: "{name}" asks for {shown}, which neither Segoe font has')

	# ---- codepoints: the private use area is Segoe's ----
	for source in sources:
		for codepoint in source.private():
			if codepoint not in core.cmap:
				glyph = segoe(source, codepoint)
				if glyph:
					core.cmap[codepoint] = glyph

	# ---- names, least preferred first so the later ones win ----
	names = {name: ("material", glyph) for name, glyph in material_names.items()}
	known = set(names)
	taken = {}
	for source in reversed(sources):
		for name, codepoint in source.names.items():
			glyph = made.get((source.key, codepoint)) or segoe(source, codepoint)
			if not glyph:
				continue
			for form in (name, snake(name)):
				if len(form) > 1 and all(char in letter for char in form):
					names[form] = glyph
					if form in known:
						taken[form] = f"{source.label}'s {name}"
	aliased = {}
	for name, target in ALIASES.items():
		source, codepoint = find(target, name)
		names[name] = segoe(source, codepoint)
		aliased[name] = (source, codepoint)
		taken.pop(name, None)

	# what's left of Material: the glyphs some name still draws
	kept = set()
	for name, value in names.items():
		if isinstance(value, tuple):
			glyph = f"material.{value[1]}"
			if glyph not in kept:
				kept.add(glyph)
				core.add(glyph, redraw(material_glyphs, value[1]))
			names[name] = glyph

	# The ligatures: one lookup, with a subtable for each first letter. Left
	# as a single subtable it grows past what its 16-bit offsets can reach,
	# and fontTools' own way of splitting it up can't cope with where.
	features = [
		"languagesystem DFLT dflt;",
		"languagesystem latn dflt;",
		"feature rlig {",
		"\tlookup names useExtension {",
	]
	first = None
	for name, glyph in sorted(names.items()):
		if first not in (None, name[0]):
			features.append("\t\tsubtable;")
		first = name[0]
		spelling = " ".join(letter[char] for char in name)
		features.append(f"\t\tsub {spelling} by {glyph};")
	features += ["\t} names;", "} rlig;"]

	file = Path(args.output) / "MetroSymbols.woff2"
	count = core.save(file, "\n".join(features))
	by_source = {s.key: sum(1 for key in made if key[0] == s.key and made[key]) for s in sources}
	print(
		f"{file}: {file.stat().st_size / 1000:.0f} kB, {count} glyphs "
		f"({by_source['sym']} Segoe UI Symbol, {by_source['mdl2']} Segoe MDL2 Assets, "
		f"{len(kept)} Material), {len(names)} names"
	)
	print(
		f"  Material names drawn with a Segoe glyph: {len(aliased)} from ALIASES, "
		f"{len(taken)} more by sharing a name with Microsoft's:"
	)
	print("   ", " ".join(sorted(taken)))

	# ---- the pictographs ----
	pictographs = Font()
	pictographs.add(".notdef", TTGlyphPen(None).glyph())
	for low, high in PICTOGRAPHS:
		for codepoint in range(low, high + 1):
			if codepoint in symbol.cmap:
				move = placement(symbol, codepoint)
				if move:
					glyph = f"sym.{codepoint:04X}"
					pictographs.add(glyph, redraw(symbol.glyphset, symbol.cmap[codepoint], move))
					pictographs.cmap[codepoint] = glyph
	file2 = Path(args.output) / "MetroSymbols-Pictographs.woff2"
	count = pictographs.save(file2)
	ranges = ", ".join(f"U+{low:04X}-{high:04X}" for low, high in PICTOGRAPHS)
	print(f"{file2}: {file2.stat().st_size / 1000:.0f} kB, {count} glyphs")
	print(f"  unicode-range: {ranges}")

	if args.preview:
		preview(Path(args.preview), file, file2, sources, aliased, taken, names, pictographs)


def preview(page, file, file2, sources, aliased, taken, names, pictographs):
	"""An HTML page of everything in the font, with the names to use."""

	def url(font_file):
		return os.path.relpath(font_file.resolve(), page.resolve().parent)

	def cell(text, caption, note=""):
		return (
			f'<div><i>{html.escape(text)}</i><b>{html.escape(caption)}</b>'
			f"<u>{html.escape(note)}</u></div>"
		)

	def section(title, cells):
		return f"<h2>{html.escape(title)} <small>{len(cells)}</small></h2><section>{''.join(cells)}</section>"

	symbol, mdl2 = sources
	parts = [
		section(
			"Material names given a Segoe glyph (ALIASES)",
			[
				cell(name, name, f"{source.key} {codepoint:04X}")
				for name, (source, codepoint) in aliased.items()
			],
		),
		section(
			"Material names that are also Microsoft's",
			[cell(name, name, origin) for name, origin in sorted(taken.items())],
		),
	]
	for source in sources:
		parts.append(
			section(
				f"{source.label}, by Microsoft's name",
				[
					cell(name, name, f"{codepoint:04X}")
					for name, codepoint in sorted(source.names.items())
					if names.get(name, "").startswith(source.key + ".")
				],
			)
		)
	named = set(symbol.names.values())
	parts.append(
		section(
			"Segoe UI Symbol, unnamed: by codepoint",
			[
				cell(chr(codepoint), f"&#x{codepoint:04X};")
				for codepoint in symbol.private()
				if codepoint not in named and symbol.bounds(codepoint)
			],
		)
	)
	parts.append(
		section(
			"Left to Material (a sample)",
			[
				cell(name, name)
				for name in ("rss_feed", "panorama_photosphere", "science", "rocket_launch", "pets", "recycling")
			],
		)
	)
	parts.append(
		section(
			"Segoe UI Symbol's pictographs: by the character itself",
			[cell(chr(codepoint), f"U+{codepoint:04X}") for codepoint in sorted(pictographs.cmap)],
		)
	)
	page.write_text(
		f"""<!doctype html><meta charset="utf-8"><title>{FAMILY}</title>
<style>
@font-face {{ font-family: "{FAMILY}"; src: url("{url(file)}"); unicode-range: U+0020-007E, U+E000-F8FF; }}
@font-face {{ font-family: "{FAMILY}"; src: url("{url(file2)}"); unicode-range: {", ".join(f"U+{a:04X}-{b:04X}" for a, b in PICTOGRAPHS)}; }}
html {{ background: #000; color: #fff; font: 11px/1.3 "Segoe UI Variable", "Segoe UI", sans-serif; }}
body {{ margin: 1rem; }}
h2 {{ font-weight: 300; font-size: 22px; margin: 1.6rem 0 0.6rem; }} small {{ color: #888; }}
section {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr)); gap: 4px; }}
div {{ display: grid; justify-items: center; gap: 2px; padding: 8px 2px 6px; background: #1f1f1f; overflow: hidden; }}
i {{ font: normal 32px/1 "{FAMILY}"; height: 32px; white-space: nowrap; }}
b {{ font-weight: 400; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }}
u {{ text-decoration: none; color: #8ad; }}
</style>{''.join(parts)}"""
	)
	print("preview:", page)


if __name__ == "__main__":
	parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
	parser.add_argument("--symbol", required=True, help="Segoe UI Symbol (Windows 8.1) .ttf")
	parser.add_argument("--mdl2", required=True, help="Segoe MDL2 Assets .ttf")
	parser.add_argument("--material", required=True, help="Material Symbols Sharp variable .ttf")
	parser.add_argument("-o", "--output", default=str(OUT), help="folder to write the two .woff2 files to")
	parser.add_argument("--preview", help="also write an HTML page of everything in the font here")
	build(parser.parse_args())
