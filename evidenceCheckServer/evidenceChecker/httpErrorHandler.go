package evidencechecker

import (
	pb "evidenceCheckServer/pb/b18a/proto/evidence_checker"
	"net"
	"strings"
)

func httpGetError(err error, url string) pb.SubmissionCheckResult_Status {
	if _, ok := err.(*net.AddrError); ok {
		checkLogger.Warnf("Net addr error: %s", url)
		return pb.SubmissionCheckResult_WEBPAGE_URL_NOT_VALID_OR_UNREACHABLE
	}

	if _, ok := err.(*net.ParseError); ok {
		checkLogger.Warnf("Error parsing URL: %s,%s", err, url)
		return pb.SubmissionCheckResult_WEBPAGE_URL_NOT_VALID_OR_UNREACHABLE
	}

	if opErr, ok := err.(*net.OpError); ok {
		if opErr.Timeout() {
			checkLogger.Warnf("Operror timeout: %s,%s", err, url)
			return pb.SubmissionCheckResult_OK
		}
		checkLogger.Warnf("Error op URL: %s,%s", err, url)
		return pb.SubmissionCheckResult_WEBPAGE_URL_NOT_VALID_OR_UNREACHABLE
	}

	if strings.Contains(err.Error(), "unsupported protocol scheme") {
		checkLogger.Warnf("http get Error URL: %s,%s", err, url)
		return pb.SubmissionCheckResult_WEBPAGE_URL_NOT_VALID_OR_UNREACHABLE
	}
	checkLogger.Warnf("http get error unknown : %s,%s", err, url)
	return pb.SubmissionCheckResult_WEBPAGE_URL_NOT_VALID_OR_UNREACHABLE
}
