# A címsorok betűje (Fredoka 600) a magyar ő, ű, Ő, Ű nélkül jön a Google Fontsról, ezért ezek a böngészőben egy másik
# betűből jelennek meg. Ez a script a Fredoka nyílt licencű (SIL OFL 1.1) forrásából elkészíti a 600-as vastagságot, és a
# meglévő alapbetűből (o, u, O, U) és a betűtípus saját kettős ékezetéből (U+030B) összerakja a négy hiányzó betűt, ugyanúgy,
# ahogy a Fredoka a saját ó, ö, Ó betűit rakja össze. A kimenet új néven (Fredoka Matura) kerül az app/public/fonts mappába.
#
# Forrás: https://github.com/google/fonts/blob/main/ofl/fredoka/Fredoka[wdth,wght].ttf (és ugyanott az OFL.txt)
# Használat: python -I eszkozok/fredoka-hu.py <Fredoka[wdth,wght].ttf> app/public/fonts/fredoka-matura-600.woff2
# Kell hozzá: python -m pip install fonttools brotli
import sys
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent
from fontTools.varLib import instancer
from fontTools import subset

src, out = sys.argv[1], sys.argv[2]
font = instancer.instantiateVariableFont(TTFont(src), {'wght': 600, 'wdth': 100})
glyf, hmtx, cmap = font['glyf'], font['hmtx'], font.getBestCmap()


def comp(name, x, y):
    c = GlyphComponent()
    c.glyphName, c.x, c.y, c.flags = name, x, y, 0
    return c


def top_anchors():
    """A betűtervező horgonypontjai (GPOS mark-to-base, felső osztály): alapbetű -> (x, y), ékezet -> (x, y)."""
    bases, marks = {}, {}
    for lk in font['GPOS'].table.LookupList.Lookup:
        for st in lk.SubTable:
            st = st.ExtSubTable if lk.LookupType == 9 else st
            if getattr(st, 'LookupType', lk.LookupType) != 4:
                continue
            for i, m in enumerate(st.MarkCoverage.glyphs):
                r = st.MarkArray.MarkRecord[i]
                marks[m] = (r.Class, r.MarkAnchor.XCoordinate, r.MarkAnchor.YCoordinate)
            for i, b in enumerate(st.BaseCoverage.glyphs):
                bases[b] = [(a.XCoordinate, a.YCoordinate) if a else None for a in st.BaseArray.BaseRecord[i].BaseAnchor]
    return bases, marks


bases, marks = top_anchors()


def place(base, mark):
    cls, mx, my = marks[mark]
    bx, by = bases[base][cls]
    return round(bx - mx), round(by - my)


# Próba: a horgonypontok a Fredoka saját ö, Ö, ü, Ü betűjén ugyanazt adják-e, mint a betűtervező összerakása.
for base, ready in (('o', 'odieresis'), ('O', 'Odieresis'), ('u', 'udieresis'), ('U', 'Udieresis')):
    have = next((round(c.x), round(c.y)) for c in glyf[ready].components if c.glyphName == 'uni0308')
    print(f'{ready}: tervezett {have}, horgony szerint {place(base, "uni0308")}')
    assert abs(have[0] - place(base, 'uni0308')[0]) <= 1 and have[1] == place(base, 'uni0308')[1]

MARK = 'uni030B'
NEW = {0x0151: ('ohungarumlaut', 'o'), 0x0171: ('uhungarumlaut', 'u'), 0x0150: ('Ohungarumlaut', 'O'), 0x0170: ('Uhungarumlaut', 'U')}
order = font.getGlyphOrder()
for code, (name, base) in NEW.items():
    assert code not in cmap, f'U+{code:04X} már benne van'
    x, y = place(base, MARK)
    g = Glyph()
    g.numberOfContours = -1
    g.components = [comp(base, 0, 0), comp(MARK, x, y)]
    order.append(name)
    glyf.glyphOrder = order
    glyf[name] = g
    hmtx[name] = hmtx[base]
    print(f'{name}: {base} + {MARK} (x={x}, y={y})')
font.setGlyphOrder(order)
for t in font['cmap'].tables:
    if t.isUnicode():
        for code, (name, _) in NEW.items():
            t.cmap[code] = name

# név: módosított változat, saját néven (OFL 1.1)
for rec in font['name'].names:
    if rec.nameID in (1, 3, 4, 6, 16):
        s = rec.toUnicode()
        rec.string = s.replace('Fredoka', 'Fredoka Matura', 1) if rec.nameID != 6 else s.replace('Fredoka', 'FredokaMatura', 1)

# csak a felülethez kellő jelek: alap latin, magyar ékezetek, tipográfiai jelek
opts = subset.Options()
opts.flavor = 'woff2'
opts.layout_features = ['kern', 'liga', 'calt', 'mark', 'mkmk']
opts.name_IDs = ['*']
opts.notdef_outline = True
sub = subset.Subsetter(opts)
chars = set(range(0x20, 0x7F)) | set(range(0xA0, 0x100)) | set(NEW) | {0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x201E, 0x2026, 0x2022, 0x20AC}
sub.populate(unicodes=chars)
sub.subset(font)
font.flavor = 'woff2'
font.save(out)
check = TTFont(out).getBestCmap()
print('kész:', out, '| ő ű Ő Ű benne:', all(c in check for c in NEW), '| jelek:', len(check))
