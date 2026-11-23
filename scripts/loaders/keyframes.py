#!/usr/bin/env python3
"""Prints the @keyframes of the site's two indeterminate loaders.

The loaders (src/metro-dreamland/components/Progress.tsx; "Loaders" in
src/metro-dreamland/metro.css) are
Windows 8's: the ProgressRing, dots chasing each other round a circle, and
the indeterminate ProgressBar, five dots that fly in from the left, bunch up
in the middle and fly off to the right. Their motion is a table of key
frames in each control's default template, which Microsoft published:

    ProgressRing styles and templates
    https://learn.microsoft.com/en-us/previous-versions/windows/apps/jj709924(v=win.10)
    ProgressBar styles and templates
    https://learn.microsoft.com/en-us/previous-versions/windows/apps/jj709923(v=win.10)

Every time, angle, distance and curve below is copied from those two
storyboards as printed, oddities included (the fifth and sixth dots of the
ring are 2 degrees off the others' pattern at one key frame: 331 and 325,
where 333 and 327 would fit). This script only turns them into CSS: key
times into percentages of the loop, and each KeySpline into the
cubic-bezier() of the stretch that leads up to its key frame (XAML puts a
curve on the frame it arrives at, CSS on the frame it leaves from).

What the templates leave to the control's code, and so isn't on those
pages, is in the stylesheet beside what this prints: how big the dots are
and how far the bar's row of them drifts. See the notes there.

    python3 scripts/loaders/keyframes.py

and paste the output over the generated block in
src/metro-dreamland/metro.css.
"""

# ---------------------------------------------------------------- the ring
# <DoubleAnimationUsingKeyFrames Storyboard.TargetName="E1R" ... "Angle">,
# E2R ... E6R: the same key times and curves, each dot 6 degrees behind the
# one before it and starting 0.167s later.
RING_TIMES = [0, 0.433, 1.2, 1.617, 2.017, 2.783, 3.217]
# (the curve of the stretch arriving at each key frame; None is a straight
# line, a SplineDoubleKeyFrame with no KeySpline. The first frame's own
# KeySpline, 0.13,0.21,0.1,0.7, has no stretch before it to shape.)
RING_SPLINES = [
    None,
    "0.02, 0.33, 0.38, 0.77",
    None,
    "0.57, 0.17, 0.95, 0.75",
    "0, 0.19, 0.07, 0.72",
    None,
    "0, 0, 0.95, 0.37",
]
RING_ANGLES = [
    [-110, 10, 93, 205, 357, 439, 585],
    [-116, 4, 87, 199, 351, 433, 579],
    [-122, -2, 81, 193, 345, 427, 573],
    [-128, -8, 75, 187, 339, 421, 567],
    [-134, -14, 69, 181, 331, 415, 561],
    [-140, -20, 63, 175, 325, 409, 555],
]
RING_BEGINS = [0, 0.167, 0.334, 0.501, 0.668, 0.835]
# Opacity: 1 from 0 to 3.21, 0 at 3.22, and a last key frame at 3.47 that
# changes nothing but how long the animation is.
RING_HIDES_AT = 3.22
RING_OPACITY_ENDS = 3.47
# The storyboard has no Duration of its own, so one loop lasts as long as
# its longest child: the sixth dot's opacity, which begins last.
RING_PERIOD = RING_BEGINS[-1] + RING_OPACITY_ENDS  # 4.305s

# ----------------------------------------------------------------- the bar
BAR_PERIOD = 3.917  # the EllipseGrid's DoubleAnimation, the longest child
BAR_SPLINE = "0.4, 0, 0.6, 1"
# E1...E5, the dots: each waits its turn, takes a second to reach the
# "well" (a third of the way across), sits there a second, and takes a
# second to the end position (two thirds). Distances are fractions of the
# control's width (TemplateSettings.EllipseAnimationWellPosition and
# ...EndPosition: "internally calculated as 1/3" and "2/3 of the
# ActualWidth", says the API reference).
BAR_E = [
    [(0, 0, None), (1, 1 / 3, BAR_SPLINE), (2, 1 / 3, None), (3, 2 / 3, BAR_SPLINE)],
    [(0, 0, None), (0.167, 0, None), (1.167, 1 / 3, BAR_SPLINE), (2.167, 1 / 3, None), (3.167, 2 / 3, BAR_SPLINE)],
    [(0, 0, None), (0.333, 0, None), (1.333, 1 / 3, BAR_SPLINE), (2.333, 1 / 3, None), (3.333, 2 / 3, BAR_SPLINE)],
    [(0, 0, None), (0.5, 0, None), (1.5, 1 / 3, BAR_SPLINE), (2.5, 1 / 3, None), (3.5, 2 / 3, BAR_SPLINE)],
    [(0, 0, None), (0.667, 0, None), (1.667, 1 / 3, BAR_SPLINE), (2.667, 1 / 3, None), (3.667, 2 / 3, BAR_SPLINE)],
]
# B1...B5, the box each dot sits in: 50px back to start with, level by the
# time its dot is on its way, and 100px on over its last second. Straight
# lines (EasingDoubleKeyFrames with no easing function). In pixels, which
# the stylesheet has as rems (16 to one).
BAR_B = [
    [(0, -50), (0.5, 0), (2, 0), (3, 100)],
    [(0, -50), (0.667, 0), (2.167, 0), (3.167, 100)],
    [(0, -50), (0.833, 0), (2.333, 0), (3.333, 100)],
    [(0, -50), (1, 0), (2.5, 0), (3.5, 100)],
    [(0, -50), (1.167, 0), (2.667, 0), (3.667, 100)],
]
# Opacity of each dot: there from when it sets off until it arrives.
BAR_SHOWN = [(0, 3), (0.167, 3.167), (0.333, 3.333), (0.5, 3.5), (0.667, 3.667)]


def pct(seconds, period):
    text = f"{seconds / period * 100:.4f}".rstrip("0").rstrip(".")
    return f"{text}%"


def num(value, places=4):
    return f"{value:.{places}f}".rstrip("0").rstrip(".")


def frame(at, declarations, curve=None, hold_to_end=False):
    """One key frame; `curve` shapes the stretch that leaves it."""
    selector = f"{at},\n\t100%" if hold_to_end else at
    lines = [f"\t{selector} {{"]
    lines += [f"\t\t{d};" for d in declarations]
    if curve and not hold_to_end:
        lines.append(f"\t\tanimation-timing-function: cubic-bezier({curve});")
    lines.append("\t}")
    return "\n".join(lines)


def keyframes(name, frames):
    return f"@keyframes {name} {{\n" + "\n".join(frames) + "\n}\n"


out = []

for dot, angles in enumerate(RING_ANGLES):
    frames = []
    for k, (t, angle) in enumerate(zip(RING_TIMES, angles)):
        last = k == len(RING_TIMES) - 1
        curve = None if last else RING_SPLINES[k + 1]
        frames.append(
            frame(pct(t, RING_PERIOD), [f"transform: rotate({angle}deg)"], curve, last)
        )
    out.append(keyframes(f"m-ring-{dot + 1}", frames))

out.append(
    keyframes(
        "m-ring-show",
        [
            frame("0%", ["opacity: 1"]),
            frame(pct(RING_HIDES_AT, RING_PERIOD), ["opacity: 0"], hold_to_end=True),
        ],
    )
)

for dot, stops in enumerate(BAR_E):
    frames = []
    for k, (t, x, _) in enumerate(stops):
        last = k == len(stops) - 1
        curve = None if last else stops[k + 1][2]
        frames.append(
            frame(
                pct(t, BAR_PERIOD),
                [f"transform: translateX({num(x * 100)}%)" if x else "transform: translateX(0)"],
                curve,
                last,
            )
        )
    out.append(keyframes(f"m-bar-dot-{dot + 1}", frames))

for dot, stops in enumerate(BAR_B):
    frames = []
    for k, (t, px) in enumerate(stops):
        last = k == len(stops) - 1
        x = f"{num(px / 16)}rem" if px else "0"
        frames.append(frame(pct(t, BAR_PERIOD), [f"transform: translateX({x})"], None, last))
    out.append(keyframes(f"m-bar-box-{dot + 1}", frames))

for dot, (shown, hidden) in enumerate(BAR_SHOWN):
    frames = []
    if shown:
        frames.append(frame("0%", ["opacity: 0"]))
    frames.append(frame(pct(shown, BAR_PERIOD), ["opacity: 1"]))
    frames.append(frame(pct(hidden, BAR_PERIOD), ["opacity: 0"], hold_to_end=True))
    out.append(keyframes(f"m-bar-show-{dot + 1}", frames))

print(f"/* ring: one loop is {num(RING_PERIOD)}s; bar: {num(BAR_PERIOD)}s */\n")
print("\n".join(out), end="")
