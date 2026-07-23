// backend/scripts/pptxgen/generate.js
const fs = require("fs");
const PptxGenJS = require("pptxgenjs");

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error("Usage: node generate.js <input.json> <output.pptx>");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
const { periodLabel, groups, theme } = data;

// Fallback kalau theme tidak dikirim (backward compatible) - default ke tema lama (corporate_blue-ish).
const T = theme || {
  primary: "2563EB",
  secondary: "1E293B",
  background: "FFFFFF",
  textColor: "1E293B",
  mutedColor: "64748B",
  fontFamily: "Calibri",
};

// Palet aksen per-grup diturunkan dari primary+secondary tema, bukan warna acak tetap,
// supaya seluruh deck (termasuk slide detail per target) konsisten dengan tema yang dipilih.
const ACCENTS = [
  T.primary,
  T.secondary,
  shade(T.primary, 25),
  shade(T.secondary, -20),
  shade(T.primary, -25),
  shade(T.secondary, 25),
];

// Util kecil buat menerangkan/menggelapkan warna hex, dipakai supaya ACCENTS tidak monoton
// hanya 2 warna walau groups-nya banyak.
function shade(hex, percent) {
  const num = parseInt(hex, 16);
  let r = (num >> 16) + Math.round((percent / 100) * 255);
  let g = ((num >> 8) & 0x00ff) + Math.round((percent / 100) * 255);
  let b = (num & 0x0000ff) + Math.round((percent / 100) * 255);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0").toUpperCase();
}

// Teks di atas background gelap butuh warna terang, dan sebaliknya - dipakai di title slide
// & header slide detail (yang backgroundnya = primary) supaya tetap terbaca di semua tema (termasuk dark_mode).
function isDark(hex) {
  const num = parseInt(hex, 16);
  const r = num >> 16,
    g = (num >> 8) & 0x00ff,
    b = num & 0x0000ff;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}
const onPrimary = isDark(T.primary) ? "FFFFFF" : "111827";
const onBackground = isDark(T.background) ? "F1F5F9" : T.textColor;
const mutedOnBackground = T.mutedColor;

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDESCREEN", width: 10, height: 5.63 });
pptx.layout = "WIDESCREEN";
pptx.author = "Dora - Doran Todo Assistant";
pptx.title = "Laporan Progres Tim";

// --- Slide 1: Judul ---
const titleSlide = pptx.addSlide();
titleSlide.background = { color: T.background };
titleSlide.addShape(pptx.ShapeType.rect, {
  x: 0,
  y: 0,
  w: 10,
  h: 5.63,
  fill: { color: T.background },
});
titleSlide.addText("Laporan Progres Tim", {
  x: 0.8,
  y: 1.7,
  w: 8.4,
  h: 1.1,
  fontSize: 40,
  bold: true,
  color: onBackground,
  fontFace: T.fontFamily,
});
titleSlide.addText(`Periode: ${periodLabel}`, {
  x: 0.8,
  y: 2.9,
  w: 8.4,
  h: 0.6,
  fontSize: 20,
  color: T.primary,
  fontFace: T.fontFamily,
});
titleSlide.addShape(pptx.ShapeType.rect, {
  x: 0.8,
  y: 3.55,
  w: 1.2,
  h: 0.06,
  fill: { color: T.primary },
});
titleSlide.addText("Disusun otomatis oleh Dora - Doran Todo Assistant", {
  x: 0.8,
  y: 4.9,
  w: 8.4,
  h: 0.4,
  fontSize: 12,
  italic: true,
  color: mutedOnBackground,
  fontFace: T.fontFamily,
});

// --- Slide 2: Ringkasan / List Target ---
const summarySlide = pptx.addSlide();
summarySlide.background = { color: T.background };
summarySlide.addText("List Target", {
  x: 0.6,
  y: 0.35,
  w: 8.8,
  h: 0.6,
  fontSize: 28,
  bold: true,
  color: onBackground,
  fontFace: T.fontFamily,
});

let y = 1.25;
groups.forEach((g, i) => {
  const accent = ACCENTS[i % ACCENTS.length];
  const onAccent = isDark(accent) ? "FFFFFF" : "111827";

  summarySlide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6,
    y,
    w: 1.3,
    h: 0.5,
    rectRadius: 0.08,
    fill: { color: accent },
    line: { color: accent },
  });
  summarySlide.addText(`${g.percentDone}%`, {
    x: 0.6,
    y,
    w: 1.3,
    h: 0.5,
    fontSize: 16,
    bold: true,
    color: onAccent,
    align: "center",
    valign: "middle",
    fontFace: T.fontFamily,
  });

  summarySlide.addText(g.targetName, {
    x: 2.1,
    y,
    w: 6.0,
    h: 0.5,
    fontSize: 17,
    color: onBackground,
    valign: "middle",
    fontFace: T.fontFamily,
  });

  // progress bar tipis di bawah nama, biar tidak monoton cuma teks+badge
  summarySlide.addShape(pptx.ShapeType.rect, {
    x: 2.1,
    y: y + 0.42,
    w: 6.0,
    h: 0.06,
    fill: { color: shade(T.background, isDark(T.background) ? 15 : -8) },
  });
  summarySlide.addShape(pptx.ShapeType.rect, {
    x: 2.1,
    y: y + 0.42,
    w: (6.0 * g.percentDone) / 100,
    h: 0.06,
    fill: { color: accent },
  });

  y += 0.72;
});

// --- Slide detail per target ---
groups.forEach((g, i) => {
  const accent = ACCENTS[i % ACCENTS.length];
  const onAccent = isDark(accent) ? "FFFFFF" : "111827";
  const slide = pptx.addSlide();
  slide.background = { color: T.background };

  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 10,
    h: 0.85,
    fill: { color: accent },
  });
  slide.addText(`${g.targetName}  •  ${g.percentDone}% Selesai`, {
    x: 0.5,
    y: 0,
    w: 9,
    h: 0.85,
    fontSize: 22,
    bold: true,
    color: onAccent,
    valign: "middle",
    fontFace: T.fontFamily,
  });

  slide.addText("Sudah Selesai", {
    x: 0.5,
    y: 1.1,
    w: 4.3,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: T.primary,
    fontFace: T.fontFamily,
  });
  const doneText =
    g.doneTasks && g.doneTasks.length > 0
      ? g.doneTasks.map((t) => ({
          text: `✓  ${t}`,
          options: { breakLine: true, color: onBackground, fontSize: 13 },
        }))
      : [
          {
            text: "Belum ada task selesai di periode ini.",
            options: { italic: true, color: mutedOnBackground, fontSize: 13 },
          },
        ];
  slide.addText(doneText, {
    x: 0.5,
    y: 1.55,
    w: 4.3,
    h: 3.7,
    fontFace: T.fontFamily,
    valign: "top",
  });

  slide.addText("Belum Selesai", {
    x: 5.2,
    y: 1.1,
    w: 4.3,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: T.secondary,
    fontFace: T.fontFamily,
  });
  const pendingText =
    g.pendingTasks && g.pendingTasks.length > 0
      ? g.pendingTasks.map((t) => ({
          text: `○  ${t}`,
          options: { breakLine: true, color: onBackground, fontSize: 13 },
        }))
      : [
          {
            text: "Semua task pada target ini sudah selesai.",
            options: { italic: true, color: mutedOnBackground, fontSize: 13 },
          },
        ];
  slide.addText(pendingText, {
    x: 5.2,
    y: 1.55,
    w: 4.3,
    h: 3.7,
    fontFace: T.fontFamily,
    valign: "top",
  });
});

pptx
  .writeFile({ fileName: outputPath })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
