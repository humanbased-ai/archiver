"""日志配置"""
import logging
from pathlib import Path

def setup_logger(name: str) -> logging.Logger:
    """设置日志"""
    
    # 创建 logs 目录
    log_dir = Path(__file__).parent.parent.parent / 'logs'
    log_dir.mkdir(exist_ok=True)
    
    # 配置日志
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # 避免重复添加 handler
    if logger.handlers:
        return logger
    
    # 文件处理器
    file_handler = logging.FileHandler(log_dir / f'{name}.log')
    file_handler.setLevel(logging.INFO)
    
    # 控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # 格式
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger
