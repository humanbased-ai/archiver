package evidencechecker

import (
	"context"
	"evidenceCheckServer/log"
	pb "evidenceCheckServer/pb/b18a/proto/evidence_checker"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel"
	"google.golang.org/grpc/metadata"
)

type EvidenceCheckServer struct {
	pb.UnimplementedEvidenceCheckServer
}

var requestDurations = prometheus.NewSummary(prometheus.SummaryOpts{
	Name: "http_request_duration_seconds",
	Help: "A summary of the HTTP request durations in seconds.",
	Objectives: map[float64]float64{
		0.5:  0.05,  // 第50个百分位数，最大绝对误差为0.05。
		0.9:  0.01,  // 第90个百分位数，最大绝对误差为0.01。
		0.99: 0.001, // 第90个百分位数，最大绝对误差为0.001。
	},
},
)

var imageProccessed = prometheus.NewCounter(prometheus.CounterOpts{
	Name: "image_processed_total",
	Help: "The total number of image processed.",
})

func (s *EvidenceCheckServer) Health(ctx context.Context, in *pb.HealthCheckRequest) (*pb.HealthCheckResponse, error) {
	//	startTime := time.Now()
	//	userTracer := otel.Tracer("checkEvidence")
	//	ctx, userSpan := userTracer.Start(context.Background(), "checkEvidence")
	//	defer userSpan.End()
	//	go func() {
	//		checkLogger.InfofContext(ctx, log.FmtLog(userSpan.SpanContext().TraceID().String(), "", "health", "", "success", "", int(time.Since(startTime)/time.Millisecond)))
	//	}()
	return &pb.HealthCheckResponse{}, nil
}

func (s *EvidenceCheckServer) CheckEvidence(ctx context.Context, in *pb.EvidenceCheckReq) (*pb.EvidenceCheckResp, error) {
	startTime := time.Now()
	userTracer := otel.Tracer("checkEvidence")
	ctx, userSpan := userTracer.Start(ctx, "checkEvidence")
	defer userSpan.End()
	md, ok := metadata.FromIncomingContext(ctx)
	traceID := ""
	if ok {
		traceids, exists := md["traceparent"]
		if exists && len(traceids) > 0 {
			ctx = context.WithValue(ctx, "traceparent", traceids[0])
			traceID = traceids[0]
		}
	}
	logStatus := "success"
	logReason := ""
	subCtx := context.WithValue(ctx, "traceid", traceID)

	go func() {
		checkLogger.InfofContext(ctx, log.FmtLog(userSpan.SpanContext().TraceID().String(), "", "checkEvidence", "", logStatus, logReason, int(time.Since(startTime)/time.Millisecond)))
	}()

	timectx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel() // 确保在函数结束时取消context，释放资源
	chanResult := make(chan *pb.EvidenceCheckResp, 1)
	dur := time.Since(startTime)
	go func() {
		checkResult := CheckSubmissions(subCtx, in.Submissions)
		chanResult <- checkResult
		close(chanResult)
	}()

	defer requestDurations.Observe(dur.Seconds())
	select {
	case <-timectx.Done():
		return &pb.EvidenceCheckResp{Status: pb.EvidenceCheckResp_ALL_SUCCEED}, nil
	case r := <-chanResult:
		return r, nil
	}
	return &pb.EvidenceCheckResp{Status: pb.EvidenceCheckResp_ALL_SUCCEED}, nil
}

func (s *EvidenceCheckServer) Translate(ctx context.Context, in *pb.TranslationReq) (*pb.TranslationResp, error) {
	//TODO: add real resp
	return &pb.TranslationResp{}, nil
}

func (s *EvidenceCheckServer) CheckImageRepeated(ctx context.Context, in *pb.EvidenceCheckReq) (*pb.EvidenceCheckResp, error) {
	return &pb.EvidenceCheckResp{}, nil
}
func (s *EvidenceCheckServer) CheckImageInfo(ctx context.Context, in *pb.EvidenceCheckReq) (*pb.EvidenceCheckResp, error) {
	return &pb.EvidenceCheckResp{}, nil
}
func (s *EvidenceCheckServer) CheckImageEdited(ctx context.Context, in *pb.EvidenceCheckReq) (*pb.EvidenceCheckResp, error) {
	return &pb.EvidenceCheckResp{}, nil
}
func (s *EvidenceCheckServer) CheckWebpageInfo(ctx context.Context, in *pb.EvidenceCheckReq) (*pb.EvidenceCheckResp, error) {
	return &pb.EvidenceCheckResp{}, nil
}
