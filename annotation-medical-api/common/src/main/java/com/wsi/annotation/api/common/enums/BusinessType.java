package com.wsi.annotation.api.common.enums;

/**
 * 业务操作类型
 * 
 * @author early
 */
public enum BusinessType
{
    /**
     * 其它
     */
    OTHER,

    /**
     * 新增
     */
    INSERT,

    /**
     * 修改
     */
    UPDATE,

    /**
     * 统一保存
     */
    SAVE,

    /**
     * 修改状态
     */
    CHANGE,

    /**
     * 查询详情
     */
    DETAIL,
    /**
     * 删除
     */
    DELETE,

    /**
     * 失效
     */
    INVALID,

    /**
     * 有效
     */
    EFFECTIVE,

    /**
     * 授权
     */
    GRANT,

    /**
     * 导出
     */
    EXPORT,

    /**
     * 导入
     */
    IMPORT,

    /**
     * 强退
     */
    FORCE,

    /**
     * 生成代码
     */
    GENCODE,
    
    /**
     * 清空数据
     */
    CLEAN,
}
