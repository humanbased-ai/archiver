FROM golang:1.22


WORKDIR /src
# pre-copy/cache go.mod for pre-downloading dependencies and only redownloading them in subsequent builds if they change
COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .
RUN mkdir -p /etc /app  
RUN go build -v  cmd/main.go  #-o /app  #./...


RUN cp ./config/config.toml /etc

RUN cp /src/main /app/riskControlServer

## 设置工作目录为 /app
#ENV MY_ENV_VAR=""

WORKDIR /app
# 指定容器运行时的启动命令，这里假设 your-executable 是一个可执行的文件
#CMD ["/app/riskControlServer -c /etc/config.toml"]

# 暴露端口，如果 your-executable 监听某个端口，将以下行取消注释并指定端口号
EXPOSE 8080

