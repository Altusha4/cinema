// internal/api/ai_chat.go
package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"cinema/internal/models"
)

const cinemaGoSystemPrompt = `
You are “CinemaGo AI Assistant”, a helper for the CinemaGo web app.

STRICT SCOPE RULES:
- Use ONLY the provided CINEMAGO_CONTEXT (cinemas, movies, sessions, prices).
- Do NOT invent cinemas, movies, sessions, dates, prices, halls, seats, or promos.
- If user requests something unavailable, say it is not available and offer alternatives from context.
- If missing info, ask a short clarifying question.

YOU CAN:
- Recommend movies ONLY from available_movies.
- Suggest sessions ONLY from sessions list.
- Explain how to book and student discount (20%) if present in context.

STYLE:
- Short, friendly, actionable.
- Use bullet points.
- Ask 1 follow-up question if needed.
`

type AIChatRequest struct {
	Message string `json:"message"`
}

type AIChatResponse struct {
	Reply string `json:"reply"`
}

// Minimal parsing for Responses API
type openAIResponse struct {
	Output []struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	} `json:"output"`
}

// POST /ai/chat
// Body: {"message":"..."}
func AIChatHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AIChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Message) == "" {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		http.Error(w, "OPENAI_API_KEY is not set", http.StatusInternalServerError)
		return
	}

	model := os.Getenv("OPENAI_MODEL")
	if model == "" {
		model = "gpt-4.1-mini"
	}

	// ✅ Build real context from your Mongo sessions
	ctxText, err := buildCinemaGoContext()
	if err != nil {
		http.Error(w, "context error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Final prompt given to the model
	finalPrompt := strings.TrimSpace(cinemaGoSystemPrompt) +
		"\n\n" + ctxText +
		"\n\nUSER QUESTION:\n" + strings.TrimSpace(req.Message)

	reply, err := callOpenAIResponses(apiKey, model, finalPrompt)
	if err != nil {
		http.Error(w, "ai error: "+err.Error(), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(AIChatResponse{Reply: reply})
}

func callOpenAIResponses(apiKey, model, userPrompt string) (string, error) {
	payload := map[string]any{
		"model": model,
		"input": []any{
			map[string]any{
				"role": "developer",
				"content": []any{
					map[string]any{
						"type": "input_text",
						"text": "Follow the provided CINEMAGO_CONTEXT strictly. Do not invent facts.",
					},
				},
			},
			map[string]any{
				"role": "user",
				"content": []any{
					map[string]any{
						"type": "input_text",
						"text": userPrompt,
					},
				},
			},
		},
	}

	b, _ := json.Marshal(payload)

	client := &http.Client{Timeout: 25 * time.Second}
	httpReq, _ := http.NewRequest("POST", "https://api.openai.com/v1/responses", bytes.NewBuffer(b))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		// show response body to understand error quickly
		return "", errors.New(string(body))
	}

	var parsed openAIResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return "", err
	}

	var out strings.Builder
	for _, o := range parsed.Output {
		for _, c := range o.Content {
			if c.Type == "output_text" && c.Text != "" {
				out.WriteString(c.Text)
			}
		}
	}

	s := strings.TrimSpace(out.String())
	if s == "" {
		s = "Sorry, I couldn't generate a reply."
	}
	return s, nil
}

// Builds strict context from your DB sessions.
// Requires: models.GetAllSessionsMongo() implemented.
func buildCinemaGoContext() (string, error) {
	sessions, err := models.GetAllSessionsMongo()
	if err != nil {
		return "", err
	}

	cinemaSet := map[string]bool{}
	movieSet := map[string]bool{}

	for _, s := range sessions {
		if strings.TrimSpace(s.CinemaName) != "" {
			cinemaSet[s.CinemaName] = true
		}
		if strings.TrimSpace(s.MovieTitle) != "" {
			movieSet[s.MovieTitle] = true
		}
	}

	cinemas := make([]string, 0, len(cinemaSet))
	for c := range cinemaSet {
		cinemas = append(cinemas, c)
	}
	sort.Strings(cinemas)

	movies := make([]string, 0, len(movieSet))
	for m := range movieSet {
		movies = append(movies, m)
	}
	sort.Strings(movies)

	var b strings.Builder
	b.WriteString("CINEMAGO_CONTEXT (truth source):\n")
	b.WriteString("cinemas: " + fmt.Sprintf("%v", cinemas) + "\n")
	b.WriteString("available_movies: " + fmt.Sprintf("%v", movies) + "\n")
	b.WriteString("sessions:\n")

	for _, s := range sessions {
		b.WriteString(fmt.Sprintf("- session_id: %d\n", s.ID))
		b.WriteString(fmt.Sprintf("  movie: %q\n", s.MovieTitle))
		b.WriteString(fmt.Sprintf("  cinema: %q\n", s.CinemaName))
		b.WriteString(fmt.Sprintf("  hall: %q\n", s.Hall))
		b.WriteString(fmt.Sprintf("  datetime: %q\n", s.StartTime.Format(time.RFC3339)))
		b.WriteString(fmt.Sprintf("  base_price: %v\n", s.BasePrice))
		b.WriteString(fmt.Sprintf("  available_seats: %v\n", len(s.AvailableSeats)))
	}

	b.WriteString("discounts:\n- student_discount: 20%\n")
	b.WriteString("booking_rules:\n- age_limit: 18+\n- seat_required: yes\n")

	return b.String(), nil
}
