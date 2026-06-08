protoc --go_out=./pb  \
   --go-grpc_out=./pb \
   --grpc-gateway_out=./pb  \
   -I ./proto \
   -I . \
   ./proto/logic-bridge.proto
protoc --go_out=./pb  \
   --go-grpc_out=./pb \
   --grpc-gateway_out=./pb  \
   -I ./proto \
   -I . \
   ./proto/evidence-checker.proto 
