package core

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/bnb-chain/greenfield-go-sdk/client"
	"github.com/bnb-chain/greenfield-go-sdk/types"
	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
	"log"
	"os"
	"strconv"
	"strings"
	"time"
)

func StartScheduler() {
	fmt.Printf("start scheduler,time:%v\n", time.Now())
	db := initDB()
	c := cron.New(cron.WithLocation(time.UTC))
	_, err := c.AddFunc(os.Getenv("CRON"), func() {
		loadData(db)
	})
	if err != nil {
		log.Fatalf("start scheduler failed,err:%v", err)
	}
	c.Start()
	fmt.Printf("start scheduler success,time:%v\n", time.Now())
	select {}
	//db := initDB()
	//loadData(db)
}

func initClient() *GreenfiledClient {
	privateKey := os.Getenv("ACCOUNT_PRIVATEKEY")
	// import acccount
	account, err := types.NewAccountFromPrivateKey("greenfield", privateKey)
	if err != nil {
		log.Fatalf("New account from private key error, %v", err)
		return nil
	}

	// create client
	gnfdClient, newClientErr := client.New(GetEnv("CHAIN_ID"), GetEnv("RPC_ADDR"), client.Option{DefaultAccount: account})
	if newClientErr != nil {
		log.Fatalf("unable to new greenfield client, %v", newClientErr)
		return nil
	}
	storageClient := &GreenfiledClient{
		cli: gnfdClient,
	}
	return storageClient
}

func getStorageProvider(storageClient *GreenfiledClient) []map[string]interface{} {
	ctx := context.Background()
	data, _ := storageClient.ListStorageProviders(ctx)
	var storageProviders []map[string]interface{}
	if jsonErr := json.Unmarshal(data, &storageProviders); jsonErr != nil {
		log.Fatalf("unmarshal data failed,err:%v,data:%s", jsonErr, string(data))
		return nil
	}
	return storageProviders
}

func loadData(db *gorm.DB) {
	var submissions []CfpTaskSubmission
	dataLimit, _ := strconv.Atoi(GetEnv("DATA_LIMIT"))
	queryErr := db.Table("cfp_task_submission").Where("deleted=?", false).Where("status=?", "PENDING").Order("gmt_modified DESC").Limit(dataLimit).Find(&submissions).Error
	if queryErr != nil {
		log.Fatalf("load data failed,err:%v", queryErr)
		return
	}
	if len(submissions) == 0 {
		fmt.Println("no data to load")
		return
	}
	client := initClient()
	storageProviders := getStorageProvider(client)
	for _, submission := range submissions {
		log.Printf("process data，id:%d,submissionId:%s\n", submission.Id, submission.SubmissionId)
		// 处理实际的数据到greenfield中
		data, frontierId := getGreenfieldData(db, submission)
		if data == nil && frontierId == "" {
			return
		}
		txHash := PushToGreenfield(data, frontierId, submission.TaskId, submission.SubmissionId, client, storageProviders)
		ext_info := make(map[string]string)
		ext_info["txHash"] = txHash
		jsonData, _ := json.Marshal(ext_info)
		if err := db.Table("cfp_task_submission").Where("id=?", submission.Id).Update("status", "SUBMITTED").Update("ext_info", string(jsonData)).Error; err != nil {
			log.Fatalf("save data failed,err:%v,id:%d,submissionId:%s\n", err, submission.Id, submission.SubmissionId)
		} else {
			fmt.Printf("save data success,id:%d,submissionId:%s\n", submission.Id, submission.SubmissionId)
		}

	}
}

func getGreenfieldData(db *gorm.DB, submission CfpTaskSubmission) ([]byte, string) {
	var task CfpFrontierTask
	dbQueryErr := db.Table("cfp_frontier_task").Where("task_id=?", submission.TaskId).First(&task).Error
	if dbQueryErr != nil {
		log.Fatalf("load data failed,err:%v,id:%d,submissionId:%s\n", dbQueryErr, submission.Id, submission.SubmissionId)
		return nil, ""
	}
	data := make(map[string]interface{})
	data["task_id"] = task.TaskId
	data["submission_id"] = submission.SubmissionId
	data["user_id"] = submission.UserId
	data["frontier_id"] = task.FrontierId
	var dataDisplay map[string]string
	if err := json.Unmarshal(task.DataDisplay, &dataDisplay); err != nil {
		log.Fatalf("unmarshal data failed,err:%v,id:%d,submissionId:%s\n", err, submission.Id, submission.SubmissionId)
		return nil, ""
	}
	var dataSubmissions map[string]interface{}
	if err := json.Unmarshal(submission.DataSubmission, &dataSubmissions); err != nil {
		log.Fatalf("unmarshal data failed,err:%v,id:%d,submissionId:%s\n", err, submission.Id, submission.SubmissionId)
		return nil, ""
	}
	data["url"] = GetEnv("RESOURCE_OSS_PATH") + task.FrontierId + "/" + dataDisplay[GetEnv("DISPLAY_KEY")]
	if strings.Contains(task.Name, "L1") {
		if value, ok := dataSubmissions["data"]; ok {
			if array, ok := value.([]interface{}); ok {
				for i, item := range array {
					key := fmt.Sprintf("time%d", i+1)
					data[key] = item
				}
			}
		}

	} else if strings.Contains(task.Name, "L2") {
		return nil, ""
	} else if strings.Contains(task.Name, "L3") {
		if value, ok := dataSubmissions["data"]; ok {
			if dataMap, ok := value.(map[string]interface{}); ok {
				for key, _value := range dataMap {
					data[key] = _value
				}
			}
		}
	}
	jsonData, _ := json.Marshal(data)
	fmt.Println("get data:", string(jsonData))
	return jsonData, task.FrontierId
}
