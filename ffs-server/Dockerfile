FROM python:3.9-alpine

#RUN mkdir /opt
WORKDIR /opt/
EXPOSE 8080

# 将 requirements.txt 复制到 /opt/ 目录
COPY ["requirements.txt", "/opt/"]

# RUN pip3 install flask
RUN pip3 install flask -r requirements.txt

# 将其余文件复制到 /opt/ 目录
COPY [".", "/opt/"]

CMD python3 -u server.py
