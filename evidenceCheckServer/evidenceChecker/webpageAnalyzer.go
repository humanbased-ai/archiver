package evidencechecker

import (
	pb "evidenceCheckServer/pb/b18a/proto/evidence_checker"
	"strings"
)

func checkSubmissionInWebpage(sub *pb.Submission, htmlContent string) pb.SubmissionCheckResult_Status {
	htmlLowerContent := strings.ToLower(htmlContent)
	if !strings.Contains(htmlLowerContent, strings.ToLower(sub.Address)) {
		checkLogger.Infof("strings not contain %s", sub.Address)
		return pb.SubmissionCheckResult_WEBPAGE_ADDRESS_NOT_MATCH
	}
	//if !strings.Contains(htmlLowerContent, strings.ToLower(sub.Network)) {
	//	return pb.SubmissionCheckResult_WEBPAGE_NETWORK_NOT_MATCH
	//}
	//if sub.Entity != "" && !strings.Contains(htmlLowerContent, strings.ToLower(sub.Entity)) {
	//	return pb.SubmissionCheckResult_WEBPAGE_ENTITY_NOT_MATCH
	//}
	return pb.SubmissionCheckResult_OK
}
