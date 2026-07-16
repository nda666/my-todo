package graph

import (
	"fmt"

	"golang-todo/internal/auth"
	"golang-todo/internal/libs/ai"
	"golang-todo/internal/repository"

	"github.com/graphql-go/graphql"
)

type Schema struct {
	Schema graphql.Schema
}

func NewSchema(repos *repository.Repositories, authService *auth.Service, aiClient ai.Client, projectPolicy *auth.ProjectPolicy) (*Schema, error) {
	t := buildTypes()
	rootQuery := graphql.NewObject(graphql.ObjectConfig{Name: "Query", Fields: queryFields(repos, t)})
	rootMutation := graphql.NewObject(graphql.ObjectConfig{Name: "Mutation", Fields: mutationFields(repos, authService, aiClient, *projectPolicy, t)})
	schema, err := graphql.NewSchema(graphql.SchemaConfig{Query: rootQuery, Mutation: rootMutation})
	if err != nil {
		return nil, fmt.Errorf("create schema: %w", err)
	}
	return &Schema{Schema: schema}, nil
}
