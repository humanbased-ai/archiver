#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Airdrop Deduct Tool - HTTP请求版本
根据merged_result CSV文件发送HTTP请求到cfp-assets-svc:8081/customer/asset/reward
"""

import pandas as pd
import requests
import json
import os
from datetime import datetime

CFP_ASSETS_HOST = os.getenv('CFP_ASSETS_HOST', 'http://localhost:8081')


class AirdropDeductTool:
    def __init__(self):
        self.file_data = None
        
    def load_csv_file(self, merged_file: str) -> bool:
        """加载merged_result CSV文件"""
        try:
            if not os.path.exists(merged_file):
                print(f"❌ merged文件不存在: {merged_file}")
                return False
                
            # 读取CSV时指定user_id为字符串类型，避免科学计数法
            self.file_data = pd.read_csv(merged_file, dtype={'user_id': str})
            print(f"✅ 成功加载merged文件: {merged_file}")
            print(f"   共 {len(self.file_data)} 行数据")
            print(f"   列名: {list(self.file_data.columns)}")
            return True
            
        except Exception as e:
            print(f"❌ 加载merged文件失败: {e}")
            return False
    
    def send_http_requests(self, host: str = "cfp-assets-svc:8081", path: str = "/customer/asset/award") -> bool:
        """根据merged_result CSV文件发送HTTP请求"""
        try:
            if self.file_data is None:
                print("❌ 请先加载merged_result CSV文件")
                return False
            
            # 检查必要的列
            required_columns = ['user_id', 'reward_value', 'task_id', 'reward_type', 'transaction_id', 'stage']
            missing_columns = [col for col in required_columns if col not in self.file_data.columns]
            if missing_columns:
                print(f"❌ 缺少必要的列: {missing_columns}")
                return False

            # 构建完整的URL
            url = f"{host}{path}"
            print(f"开始发送HTTP请求到 {url}...")
            
            total_requests = len(self.file_data)
            success_count = 0
            failed_count = 0
            
            # 遍历每一行数据发送请求
            for index, row in self.file_data.iterrows():
                try:
                    # 构造请求数据
                    request_data = {
                        "user_id": str(row['user_id']),
                        "transaction_id": row['transaction_id'],
                        "task_id": row['task_id'],
                        "reward_value": int(row['reward_value']),
                        "reward_type": row['reward_type'],
                        "stage": row['stage']
                    }
                    
                    print(f"发送请求 {index + 1}/{total_requests}: {request_data}")
                    
                    # 发送POST请求
                    response = requests.post(
                        url,
                        json=request_data,
                        headers={'Content-Type': 'application/json'},
                        timeout=30
                    )

                    data = response.json()
                    
                    if response.status_code == 200 and data['success'] is True:
                        print(f"✅ 请求成功: {response.status_code}")
                        success_count += 1
                    else:
                        print(f"❌ 请求失败: {response.status_code} - {response.text}")
                        failed_count += 1
                        
                except Exception as e:
                    print(f"❌ 请求异常: {e}")
                    failed_count += 1
                
                # 显示进度
                if (index + 1) % 20 == 0:
                    print(f"已处理: {index + 1}/{total_requests}")
            
            print(f"✅ HTTP请求完成！")
            print(f"   总请求数: {total_requests}")
            print(f"   成功请求数: {success_count}")
            print(f"   失败请求数: {failed_count}")
            
            return True
            
        except Exception as e:
            print(f"❌ 发送HTTP请求失败: {e}")
            return False

def main():
    """主函数"""

    merged_file = os.getenv('DATA_FILE', 'merged_result_20250818_174345-test.csv')
    
    # 创建工具实例
    tool = AirdropDeductTool()
    if not tool.load_csv_file(merged_file):
        print(f"❌ 加载文件失败: {merged_file}")
        return
    
    success = tool.send_http_requests(host=CFP_ASSETS_HOST)
    
    if success:
        print("\n🎉 HTTP请求处理完成！")
    else:
        print("\n❌ HTTP请求处理失败！")

if __name__ == "__main__":
    main()
