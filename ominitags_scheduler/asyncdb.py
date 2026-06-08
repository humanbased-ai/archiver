import contextvars
import functools

from tortoise.transactions import in_transaction

transaction_stack_var = contextvars.ContextVar("transaction_stack", default=[])


def transaction(target_function):
    # 事务注解
    @functools.wraps(target_function)
    async def wrapper(*args, **kwargs):
        transaction_stack = transaction_stack_var.get()

        if transaction_stack:
            # 已有事务，直接执行函数
            return await target_function(*args, **kwargs)
        else:
            # 创建一个新的事务
            async with in_transaction() as transaction:
                # 将新事务添加到栈中
                transaction_stack.append(transaction)
                transaction_stack_var.set(transaction_stack)

                try:
                    result = await target_function(*args, **kwargs)
                    await transaction.commit()
                    return result
                except Exception as e:
                    await transaction.rollback()
                    raise e
                finally:
                    # 移除事务
                    transaction_stack.pop()
                    transaction_stack_var.set(transaction_stack)

    return wrapper
