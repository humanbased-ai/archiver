package com.wsi.annotation.api.common.exception.file;

import com.wsi.annotation.api.common.exception.BaseException;

/**
 * 文件信息异常类
 * 
 * @author early
 */
public class FileException extends BaseException
{
    private static final long serialVersionUID = 1L;

    public FileException(String code, Object[] args)
    {
        super("file", code, args, null);
    }

}
