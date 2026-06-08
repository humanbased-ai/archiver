import os
import sys
import time
import logging
from types import FrameType
from typing import cast

import loguru


class Logger:
    """print log"""

    def __init__(self):
        # file name
        log_name = f"Fast_{time.strftime('%Y-%m-%d', time.localtime()).replace('-', '_')}.log"
        #log_path = os.path.join(LogPath, "Fast_{time:YYYY-MM-DD}.log")
        self.logger = loguru.logger
        # clear setting
        self.logger.remove()
        # file exist
        #if not os.path.exists(LogPath):
        #    os.makedirs(LogPath)
        # format log
        formatter = "{time:YYYY-MM-DD HH:mm:ss} | {level}: {message}"
        # param setting
        self.logger.add(sys.stdout,
                        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | " 
                               "{process.name} | "  
                               "{thread.name} | "  
                               "<cyan>{module}</cyan>.<cyan>{function}</cyan>"  
                               ":<cyan>{line}</cyan> | "  
                               "<level>{level}</level>: " 
                               "<level>{message}</level>",
                        )

    def init_config(self):
        LOGGER_NAMES = ("uvicorn.asgi", "uvicorn.access", "uvicorn")
        #, "uvicorn.access"

        # change handler for default uvicorn logger
        logging.getLogger().handlers = [InterceptHandler()]
        for logger_name in LOGGER_NAMES:
            logging_logger = logging.getLogger(logger_name)
            logging_logger.handlers = [InterceptHandler()]

    def get_logger(self):
        return self.logger


class InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:  # pragma: no cover
        # Get corresponding Loguru level if it exists
        try:
            level = loguru.logger.level(record.levelname).name
        except ValueError:
            level = str(record.levelno)

        # Find caller from where originated the logged message
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:  # noqa: WPS609
            frame = cast(FrameType, frame.f_back)
            depth += 1

        loguru.logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage(),
        )


Loggers = Logger()
logger = Loggers.get_logger()