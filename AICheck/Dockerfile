FROM python:3.12-bullseye
ENV PYTHONIOENCODING=utf-8
ENV PROJECT_ID=chaintool-etl
ENV REGION=us-central1
ENV REDIS_HOST=<INTERNAL_IP_REDACTED>
ENV REDIS_PORT=6379
ENV REDIS_DB=6
ENV REDIS_STORE_DAY=7

WORKDIR /opt/
EXPOSE 80
RUN   pip3 install uvicorn[standard]  fastapi  redis datasketch[redis] asyncer vertexai anthropic[vertex] google-cloud-aiplatform retry fake_useragent
COPY ["*", "/opt/"]
CMD  uvicorn main:app --host 0.0.0.0  --proxy-headers --port 80