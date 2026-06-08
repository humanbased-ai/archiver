package evidencechecker

import (
	"bytes"
	"context"
	"encoding/base64"
	"evidenceCheckServer/claude3"
	"evidenceCheckServer/conf"
	"evidenceCheckServer/log"
	pb "evidenceCheckServer/pb/b18a/proto/evidence_checker"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	match "github.com/alexpantyukhin/go-pattern-match"
	"github.com/evanoberholster/imagemeta/xmp"
	imageType "github.com/mushroomsir/image-type"
	cmap "github.com/orcaman/concurrent-map/v2"
	lop "github.com/samber/lo/parallel"
	"github.com/uptrace/opentelemetry-go-extra/otelzap"
)

var (
	globalImageMd5Cache cmap.ConcurrentMap[string, int64]
	checkLogger         *otelzap.SugaredLogger
)

func InitChecker() {
	globalImageMd5Cache = cmap.New[int64]()
	checkLogger = log.InitLogger("info")
	go cleanCache()
}

func cleanCache() {
	for {
		for item := range globalImageMd5Cache.IterBuffered() {
			val := item.Val
			if time.Now().UTC().Unix()-val >= int64(60*60*24*7) {
				globalImageMd5Cache.Remove(item.Key)
			}
		}
		time.Sleep(60 * 60 * time.Second)
	}
}

func checkImageDuplicated(ctx context.Context, image string) (bool, string) {

	if image == "" {
		return false, ""
	}
	startTime := time.Now()
	logStatus := "success"
	logReason := ""
	defer func() {
		checkLogger.Infof(log.FmtLog(ctx.Value("traceid").(string), ctx.Value("submissionid").(string), "checkEvidence", "ckeckImageDuplicated", logStatus, logReason, int(time.Since(startTime)/time.Millisecond)))
	}()
	//	hash := sha256.Sum256([]byte(image))
	//	imageHash := hex.EncodeToString(hash[:])
	_, ok := globalImageMd5Cache.Get(image)
	if !conf.GlobalConf.CheckImageRepeated {
		return false, ""
	}
	logStatus = "failure"
	logReason = "imageRepeated"
	return ok, image
}
func imageHashSave(imageHash string) {
	if imageHash == "" {
		return
	}
	globalImageMd5Cache.Set(imageHash, time.Now().UTC().Unix())
}

func checkImageInfo(ctx context.Context, submission *pb.Submission) *pb.SubmissionCheckResult {

	logStatus := "success"
	logReason := ""
	startTime := time.Now()
	status, imageTag := ocrAndValidate(ctx, submission)
	//失败在调用内部打印，成功在调用外部打印
	if status == pb.SubmissionCheckResult_OK {
		checkLogger.Infof(log.FmtLog(ctx.Value("traceid").(string), submission.Submissionid, "checkEvidence", "checkImage", logStatus, logReason, int(time.Since(startTime)/time.Millisecond)))
	}
	return &pb.SubmissionCheckResult{
		Status: status,
		Tag:    imageTag,
		Image:  submission.Image,
	}
}

func checkImageEdited(submission *pb.Submission) bool {
	return false
	decodedData, err := base64.StdEncoding.DecodeString(submission.ImageBase64)
	if err != nil {
		checkLogger.Errorf("Check image XMP, base64 Decode failed : %v ", err)
		if len(submission.Image) > 40 {
			checkLogger.Errorf("Check image XMP, base64 Decode failed : %s ", submission.Image[0:40])
		}
		return true
	}

	f := strings.NewReader(string(decodedData))
	x, err := xmp.ParseXmp(f)
	if err != nil {
		if err != io.EOF {
			checkLogger.Errorf("Check image XMP, parse xmp failed : %v", err)
			return true
		}
	}
	if x.Basic.CreatorTool == "" {
		return false
	} else {
		checkLogger.Infof("Check image XMP, : %v", x.Basic.CreatorTool)
	}
	return true
}

func checkWebPageInfo(submission *pb.Submission) pb.SubmissionCheckResult_Status {
	if !conf.GlobalConf.CheckWebpageInfo {
		return pb.SubmissionCheckResult_OK
	}
	if submission.Webpage == "" {
		return pb.SubmissionCheckResult_OK
	}

	if !strings.Contains(submission.Webpage, "http:") && !strings.Contains(submission.Webpage, "https:") {
		submission.Webpage = "https://" + submission.Webpage
	}
	// input error
	parsedUrl, err := url.Parse(submission.Webpage)
	if err != nil {
		//checkLogger.Infof("Error parsing URL: %s,%s", err, submission.Webpage)
		return pb.SubmissionCheckResult_WEBPAGE_URL_NOT_VALID_OR_UNREACHABLE
	}

	if parsedUrl.Scheme != "http" && parsedUrl.Scheme != "https" {
		//checkLogger.Infof("Scheme not valid: %s", parsedUrl.Scheme)
		return pb.SubmissionCheckResult_WEBPAGE_URL_NOT_VALID_OR_UNREACHABLE
	}

	cli := &http.Client{Timeout: 3 * time.Second}
	resp, err := cli.Get(submission.Webpage)
	//todo: add more condition

	if err != nil {
		//checkLogger.Errorf("http get webpage failed %s,%s", err, submission.Webpage)
		return httpGetError(err, submission.Webpage)
	}

	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		//checkLogger.Errorf("http get webpage failed status code %d,%s", resp.StatusCode, submission.Webpage)
		return pb.SubmissionCheckResult_WEBPAGE_NETWORK_NOT_MATCH
	}

	if resp.ContentLength > 500000 {
		//checkLogger.Errorf("http get webpage too bigger %d", resp.ContentLength)
		return pb.SubmissionCheckResult_WEBPAGE_NETWORK_NOT_MATCH
	}

	content, _ := io.ReadAll(resp.Body)

	toValidate := checkSubmissionInWebpage(submission, string(content))
	return toValidate
}

type CheckType int

const (
	IMAGE_REPEATED CheckType = iota // iota 自增，从 0 开始
	IMAGE_INFO                      // 省略赋值，默认为上一行值加 1
	IMAGE_EDITED
	WEBPAGE_INFO
)

func prepareImagesInSubmissions(ctx context.Context, submissions []*pb.Submission) {
	var wg sync.WaitGroup
	startTime := time.Now()
	logStatus := "success"
	logReason := ""

	var mu sync.Mutex // 创建一个互斥锁
	for i, v := range submissions {
		if v.Image != "" {
			wg.Add(1)
			go func(sub *pb.Submission) {
				defer wg.Done()
				//				_, size, err := fastimage.DetectImageType(v.Image)
				//				if err != nil {
				//					checkLogger.Errorf("image fast detect failed:%s", err)
				//					sub.Image = ""
				//					return
				//				}
				//				if size.Height > 4096 || size.Width > 4096 {
				//					checkLogger.Errorf("image too big %d", size)
				//					sub.Image = ""
				//					return
				//				}
				http.DefaultClient.Timeout = time.Duration(5) * time.Second
				resp, err := http.DefaultClient.Get(v.Image)

				if err != nil {
					mu.Lock()
					logStatus = "failure"
					logReason = fmt.Sprintf("http get image failed %s,url:%s", err, v.Image)
					mu.Unlock()
					sub.ImageBase64 = ""
				}
				defer resp.Body.Close()
				if resp.StatusCode != 200 {
					mu.Lock()
					logStatus = "failure"
					logReason = fmt.Sprintf("http get image failed %d,url:%s", resp.StatusCode, v.Image)
					mu.Unlock()
					sub.ImageBase64 = "404"
				}

				data, rErr := io.ReadAll(resp.Body)
				if rErr != nil {
					mu.Lock()
					logStatus = "failure"
					logReason = fmt.Sprintf("read image failed %s, url:%s", err, v.Image)
					mu.Unlock()
					v.ImageBase64 = ""
					return
				}
				typeres, err := imageType.Parse(bytes.NewReader(data))
				if err != nil {
					mu.Lock()
					logStatus = "failure"
					logReason = fmt.Sprintf("image type parse failed %s,url:%s", err, v.Image)
					mu.Unlock()
					v.ImageBase64 = ""
					return
				}
				if typeres.MimeType != "" {
					sub.ImageBase64 = "data:" + typeres.MimeType + ";base64," + base64.StdEncoding.EncodeToString(data)
				} else {
					sub.ImageBase64 = base64.StdEncoding.EncodeToString(data)
				}
			}(submissions[i])
		}
	}
	wg.Wait()
	checkLogger.Infof(log.FmtLog(ctx.Value("traceid").(string), "", "checkEvidence", "prepareImage", logStatus, logReason, int(time.Since(startTime)/time.Millisecond)))
}
func CheckSubmissions(ctx context.Context, submissions []*pb.Submission) *pb.EvidenceCheckResp {
	if conf.GlobalConf.DownloadImage {
		prepareImagesInSubmissions(ctx, submissions)
	} else {
		lop.ForEach(submissions, func(submission *pb.Submission, _ int) {
			submission.ImageBase64 = submission.Image
		})
	}
	var allStatus = &pb.EvidenceCheckResp{
		Results: make([]*pb.SubmissionCheckResult, 0),
		Status:  pb.EvidenceCheckResp_ALL_SUCCEED,
	}
	imageProccessed.Add(float64((len(submissions))))
	allStatus.Results = make([]*pb.SubmissionCheckResult, 0)
	failedCnt := 0
	var wg sync.WaitGroup
	var messageChan = make(chan Message, len(submissions)+1)
	for i, v := range submissions {
		wg.Add(1)
		go func(channel chan Message, index int) {
			oneStatus, toSaveHash := checkSubmission(ctx, v)
			defer wg.Done()
			channel <- Message{Value: oneStatus, Index: i, ToSave: toSaveHash}
		}(messageChan, i)

	}
	wg.Wait()

	checkLogger.Debugf("submission check finished")
	allResult := make([]Message, 0)
	toSaveImages := make([]string, 0)
	for i := 0; i < len(submissions); i++ {
		oneResult := <-messageChan
		checkLogger.Debugf("submission check result %d, %s", oneResult.Index, oneResult.Value)
		allResult = append(allResult, oneResult)
		toSaveImages = append(toSaveImages, oneResult.ToSave)
	}
	checkLogger.Debugf("submission results before sorted", len(allResult))
	sort.Sort(MessageArray(allResult))
	close(messageChan)
	checkLogger.Debugf("submission results sorted", len(allResult))

	for _, v := range allResult {
		if v.Value.Status != pb.SubmissionCheckResult_OK {
			failedCnt = failedCnt + 1
			checkLogger.Debugf("submission check failed %s", v.Value)
		}
		oneResult := v.Value
		allStatus.Results = append(allStatus.Results, oneResult)
	}
	_, matchR := match.Match(failedCnt).
		When(0, pb.EvidenceCheckResp_ALL_SUCCEED).
		When(len(submissions), pb.EvidenceCheckResp_ALL_FAILED).
		When(match.ANY, pb.EvidenceCheckResp_SOME_FAILED).Result()
	allStatus.Status = matchR.(pb.EvidenceCheckResp_Status)
	if allStatus.Status == pb.EvidenceCheckResp_ALL_SUCCEED {
		for _, v := range toSaveImages {
			go imageHashSave(v)
		}
	}

	return allStatus
}

func checkSubmission(ctx context.Context, submission *pb.Submission) (*pb.SubmissionCheckResult, string) {
	//TODO: No need to validate entity, no rule
	submission.Entity = ""
	//正常情况下，一个 Submission 不会同时包含 image. txt, webpage. 只会包含其中的一种
	//一个任务可能会拆分成多个submission再后台并行执行
	//1. 如果图片下载不了
	if submission.ImageBase64 == "404" {
		return &pb.SubmissionCheckResult{
			Status: pb.SubmissionCheckResult_IMAGE_DATA_NOT_VALID,
		}, ""
	}
	ctx = context.WithValue(ctx, "submissionid", submission.Submissionid)
	dup, imageHash := checkImageDuplicated(ctx, submission.Image)
	if dup {
		return &pb.SubmissionCheckResult{
			Status: pb.SubmissionCheckResult_IMAGE_REPEATED,
		}, ""
	}

	//2. 如果图片信息校验出问题
	var status = checkImageInfo(ctx, submission)
	if status.Status != pb.SubmissionCheckResult_OK {
		return status, ""
	}

	//3. 如果web信息出问题
	//因为 webpage 内容依赖浏览器解析, 会有防抓取机制. 先屏蔽
	//	webPageStatus := checkWebPageInfo(submission)
	//	if webPageStatus != pb.SubmissionCheckResult_OK {
	//		status.Status = webPageStatus
	//		return status, ""
	//	}

	//4. translation
	txtWeb3Releated := false
	if submission.Text != "" {
		_, status.Translation, txtWeb3Releated = claude3.CallBedrockTranslate(ctx, submission.Text)
		if !txtWeb3Releated {
			status.Status = pb.SubmissionCheckResult_TEXT_WEB3_NOT_RELEATED
			return status, ""
		}
	}
	status.Status = pb.SubmissionCheckResult_OK
	return status, imageHash
}

//func CheckSubmissionsImageEdited(submissions []*pb.Submission) *pb.EvidenceCheckResp {
//	var allStatus = &pb.EvidenceCheckResp{
//		Results: make([]*pb.SubmissionCheckResult, 0),
//		Status:  pb.EvidenceCheckResp_ALL_SUCCEED,
//	}
//	allStatus.Results = make([]*pb.SubmissionCheckResult, 0)
//	failedCnt := 0
//	for _, v := range submissions {
//		edited := checkImageEdited(v)
//		if edited {
//			allStatus.Status = pb.EvidenceCheckResp_SOME_FAILED
//			failedCnt = failedCnt + 1
//			oneResult := pb.SubmissionCheckResult{
//				Status: pb.SubmissionCheckResult_IMAGE_EDITED,
//			}
//			allStatus.Results = append(allStatus.Results, &oneResult)
//		} else {
//			oneResult := pb.SubmissionCheckResult{
//				Status: pb.SubmissionCheckResult_OK,
//			}
//			allStatus.Results = append(allStatus.Results, &oneResult)
//		}
//	}
//	if failedCnt == len(submissions) {
//		allStatus.Status = pb.EvidenceCheckResp_ALL_FAILED
//	}
//	return allStatus
//}
//func CheckSubmissionsImageRepeated(submissions []*pb.Submission) *pb.EvidenceCheckResp {
//	var allStatus = &pb.EvidenceCheckResp{
//		Results: make([]*pb.SubmissionCheckResult, 0),
//		Status:  pb.EvidenceCheckResp_ALL_SUCCEED,
//	}
//	allStatus.Results = make([]*pb.SubmissionCheckResult, 0)
//	failedCnt := 0
//	for _, v := range submissions {
//		oneStatus, imageHash := checkImageDuplicated(ctx, v.Image)
//		if oneStatus {
//			allStatus.Status = pb.EvidenceCheckResp_SOME_FAILED
//			failedCnt = failedCnt + 1
//			oneResult := pb.SubmissionCheckResult{
//				Status: pb.SubmissionCheckResult_IMAGE_REPEATED,
//			}
//			allStatus.Results = append(allStatus.Results, &oneResult)
//			imageHashSave(imageHash)
//		} else {
//			oneResult := pb.SubmissionCheckResult{
//				Status: pb.SubmissionCheckResult_OK,
//			}
//			allStatus.Results = append(allStatus.Results, &oneResult)
//		}
//	}
//	if failedCnt == len(submissions) {
//		allStatus.Status = pb.EvidenceCheckResp_ALL_FAILED
//	}
//	return allStatus
//}

//func CheckSubmissionsImageInfo(submissions []*pb.Submission) *pb.EvidenceCheckResp {
//	var allStatus = &pb.EvidenceCheckResp{
//		Results: make([]*pb.SubmissionCheckResult, 0),
//		Status:  pb.EvidenceCheckResp_ALL_SUCCEED,
//	}
//	allStatus.Results = make([]*pb.SubmissionCheckResult, 0)
//	failedCnt := 0
//	for _, v := range submissions {
//		oneStatus := checkImageInfo(v)
//		if oneStatus.Status != pb.SubmissionCheckResult_OK {
//			allStatus.Status = pb.EvidenceCheckResp_SOME_FAILED
//			failedCnt = failedCnt + 1
//		}
//		oneResult := oneStatus
//		allStatus.Results = append(allStatus.Results, oneResult)
//	}
//	if failedCnt == len(submissions) {
//		allStatus.Status = pb.EvidenceCheckResp_ALL_FAILED
//	}
//	return allStatus
//}

//func CheckSubmissionsWebpageInfo(submissions []*pb.Submission) *pb.EvidenceCheckResp {
//	var allStatus = &pb.EvidenceCheckResp{
//		Results: make([]*pb.SubmissionCheckResult, 0),
//		Status:  pb.EvidenceCheckResp_ALL_SUCCEED,
//	}
//	allStatus.Results = make([]*pb.SubmissionCheckResult, 0)
//	failedCnt := 0
//	for _, v := range submissions {
//		oneStatus := checkWebPageInfo(v)
//		if oneStatus != pb.SubmissionCheckResult_OK {
//			allStatus.Status = pb.EvidenceCheckResp_SOME_FAILED
//			failedCnt = failedCnt + 1
//		}
//		oneResult := pb.SubmissionCheckResult{
//			Status: oneStatus,
//		}
//		allStatus.Results = append(allStatus.Results, &oneResult)
//	}
//	if failedCnt == len(submissions) {
//		allStatus.Status = pb.EvidenceCheckResp_ALL_FAILED
//	}
//	return allStatus
//}
