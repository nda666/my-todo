package auth

import (
	"context"
	"errors"
	"time"
	"fmt"

	"golang-todo/internal/config"
	"golang-todo/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type contextKey string

const UserContextKey contextKey = "user"

type Claims struct {
	Kodeku   string `json:"kodeku"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

type Service struct {
	db        *gorm.DB
	jwtSecret []byte
}

func NewService(db *gorm.DB, cfg *config.Config) *Service {
	return &Service{
		db:        db,
		jwtSecret: []byte(cfg.JWTSecret),
	}
}

func (s *Service) Login(username, password string) (string, *models.MasterUser, error) {
	var user models.MasterUser
	if err := s.db.Where("usernameku = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, errors.New("username atau password salah")
		}
		return "", nil, err
	}
	fmt.Println("user", user.Usernameku)
	fmt.Println("password", password)
	fmt.Println("user.Password", user.Passwordku)
	if password != user.Passwordku {
		return "", nil, errors.New("username atau password salah")
	}

	token, err := s.generateToken(&user)
	if err != nil {
		return "", nil, err
	}

	return token, &user, nil
}

func (s *Service) checkPassword(input, stored string) bool {
	if input == stored {
		return true
	}
	if err := bcrypt.CompareHashAndPassword([]byte(stored), []byte(input)); err == nil {
		return true
	}
	return false
}

func (s *Service) generateToken(user *models.MasterUser) (string, error) {
	claims := Claims{
		Kodeku:   user.Kodeku,
		Username: user.Usernameku,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *Service) ParseToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

func UserFromContext(ctx context.Context) (*Claims, bool) {
	claims, ok := ctx.Value(UserContextKey).(*Claims)
	return claims, ok
}

func RequireUser(ctx context.Context) (*Claims, error) {
	claims, ok := UserFromContext(ctx)
	if !ok {
		return nil, errors.New("unauthorized")
	}
	return claims, nil
}
