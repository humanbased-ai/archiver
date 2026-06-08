# 使用 Node.js 20 的 Alpine 轻量级镜像作为基础镜像
FROM node:20.15.0

# 设置容器内的工作目录
WORKDIR /app

# 将项目根目录下的 package.json 和 package-lock.json 复制到工作目录
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 将项目的其他文件复制到工作目录
COPY . .

# 暴露项目监听的端口，这里假设项目监听 8080 端口
EXPOSE 8080

# 定义容器启动时执行的命令，启动项目
CMD ["npm", "start"]