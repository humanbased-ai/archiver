# 使用Python 3.9 slim镜像作为基础镜像
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 复制所有git文件到容器内
COPY . .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 设置权限
RUN chmod +x app.py

# 显示文件列表（调试用）
RUN ls -la

# 健康检查（可选）
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health', timeout=5)" || exit 1

# 设置入口点
ENTRYPOINT ["python", "app.py"]
