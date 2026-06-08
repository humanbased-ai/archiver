package main

import (
	"AICheckLogicBridge/config"
	"AICheckLogicBridge/log"
	pb "AICheckLogicBridge/pb/b18a/proto/logic_bridge"
	"AICheckLogicBridge/server"
	"context"
	"net"
	"net/http"

	"github.com/BurntSushi/toml"
	kingpin "github.com/alecthomas/kingpin/v2"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/uptrace/opentelemetry-go-extra/otelzap"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"

	//"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/reflection"
)

var confPath = kingpin.Arg("conf", "config path").Default("./config/config.toml").String()
var logger *otelzap.SugaredLogger

func initConf(confPath string) *config.Config {
	conf := &config.Config{}
	_, err := toml.DecodeFile(confPath, &conf)
	if err != nil {
		logger.Fatalf(log.FmtLog("", "", "initConf", "", "failure", err.Error(), 0))
	}
	return conf
}
func initGrpc() {
	lis, err := net.Listen("tcp", config.GlobalConf.GrpcEndpoint)
	if err != nil {
		logger.Fatalf(log.FmtLog("", "", "startGrpc", "", "failure", err.Error(), 0))
	}
	grpcServer := grpc.NewServer()
	//grpc.UnaryInterceptor(unaryServerInterceptor()),
	//)
	pb.RegisterAICheckLogicBridgeServer(grpcServer, &server.AICheckLogicBridge{})
	reflection.Register(grpcServer)

	logger.Infof("gRPC server started on port %s ", config.GlobalConf.GrpcEndpoint)
	go func() {
		if err := grpcServer.Serve(lis); err != nil {
			logger.Fatalf(log.FmtLog("", "", "startGrpc", "", "failure", err.Error(), 0))
		}
	}()
}
func main() {
	kingpin.Parse()
	config.GlobalConf = initConf(*confPath)
	logger = log.InitLogger()

	tp, err := newTracerProvider()
	if err != nil {
		logger.Infof(log.FmtLog("", "", "main", "", "failure", err.Error(), 0))
	}
	defer func() { _ = tp.Shutdown(context.Background()) }()

	initGrpc()
	server.InitServer(config.GlobalConf)
	traceKey := config.GlobalConf.TraceKey
	mux := runtime.NewServeMux(
		runtime.WithMetadata(func(ctx context.Context, req *http.Request) metadata.MD {
			return metadata.New(map[string]string{
				traceKey: req.Header.Get(traceKey),
			})
		}),
	)

	logger.Infof("Register GRPC Handler %d", config.GlobalConf.GrpcEndpoint)
	err = pb.RegisterAICheckLogicBridgeHandlerFromEndpoint(context.Background(), mux, config.GlobalConf.GrpcEndpoint, []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())})
	if err != nil {
		logger.Fatalf(log.FmtLog("", "", "registerGrpc", "", "failure", err.Error(), 0))
	}

	logger.Infof("gRPC-Gateway server started on port %s", config.GlobalConf.HttpEndpoint)

	if err := http.ListenAndServe(config.GlobalConf.HttpEndpoint, otelhttp.NewHandler(mux, "gateway")); err != nil {
		logger.Fatalf(log.FmtLog("", "", "servGrpc", "", "failure", err.Error(), 0))
	}
}

// trace
//
//	func unaryServerInterceptor() grpc.UnaryServerInterceptor {
//	   return func(
//	       ctx context.Context,
//	       req interface{},
//	       info *grpc.UnaryServerInfo,
//	       handler grpc.UnaryHandler,
//	   ) (interface{}, error) {
//	       md, ok := metadata.FromIncomingContext(ctx)
//	       if ok {
//	           fmt.Println("Received metadata:", md)
//	       } else {
//	           fmt.Println("No metadata received")
//	       }
//	       fmt.Println("Request:", req)
//
//	       // 调用实际的 gRPC 方法
//	       resp, err := handler(ctx, req)
//	       if err != nil {
//	           return nil, err
//	       }
//
//	       fmt.Println("Response:", resp)
//	       return resp, nil
//	   }
//	}
func newTracerProvider() (*trace.TracerProvider, error) {
	//	exporter, err := stdouttrace.New(stdouttrace.WithPrettyPrint())
	//	if err != nil {
	//		return nil, err
	//	}

	tp := trace.NewTracerProvider(
		//trace.WithBatcher(exporter),
		trace.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceNameKey.String("aicheck-logic-bridge"),
			semconv.ServiceVersionKey.String("1.0.0"),
		)),
	)

	otel.SetTracerProvider(tp)
	return tp, nil
}
