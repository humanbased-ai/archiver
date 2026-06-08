package core

import (
	"github.com/joho/godotenv"
	"os"
)

func GetEnv(key string) string {
	_ = godotenv.Load(".env")
	return os.Getenv(key)
}
