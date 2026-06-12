from __future__ import annotations
from dataclasses import dataclass


class NodeError(Exception):
    pass


class RetryableError(NodeError):
    pass


class NonRetryableError(NodeError):
    pass


@dataclass
class ClassifiedError:
    code: str
    message: str
    retryable: bool


def classify_error(err: Exception) -> ClassifiedError:
    if isinstance(err, NonRetryableError):
        return ClassifiedError(code="NODE_ERROR", message=str(err), retryable=False)
    if isinstance(err, RetryableError):
        return ClassifiedError(code="NODE_ERROR", message=str(err), retryable=True)
    if isinstance(err, TimeoutError):
        return ClassifiedError(code="TIMEOUT", message=str(err), retryable=True)
    if isinstance(err, ConnectionError):
        return ClassifiedError(code="CONNECTION_ERROR", message=str(err), retryable=True)
    return ClassifiedError(code="DRIVER_EXCEPTION", message=str(err), retryable=True)
