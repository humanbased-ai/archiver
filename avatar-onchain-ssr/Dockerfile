FROM node:22

ENV NODE_ENV=production
WORKDIR /app

# 从 builder 复制 standalone 构建产物
COPY ./.next/standalone ./
COPY ./.next/static ./.next/static

# 如果使用了 node_modules 依赖（如某些 serverless 场景）
COPY ./node_modules ./node_modules

# 暴露端口并启动
EXPOSE 8080
CMD ["node", "server.js"]