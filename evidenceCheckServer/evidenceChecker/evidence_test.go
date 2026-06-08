package evidencechecker

import (
	"evidenceCheckServer/log"
	pb "evidenceCheckServer/pb/b18a/proto/evidence_checker"
	"net/http"
	"testing"
	"time"

	"github.com/adrg/strutil"
	"github.com/adrg/strutil/metrics"
	"github.com/smartystreets/goconvey/convey"
)

func TestHashStrDistance(t *testing.T) {
	predict := ""
	label := ""
	similarity := strutil.Similarity(predict, label, metrics.NewJaroWinkler())
	t.Logf("similarity %s, %s:%f", predict, label, similarity)
}

func TestHttpGetError(t *testing.T) {
	checkLogger = log.InitLogger("debug")
	//	convey.Convey("Given some integer with a starting value", t, func() {
	//		x := 1
	//		convey.Convey("When the integer is incremented", func() {
	//			x++
	//			convey.Convey("The value should be greater by one", func() {
	//				convey.So(x, convey.ShouldEqual, 2)
	//			})
	//		})
	//	})
	urls := map[string]pb.SubmissionCheckResult_Status{
		"http://www.baidu.com": pb.SubmissionCheckResult_OK,
		"www.baidu.com":        pb.SubmissionCheckResult_WEBPAGE_URL_NOT_VALID_OR_UNREACHABLE,
		"htp://www.baidu.com":  pb.SubmissionCheckResult_WEBPAGE_URL_NOT_VALID_OR_UNREACHABLE,
		"google.com":           pb.SubmissionCheckResult_WEBPAGE_URL_NOT_VALID_OR_UNREACHABLE,
	}

	convey.Convey("Some cases test http get errors", t, func() {
		for k, v := range urls {
			cli := &http.Client{Timeout: 3 * time.Second}
			_, err := cli.Get(k)
			if err != nil {
				convey.So(httpGetError(err, k), convey.ShouldEqual, v)
			}
		}
	})
}

func TestCloseChannel(t *testing.T) {
	go func() {
		x := make(chan int, 1)
		go func() {
			time.Sleep(1 * time.Second)
			close(x)
		}()
	}()
	time.Sleep(3 * time.Second)
}
