package reportgen

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"time"

	"golang-todo/internal/libs/ai"
)

type reportPayload struct {
	PeriodLabel string           `json:"periodLabel"`
	Groups      []ai.ReportGroup `json:"groups"`
}

// scriptPath dan nodeBin bisa dioverride lewat env var kalau perlu.
var scriptPath = envOr("PPTXGEN_SCRIPT_PATH", "scripts/pptxgen/generate.js")
var nodeBin = envOr("NODE_BIN_PATH", "node")

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// Generate menulis data ke file JSON sementara, memanggil Node.js (generate.js
// yang pakai PptxGenJS) untuk membuat file .pptx, lalu mengembalikan path file hasilnya.
func Generate(periodLabel string, groups []ai.ReportGroup) (string, error) {
	payload := reportPayload{PeriodLabel: periodLabel, Groups: groups}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("gagal menyiapkan data laporan: %w", err)
	}

	inputPath := fmt.Sprintf("/tmp/report-input-%d.json", time.Now().UnixNano())
	outputPath := fmt.Sprintf("/tmp/report-output-%d.pptx", time.Now().UnixNano())

	if err := os.WriteFile(inputPath, raw, 0644); err != nil {
		return "", fmt.Errorf("gagal menulis file input: %w", err)
	}
	defer os.Remove(inputPath)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, nodeBin, scriptPath, inputPath, outputPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		os.Remove(outputPath)
		return "", fmt.Errorf("gagal menjalankan generator PPT: %w (output: %s)", err, string(output))
	}

	if _, statErr := os.Stat(outputPath); statErr != nil {
		return "", fmt.Errorf("file presentasi tidak berhasil dibuat")
	}

	return outputPath, nil
}
