package core

import (
	"context"
	"fmt"
	"log"
	"strings"
)

func PushToGreenfield(req []byte, frontierId, taskId, submissionId string, storageClient *GreenfiledClient, storageProviders []map[string]interface{}) string {
	ctx := context.Background()
	bucketName := strings.ToLower(frontierId) + "-" + taskId
	hasBucket, _ := storageClient.QueryBucket(ctx, bucketName)
	if !hasBucket {
		for _, value := range storageProviders {
			if storageProvider, ok := value["operator_address"]; ok {
				_, createErr := storageClient.CreateBucket(ctx, bucketName, storageProvider.(string))
				if createErr != nil {
					continue
				}
				fmt.Printf("Bucket %s created successfully\n", bucketName)
				break
			}
		}
	}
	txHash, objectErr := storageClient.CreateObject(ctx, bucketName, submissionId, req)
	if objectErr != nil {
		log.Fatalf("Failed to create object: %v", objectErr)
	}
	fmt.Printf("Object %s created successfully in bucket %s\n", bucketName, submissionId)
	fmt.Println("PushToGreenfield success ")
	return txHash
}
