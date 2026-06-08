package core

import (
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"log"
)

func initDB() *gorm.DB {
	dsn := GetEnv("DB_URL")
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database, err:%v\n", err)
	}
	return db
}
