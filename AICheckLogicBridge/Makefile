PROTO_DIR=./proto
DOC_DIR=./doc

#生成proto文件的markdown接口定义文档
protodoc-markdown:
	@go install github.com/pseudomuto/protoc-gen-doc/cmd/protoc-gen-doc@latest
	@mkdir -p $(DOC_DIR)
	@protoc --doc_out=$(DOC_DIR) --proto_path=$(PROTO_DIR) --doc_opt=markdown,$(DOC_DIR)/proto.md $(PROTO_DIR)/*.proto

#生成proto文件的html接口定义文档
protodoc-html:
	@go install github.com/pseudomuto/protoc-gen-doc/cmd/protoc-gen-doc@latest
	@mkdir -p $(DOC_DIR)
	@protoc --doc_out=$(DOC_DIR) --proto_path=$(PROTO_DIR) --doc_opt=html,$(DOC_DIR)/proto.html $(PROTO_DIR)/*.proto

build:
	CGO_ENABLED=0 go build cmd/main.go

image: 
	#docker run --rm -it -v `pwd`:/evidenceCheckServer chaintool.ai/go-ubuntu-builder bash make build
	docker build . -t chaintool.ai/ai-check-logic-bridge
	#docker push chaintool.ai/evidence-check-server
	#echo "image build success"
