
export DOC_DIR=/Users/nolan/bisonpay/riskControlServer/doc
export PROTO_DIR=/Users/nolan/bisonpay/riskControlServer/proto

go install github.com/pseudomuto/protoc-gen-doc/cmd/protoc-gen-doc@latest
mkdir -p $DOC_DIR
protoc --doc_out=$DOC_DIR --proto_path=$PROTO_DIR --doc_opt=html,$DOC_DIR/proto.html $PROTO_DIR/*.proto
