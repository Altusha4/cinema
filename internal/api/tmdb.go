package api

import (
    "fmt"
    "cinema/internal/models"
)

// FetchMovieDetails retrieves posters and trailers from TMDb API
func FetchMovieDetails(tmdbID string) (*models.Movie, error) {
    // This is a skeleton for Assignment 3
    fmt.Printf("Fetching data for movie ID: %s from TMDb...\n", tmdbID)
    
    // In Milestone 2, we will implement actual http.Get requests
    return &models.Movie{
        TMDBID: tmdbID,
        Title:  "Sample Movie from API",
    }, nil
}