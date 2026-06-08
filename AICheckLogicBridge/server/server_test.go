package server

import (
	"AICheckLogicBridge/config"
	checker "AICheckLogicBridge/pb/b18a/proto/evidence_checker"
	pb "AICheckLogicBridge/pb/b18a/proto/logic_bridge"
	"context"
	"encoding/json"
	"fmt"
	"testing"
)

func TestCheck(t *testing.T) {
	var config = &config.Config{
		CheckGrpcEndpoint: "127.0.0.1:50051",
	}
	InitServer(config)
	logicBridgeInstance := &AICheckLogicBridge{}
	req := &pb.AIEvidenceCheckReq{
		Address: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
		Network: "ethereum",
		Entity:  "Router",
		Evidence: `{
			"link": "https://etherscan.io/tx/0x305fb059e46723da673e762eb6e8850dc6fe6a2511434c890446a3dd5c590f00",
			"hash": "0x305fb059e46723da673e762eb6e8850dc6fe6a2511434c890446a3dd5c590f00",
			"files": [{
				"filename": "output.png",
				"path": "https://file.b18a.io/057b0fb0-a19f-4944-82e1-520af31231df_501807_output.png"
			}]
		}`,
	}
	resp, err := logicBridgeInstance.CheckEvidence(context.TODO(), req)
	if err != nil {
		t.Error(err)
	}
	fmt.Printf("%d,%s,%s\n", resp.Code, resp.Data.Reason, resp.Message)
}

func TestParseReason(t *testing.T) {
	x := "{\"text\":\"<div></div>\",\"files\":[{\"filename\":\"1.png\",\"path\":\"https://file.b18a.io/c713ede2-d99d-4033-8c37-762931703f18_817694_1.png\"}]}"
	z, _, _, _ := parseReason(x, "", "", "")
	println(z[0].Image)
}

func TestSlice2D(t *testing.T) {
	x := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 0}
	offsets := []int{0, 3, 5}
	//123 45  67890
	int2d, err := slice2D(x, offsets)
	println(err)
	println(int2d[0][0], int2d[1][0], int2d[2][0])
}

func TestPrepareImageTags(t *testing.T) {
	var submissions = make([]*checker.SubmissionCheckResult, 0)
	submissions = append(submissions, &checker.SubmissionCheckResult{
		Tag:         checker.ImageTag_TagExternal,
		Translation: "hello1",
		Image:       "",
	})
	submissions = append(submissions, &checker.SubmissionCheckResult{
		Tag:         checker.ImageTag_TagExternal,
		Translation: "hello2",
		Image:       "",
	})

	submissions = append(submissions, &checker.SubmissionCheckResult{
		Tag:         checker.ImageTag_TagExternal,
		Translation: "",
		Image:       "1",
	})

	submissions = append(submissions, &checker.SubmissionCheckResult{
		Tag:         checker.ImageTag_TagExternal,
		Translation: "hello1",
		Image:       "2",
	})
	submissions = append(submissions, &checker.SubmissionCheckResult{
		Tag:         checker.ImageTag_TagExternal,
		Translation: "",
		Image:       "",
	})

	var evidences = make([]*Evidence, 0)
	evidences = append(evidences, &Evidence{})
	evidences = append(evidences, &Evidence{})
	evidences = append(evidences, &Evidence{})

	tags := prepareImageTags(submissions, []int{0, 2, 3}, evidences)
	println(tags)
	//int2d, err := slice2D(x, offsets)
}

func TestMarshalMap(t *testing.T) {
	var x = make([]map[string]int, 0)
	x1 := make(map[string]int, 0)
	x = append(x, x1)
	x2 := make(map[string]int, 0)
	x = append(x, x2)
	c, _ := json.Marshal(x)
	println(string(c))
}

func TestSlice2D2(t *testing.T) {
	var submissions = make([]*checker.SubmissionCheckResult, 0)
	submissions = append(submissions, &checker.SubmissionCheckResult{
		Tag:         checker.ImageTag_TagExternal,
		Translation: "hello1",
		Image:       "",
	})
	submissions = append(submissions, &checker.SubmissionCheckResult{
		Tag:         checker.ImageTag_TagExternal,
		Translation: "hello2",
		Image:       "",
	})

	submissions = append(submissions, &checker.SubmissionCheckResult{
		Tag:         checker.ImageTag_TagExternal,
		Translation: "",
		Image:       "1",
	})

	submissions = append(submissions, &checker.SubmissionCheckResult{
		Tag:         checker.ImageTag_TagExternal,
		Translation: "hello1",
		Image:       "2",
	})
	submissions = append(submissions, &checker.SubmissionCheckResult{
		Tag:         checker.ImageTag_TagExternal,
		Translation: "",
		Image:       "",
	})
	offsets := []int{0, 2, 3}
	//01 2  34
	int2d, _ := slice2D(submissions, offsets)
	println(int2d[0][0].Image, int2d[1][0].Image, int2d[2][0].Image)
	println(len(int2d[0]), len(int2d[1]), len(int2d[2]))
}
