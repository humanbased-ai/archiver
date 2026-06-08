import os

def get_id():
    return os.getenv("oss.id","<ALIYUN_OSS_KEY_ID_REDACTED>")

def get_secret():
    return os.getenv("oss.secret","<ALIYUN_OSS_SECRET_REDACTED>")

def get_private_endpoint():
    return os.getenv("oss.private_endpoint","https://medical-image.codatta.io/")

def get_bucket_name():
    return os.getenv("oss.bucket_name","codatta-medical-image")

def get_region():
    # return os.getenv("oss.region","eu-central-1")
    return os.getenv("oss.region", "ap-southeast-1")
