package evidencechecker

import (
	"context"
	"evidenceCheckServer/claude3"
	"evidenceCheckServer/conf"
	pb "evidenceCheckServer/pb/b18a/proto/evidence_checker"

	match "github.com/alexpantyukhin/go-pattern-match"
)

func ocrAndValidate(ctx context.Context, sub *pb.Submission) (pb.SubmissionCheckResult_Status, pb.ImageTag) {
	// 发送 GET 请求
	//data := postImage2OcrServer(sub.Image)
	//status, data := claude3.CallClaude3(sub.Image, "")
	if !(conf.GlobalConf.UseClaude3) || sub.Image == "" {
		return pb.SubmissionCheckResult_OK, pb.ImageTag_TagRoundTruth
	}
	status, data := claude3.CallBedrock(ctx, sub.ImageBase64)
	if status != pb.SubmissionCheckResult_OK {
		return status, pb.ImageTag_TagUnknown
	}
	imageTag := pb.ImageTag_TagRoundTruth
	if !data.GroundTruth {
		imageTag = pb.ImageTag_TagExternal
	}
	if status != pb.SubmissionCheckResult_OK {
		return status, imageTag
	}
	status = validateClaude3Result(ctx, data, sub)
	return status, imageTag
}

type OCRResult struct {
	SendAddrs  []string `json:"sendAddrs"`
	SendEntity string   `json:"sendEntity"`
	RecvAddrs  []string `json:"recvAddrs"`
	RecvEntity string   `json:"recvEntity"`
	Network    string   `json:"network"`
	Edited     bool     `json:"edited"`
}

func validateClaude3Result(ctx context.Context, ocrResult *claude3.ImageOcrInfo, sub *pb.Submission) pb.SubmissionCheckResult_Status {

	_, threshold := match.Match(ocrResult.FromPhone).
		When(true, conf.GlobalConf.SimilarThreshold-0.3).
		When(false, conf.GlobalConf.SimilarThreshold).Result()
	//close network validate
	//	if !fuzzyMatchCaseInsentive(sub.Network, ocrResult.Network, threshold.(float64)) {
	//		return pb.SubmissionCheckResult_IMAGE_NETWORK_NOT_MATCH
	//	}

	if !someMatch(ocrResult.RecvAddrs, sub.Address, threshold.(float64)) && !someMatch(ocrResult.SendAddrs, sub.Address, threshold.(float64)) {
		return pb.SubmissionCheckResult_IMAGE_ADDRESS_NOT_MATCH
	}

	if ocrResult.Edited {
		return pb.SubmissionCheckResult_IMAGE_EDITED
	}

	if sub.Entity == "" {
		return pb.SubmissionCheckResult_OK
	}
	if !fuzzyMatchCaseInsentive(sub.Entity, ocrResult.RecvEntity, threshold.(float64)) && !fuzzyMatchCaseInsentive(sub.Entity, ocrResult.SendEntity, threshold.(float64)) {
		return pb.SubmissionCheckResult_IMAGE_ENTITY_NOT_MATCH
	}
	return pb.SubmissionCheckResult_OK
}
