// backend/mcp/pptxgen-mcp/index.js
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const PptxGenJS = require("pptxgenjs");
const crypto = require("crypto");
const https = require("https");
const http = require("http");

const server = new McpServer({ name: "pptxgen-mcp", version: "1.2.0" });
const presentations = new Map();

function getPresentation(id) {
  const p = presentations.get(id);
  if (!p)
    throw new Error(
      `presentationId '${id}' tidak ditemukan. Panggil create_presentation dulu.`,
    );
  return p;
}

// Ambil gambar dari URL (mis. picsum.photos) dan konversi ke base64 data-URI, supaya
// pptxgenjs bisa embed langsung ke file tanpa bergantung koneksi internet saat file dibuka.
function fetchImageAsDataUri(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(url, { headers: { "User-Agent": "pptxgen-mcp" } }, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          fetchImageAsDataUri(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(
            new Error(`gagal mengunduh gambar (${res.statusCode}): ${url}`),
          );
          return;
        }
        const contentType = res.headers["content-type"] || "image/jpeg";
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const b64 = Buffer.concat(chunks).toString("base64");
          resolve(`data:${contentType};base64,${b64}`);
        });
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

server.tool(
  "create_presentation",
  "Membuat presentasi PowerPoint baru dan mengembalikan presentationId. WAJIB dipanggil pertama kali sebelum tool lain.",
  {
    title: z.string(),
    author: z.string().optional(),
    layout: z.enum(["WIDESCREEN", "STANDARD"]).optional(),
  },
  async ({ title, author, layout }) => {
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "WIDESCREEN", width: 10, height: 5.63 });
    pptx.layout = layout === "STANDARD" ? "LAYOUT_4x3" : "WIDESCREEN";
    pptx.title = title;
    pptx.author = author || "Dora - Doran Todo Assistant";
    const id = crypto.randomUUID();
    presentations.set(id, { pptx, slideCount: 0 });
    return {
      content: [{ type: "text", text: JSON.stringify({ presentationId: id }) }],
    };
  },
);

const textElement = z.object({
  type: z.literal("text"),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  fontSize: z.number().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  color: z.string().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  valign: z.enum(["top", "middle", "bottom"]).optional(),
  fontFace: z.string().optional(),
  bullet: z.boolean().optional(),
  charSpacing: z.number().optional(),
  lineSpacing: z.number().optional(),
  shadow: z
    .boolean()
    .optional()
    .describe(
      "Beri drop shadow tipis pada teks, cocok untuk judul di atas gambar/warna gelap",
    ),
});

const shapeElement = z.object({
  type: z.literal("shape"),
  shapeType: z.enum(["rect", "roundRect", "oval", "line"]),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  fillColor: z.string().optional(),
  lineColor: z.string().optional(),
  transparency: z
    .number()
    .optional()
    .describe(
      "0-100, dipakai untuk overlay gelap transparan di atas gambar supaya teks tetap terbaca",
    ),
  shadow: z
    .boolean()
    .optional()
    .describe(
      "Beri drop shadow tipis, bikin shape terlihat 'mengambang' (elevated)",
    ),
});

const tableElement = z.object({
  type: z.literal("table"),
  rows: z.array(z.array(z.string())),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  hasHeader: z.boolean().optional(),
  headerColor: z.string().optional(),
  fontSize: z.number().optional(),
});

const chartElement = z.object({
  type: z.literal("chart"),
  chartType: z.enum(["bar", "pie", "doughnut", "line"]),
  labels: z
    .array(z.string())
    .describe("Label tiap kategori/slice, mis. nama target"),
  values: z
    .array(z.number())
    .describe("Nilai numerik sejajar dengan labels, mis. percentDone"),
  seriesName: z.string().optional(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  colors: z
    .array(z.string())
    .optional()
    .describe("Hex warna tanpa # per slice/bar, urut sesuai labels"),
  showLegend: z.boolean().optional(),
  showDataLabels: z.boolean().optional(),
});

const imageElement = z.object({
  type: z.literal("image"),
  url: z
    .string()
    .describe(
      "URL gambar publik, mis. dari https://picsum.photos/1600/900 atau https://picsum.photos/seed/{kata-kunci}/1600/900 untuk hasil konsisten",
    ),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

const elementSchema = z.union([
  textElement,
  shapeElement,
  tableElement,
  chartElement,
  imageElement,
]);

async function applyElement(slide, pptx, el) {
  if (el.type === "text") {
    slide.addText(el.text, {
      x: el.x,
      y: el.y,
      w: el.w,
      h: el.h,
      fontSize: el.fontSize || 14,
      bold: !!el.bold,
      italic: !!el.italic,
      color: el.color || "1E293B",
      align: el.align || "left",
      valign: el.valign || "top",
      fontFace: el.fontFace || "Calibri",
      bullet: !!el.bullet,
      charSpacing: el.charSpacing,
      lineSpacing: el.lineSpacing,
      shadow: el.shadow
        ? {
            type: "outer",
            color: "000000",
            opacity: 0.35,
            blur: 3,
            offset: 2,
            angle: 45,
          }
        : undefined,
    });
  } else if (el.type === "shape") {
    const map = {
      rect: pptx.ShapeType.rect,
      roundRect: pptx.ShapeType.roundRect,
      oval: pptx.ShapeType.ellipse,
      line: pptx.ShapeType.line,
    };
    slide.addShape(map[el.shapeType], {
      x: el.x,
      y: el.y,
      w: el.w,
      h: el.h,
      fill: el.fillColor
        ? { color: el.fillColor, transparency: el.transparency || 0 }
        : undefined,
      line: el.lineColor ? { color: el.lineColor } : undefined,
      shadow: el.shadow
        ? {
            type: "outer",
            color: "000000",
            opacity: 0.25,
            blur: 6,
            offset: 3,
            angle: 45,
          }
        : undefined,
    });
  } else if (el.type === "table") {
    const tableRows = el.rows.map((row, ri) =>
      row.map((cell) => ({
        text: cell,
        options:
          el.hasHeader && ri === 0
            ? {
                bold: true,
                color: "FFFFFF",
                fill: { color: el.headerColor || "1E293B" },
                fontSize: el.fontSize || 12,
              }
            : { fontSize: el.fontSize || 12, color: "1E293B" },
      })),
    );
    slide.addTable(tableRows, { x: el.x, y: el.y, w: el.w, autoPage: false });
  } else if (el.type === "chart") {
    const chartTypeMap = {
      bar: pptx.ChartType.bar,
      pie: pptx.ChartType.pie,
      doughnut: pptx.ChartType.doughnut,
      line: pptx.ChartType.line,
    };
    const chartData = [
      { name: el.seriesName || "Data", labels: el.labels, values: el.values },
    ];
    slide.addChart(chartTypeMap[el.chartType], chartData, {
      x: el.x,
      y: el.y,
      w: el.w,
      h: el.h,
      showLegend: el.showLegend !== false,
      showValue: !!el.showDataLabels,
      chartColors: el.colors && el.colors.length ? el.colors : undefined,
      legendPos: "b",
    });
  } else if (el.type === "image") {
    const dataUri = await fetchImageAsDataUri(el.url);
    slide.addImage({ data: dataUri, x: el.x, y: el.y, w: el.w, h: el.h });
  }
}

server.tool(
  "build_slide",
  "Membuat SATU slide baru berikut SEMUA elemennya (teks, shape, tabel, chart, image) dalam SATU panggilan. " +
    "WAJIB dipakai untuk membangun slide - JANGAN pisah jadi tool terpisah per elemen. Elemen digambar berurutan " +
    "sesuai urutan array (elemen belakangan menimpa/tumpang tindih elemen depan - manfaatkan untuk overlay). " +
    "Kanvas WIDESCREEN 10 x 5.63 inch, x/y/w/h dalam inch.",
  {
    presentationId: z.string(),
    backgroundColor: z
      .string()
      .optional()
      .describe(
        "hex tanpa # mis. 'FFFFFF', default putih. Diabaikan kalau ada elemen image full-bleed.",
      ),
    elements: z.array(elementSchema),
  },
  async ({ presentationId, backgroundColor, elements }) => {
    const p = getPresentation(presentationId);
    const slide = p.pptx.addSlide();
    if (backgroundColor) slide.background = { color: backgroundColor };
    for (const el of elements) {
      await applyElement(slide, p.pptx, el);
    }
    const slideIndex = p.slideCount;
    p.slideCount += 1;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ slideIndex, elementsAdded: elements.length }),
        },
      ],
    };
  },
);

server.tool(
  "save_presentation",
  "Menyimpan presentasi ke file .pptx di disk dan mengembalikan outputPath. WAJIB dipanggil terakhir setelah semua slide dibuat.",
  {
    presentationId: z.string(),
    outputPath: z.string(),
  },
  async ({ presentationId, outputPath }) => {
    const p = getPresentation(presentationId);
    await p.pptx.writeFile({ fileName: outputPath });
    presentations.delete(presentationId);
    return {
      content: [{ type: "text", text: JSON.stringify({ outputPath }) }],
    };
  },
);

const transport = new StdioServerTransport();
server.connect(transport);
