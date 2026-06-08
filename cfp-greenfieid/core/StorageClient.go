package core

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/bnb-chain/greenfield-go-sdk/client"
	"github.com/bnb-chain/greenfield-go-sdk/types"
	"log"
)

type StorageClient interface {
	ListStorageProviders(content context.Context) ([]byte, error)
	CreateBucket(content context.Context, bucketName, storageProvider string) (string, error)
	CreateObject(content context.Context, bucketName, objectName string, uploadData []byte) (string, error)
	QueryBucket(content context.Context, bucketName string) (bool, error)
	QueryObject(content context.Context, bucketName, objectName string) (string, error)
}

type GreenfiledClient struct {
	cli client.IClient
}

func (c *GreenfiledClient) QueryObject(content context.Context, bucketName, objectName string) (string, error) {
	objectDetail, err := c.cli.HeadObject(content, bucketName, objectName)
	if err != nil {
		log.Fatalf("fail to list in service sps")
		return "", err
	}
	return objectDetail.ObjectInfo.Id.String(), nil
}

func (c *GreenfiledClient) ListStorageProviders(ctx context.Context) ([]byte, error) {
	spLists, err := c.cli.ListStorageProviders(ctx, true)
	if err != nil {
		log.Fatalf("fail to list in service sps")
		return nil, err
	}
	jsonData, _ := json.MarshalIndent(spLists, "", "  ")
	return jsonData, nil
}

func (c *GreenfiledClient) CreateBucket(ctx context.Context, bucketName, storageProvider string) (string, error) {
	txHash, err := c.cli.CreateBucket(ctx, bucketName, storageProvider, types.CreateBucketOptions{})
	if err != nil {
		return "", err
	}
	txResult, err := c.submitTx(ctx, txHash)
	if err != nil {
		return "", err
	}
	return txResult, nil
}

func (c *GreenfiledClient) CreateObject(ctx context.Context, bucketName, objectName string, uploadData []byte) (string, error) {
	txHash, err := c.cli.CreateObject(ctx, bucketName, objectName, bytes.NewReader(uploadData), types.CreateObjectOptions{})
	if err != nil {
		return "", err
	}
	// Put your object
	err = c.cli.PutObject(ctx, bucketName, objectName, int64(len(uploadData)),
		bytes.NewReader(uploadData), types.PutObjectOptions{TxnHash: txHash})
	if err != nil {
		return "", err
	}

	_, err = c.submitTx(ctx, txHash)
	if err != nil {
		return "", err
	}
	return txHash, nil
}

func (c *GreenfiledClient) submitTx(ctx context.Context, txHash string) (string, error) {
	waitForTx, err := c.cli.WaitForTx(ctx, txHash)
	if err != nil {
		return "", err
	}
	return waitForTx.TxResult.String(), nil
}

func (c *GreenfiledClient) QueryBucket(ctx context.Context, bucketName string) (bool, error) {
	bucket, err := c.cli.HeadBucket(ctx, bucketName)
	if err != nil {
		return false, err
	}
	return bucket != nil, nil
}
