import hashlib
import random
import string

def generate_code(text):
    # 生成随机盐
    salt = ''.join(random.choices(string.ascii_letters + string.digits, k=4))
    # 使用SHA-256哈希算法
    sha256 = hashlib.sha256()
    sha256.update((text + salt).encode('utf-8'))
    # 获取哈希值的前8位
    code = sha256.hexdigest()[:8]
    return code

# 示例短文本
text1 = "metis"

# 生成代码
code1 = generate_code("metis") # b4ad3d6d
print (code1)