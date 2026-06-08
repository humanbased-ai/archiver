package com.wsi.annotation.api.common.constant;

/**
 * 角色类型基础数据
 * 
 * @author early
 */
public class DataScopeConstants
{
    /**
     * 全部数据权限
     */
    public static final Integer DATA_SCOPE_ALL = 1;

    /**
     * 公司数据权限
     */
    public static final Integer DATA_SCOPE_COMPANY = 100;

    /**
     * 部门及以下数据权限
     */
    public static final Integer DATA_SCOPE_DEPT_AND_CHILD = 1000;

    /**
     * 部门数据权限
     */
    public static final Integer DATA_SCOPE_DEPT = 1100;

    /**
     * 本人数据权限
     */
    public static final Integer DATA_SCOPE_SELF = 1200;

    /**
     * 本人数据权限
     */
    public static final Integer DATA_SCOPE_CUSTOM = 1300;
}
