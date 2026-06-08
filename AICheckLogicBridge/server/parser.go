package server

import (
	checker "AICheckLogicBridge/pb/b18a/proto/evidence_checker"
	"encoding/json"
	"fmt"
	"strings"
)

func parseReason(reason string, address string, network string, entity string) ([]*checker.Submission, []*Evidence, []int, error) {
	//'{"text": "", "files": [{"path":"","filename":""}],"hash":"","link":""}
	reason = strings.Trim(reason, "\"")
	var evidence = &Evidence{}
	var evidenceArr = make([]*Evidence, 0)
	var submissionArr = make([]*checker.Submission, 0)
	var submissionOffsets = make([]int, 0)

	err := json.Unmarshal([]byte(reason), evidence)
	if err != nil {
		//logger.Errorf("unmarshal reason as object failed %s, %s", err, reason)
		err = json.Unmarshal([]byte(reason), &evidenceArr)
		if err != nil {
			//logger.Errorf("unmarshal reason as arr failed %s, %s", err, reason)
			return nil, nil, nil, err
		}
		var nextIndexOfLastSubmission = 0
		for _, v := range evidenceArr {
			submissionOffsets = append(submissionOffsets, nextIndexOfLastSubmission)
			submissionsOfOneEvidence := parseEvidence(v, address, network, entity)
			submissionArr = append(submissionArr, submissionsOfOneEvidence...)
			nextIndexOfLastSubmission = nextIndexOfLastSubmission + len(submissionsOfOneEvidence)
		}
		return submissionArr, evidenceArr, submissionOffsets, nil
	} else {
		submissionArr = append(submissionArr, parseEvidence(evidence, address, network, entity)...)
		submissionOffsets = append(submissionOffsets, 0)
		return submissionArr, []*Evidence{evidence}, submissionOffsets, nil
	}

	return submissionArr, evidenceArr, submissionOffsets, nil
}

func parseEvidence(evi *Evidence, address string, network string, entity string) []*checker.Submission {
	subs := make([]*checker.Submission, 0)
	if evi.Link != "" {
		subs = append(subs, &checker.Submission{
			Webpage: evi.Link,
			Entity:  entity,
			Network: network,
			Address: address,
		})
	}
	if evi.Text != "" {
		subs = append(subs, &checker.Submission{
			Text: evi.Text,
		})
	}
	for _, v := range evi.Files {
		if v == nil {
			//in case of  {"files":[null],"date":1714456826244}-0x1234-AIOZ-
			continue
		}
		subs = append(subs, &checker.Submission{
			Image:   v.Path,
			Entity:  entity,
			Network: network,
			Address: address,
		})
	}
	return subs
}

// Slice2D 根据提供的offsets将一维数组切片分割成二维数组
func slice2D[T any](x []T, offsets []int) ([][]T, error) {
	//检查 offsets 是否是递增，且没有越结
	for i := 1; i < len(offsets); i++ {
		if offsets[i] <= offsets[i-1] || offsets[i] > len(x) {
			return nil, fmt.Errorf("invalid offsets")
		}
	}
	// 初始化二维数组
	var result [][]T = make([][]T, 0)
	for i, offset := range offsets {
		var one = make([]T, 0)
		from := offset
		to := len(x)

		if i != len(offsets)-1 {
			to = offsets[i+1]
		}
		one = append(one, x[from:to]...)
		result = append(result, one)
	}
	return result, nil
}

func prepareOutputEvidence(submissions []*checker.SubmissionCheckResult, offsets []int, evis []*Evidence) string {
	//println("submission prepare output evidence", submissions[0].Translation, submissions[0].Tag)
	submission2D, err := slice2D(submissions, offsets)
	if err != nil {
		//println(err)
		return "" 
	}

	//对于每一个 evidence 添加数据 output 和 web3
	for i, _ := range evis {
		for _, v := range submission2D[i] {
			if v.Translation != "" {
				evis[i].Translation = v.Translation
			}
		}
	}
	eviJson, err := json.Marshal(evis)
	if err != nil {
		//println(err)
		return "" 
	}

	return string(eviJson)
}

func prepareImageTags(submissions []*checker.SubmissionCheckResult, offsets []int, evis []*Evidence) string {
	submission2D, err := slice2D(submissions, offsets)
	if err != nil {
		//println(err)
		return ""
	}

	if len(submission2D) != len(evis) {
		return ""
	}
	evidenceImageTags := make([]map[string]int, 0)
	//每个 Evidence 对应一个 submission2D
	//
	//对于每一个 evidence 添加数据 output 和 web3
	for i, _ := range evis {
		//提取
		oneEvidenceTags := make(map[string]int, 0)
		for _, v := range submission2D[i] {
			if v.Image != "" {
				oneEvidenceTags[v.Image] = int(v.Tag)
			}
		}
		evidenceImageTags = append(evidenceImageTags, oneEvidenceTags)
	}

	imageTagsErr, err := json.Marshal(evidenceImageTags)
	if err != nil {
		//println(err.Error())
		return ""
	}
	//return json.Marshal(evis)
	return string(imageTagsErr)
}
