package com.wsi.annotation.api.manager.domain.response.result;

/**
 * 枚举了一些常用API操作码
 * Created by macro on 2019/4/19.
 */
public enum ResultCode implements IErrorCode {
    SUCCESS(200, "操作成功"),
    FAILED(500, "操作失败"),
    VALIDATE_FAILED(404, "参数检验失败"),
    UNAUTHORIZED(401, "暂未登录或token已经过期"),
    FORBIDDEN(403, "没有相关权限"),
    /**
     * 参数错误
     */
    PARAM_TYPE_MISMATCH(414, "参数类型不匹配"),
    /**
     * 参数错误
     */
    PARAM_VALID_ERROR(415, "参数校验失败"),
    /**
     * 参数错误
     */
    ILLEGAL_REQUEST(416, "非法请求"),
    /**
     * 乐观锁异常
     */
    OPTIMISTIC_LOCKING_FAILURE(417, "记录已被他人修改，请重新操作");

    private long code;
    private String message;

    private ResultCode(long code, String message) {
        this.code = code;
        this.message = message;
    }

    public long getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}
