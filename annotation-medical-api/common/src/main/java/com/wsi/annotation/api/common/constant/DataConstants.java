package com.wsi.annotation.api.common.constant;

import org.bson.types.ObjectId;

/**
 * 通用数据常量信息
 * 
 * @author early
 */
public class DataConstants
{
    /**
     * 无上级id; 无父id
     */
    public static final String NO_PARENT_ID = "000000000000000000000000";


    /**
     * jscode转session地址
     */
    public static final String WECHAT_JSCODE2SESSION_URL = "https://api.weixin.qq.com/sns/jscode2session";
    /**
     * 获取access_token地址
     */
    public static final String WECHAT_GETACCESSTOKEN_URL = "https://api.weixin.qq.com/cgi-bin/token";
    /**
     * 发送统一消息地址
     */
    public static final String WECHAT_SENDMESSAGE_URL = "https://api.weixin.qq.com/cgi-bin/message/wxopen/template/uniform_send";
}
