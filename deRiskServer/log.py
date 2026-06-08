import os
import sys
import time
import logging
from types import FrameType
from typing import cast
import setting
import loguru
from contextvars import ContextVar

trace_id: ContextVar[str] = ContextVar("trace_id", default=None)


class Logger:
    """输出日志到文件和控制台"""

    def __init__(self):
        # 文件的命名
        log_name = f"Fast_{time.strftime('%Y-%m-%d', time.localtime()).replace('-', '_')}.log"
        #log_path = os.path.join(LogPath, "Fast_{time:YYYY-MM-DD}.log")
        self.logger = loguru.logger
        # 清空所有设置
        self.logger.remove()
        # 判断日志文件夹是否存在，不存则创建
        log_path = setting.LOG_PATH
        if log_path is not None and log_path != '' and log_path != 'None' and not os.path.exists(log_path):
            os.makedirs(log_path)
        # 日志输出格式
        formatter = "{time:YYYY-MM-DD HH:mm:ss} | {level}: {message}"
        # 添加控制台输出的格式,sys.stdout为输出到屏幕;关于这些配置还需要自定义请移步官网查看相关参数说明
        ''''''
        self.logger.add(sys.stdout,
                        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "  # 颜色>时间
                               "{extra[trace_id]} | "
                               #"{process.name} | "  # 进程名
                               #"{thread.name} | "  # 进程名
                               "<cyan>{module}</cyan>.<cyan>{function}</cyan>"  # 模块名.方法名
                               ":<cyan>{line}</cyan> | "  # 行号
                               "<level>{level}</level>: "  # 等级
                               "<level>{message}</level>",  # 日志内容
                        )

        # 日志写入文件
        ''''''
        log_path = f'{log_path}/ffs.log'
        self.logger.add(log_path,  # 写入目录指定文件
                        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "  # 颜色>时间
                               "{extra[trace_id]} | "
                                #"{process.name} | "  # 进程名
                                #"{thread.name} | "  # 进程名
                               "<cyan>{module}</cyan>.<cyan>{function}</cyan>"  # 模块名.方法名
                               ":<cyan>{line}</cyan> | "  # 行号
                               "<level>{level}</level>: "  # 等级
                               "<level>{message}</level>",  # 日志内容
                        encoding='utf-8',
                        retention='7 days',  # 设置历史保留时长
                        backtrace=True,  # 回溯
                        diagnose=True,  # 诊断
                        enqueue=True,  # 异步写入
                        rotation="00:00",  # 每日更新时间
                        # rotation="5kb",  # 切割，设置文件大小，rotation="12:00"，rotation="1 week"
                        # filter="my_module"  # 过滤模块
                        # compression="zip"   # 文件压缩
                        )

    def get_logger(self):
         self.logger.configure(extra={"trace_id": ""})
         return self.logger


Loggers = Logger()
logger = Loggers.get_logger()