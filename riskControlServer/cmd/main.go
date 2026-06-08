package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"

	"riskControlServer/dao"
	pb "riskControlServer/pb/gateway/riskcontrol"

	"riskControlServer/server"

	"riskControlServer/config"

	"github.com/BurntSushi/toml"
	"github.com/alecthomas/kingpin/v2"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

var (
	confPath = kingpin.Arg("conf", "config path").Default("./config/config.toml").String()
	port     = kingpin.Arg("port", "the port to restful serve on").Default("8089").Int()
	grpcport = kingpin.Arg("grpcPort", "the port to grpc serve on").Default("50039").Int()
)

func initGrpc() {
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", *grpcport))
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterRiskControlServerServer(grpcServer, &server.RiskControlServer{})
	reflection.Register(grpcServer)

	log.Println("gRPC server started on port ", *grpcport)
	go func() {
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("failed to serve: %v", err)
		}
	}()
}
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
	config.GlobalConfig = initConf(*confPath)
	dao.InitConn(config.GlobalConfig)
	go initGrpc()
	mux := runtime.NewServeMux()
	err := pb.RegisterRiskControlServerHandlerFromEndpoint(context.Background(), mux, fmt.Sprintf(":%d", *grpcport), []grpc.DialOption{grpc.WithInsecure()})
	if err != nil {
		log.Fatalf("failed to register gRPC-Gateway handler: %v", err)
	}

	log.Println("gRPC-Gateway server started on port ", *port)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", *port), mux); err != nil {
		log.Fatalf("failed to serve gRPC-Gateway: %v", err)
	}
}
