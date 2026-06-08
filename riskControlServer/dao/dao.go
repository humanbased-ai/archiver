package dao

import (
	"context"
	"fmt"
	"riskControlServer/config"
	pb "riskControlServer/pb/gateway/riskcontrol"
	"sort"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	client     *mongo.Client
	err        error
	db         *mongo.Database
	collection *mongo.Collection
)

const (
	StatusUnknown    = -1 // 隐式从0开始
	StatusSuccess    = 0
	StatusFailure    = 1
	StatusPending    = 2
	StatusAuthFailed = 3
	StatusLetout     = 999
	// 可以继续添加更多的状态
)

const (
	OptLogin = iota // 隐式从0开始
	OptChangePasswd
)

func InitConn(config *config.Config) {
	config.MongoDBUrl = config.MongoDBUrl + "?maxPoolSize=20"
	client, err = mongo.Connect(context.TODO(), options.Client().ApplyURI(config.MongoDBUrl).SetConnectTimeout(5*time.Second))
	if err != nil {
		panic(err)
	}

	db = client.Database(config.Database)
	collection = db.Collection("user-opt")
	//defer client.Disconnect(context.TODO())
}

type DeviceInfo struct {
	DeviceIP string `bson:"device_ip" json:"device_ip"`
	DeviceID string `bson:"device_id" json:"device_id"`
}

type UserOperation struct {
	AuthUUID  string         `bson:"auth_uuid" json:"auth_uuid"`
	UserID    string         `bson:"user_id" json:"user_id"`
	Operation int            `bson:"operation" json:"operation"`
	OptStatus int            `bson:"opt_status" json:"opt_status"`
	DeviceIf  *pb.DeviceInfo `bson:"device_info" json:"device_info"`
	CreateAt  time.Time      `bson:"create_at" json:"create_at"`
}

func InsertUserOperation(userOpt *UserOperation) error {
	_, err := collection.InsertOne(context.TODO(), userOpt)
	if err != nil {
		fmt.Printf("%s\n", err)
	}
	return err
}

func QueryUserOperation(userID string, from time.Time, to time.Time, opt int, optStatus int) *UserOperation {
	var userOpt *UserOperation

	query := bson.M{
		"user_id": userID,
		"create_at": bson.M{
			"$gte": from,
			"$lt":  to,
		},
		"operation": opt,
	}
	if optStatus != StatusLetout {
		query = bson.M{
			"user_id": userID,
			"create_at": bson.M{
				"$gte": from,
				"$lt":  to,
			},
			"operation":  opt,
			"opt_status": optStatus,
		}
	}
	err = collection.FindOne(context.TODO(), query).Decode(&userOpt)
	if err != nil {
		fmt.Printf("query failed %s\n", err)
		return nil
	}
	return userOpt
}

func CountUserOpt(userID string, from time.Time, to time.Time, opt int, optStatus int) (int64, error) {

	query := bson.M{
		"user_id": userID,
		"create_at": bson.M{
			"$gte": from,
			"$lt":  to,
		},
		"operation": opt,
	}
	if optStatus != StatusLetout {
		query = bson.M{
			"user_id": userID,
			"create_at": bson.M{
				"$gte": from,
				"$lt":  to,
			},
			"operation":  opt,
			"opt_status": optStatus,
		}
	}
	counts, err := collection.CountDocuments(context.TODO(), query)
	if err != nil {
		fmt.Printf("query failed %s\n", err)
		return 0, err
	}
	return counts, err
}

func FindDevicesByUserID(userID string, from time.Time, to time.Time, opt int, max int) string {
	var optLogs = make([]*UserOperation, 0)
	query := bson.M{
		"user_id": userID,
		"create_at": bson.M{
			"$gte": from,
			"$lt":  to,
		},
		"operation": opt,
		"status":    StatusSuccess,
	}
	cursor, err := collection.Find(context.TODO(), query)
	if err != nil {
		fmt.Printf("query failed %s\n", err)
		return ""
	}
	defer cursor.Close(context.TODO())
	for cursor.Next(context.TODO()) {
		var oneOptLog = UserOperation{}
		err = cursor.Decode(&oneOptLog)
		if err != nil {
			fmt.Printf("query failed %s\n", err)
			return ""
		}
		optLogs = append(optLogs, &oneOptLog)
	}

	sort.Sort(UserLogs(optLogs))
	if len(optLogs) < max {
		return ""
	}
	return optLogs[max-1].DeviceIf.DeviceID
}
