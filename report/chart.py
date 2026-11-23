#!/usr/bin/env python3
"""Draw report/charts/cost-and-time-per-run.png from report/data/runs.csv.

Two panels (cost per run, active minutes per run), one bar per run, grouped by
model and colored by model. No value labels or footnotes; the numbers are in
report/tables.md. Needs matplotlib (pip install matplotlib).

usage: python3 report/chart.py      (run report/build.py first)
"""
import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import FancyBboxPatch, Rectangle  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
MODELS = [  # fixed order and colors, same as the post's hero
    ("neon", "Gemini 4 Neon", "#2a78d6"),
    ("carbon", "Gemini 4 Carbon", "#1baf7a"),
    ("fable", "Fable 5.2", "#eb6834"),
]
SURFACE, INK, MUTED, GRID = "#fcfcfb", "#1f1f1f", "#5f5f5a", "#e6e6e3"
BAR_W, GROUP_GAP = 0.8, 1.2
plt.rcParams.update({"font.family": ["Arial", "DejaVu Sans"], "font.size": 12})

rows = [r for r in csv.DictReader(open(REPO / "report" / "data" / "runs.csv"))]
by_model = {k: sorted((r for r in rows if r["run"].startswith(k + "-")), key=lambda r: r["run"]) for k, _, _ in MODELS}


def rounded_bar(ax, x, h, color, radius_px=4):
    """A bar with a rounded data end and a square baseline end."""
    fig = ax.figure
    fig.canvas.draw()
    px_per_x = ax.transData.transform((1, 0))[0] - ax.transData.transform((0, 0))[0]
    px_per_y = ax.transData.transform((0, 1))[1] - ax.transData.transform((0, 0))[1]
    rx = radius_px / px_per_x
    ry = radius_px / px_per_y
    left = x - BAR_W / 2
    ax.add_patch(FancyBboxPatch((left, 0), BAR_W, h, boxstyle=f"round,pad=0,rounding_size={rx}",
                                mutation_aspect=ry / rx, facecolor=color, edgecolor="none"))
    ax.add_patch(Rectangle((left, 0), BAR_W, max(h - ry, 0), facecolor=color, edgecolor="none"))


def panel(ax, field, title, ymax):
    ax.set_facecolor(SURFACE)
    ax.set_xlim(-0.8, 3 * 3 + 2 * GROUP_GAP - 0.2)
    ax.set_ylim(0, ymax)
    ax.yaxis.grid(True, color=GRID, linewidth=1)
    ax.set_axisbelow(True)
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(GRID)
    ax.tick_params(axis="y", colors=MUTED, length=0)
    ax.tick_params(axis="x", colors=INK, length=0, pad=8)
    ax.set_title(title, loc="left", color=INK, fontsize=14, fontweight="bold", pad=14)
    centers, x = [], 0.0
    bars = []
    for key, label, color in MODELS:
        xs = []
        for r in by_model[key]:
            bars.append((x, float(r[field]), color))
            xs.append(x)
            x += 1.0  # BAR_W 0.8 leaves a gap between adjacent bars
        centers.append(sum(xs) / len(xs))
        x += GROUP_GAP
    ax.set_xticks(centers, [label for _, label, _ in MODELS])
    return bars


fig, (a1, a2) = plt.subplots(1, 2, figsize=(12, 5.2), dpi=150)
fig.patch.set_facecolor(SURFACE)
bars1 = panel(a1, "cost_usd", "Cost per run (USD)", 15)
bars2 = panel(a2, "active_minutes", "Active minutes per run", 50)
fig.tight_layout(w_pad=4)  # fix the layout first so the 4 px corner radius is measured on final axes
for ax, bars in ((a1, bars1), (a2, bars2)):
    for bx, h, color in bars:
        rounded_bar(ax, bx, h, color)
out = REPO / "report" / "charts" / "cost-and-time-per-run.png"
fig.savefig(out, facecolor=SURFACE)
print("wrote", out.relative_to(REPO))
