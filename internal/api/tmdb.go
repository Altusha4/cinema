package api

import (
	"cinema/internal/models"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
)

const (
	baseURL   = "https://api.themoviedb.org/3/movie/"
	searchURL = "https://api.themoviedb.org/3/search/movie"
)

func FetchMovieDetails(tmdbID string) (*models.Movie, error) {
	apiKey := os.Getenv("TMDB_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("TMDB_API_KEY is missing")
	}

	apiURL := fmt.Sprintf("%s%s?api_key=%s&language=en-US", baseURL, tmdbID, apiKey)

	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var movie models.Movie
	if err := json.NewDecoder(resp.Body).Decode(&movie); err != nil {
		return nil, err
	}

	return &movie, nil
}

func SearchMovieByName(title string) (*models.Movie, error) {
	apiKey := os.Getenv("TMDB_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("TMDB_API_KEY is missing")
	}

	safeTitle := url.QueryEscape(title)
	apiURL := fmt.Sprintf("%s?api_key=%s&query=%s&language=en-US", searchURL, apiKey, safeTitle)

	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var searchResult struct {
		Results []models.Movie `json:"results"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&searchResult); err != nil {
		return nil, err
	}

	if len(searchResult.Results) == 0 {
		return nil, fmt.Errorf("movie not found")
	}

	return &searchResult.Results[0], nil
}
