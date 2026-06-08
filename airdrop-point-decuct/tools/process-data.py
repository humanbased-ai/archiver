#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据处理脚本
功能：
1. 解析Result_13.csv文件，获取user_address
2. 连接数据库，通过user_address查询user_id
3. 将查询结果合并到Result_13.csv中
4. 对比deduct.csv，找到匹配的行并合并数据
5. 输出最终的合并结果到新CSV文件
"""

import pandas as pd
import pymysql
import logging
from typing import Dict, List, Optional
import os
from datetime import datetime
from dotenv import load_dotenv


PROCESS_FILE = './tools/Result_13.csv'
DEDUCT_FILE = './tools/deduct.csv'

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DataProcessor:
    def __init__(self, db_config: Dict, batch_size: int = 1000):
        """
        初始化数据处理器
        
        Args:
            db_config: 数据库连接配置
            batch_size: 批处理大小
        """
        self.db_config = db_config
        self.connection = None
        self.batch_size = batch_size
        
    def connect_database(self) -> bool:
        """
        连接数据库
        
        Returns:
            bool: 连接是否成功
        """
        try:
            self.connection = pymysql.connect(**self.db_config)
            logger.info("数据库连接成功")
            return True
        except Exception as e:
            logger.error(f"数据库连接失败: {e}")
            return False
    
    def close_database(self):
        """关闭数据库连接"""
        if self.connection:
            self.connection.close()
            logger.info("数据库连接已关闭")
    
    def batch_query_user_ids(self, user_addresses: List[str]) -> Dict[str, Optional[str]]:
        """
        批量查询用户ID
        
        Args:
            user_addresses: 用户地址列表
            
        Returns:
            Dict[str, Optional[str]]: 地址到用户ID的映射，地址统一转为小写
        """
        if not self.connection:
            logger.error("数据库未连接")
            return {}
            
        address_to_user_id = {}
        
        try:
            # 将地址转换为小写，用于忽略大小写比较
            lowercase_addresses = [addr.lower() for addr in user_addresses]
            
            # 分批处理，避免SQL语句过长
            for i in range(0, len(lowercase_addresses), self.batch_size):
                batch_addresses = lowercase_addresses[i:i + self.batch_size]
                
                # 构建IN查询的占位符
                placeholders = ','.join(['%s'] * len(batch_addresses))
                
                with self.connection.cursor() as cursor:
                    # 使用LOWER函数进行忽略大小写的查询
                    sql = f"""
                    SELECT user_id, LOWER(account) as account_lower
                    FROM cfp_customer_user_account 
                    WHERE LOWER(account) IN ({placeholders})
                    """
                    
                    cursor.execute(sql, batch_addresses)
                    results = cursor.fetchall()
                    
                    # 建立地址到user_id的映射
                    for user_id, account_lower in results:
                        address_to_user_id[account_lower] = str(user_id)
                
                logger.info(f"已处理批次 {i//self.batch_size + 1}/{(len(lowercase_addresses)-1)//self.batch_size + 1}")
            
            # 为所有地址创建映射，未找到的设为None
            result_mapping = {}
            for original_addr, lower_addr in zip(user_addresses, lowercase_addresses):
                result_mapping[original_addr] = address_to_user_id.get(lower_addr)
            
            return result_mapping
                    
        except Exception as e:
            logger.error(f"批量查询失败: {e}")
            return {}
    
    def process_data(self):
        """主要数据处理流程"""
        try:
            # 1. 读取Result_13.csv
            logger.info("正在读取Result_13.csv...")
            result_13_df = pd.read_csv(PROCESS_FILE)
            logger.info(f"Result_13.csv读取完成，共{len(result_13_df)}行数据")
            
            # 1.1 过滤只处理status为Claimed的记录
            original_count = len(result_13_df)
            result_13_df = result_13_df[result_13_df['status'] == 'Claimed'].copy()
            claimed_count = len(result_13_df)
            logger.info(f"过滤后只处理status为Claimed的记录: {claimed_count}/{original_count}行")
            
            # 2. 连接数据库
            if not self.connect_database():
                logger.error("无法连接数据库，程序退出")
                return
            
            # 3. 批量查询所有user_address对应的user_id
            logger.info("正在批量查询数据库获取user_id...")
            unique_addresses = result_13_df['user_address'].unique().tolist()
            logger.info(f"共有{len(unique_addresses)}个唯一地址需要查询")
            
            # 批量查询
            address_to_user_id = self.batch_query_user_ids(unique_addresses)
            
            # 4. 将user_id添加到Result_13.csv数据中
            result_13_df['user_id'] = result_13_df['user_address'].map(address_to_user_id)
            
            found_count = len([x for x in result_13_df['user_id'] if x is not None])
            logger.info(f"user_id查询完成，成功找到{found_count}/{len(result_13_df)}条记录的user_id")
            
            # 5. 读取deduct.csv
            logger.info("正在读取deduct.csv...")
            deduct_df = pd.read_csv(DEDUCT_FILE)
            logger.info(f"deduct.csv读取完成，共{len(deduct_df)}行数据")
            
            # 6. 合并数据 - 使用pandas merge提高效率
            logger.info("正在合并数据...")
            
            # 过滤出有user_id的记录
            result_with_user_id = result_13_df[result_13_df['user_id'].notna()].copy()
            logger.info(f"有效的user_id记录数: {len(result_with_user_id)}")
            
            # 将user_id转换为相同类型以便合并
            result_with_user_id['user_id'] = result_with_user_id['user_id'].astype(str)
            deduct_df['user_id'] = deduct_df['user_id'].astype(str)
            
            # 使用pandas merge进行高效合并
            merged_df = pd.merge(
                result_with_user_id,
                deduct_df,
                on='user_id',
                how='inner',
                suffixes=('', '_deduct')
            )
            
            # 重新组织列，按照要求的格式输出
            if not merged_df.empty:
                # 创建最终输出格式
                output_df = pd.DataFrame({
                    'user_address': merged_df['user_address'],
                    'user_id': merged_df['user_id'],
                    'reward_value': -merged_df['balance_result'].astype(float),  # 转换为负数
                    'reward_type': 'POINTS',  # 固定值
                    'transaction_id': 'airdrop-point-deduct-season-1',  # 固定值
                    'task_id': 'airdrop-point-deduct-season-1',  # 固定值
                    'stage': 'EXTERNAL'  # 固定值
                })
                merged_df = output_df
            logger.info(f"数据合并完成，共找到{len(merged_df)}条匹配记录")
            
            # 8. 保存结果到新CSV文件
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            process_file_base = os.path.splitext(os.path.basename(PROCESS_FILE))[0]
            output_filename = f"{process_file_base}_merged_{timestamp}.csv"
            
            merged_df.to_csv(output_filename, index=False)
            logger.info(f"结果已保存到: {output_filename}")
            
            # 9. 输出统计信息
            logger.info("=== 处理统计 ===")
            logger.info(f"Result_13.csv总行数: {original_count}")
            logger.info(f"status为Claimed的行数: {claimed_count}")
            logger.info(f"唯一地址数量: {len(unique_addresses)}")
            logger.info(f"成功查询到user_id的行数: {found_count}")
            logger.info(f"deduct.csv总行数: {len(deduct_df)}")
            logger.info(f"在deduct.csv中找到匹配的行数: {len(merged_df)}")
            logger.info(f"最终输出行数: {len(merged_df)}")
            
            if len(merged_df) > 0:
                logger.info(f"匹配成功率: {len(merged_df)/found_count*100:.2f}%")
                logger.info(f"输出格式: user_address, user_id, reward_value, reward_type, transaction_id, task_id, stage")
                logger.info("所有reward_value已转换为负数")
                logger.info("只处理了status为Claimed的记录")
            else:
                logger.info("未找到任何匹配记录")
            
        except Exception as e:
            logger.error(f"数据处理过程中发生错误: {e}")
        finally:
            self.close_database()


def load_config_from_env():
    """从环境变量加载配置"""
    # 加载.env文件
    load_dotenv()
    
    # 从环境变量读取数据库配置
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 3306)),
        'user': os.getenv('DB_USER'),
        'password': os.getenv('DB_PASSWORD'),
        'database': os.getenv('DB_NAME'),
    }
    
    # 检查必需的配置项
    required_fields = ['user', 'password', 'database']
    missing_fields = [field for field in required_fields if not db_config[field]]
    
    if missing_fields:
        logger.error(f"缺少必需的环境变量: {', '.join([f'DB_{field.upper()}' for field in missing_fields])}")
        logger.info("请创建.env文件并设置以下环境变量:")
        logger.info("DB_HOST=your_database_host")
        logger.info("DB_PORT=3306")
        logger.info("DB_USER=your_username")
        logger.info("DB_PASSWORD=your_password")
        logger.info("DB_NAME=your_database_name")
        return None
    
    return db_config

def main():
    """主函数"""
    # 从环境变量加载配置
    db_config = load_config_from_env()
    
    if db_config is None:
        return
    
    # 获取批处理大小配置
    batch_size = int(os.getenv('BATCH_SIZE', 100))
    
    logger.info(f"连接到数据库: {db_config['user']}@{db_config['host']}:{db_config['port']}/{db_config['database']}")
    logger.info(f"批处理大小: {batch_size}")
    
    # 创建数据处理器并执行
    processor = DataProcessor(db_config, batch_size)
    processor.process_data()


if __name__ == "__main__":
    main()
