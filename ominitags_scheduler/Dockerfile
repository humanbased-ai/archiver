FROM python:3.9-slim
#RUN mkdir /opt
WORKDIR /opt/
EXPOSE 8080
# 将 requirements.txt 复制到 /opt/ 目录
COPY ["requirements.txt", "/opt/"]
RUN pip3 install flask -r requirements.txt
# 将其余文件复制到 /opt/ 目录
COPY [".", "/opt/"]
#CMD   uvicorn server:app --port 8081 --host 0.0.0.0
ENV ms.db.url mysql://<USER>:<REDACTED>@<DB_HOST_REDACTED>/omnitags_db_orm
ENV ton_api_url https://testnet.tonapi.io/v2/blockchain/transactions/
CMD python3 -u scheduler_trigger.py

