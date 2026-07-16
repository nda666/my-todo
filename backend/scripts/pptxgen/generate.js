const fs = require("fs");
const PptxGenJS = require("pptxgenjs");

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error("Usage: node generate.js <input.json> <output.pptx>");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
const { periodLabel, groups } = data;

const ACCENTS = ["2563EB", "059669", "D97706", "DB2777", "7C3AED", "0891B2"];

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDESCREEN", width: 10, height: 5.63 });
pptx.layout = "WIDESCREEN";
pptx.author = "Dora - Doran Todo Assistant";
pptx.title = "Laporan Progres Tim";

// --- Slide 1: Judul ---
const titleSlide = pptx.addSlide();
titleSlide.background = { color: "1E293B" };
titleSlide.addText("Laporan Progres Tim", {
  x: 0.8,
  y: 1.7,
  w: 8.4,
  h: 1.1,
  fontSize: 40,
  bold: true,
  color: "FFFFFF",
  fontFace: "Calibri",
});
titleSlide.addText(`Periode: ${periodLabel}`, {
  x: 0.8,
  y: 2.9,
  w: 8.4,
  h: 0.6,
  fontSize: 20,
  color: "93C5FD",
  fontFace: "Calibri",
});
titleSlide.addShape(pptx.ShapeType.rect, {
  x: 0.8,
  y: 3.55,
  w: 1.2,
  h: 0.06,
  fill: { color: "2563EB" },
});
titleSlide.addText("Disusun otomatis oleh Dora - Doran Todo Assistant", {
  x: 0.8,
  y: 4.9,
  w: 8.4,
  h: 0.4,
  fontSize: 12,
  italic: true,
  color: "64748B",
  fontFace: "Calibri",
});

// --- Slide 2: Ringkasan / List Target ---
const summarySlide = pptx.addSlide();
summarySlide.background = { color: "FFFFFF" };
summarySlide.addText("List Target", {
  x: 0.6,
  y: 0.35,
  w: 8.8,
  h: 0.6,
  fontSize: 28,
  bold: true,
  color: "1E293B",
  fontFace: "Calibri",
});

let y = 1.25;
groups.forEach((g, i) => {
  const accent = ACCENTS[i % ACCENTS.length];

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
    color: "FFFFFF",
    align: "center",
    valign: "middle",
    fontFace: "Calibri",
  });

  summarySlide.addText(g.targetName, {
    x: 2.1,
    y,
    w: 6.0,
    h: 0.5,
    fontSize: 17,
    color: "334155",
    valign: "middle",
    fontFace: "Calibri",
  });

  // progress bar tipis di bawah nama, biar tidak monoton cuma teks+badge
  summarySlide.addShape(pptx.ShapeType.rect, {
    x: 2.1,
    y: y + 0.42,
    w: 6.0,
    h: 0.06,
    fill: { color: "E2E8F0" },
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
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };

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
    color: "FFFFFF",
    valign: "middle",
    fontFace: "Calibri",
  });

  slide.addText("Sudah Selesai", {
    x: 0.5,
    y: 1.1,
    w: 4.3,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: "059669",
    fontFace: "Calibri",
  });
  const doneText =
    g.doneTasks && g.doneTasks.length > 0
      ? g.doneTasks.map((t) => ({
          text: `✓  ${t}`,
          options: { breakLine: true, color: "334155", fontSize: 13 },
        }))
      : [
          {
            text: "Belum ada task selesai di periode ini.",
            options: { italic: true, color: "94A3B8", fontSize: 13 },
          },
        ];
  slide.addText(doneText, {
    x: 0.5,
    y: 1.55,
    w: 4.3,
    h: 3.7,
    fontFace: "Calibri",
    valign: "top",
  });

  slide.addText("Belum Selesai", {
    x: 5.2,
    y: 1.1,
    w: 4.3,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: "D97706",
    fontFace: "Calibri",
  });
  const pendingText =
    g.pendingTasks && g.pendingTasks.length > 0
      ? g.pendingTasks.map((t) => ({
          text: `○  ${t}`,
          options: { breakLine: true, color: "334155", fontSize: 13 },
        }))
      : [
          {
            text: "Semua task pada target ini sudah selesai.",
            options: { italic: true, color: "94A3B8", fontSize: 13 },
          },
        ];
  slide.addText(pendingText, {
    x: 5.2,
    y: 1.55,
    w: 4.3,
    h: 3.7,
    fontFace: "Calibri",
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
