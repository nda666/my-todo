package main

import (
	"context"
	"log"
	"net/http"
	"strings"

	"golang-todo/internal/auth"
	"golang-todo/internal/config"
	"golang-todo/internal/database"
	"golang-todo/internal/graph"

	"github.com/graphql-go/handler"
	"github.com/rs/cors"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	authService := auth.NewService(db, cfg)
	schema, err := graph.NewSchema(db, authService)
	if err != nil {
		log.Fatalf("graphql schema: %v", err)
	}

	h := handler.New(&handler.Config{
		Schema:   &schema.Schema,
		Pretty:   true,
		GraphiQL: true,
	})

	http.Handle("/query", authMiddleware(authService, h))

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://127.0.0.1:5173"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})

	port := cfg.ServerPort
	log.Printf("server running on http://localhost:%s/query", port)
	log.Fatal(http.ListenAndServe(":"+port, c.Handler(http.DefaultServeMux)))
}

func authMiddleware(authService *auth.Service, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		header := r.Header.Get("Authorization")
		if strings.HasPrefix(header, "Bearer ") {
			token := strings.TrimPrefix(header, "Bearer ")
			if claims, err := authService.ParseToken(token); err == nil {
				ctx = context.WithValue(ctx, auth.UserContextKey, claims)
			}
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
