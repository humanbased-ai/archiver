# 阶段1: 构建阶段
FROM golang:1.23.4 AS builder

# 设置工作目录
WORKDIR /app

# 将 go.mod 和 go.sum 文件复制到容器中
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 将项目文件复制到工作目录
COPY . .

# 构建二进制文件
RUN go build -o main .

# 第二阶段：运行阶段
FROM golang:1.23.4

# 设置工作目录
WORKDIR /root/

# 从构建阶段复制编译好的二进制文件
COPY --from=builder /app/main .

# 设置容器启动命令
CMD ["./main"]