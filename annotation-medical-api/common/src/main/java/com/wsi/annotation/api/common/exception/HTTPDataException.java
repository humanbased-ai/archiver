package com.wsi.annotation.api.common.exception;

public class HTTPDataException extends RuntimeException{

    private Integer code;
    private String message;

    public HTTPDataException(Integer code,String message) {
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
