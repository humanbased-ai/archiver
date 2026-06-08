package com.wsi.annotation.api.ims.service;

import com.wsi.annotation.api.common.utils.SecurityUtils;
import com.mongodb.DBObject;
import com.mongodb.QueryBuilder;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;

public class BaseService {

    public static Query getQuery(QueryBuilder queryBuilder, Integer status, DBObject dataScope) {
        if (status != null) {
            queryBuilder.and("delFlag").is(status);
        }

        if (dataScope != null) {
            queryBuilder.and(dataScope);
        }

        Query query = new BasicQuery(queryBuilder.get().toString());
        return query;
    }

    /**
     * 基础的查询类，机构id，公司id，部门权限等相关的基础条件先写在这里
     */
    public QueryBuilder getBaseQueryBuilder(){
        QueryBuilder queryBuilder = new QueryBuilder();
//        queryBuilder.and("companyInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getCompanyInfo().getForeignKeyId());
//        queryBuilder.and("departmentInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getDepartmentInfo().getForeignKeyId());
      //  queryBuilder.and("orgnizationInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getOrgnizationInfo().getForeignKeyId());
        return queryBuilder;
    }

    public QueryBuilder getBaseCondition(QueryBuilder queryBuilder){
        queryBuilder.and("companyInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getCompanyInfo().getForeignKeyId());
        queryBuilder.and("orgnizationInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getOrgnizationInfo().getForeignKeyId());
        queryBuilder.and("delFlag").is(0);
        return queryBuilder;
    }
}
