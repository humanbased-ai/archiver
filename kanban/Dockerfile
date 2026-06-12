# # Stage 1: Build dependencies
# FROM node:20-alpine as dependencies

# WORKDIR /opt/

# #这两个文件要提交到git仓库
# COPY package.json yarn.lock /opt/

# RUN yarn install

# # Stage 2: Build the application
# FROM dependencies as build

# # Copy the rest of the application code
# COPY ./ /opt/
# # 修复编译过程内存不足
# ENV NODE_OPTIONS="--max-old-space-size=4096"

# # print env file
# RUN cat .env

# # Build the application
# RUN yarn run build

# Stage 3: Create the final image
FROM nginx:1.25.2-alpine-slim

ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/

# Copy built artifacts from the build stage
COPY ./dist /usr/share/nginx/html/
COPY ./default.conf /etc/nginx/conf.d/

#CMD ["/bin/sh","-c", "nginx -g 'daemon off;'"]
