FROM golang:1.22 AS builder
# 设置工作目录
WORKDIR /app
# 复制go.mod和go.sum文件，用于下载Go依赖
COPY ["go.mod", "/app/"]
COPY ["go.sum", "/app/"]
RUN go mod download
# 复制Makefile和源代码
COPY [".", "/app/"]
# 使用Makefile进行编译
RUN make build
# 使用alpine作为最终的运行镜像，因为它体积小
FROM alpine:latest
# 创建所需的目录结构
RUN mkdir -p /etc /app
# 从builder镜像中复制编译好的二进制文件
COPY --from=builder /app/main /app/evidenceCheckServer
COPY --from=builder /app/conf/config.toml /etc/config.toml
# 设置工作目录为 /app
WORKDIR /app
# 定义环境变量，如果需要的话
ENV MY_ENV_VAR=""
# 指定容器运行时的启动命令，这里假设 your-executable 是一个可执行的文件
CMD ["/app/evidenceCheckServer", "/etc/config.toml"]
# 暴露端口，如果 your-executable 监听某个端口，将以下行取消注释并指定端口号
EXPOSE 50052
EXPOSE 8082
EXPOSE 60052
