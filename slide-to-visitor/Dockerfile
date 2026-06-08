FROM python:3.10
RUN pip install --upgrade pip
#RUN mkdir /opt
WORKDIR /opt/
EXPOSE 8080
# 将 requirements.txt 复制到 /opt/ 目录
COPY ["requirements.txt", "/opt/"]
RUN pip install flask
RUN pip install -r requirements.txt
# 将其余文件复制到 /opt/ 目录
COPY [".", "/opt/"]
#CMD   uvicorn server:app --port 8081 --host 0.0.0.0
ENV db.url mongodb://<USER>:<REDACTED>@<MONGO_HOST_REDACTED>/admin?replicaSet=<REDACTED>
ENV api.url https://app.codatta.io/api/medical/upload
ENV oss.id <ALIYUN_OSS_KEY_ID_REDACTED>
ENV oss.secret <ALIYUN_OSS_SECRET_REDACTED>
ENV oss.private_endpoint https://medical-image.codatta.io/
ENV oss.bucket_name codatta-medical-image
ENV oss.region ap-southeast-1
ENV basepath /root/image-data
CMD python -u scheduler_trigger.py

