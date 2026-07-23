package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Client interface {
	Complete(ctx context.Context, messages []ChatMessage) (string, error)
}

// openAICompatClient adalah client generik untuk API yang mengikuti format OpenAI
// chat completions (dipakai baik oleh NVIDIA NIM maupun OpenRouter).
type openAICompatClient struct {
	baseURL string
	apiKey  string
	model   string
	http    *http.Client
}

type chatRequest struct {
	Model    string        `json:"model"`
	Messages []ChatMessage `json:"messages"`
}

type chatResponse struct {
	Choices []struct {
		Message ChatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (c *openAICompatClient) Complete(ctx context.Context, messages []ChatMessage) (string, error) {
	if b, err := json.MarshalIndent(messages, "", "  "); err == nil {
		fmt.Printf("Chat messages:\n%s\n", b)
	}

	payload, err := json.Marshal(chatRequest{Model: c.model, Messages: messages})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if result.Error != nil {
		return "", fmt.Errorf("ai provider error: %s", result.Error.Message)
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("ai provider returned no choices")
	}
	return result.Choices[0].Message.Content, nil
}

func NewNimClient(apiKey, model string) Client {
	return &openAICompatClient{
		baseURL: "https://integrate.api.nvidia.com/v1",
		apiKey:  apiKey,
		model:   model,
		http:    &http.Client{},
	}
}

func NewOpenRouterClient(apiKey, model string) Client {
	return &openAICompatClient{
		baseURL: "https://openrouter.ai/api/v1",
		apiKey:  apiKey,
		model:   model,
		http:    &http.Client{},
	}
}

// FallbackClient mencoba provider utama dulu, kalau gagal baru coba provider cadangan.
type FallbackClient struct {
	Primary   Client
	Secondary Client
}

func (f *FallbackClient) Complete(ctx context.Context, messages []ChatMessage) (string, error) {
	reply, err := f.Primary.Complete(ctx, messages)
	if err == nil {
		return reply, nil
	}
	if f.Secondary == nil {
		return "", err
	}
	return f.Secondary.Complete(ctx, messages)
}
