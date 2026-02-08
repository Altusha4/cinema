package service

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"os"
	"strings"
	"time"
)

func SendEmail(to, subject, body string) error {
	host := strings.TrimSpace(os.Getenv("SMTP_HOST"))
	port := strings.TrimSpace(os.Getenv("SMTP_PORT"))
	user := strings.TrimSpace(os.Getenv("SMTP_USER"))
	pass := strings.TrimSpace(os.Getenv("SMTP_PASS"))

	if host == "" || port == "" || user == "" || pass == "" {
		return fmt.Errorf("missing SMTP env vars: SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS")
	}

	addr := net.JoinHostPort(host, port)

	// message
	msg := strings.Join([]string{
		"From: " + user,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		body,
		"",
	}, "\r\n")

	// connect
	dialer := net.Dialer{Timeout: 20 * time.Second}
	conn, err := dialer.Dial("tcp", addr)
	if err != nil {
		return fmt.Errorf("dial smtp: %w", err)
	}

	c, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("smtp client: %w", err)
	}
	defer c.Close()

	// STARTTLS (как в Python starttls)
	if ok, _ := c.Extension("STARTTLS"); ok {
		if err := c.StartTLS(&tls.Config{ServerName: host}); err != nil {
			return fmt.Errorf("starttls: %w", err)
		}
	} else {
		return fmt.Errorf("server does not support STARTTLS")
	}

	// AUTH PLAIN (для Gmail app password)
	auth := smtp.PlainAuth("", user, pass, host)
	if ok, _ := c.Extension("AUTH"); ok {
		if err := c.Auth(auth); err != nil {
			return fmt.Errorf("auth: %w", err)
		}
	} else {
		return fmt.Errorf("server does not support AUTH")
	}

	// send
	if err := c.Mail(user); err != nil {
		return fmt.Errorf("mail from: %w", err)
	}
	if err := c.Rcpt(to); err != nil {
		return fmt.Errorf("rcpt to: %w", err)
	}

	w, err := c.Data()
	if err != nil {
		return fmt.Errorf("data: %w", err)
	}
	if _, err := w.Write([]byte(msg)); err != nil {
		_ = w.Close()
		return fmt.Errorf("write: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("close: %w", err)
	}

	return c.Quit()
}
