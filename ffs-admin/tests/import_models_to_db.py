#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
将模型配置导入到数据库。
"""

import os
import sys
import argparse
from datetime import datetime
import pymysql
from pymysql.cursors import DictCursor

# 添加项目根目录到 sys.path
sys.path.insert(0, '/Users/yangxiaohu/Documents/work/R6D9/ffs-server')

# 导入模型配置
from tests.model_config import MODEL_CONFIGS, ModelOrg

# API密钥
API_KEYS = {
    ModelOrg.CHATGPT.value: "<OPENAI_KEY_REDACTED>",
    ModelOrg.CLAUDE.value: "<ANTHROPIC_KEY_REDACTED>",
    ModelOrg.QWEN.value: "<QWEN_KEY_REDACTED>",
    ModelOrg.GROK.value: "<XAI_KEY_REDACTED>",
    ModelOrg.GEMINI.value: "<GEMINI_KEY_REDACTED>",
    ModelOrg.DEEPSEEK.value: "<DEEPSEEK_KEY_REDACTED>"
}

# API基础URL和URI
HOSTS = {
    ModelOrg.CHATGPT.value: "https://api.openai.com",
    ModelOrg.CLAUDE.value: "https://api.anthropic.com",
    # ModelOrg.GEMINI.value: "https://generativelanguage.googleapis.com",
    ModelOrg.GEMINI.value: "https://generativelanguage.googleapis.com",
    ModelOrg.GROK.value: "https://api.x.ai",
    ModelOrg.DEEPSEEK.value: "https://api.deepseek.com",
    ModelOrg.QWEN.value: "https://dashscope-intl.aliyuncs.com"
}

URIS = {
    ModelOrg.CHATGPT.value: "v1",
    ModelOrg.CLAUDE.value: "v1",
    ModelOrg.GEMINI.value: "v1beta/openai/",
    ModelOrg.GROK.value: "v1",
    ModelOrg.DEEPSEEK.value: "",
    ModelOrg.QWEN.value: "compatible-mode/v1"
}

def connect_to_db():
    """连接到MySQL数据库"""
    # 从环境变量或配置文件获取数据库连接信息
    # 这里使用setting.py中的配置
    try:
        from setting import dbUrl
        # 解析数据库URL
        # 格式: mysql://username:password@host:port/dbname
        parts = dbUrl.replace('mysql://', '').split('@')
        auth = parts[0].split(':')
        conn_info = parts[1].split('/')
        
        username = auth[0]
        password = auth[1]
        host_port = conn_info[0].split(':')
        host = host_port[0]
        port = int(host_port[1]) if len(host_port) > 1 else 3306
        db_name = conn_info[1].split('?')[0]
        
        # 建立连接
        connection = pymysql.connect(
            host=host,
            user=username,
            password=password,
            database=db_name,
            port=port,
            charset='utf8mb4',
            cursorclass=DictCursor
        )
        print(f"成功连接到数据库: {host}:{port}/{db_name}")
        return connection
    except Exception as e:
        print(f"数据库连接失败: {e}")
        return None

def import_models_to_db(connection):
    """将模型配置导入到数据库"""
    if not connection:
        print("未连接到数据库，无法导入模型")
        return
    
    try:
        with connection.cursor() as cursor:
            # 检查表是否存在
            cursor.execute("SHOW TABLES LIKE 'ct_ai_model'")
            if not cursor.fetchone():
                print("表 ct_ai_model 不存在，请先创建表")
                return
            
            # 获取现有模型列表
            cursor.execute("SELECT name FROM ct_ai_model")
            existing_models = {row['name'] for row in cursor.fetchall()}
            
            # 计数器
            added_count = 0
            updated_count = 0
            skipped_count = 0
            
            # 当前时间
            now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            for model_name, config in MODEL_CONFIGS.items():
                # 准备数据
                org = config.get('org', '')
                weight = config.get('weight', 1)
                
                # 根据org获取对应的API密钥、host和uri
                api_key = API_KEYS.get(org, '')
                host = HOSTS.get(org, '')
                uri = URIS.get(org, '')
                
                if model_name in existing_models:
                    # 更新现有模型
                    sql = """
                    UPDATE ct_ai_model SET 
                        org = %s,
                        weight = %s,
                        host = %s,
                        uri = %s,
                        api_key = %s
                    WHERE name = %s
                    """
                    cursor.execute(sql, (
                        org, weight, host, uri, api_key, model_name
                    ))
                    updated_count += 1
                else:
                    # 添加新模型
                    sql = """
                    INSERT INTO ct_ai_model (
                        name, org, weight, host, uri, api_key, create_time
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s
                    )
                    """
                    cursor.execute(sql, (
                        model_name, org, weight, host, uri, api_key, now
                    ))
                    added_count += 1
            
            # 提交事务
            connection.commit()
            
            print(f"导入完成: 新增 {added_count} 个模型, 更新 {updated_count} 个模型, 跳过 {skipped_count} 个模型")
            
    except Exception as e:
        print(f"导入模型时出错: {e}")
        connection.rollback()

def main():
    """主函数"""
    # 连接数据库
    connection = connect_to_db()
    if not connection:
        return
    
    try:
        # 导入模型
        import_models_to_db(connection)
    finally:
        # 关闭连接
        connection.close()

if __name__ == "__main__":
    main()
