package api

import (
	"cinema/internal/models"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

const baseURL = "https://api.themoviedb.org/3/movie/"

func FetchMovieDetails(tmdbID string) (*models.Movie, error) {
	apiKey := os.Getenv("TMDB_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("TMDB_API_KEY is missing in environment variables")
	}

	url := fmt.Sprintf("%s%s?api_key=%s&language=en-US", baseURL, tmdbID, apiKey)

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDb API returned status: %d", resp.StatusCode)
	}

	var movie models.Movie
	if err := json.NewDecoder(resp.Body).Decode(&movie); err != nil {
		return nil, err
	}

	return &movie, nil
}
