FROM python:3.9-alpine
#RUN mkdir /opt
WORKDIR /opt/
EXPOSE 8080
# 将 requirements.txt 复制到 /opt/ 目录
COPY ["requirements.txt", "/opt/"]
# RUN pip3 install flask --index-url=http://192.168.100.223:11180/repository/pypi-group/simple -r requirements.txt --trusted-host=192.168.100.223
RUN pip3 install flask -r requirements.txt
# 将其余文件复制到 /opt/ 目录
COPY [".", "/opt/"]

ENV GOOGLE_APPLICATION_CREDENTIALS /opt/application_default_credentials.json
#ENV DYNAMIC_URL   https://app.dynamicauth.com
#
#ENV DYNAMIC_ENVIRONMENT_ID   ff6ba2b0-bfbc-4a51-b6a6-624ff7365f18
#ENV DYNAMIC_ENVIRONMENT_TOKEN   Bearer dyn_buuRgBzGCvT8GtMveEF3ECMeQm4tUJktvs78YhLzoFFyIGC6Sv3P9JYM
#ENV DYNAMIC_SECRET_KEY -----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA2r6DTmry+5Mus5kE/WyQSWudAjg3zHTWorzSaj2HJqxTCx5t2NnOmfRcjueNfHnonAni/brpJVMG9dQQ840oKAX9tAtQZZrBAE/1c9oG7BkSqcjQP3//R4YNqBgRg+lzar8G/dVa60wWkI6NIAQ4cC8d9q1ZvxkP8Y1EGGqyiQs3/AiFQ66pZJhu5jWG1ZH8hwXel0SjFKoC3Ge62hAT0pOvLwPhRr3B0koN1kwFzl/lXDqP6ochHIIhzAp3ewr/DaEwrkpGNDjZazJCqRwjsY0ERXhoNKWlY6h+kxPstOVvsumGeYMeaae9AUVWMGNyi9cFdXfe9kB1+lv2GEX0BRvks6uOtMBz33eQwkch65srVHGH78JK8Hd25OhkF3jpNSLH+0ojZv3ULiFFIlfiVfcbewZNV10wdgtqYabGYXanmOH7sYdSvWLPvB+0GXkNbvOD2CUAsbk1ayWH3w+jQS0y9PeZ8xYoyW5YVlyYQA/VeXNe8n5jz1iwHLGHRRYax7J0mXuKJuLgDNbTX4xUZ0jyKHSffEgMW4CXX3hZuL/AgLWiQPXBGlcdW3rFqxy6qpEvqLIl68qQITdrCBM4vxm2jEH4jZPg7daINOzcw4wHFJhAUwMDglMXkoWFfBRuGwD91PMX9TMmXCBNhShdG97g3PpI5xSmnuaazS2IfLsCAwEAAQ==\n-----END PUBLIC KEY-----
#ENV DYNAMIC_WEBHOOK_CREATE_USER_SECRET dyn_1lP:1XOlD7DvrwR81pCEKkMOmVK2ISqffYHmlF3qW75WEwMY9D3NReOU
#ENV DYNAMIC_WEBHOOK_LOGIN_SECRET dyn_0Uh8wo5adOsnIMo9iRTPr:EFQqhqBYV1l1t46vfBh4VHOkUFRQ46gJVm
#ENV DYNAMIC_WEBHOOK_USER_LINKED dyn_kcmaxFVPW7ROpiC31opb[eLV:m3wIkMlx7EuLWRVGJBx3Qv49n1Ufk3C
#
#ENV USER_ROLE_RULE [{"TAG_CHECK":{"reputation":" >= 0 "}},{"TAG_FEEDBACK":{"reputation":">=1","token":">=2"}}]
#ENV GCP_STORAGE_BUCKET_NAME ominitags-image
#ENV GCP_STORAGE_RUL https://file.b18a.io
#ENV USER_DEFAULT_AVATAR_URL https://file.b18a.io/default.png

CMD python3 -u server.py
