package service

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"time"
)

type EpayAuth struct {
	AccessToken  string `json:"access_token"`
	ExpiresIn    string `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
	TokenType    string `json:"token_type"`
}

func epayOAuthURL() string {
	if os.Getenv("EPAY_ENV") == "prod" {
		return "https://epay-oauth.homebank.kz/oauth2/token"
	}
	return "https://testoauth.homebank.kz/epay2/oauth2/token"
}

func RandomSecretHash() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func GetEpayToken(invoiceID string, amount float64, currency string, secretHash string) (*EpayAuth, error) {
	clientID := os.Getenv("EPAY_CLIENT_ID")
	clientSecret := os.Getenv("EPAY_CLIENT_SECRET")
	terminal := os.Getenv("EPAY_TERMINAL_ID")
	if clientID == "" || clientSecret == "" || terminal == "" {
		return nil, fmt.Errorf("missing EPAY env vars: EPAY_CLIENT_ID/EPAY_CLIENT_SECRET/EPAY_TERMINAL_ID")
	}

	form := url.Values{}
	form.Set("grant_type", "client_credentials")
	form.Set("scope", "payment")
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)
	form.Set("invoiceID", invoiceID)
	form.Set("secret_hash", secretHash)
	form.Set("amount", fmt.Sprintf("%.0f", amount))
	form.Set("curency", currency)
	form.Set("terminal", terminal)

	req, _ := http.NewRequest("POST", epayOAuthURL(), bytes.NewBufferString(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	httpClient := &http.Client{Timeout: 20 * time.Second}
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		var b bytes.Buffer
		_, _ = b.ReadFrom(resp.Body)
		return nil, fmt.Errorf("epay oauth error: %s: %s", resp.Status, b.String())
	}

	var auth EpayAuth
	if err := json.NewDecoder(resp.Body).Decode(&auth); err != nil {
		return nil, err
	}
	return &auth, nil
}

type EpayWidgetPaymentObject struct {
	InvoiceId       string    `json:"invoiceId"`
	InvoiceIdAlt    string    `json:"invoiceIdAlt,omitempty"`
	BackLink        string    `json:"backLink"`
	FailureBackLink string    `json:"failureBackLink"`
	PostLink        string    `json:"postLink"`
	FailurePostLink string    `json:"failurePostLink"`
	Language        string    `json:"language"`
	Description     string    `json:"description"`
	AccountId       string    `json:"accountId,omitempty"`
	Terminal        string    `json:"terminal"`
	Amount          float64   `json:"amount"`
	Currency        string    `json:"currency"`
	Name            string    `json:"name,omitempty"`
	Data            string    `json:"data,omitempty"`
	Auth            *EpayAuth `json:"auth"`
}

func BuildWidgetPaymentObject(auth *EpayAuth, invoiceID string, amount float64, currency string) (*EpayWidgetPaymentObject, error) {
	baseURL := os.Getenv("APP_BASE_URL")
	terminal := os.Getenv("EPAY_TERMINAL_ID")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}

	return &EpayWidgetPaymentObject{
		InvoiceId:       invoiceID,
		InvoiceIdAlt:    invoiceID,
		BackLink:        baseURL + "/static/pages/success.html",
		FailureBackLink: baseURL + "/static/pages/failure.html",
		PostLink:        baseURL + "/pay/callback",
		FailurePostLink: baseURL + "/pay/failure",
		Language:        "RUS",
		Description:     "CinemaGo booking payment",
		Terminal:        terminal,
		Amount:          amount,
		Currency:        currency,
		Auth:            auth,
	}, nil
}
