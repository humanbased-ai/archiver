package main

import (
	"context"
	"evidenceCheckServer/claude3"
	"evidenceCheckServer/conf"
	config "evidenceCheckServer/conf"
	evidencechecker "evidenceCheckServer/evidenceChecker"
	"evidenceCheckServer/log"
	pb "evidenceCheckServer/pb/b18a/proto/evidence_checker"
	"net"
	"net/http"

	"github.com/BurntSushi/toml"
	"github.com/alecthomas/kingpin/v2"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/uptrace/opentelemetry-go-extra/otelzap"
	"go.opentelemetry.io/otel"
	//"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/reflection"
)

var (
	confPath = kingpin.Arg("conf", "config path").Default("./conf/config.toml").String()
	logger   *otelzap.SugaredLogger
)

func initGrpc() {
	lis, err := net.Listen("tcp", config.GlobalConf.GrpcEndpoint)
	if err != nil {
		logger.Errorf(log.FmtLog("", "", "main", "initGrpc", "failure", err.Error(), 0))
	}
	grpcServer := grpc.NewServer()
	pb.RegisterEvidenceCheckServer(grpcServer, &evidencechecker.EvidenceCheckServer{})
	reflection.Register(grpcServer)

	//logger.Infof("gRPC server started on port %s", config.GlobalConf.GrpcEndpoint)
	go func() {
		if err := grpcServer.Serve(lis); err != nil {
			logger.Errorf(log.FmtLog("", "", "main", "initGrpc", "failure", err.Error(), 0))
		}
	}()
}
func initPrometheus() {
	http.Handle("/metrics", promhttp.Handler())
	err := http.ListenAndServe(config.GlobalConf.PromEndpoint, nil)
	if err != nil {
		logger.Infof(log.FmtLog("", "", "main", "initProm", "failure", err.Error(), 0))
		//logger.Infof("prometheus listen failed %s", err.Error())
	}
	//logger.Infof("Prometheus metrics on port: %s", config.GlobalConf.PromEndpoint)
}

// init conf before init logger
func initConf(confPath string) *config.Config {
	conf := &config.Config{}
	_, err := toml.DecodeFile(confPath, &conf)
	if err != nil {
		panic(err)
	}
	return conf
}
func main() {
	kingpin.Parse()
	conf.GlobalConf = initConf(*confPath)
	logger = log.InitLogger(conf.GlobalConf.LogLevel)
	tp, err := newTracerProvider()
	if err != nil {
		logger.Fatalf(log.FmtLog("", "", "main", "initTrace", "failure", err.Error(), 0))
	}
	defer func() { _ = tp.Shutdown(context.Background()) }()
	evidencechecker.InitChecker()
	claude3.Init()
	go initGrpc()
	go initPrometheus()
	mux := runtime.NewServeMux()
	err = pb.RegisterEvidenceCheckHandlerFromEndpoint(context.Background(),
		mux,
		config.GlobalConf.GrpcEndpoint,
		[]grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials()),
			grpc.WithDefaultCallOptions(
				grpc.MaxCallRecvMsgSize(20*1024*1024),
				grpc.MaxCallSendMsgSize(20*1024*1024),
			)})
	if err != nil {
		logger.Fatalf(log.FmtLog("", "", "main", "registerGrpcHandler", "failure", err.Error(), 0))
	}

	logger.Infof("gRPC-Gateway server started on port %s", config.GlobalConf.HttpEndpoint)
	if err := http.ListenAndServe(config.GlobalConf.HttpEndpoint, mux); err != nil {
		logger.Fatalf(log.FmtLog("", "", "main", "initGrpcGateway", "failure", err.Error(), 0))
	}

}

func newTracerProvider() (*trace.TracerProvider, error) {
	//	exporter, err := stdouttrace.New(stdouttrace.WithPrettyPrint())
	//	if err != nil {
	//		return nil, err
	//	}

	tp := trace.NewTracerProvider(
		//trace.WithBatcher(exporter),
		trace.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceNameKey.String("evidence-check-server"),
			semconv.ServiceVersionKey.String("1.0.0"),
		)),
	)

	otel.SetTracerProvider(tp)
	return tp, nil
}
