package server

import (
	"AICheckLogicBridge/config"
	"AICheckLogicBridge/log"
	checker "AICheckLogicBridge/pb/b18a/proto/evidence_checker"
	pb "AICheckLogicBridge/pb/b18a/proto/logic_bridge"
	"context"
	"time"

	"github.com/uptrace/opentelemetry-go-extra/otelzap"
	"go.opentelemetry.io/otel"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
)

var logger *otelzap.SugaredLogger

type AICheckLogicBridge struct {
	pb.UnimplementedAICheckLogicBridgeServer
}

var statusToStrDict = map[checker.SubmissionCheckResult_Status]string{
	checker.SubmissionCheckResult_IMAGE_ADDRESS_NOT_MATCH:              "Image address not match",
	checker.SubmissionCheckResult_IMAGE_REPEATED:                       "Image submitted more than once times",
	checker.SubmissionCheckResult_IMAGE_NETWORK_NOT_MATCH:              "Image network not match",
	checker.SubmissionCheckResult_IMAGE_ENTITY_NOT_MATCH:               "Image entity not match",
	checker.SubmissionCheckResult_IMAGE_EDITED:                         "Image seems edited",
	checker.SubmissionCheckResult_WEBPAGE_ADDRESS_NOT_MATCH:            "Link address not match",
	checker.SubmissionCheckResult_WEBPAGE_NETWORK_NOT_MATCH:            "Link network not match",
	checker.SubmissionCheckResult_IMAGE_DATA_NOT_VALID:                 "Image data invalid",
	checker.SubmissionCheckResult_WEBPAGE_ENTITY_NOT_MATCH:             "Link entity not match",
	checker.SubmissionCheckResult_WEBPAGE_URL_NOT_VALID_OR_UNREACHABLE: "Link invalid",
	checker.SubmissionCheckResult_CLAUDE3_NOT_AVAILABLE:                "Claude3 not available",
	checker.SubmissionCheckResult_CLAUDE3_RESPONSE_UNEXPECTED_DATA:     "Claude3 response unexpected data",
	checker.SubmissionCheckResult_TEXT_WEB3_NOT_RELEATED:               "Text web3 not related",
	checker.SubmissionCheckResult_OK:                                   "",
}

var statusToCode = map[checker.SubmissionCheckResult_Status]int{
	checker.SubmissionCheckResult_IMAGE_ADDRESS_NOT_MATCH:              2010,
	checker.SubmissionCheckResult_IMAGE_REPEATED:                       2010,
	checker.SubmissionCheckResult_IMAGE_NETWORK_NOT_MATCH:              2010,
	checker.SubmissionCheckResult_IMAGE_ENTITY_NOT_MATCH:               2014,
	checker.SubmissionCheckResult_IMAGE_EDITED:                         2010,
	checker.SubmissionCheckResult_WEBPAGE_ADDRESS_NOT_MATCH:            2012,
	checker.SubmissionCheckResult_WEBPAGE_NETWORK_NOT_MATCH:            2012,
	checker.SubmissionCheckResult_IMAGE_DATA_NOT_VALID:                 2010,
	checker.SubmissionCheckResult_WEBPAGE_ENTITY_NOT_MATCH:             2014,
	checker.SubmissionCheckResult_WEBPAGE_URL_NOT_VALID_OR_UNREACHABLE: 2014,
	checker.SubmissionCheckResult_CLAUDE3_NOT_AVAILABLE:                0,
	checker.SubmissionCheckResult_CLAUDE3_RESPONSE_UNEXPECTED_DATA:     0,
	checker.SubmissionCheckResult_TEXT_WEB3_NOT_RELEATED:               2011,
	checker.SubmissionCheckResult_OK:                                   0,
}
var checkClient checker.EvidenceCheckClient

func InitServer(conf *config.Config) {
	logger = log.InitLogger()
	do := grpc.WithTransportCredentials(insecure.NewCredentials())
	conn, err := grpc.Dial(conf.CheckGrpcEndpoint, do)
	if err != nil {
		logger.Fatalf("net.Connect err: %v", err)
	}
	//defer conn.Close()
	logger.Info("init grpc conn to evidence checker succeed")

	// 建立gRPC连接
	checkClient = checker.NewEvidenceCheckClient(conn)
}
func reConnectGrpc(conf *config.Config) {
	do := grpc.WithTransportCredentials(insecure.NewCredentials())
	conn, err := grpc.Dial(conf.CheckGrpcEndpoint, do)
	if err != nil {
		logger.Fatalf("net.Connect err: %v", err)
	}
	//defer conn.Close()
	logger.Info("init grpc conn to evidence checker succeed")

	// 建立gRPC连接
	checkClient = checker.NewEvidenceCheckClient(conn)
}

func (s *AICheckLogicBridge) Health(ctx context.Context, in *pb.HealthCheckReq) (*pb.HealthCheckResp, error) {

	//	startTime := time.Now()
	//	userTracer := otel.Tracer("health")
	//	ctx, userSpan := userTracer.Start(context.Background(), "health")
	//	defer userSpan.End()
	//	logger.InfofContext(ctx, log.FmtLog(userSpan.SpanContext().TraceID().String(), "", "health", "", "success", "", int(time.Since(startTime)/time.Millisecond)))
	return &pb.HealthCheckResp{
		ServiceName: "AICheckLogicBridge",
		Version:     "1.0.0",
		Status:      "OK",
		Timestamp:   time.Now().Unix() / int64(time.Second),
	}, nil
}

func (s *AICheckLogicBridge) CheckEvidence(ctx context.Context, in *pb.AIEvidenceCheckReq) (*pb.AIEvidenceCheckResp, error) {
	userTracer := otel.Tracer("checkEvidence")
	ctx, userSpan := userTracer.Start(ctx, "checkEvidence")
	defer userSpan.End()

	traceID := userSpan.SpanContext().TraceID().String()
	ctx = context.WithValue(ctx, config.GlobalConf.TraceKey, traceID)
	md, ok := metadata.FromIncomingContext(ctx)
	if ok {
		traceids, exists := md[config.GlobalConf.TraceKey]
		if exists && len(traceids) > 0 {
			ctx = context.WithValue(ctx, config.GlobalConf.TraceKey, traceids[0])
			traceID = traceids[0]
		}
	}
	//logger.Debugf("check evidence, %s-%s-%s-%s", in.Evidence, in.Address, in.Network, in.Entity)
	startTime := time.Now()
	logStatus := "success"
	logReason := ""
	defer func() {
		logger.InfofContext(ctx, log.FmtLog(traceID, in.Submissionid, "checkEvidence", "", logStatus, logReason, int(time.Since(startTime)/time.Millisecond)))
	}()

	submissions, retEviArr, offsets, err := parseReason(in.Evidence, in.Address, in.Network, in.Entity)

	if err != nil {
		logStatus = "failure"
		logReason = "invalid evidence json format"
		return &pb.AIEvidenceCheckResp{
			Code:    1,
			Message: "invalid evidence json format",
		}, nil
	}

	var req = &checker.EvidenceCheckReq{
		Submissions: submissions,
	}

	ctx = metadata.AppendToOutgoingContext(ctx, config.GlobalConf.TraceKey, traceID)

	resp, err := checkClient.CheckEvidence(ctx, req)
	if err != nil {
		logStatus = "failure"
		logReason = err.Error()
		return &pb.AIEvidenceCheckResp{
			Code:    1,
			Message: err.Error(),
		}, nil
	}
	checkResult := "SUCCESS"
	failedReason := ""

	// 检查是否审核不通过,审核通过才会进数据进行存储
	// 把动态类型当数据接口传递
	// 数据处理包含
	// 1. 对 submissions 按照传入的 evidence 切割,每个 evidence 可能会有多个 submission
	// 2. Evidence 添加 output, web3 releated 两个数组， 反写会 evidence
	// 3. ImageTag 写入CommonResp

	subCode := 0
	for _, v := range resp.Results {
		failedReason = statusToStrDict[v.Status]
		subCode = statusToCode[v.Status]
		if failedReason == "Claude3 not available" || failedReason == "Claude3 response unexpected data" {
			continue
		}
		if failedReason != "" {
			checkResult = "FAILED"
			break
		}
	}
	evidenceOutputJsonStr := ""
	imageTagsJsonStr := ""
	if checkResult == "SUCCESS" {
		evidenceOutputJsonStr = prepareOutputEvidence(resp.Results, offsets, retEviArr)
		imageTagsJsonStr = prepareImageTags(resp.Results, offsets, retEviArr)
	}

	if failedReason != "" {
		logStatus = "failure"
		logReason = failedReason
	}
	return &pb.AIEvidenceCheckResp{
		Code: 0,
		Data: &pb.RespCommonData{
			Reason:    failedReason,
			Result:    checkResult,
			Output:    evidenceOutputJsonStr, //[evidence]
			ImageTags: imageTagsJsonStr,      //map[string]imageTag
			Code:      int32(subCode),
		},
	}, nil
}

func (s *AICheckLogicBridge) CheckReason(ctx context.Context, in *pb.AIReasonCheckReq) (*pb.AIReasonCheckResp, error) {
	userTracer := otel.Tracer("checkReason")
	ctx, userSpan := userTracer.Start(ctx, "checkReason")
	defer userSpan.End()
	traceID := userSpan.SpanContext().TraceID().String()
	ctx = context.WithValue(ctx, config.GlobalConf.TraceKey, traceID)
	md, ok := metadata.FromIncomingContext(ctx)
	if ok {
		traceids, exists := md[config.GlobalConf.TraceKey]
		if exists && len(traceids) > 0 {
			ctx = context.WithValue(ctx, config.GlobalConf.TraceKey, traceids[0])
			traceID = traceids[0]
		}
	}
	//TODO: input check
	//logger.Debugf("check reason, %s-%s-%s-%s", in.Reason, in.Address, in.Network, in.Entity)
	startTime := time.Now()
	logStatus := "success"
	logReason := ""
	defer func() {
		logger.InfofContext(ctx, log.FmtLog(traceID, in.Submissionid, "checkReason", "", logStatus, logReason, int(time.Since(startTime)/time.Millisecond)))
	}()

	submissions, retEviArr, offsets, err := parseReason(in.Reason, in.Address, in.Network, in.Entity)
	if err != nil {
		logStatus = "failure"
		logReason = err.Error()
		//TODO: add jsonstr
		return &pb.AIReasonCheckResp{
			Code:    1,
			Message: "invalid reason json format",
			Data: &pb.RespCommonData{
				Reason: err.Error(),
				Result: "FAILED",
				Code:   2010,
			},
		}, nil
	}

	var req = &checker.EvidenceCheckReq{
		Submissions: submissions,
	}
	ctx = metadata.AppendToOutgoingContext(ctx, config.GlobalConf.TraceKey, traceID)
	resp, err := checkClient.CheckEvidence(ctx, req)
	if err != nil {
		logStatus = "failure"
		logReason = err.Error()
		//logger.Errorf("check evidence rpc failed %s", err)
		return &pb.AIReasonCheckResp{
			Code:    1,
			Message: "rpc call failed," + err.Error(),
		}, nil
	}

	checkResult := "SUCCESS"
	failedReason := ""
	subCode := 0
	for _, v := range resp.Results {
		failedReason = statusToStrDict[v.Status]
		subCode = statusToCode[v.Status]
		if failedReason == "Claude3 not available" || failedReason == "Claude3 response unexpected data" {
			continue
		} else if checkResult != "" {
			checkResult = "FAILED"
			break
		}
	}
	evidenceOutputJsonStr := ""
	imageTagsJsonStr := ""
	if checkResult == "SUCCESS" {
		evidenceOutputJsonStr = prepareOutputEvidence(resp.Results, offsets, retEviArr)
		imageTagsJsonStr = prepareImageTags(resp.Results, offsets, retEviArr)
	}
	if failedReason != "" {
		logStatus = "failure"
		logReason = failedReason
	}
	return &pb.AIReasonCheckResp{
		Code: 0,
		Data: &pb.RespCommonData{
			Reason:    failedReason,
			Result:    checkResult,
			Output:    evidenceOutputJsonStr, //[evidence]
			ImageTags: imageTagsJsonStr,      //map[string]imageTag
			Code:      int32(subCode),
		},
	}, nil
}
