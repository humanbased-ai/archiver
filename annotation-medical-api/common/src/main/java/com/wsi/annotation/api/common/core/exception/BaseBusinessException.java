package com.wsi.annotation.api.common.core.exception;

public class BaseBusinessException extends RuntimeException {

    private Integer code;

    public BaseBusinessException(Integer code,String message) {
        super(message);
        this.code = code;
    }

    public Integer getCode() {
        return code;
    }

    public void setCode(Integer code) {
        this.code = code;
    }
}
