import asyncio
import threading
from typing import Any, Callable
from typing import Coroutine, List

# 全局事件循环与线程（可复用）
_event_loop = None
_loop_thread = None


def init_async_loop():
    global _event_loop, _loop_thread
    if _event_loop is None:
        _event_loop = asyncio.new_event_loop()
        _loop_thread = threading.Thread(target=_event_loop.run_forever, daemon=True)
        _loop_thread.start()


def run_async_in_thread(coro: Callable[..., Any], *args, **kwargs) -> Any:
    """
    在后台线程中的事件循环运行 async 函数并获取返回值（同步方式）
    :param coro: async 函数对象
    :param args: 位置参数
    :param kwargs: 关键字参数
    :return: 返回结果（同步）
    """
    init_async_loop()
    future = asyncio.run_coroutine_threadsafe(coro(*args, **kwargs), _event_loop)
    return future.result()  # 会阻塞直到 coroutine 执行完毕


def run_async_tasks_in_thread(tasks: List[Coroutine]) -> List[Any]:
    """
    并发运行多个 async 任务，并同步获取结果
    :param tasks: 一个 coroutine 对象列表
    :return: 对应结果列表
    """
    init_async_loop()
    async def gather_tasks():
        return await asyncio.gather(*tasks)

    future = asyncio.run_coroutine_threadsafe(gather_tasks(), _event_loop)
    return future.result()
