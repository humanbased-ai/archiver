package dao

import (
	"context"
	"fmt"
	"riskControlServer/config"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)


func TestCreateCollection(t *testing.T) {
	var cfg = &config.Config {
		MongoDBUrl: "mongodb://127.0.0.1:27017/",
		Database: "test",
	}
	initConn(cfg)
}

func TestInsertLog(t *testing.T) {
	var cfg = &config.Config {
		MongoDBUrl: "mongodb://127.0.0.1:27017/",
		Database: "test",
	}
	client,err = mongo.Connect(context.TODO(),  options.Client().ApplyURI(cfg.MongoDBUrl).SetConnectTimeout(5*time.Second))
	if err!=nil {
		panic(err)
	}
	db = client.Database(cfg.Database)

	collection = db.Collection("user-opt")
	var upt = &UserOperation {
		AuthUUID : "123",
		UserID : "1234",
		Operation: OptChangePasswd,
		OptStatus : StatusSuccess ,
		DeviceIf :&DeviceInfo{
			DeviceIP: "127.0.0.1"},
		CreateAt :time.Now(),
	}
	var upt2 = &UserOperation {
		AuthUUID : "123",
		UserID : "1234",
		Operation: OptChangePasswd,
		OptStatus : StatusSuccess ,
		DeviceIf :&DeviceInfo{
			DeviceIP: "127.0.0.1"},
		CreateAt :time.Now(),
	}
	InsertUserOperation(upt)
	InsertUserOperation(upt2)
	InsertUserOperation(upt)
	db.Client().Disconnect(context.TODO())
}

func TestQpt(t *testing.T) {
	var cfg = &config.Config {
		MongoDBUrl: "mongodb://127.0.0.1:27017/",
		Database: "test",
	}
	client,err = mongo.Connect(context.TODO(),  options.Client().ApplyURI(cfg.MongoDBUrl).SetConnectTimeout(5*time.Second))
	if err!=nil {
		panic(err)
	}
	defer db.Client().Disconnect(context.TODO())
	db = client.Database(cfg.Database)

	collection = db.Collection("user-opt")
	from := time.Now().Add(-time.Hour)
	to:= time.Now()
	usrOpt := QueryUserOperation("1234",from,to,OptChangePasswd,StatusSuccess)
	fmt.Printf("%v ",usrOpt)
	fmt.Printf("%v ",usrOpt.CreateAt)
}