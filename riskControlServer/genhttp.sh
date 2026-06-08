protoc --go_out=/Users/nolan/bisonpay/riskControlServer/pb  \
   --go-grpc_out=/Users/nolan/bisonpay/riskControlServer/pb \
   --grpc-gateway_out=/Users/nolan/bisonpay/riskControlServer/pb  \
   -I /Users/nolan/bisonpay/riskControlServer/proto \
   -I /Users/nolan/bisonpay/riskControlServer \
   /Users/nolan/bisonpay/riskControlServer/proto/risk-control.proto
