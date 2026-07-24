// backend/internal/libs/reportgen/pptx.go
package reportgen

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"golang-todo/internal/libs/ai"
	"golang-todo/internal/libs/mcpclient"
)

var mcpServerScript = envOr("PPTXGEN_MCP_SCRIPT", "scripts/pptxgen-mcp/index.js")
var nodeBin = envOr("NODE_BIN_PATH", "node")

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// backend/internal/libs/reportgen/pptx.go — hanya bagian pptxTools & systemPrompt yang berubah, sisanya (Generate, envOr, dst) tetap
// backend/internal/libs/reportgen/pptx.go — hanya pptxTools[1] (build_slide) & systemPrompt yang berubah, sisanya (Generate, envOr, dst) tetap
var pptxTools = []ai.ToolDef{
	{
		Name:        "create_presentation",
		Description: "Membuat presentasi PowerPoint baru dan mengembalikan presentationId. WAJIB dipanggil pertama kali.",
		Parameters: json.RawMessage(`{"type":"object","properties":{
			"title":{"type":"string"},"author":{"type":"string"},
			"layout":{"type":"string","enum":["WIDESCREEN","STANDARD"]}
		},"required":["title"]}`),
	},
	{
		Name: "build_slide",
		Description: "Membuat SATU slide baru berikut SEMUA elemennya (teks, shape, tabel, chart, image) dalam SATU panggilan. " +
			"Elemen digambar berurutan sesuai array (elemen belakangan menimpa yang depan - manfaatkan untuk overlay gambar+shape " +
			"transparan+teks). Kanvas WIDESCREEN 10 x 5.63 inch, x/y/w/h dalam inch.",
		Parameters: json.RawMessage(`{"type":"object","properties":{
			"presentationId":{"type":"string"},
			"backgroundColor":{"type":"string","description":"hex tanpa #, default putih"},
			"elements":{"type":"array","items":{
				"type":"object",
				"properties":{
					"type":{"type":"string","enum":["text","shape","table","chart","image"]},
					"text":{"type":"string"},
					"shapeType":{"type":"string","enum":["rect","roundRect","oval","line"]},
					"rows":{"type":"array","items":{"type":"array","items":{"type":"string"}}},
					"chartType":{"type":"string","enum":["bar","pie","doughnut","line"]},
					"labels":{"type":"array","items":{"type":"string"}},
					"values":{"type":"array","items":{"type":"number"}},
					"seriesName":{"type":"string"},
					"colors":{"type":"array","items":{"type":"string"},"description":"hex tanpa # per slice/bar"},
					"showLegend":{"type":"boolean"},"showDataLabels":{"type":"boolean"},
					"url":{"type":"string","description":"URL gambar publik, mis. https://picsum.photos/1600/900 atau https://picsum.photos/seed/{kata-kunci}/1600/900"},
					"x":{"type":"number"},"y":{"type":"number"},"w":{"type":"number"},"h":{"type":"number"},
					"fontSize":{"type":"number"},"bold":{"type":"boolean"},"italic":{"type":"boolean"},
					"color":{"type":"string"},"align":{"type":"string","enum":["left","center","right"]},
					"valign":{"type":"string","enum":["top","middle","bottom"]},"fontFace":{"type":"string"},
					"bullet":{"type":"boolean"},"charSpacing":{"type":"number"},"lineSpacing":{"type":"number"},
					"shadow":{"type":"boolean"},
					"fillColor":{"type":"string"},"lineColor":{"type":"string"},"transparency":{"type":"number"},
					"hasHeader":{"type":"boolean"},"headerColor":{"type":"string"}
				},
				"required":["type"]
			}}
		},"required":["presentationId","elements"]}`),
	},
	{
		Name:        "save_presentation",
		Description: "Menyimpan presentasi ke file .pptx. WAJIB dipanggil terakhir setelah semua slide dibuat.",
		Parameters: json.RawMessage(`{"type":"object","properties":{
			"presentationId":{"type":"string"},"outputPath":{"type":"string"}
		},"required":["presentationId","outputPath"]}`),
	},
}

// Generate menjalankan agent loop: AI (agenticClient) merancang & membangun presentasi
// SENDIRI dengan memanggil tools MCP pptxgen satu per satu (bukan mengisi template
// statis lagi), lalu menyimpannya sebagai file .pptx.
func Generate(ctx context.Context, agenticClient *ai.AgenticClient, periodLabel string, groups []ai.ReportGroup, styleNotes string) (string, error) {
	log.Printf("[ReportGen] Generate called — period=%s groups=%d styleNotes=%q", periodLabel, len(groups), styleNotes)

	mcp, err := mcpclient.Start(ctx, nodeBin, mcpServerScript)
	if err != nil {
		log.Printf("[ReportGen] ERROR starting MCP pptxgen: %v", err)
		return "", fmt.Errorf("gagal menjalankan MCP pptxgen: %w", err)
	}
	log.Printf("[ReportGen] MCP pptxgen started successfully")
	defer mcp.Close()

	groupsJSON, err := json.MarshalIndent(groups, "", "  ")
	if err != nil {
		log.Printf("[ReportGen] ERROR marshal groups: %v", err)
		return "", err
	}

	outputPath := fmt.Sprintf("/tmp/report-output-%d.pptx", time.Now().UnixNano())
	log.Printf("[ReportGen] outputPath=%s", outputPath)

	styleInstruction := "Tidak ada preferensi desain spesifik dari user - gunakan gaya korporat yang bersih, profesional, dan mudah dibaca (jangan norak/terlalu ramai warna)."
	if styleNotes != "" {
		styleInstruction = fmt.Sprintf("Preferensi desain dari user: %q. Ikuti preferensi ini semaksimal mungkin (pemilihan warna, jumlah warna, mood keseluruhan).", styleNotes)
	}
	log.Printf("[ReportGen] styleInstruction=%s", styleInstruction)

	// backend/internal/libs/reportgen/pptx.go — bagian systemPrompt di Generate(), sisanya di fungsi ini tetap
	// backend/internal/libs/reportgen/pptx.go — bagian systemPrompt di Generate(), sisanya di fungsi ini tetap
	systemPrompt := "Kamu adalah seorang presentation designer profesional papan atas (setara desainer di McKinsey/Apple keynote). " +
		"Kamu punya akses tools: create_presentation, build_slide, save_presentation. Hasil akhir HARUS terlihat seperti " +
		"presentasi profesional buatan manusia, BUKAN slide default bullet-point putih polos.\n" +
		"ALUR WAJIB:\n" +
		"1. Panggil create_presentation SEKALI di awal.\n" +
		"2. Untuk SETIAP slide, panggil build_slide SATU KALI berisi SEMUA elemen slide itu sekaligus.\n" +
		"3. Boleh memanggil build_slide untuk beberapa slide berbeda dalam satu giliran (parallel tool calls) untuk hemat kuota - " +
		"targetkan total giliran sesedikit mungkin (idealnya 2-3 giliran: create_presentation, semua build_slide sekaligus, save_presentation).\n" +
		"4. Akhiri dengan save_presentation persis dengan outputPath yang diberikan.\n\n" +
		"TEKNIK DESAIN PROFESIONAL YANG WAJIB DIPAKAI (jangan cuma teks+bullet putih polos):\n" +
		"- Slide judul (cover): WAJIB pakai elemen 'image' full-bleed sebagai background (x:0,y:0,w:10,h:5.63) memakai URL " +
		"https://picsum.photos/seed/{kata-kunci-relevan-topik}/1600/900, lalu timpa dengan elemen 'shape' rect gelap semi-transparan " +
		"(fillColor gelap sesuai tema, transparency 35-55) menutupi seluruh slide supaya judul tetap kontras, baru elemen 'text' " +
		"judul di atasnya (pakai shadow:true karena di atas foto).\n" +
		"- Slide ringkasan/progres: WAJIB pakai elemen 'chart' (bar atau doughnut) untuk memvisualkan percentDone per target, " +
		"jangan hanya angka teks - chart jauh lebih profesional untuk data numerik berulang.\n" +
		"- Pakai accent bar (shape rect tipis, tinggi 0.05-0.08 inch) sebagai pemisah visual antara header dan body tiap slide.\n" +
		"- Selaraskan elemen ke grid konsisten (mis. margin kiri 0.5 atau 0.6 inch di semua slide, bukan angka acak tiap slide).\n" +
		"- Beri whitespace cukup - jangan penuhi seluruh slide dengan teks, biarkan ada ruang kosong yang disengaja.\n" +
		"- Variasikan layout antar slide (jangan semua slide numpuk teks kiri rata seperti dokumen Word) - kombinasikan card/box, " +
		"kolom kiri-kanan, angka besar sebagai statistik hero, dst.\n" +
		"- Konsisten: pakai palet 2-3 warna yang sama di semua slide (bukan warna beda tiap slide), font family yang sama.\n" +
		"- Kanvas WIDESCREEN 10 x 5.63 inch - pastikan semua elemen (x+w<=10, y+h<=5.63) tidak keluar batas/tumpang tindih secara tidak sengaja.\n" +
		"- Minimal: 1 slide judul (dengan background image), 1 slide ringkasan dengan chart, 1+ slide detail per target/grup " +
		"(kalau target >5, gabungkan beberapa target sejenis per slide detail supaya total slide terkendali).\n" +
		"- " + styleInstruction + "\n" +
		"Jangan menjelaskan rencana dalam teks - langsung eksekusi lewat tool calls."

	userPrompt := fmt.Sprintf(
		"Buatkan laporan progres tim periode %s dalam format .pptx. Simpan hasil akhir ke outputPath: %s\n\nData progres (JSON):\n%s",
		periodLabel, outputPath, string(groupsJSON),
	)

	log.Printf("[ReportGen] Starting agent loop — period=%s", periodLabel)

	executor := func(ctx context.Context, name string, argsJSON string) (string, error) {
		return mcp.CallTool(ctx, name, json.RawMessage(argsJSON))
	}
	result, err := agenticClient.RunAgentLoop(ctx, systemPrompt, userPrompt, pptxTools, executor, "save_presentation", 40)
	if err != nil {
		log.Printf("[ReportGen] ERROR agent loop failed: %v", err)
		return "", fmt.Errorf("gagal membangun presentasi: %w", err)
	}
	log.Printf("[ReportGen] Agent loop completed successfully")

	var parsed struct {
		OutputPath string `json:"outputPath"`
	}
	if jsonErr := json.Unmarshal([]byte(result), &parsed); jsonErr != nil || parsed.OutputPath == "" {
		if _, statErr := os.Stat(outputPath); statErr == nil {
			log.Printf("[ReportGen] Using fallback outputPath=%s", outputPath)
			return outputPath, nil
		}
		log.Printf("[ReportGen] ERROR reading output path from result: %v", jsonErr)
		return "", fmt.Errorf("gagal membaca path presentasi hasil: %v", jsonErr)
	}

	if _, statErr := os.Stat(parsed.OutputPath); statErr != nil {
		log.Printf("[ReportGen] ERROR file not found at %s: %v", parsed.OutputPath, statErr)
		return "", fmt.Errorf("file presentasi tidak ditemukan di %s", parsed.OutputPath)
	}

	log.Printf("[ReportGen] SUCCESS — presentation saved to %s", parsed.OutputPath)
	return parsed.OutputPath, nil
}
