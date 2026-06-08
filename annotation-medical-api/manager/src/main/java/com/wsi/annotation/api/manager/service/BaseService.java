package com.wsi.annotation.api.manager.service;

import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.common.utils.SecurityUtils;
import com.mongodb.DBObject;
import com.mongodb.QueryBuilder;
import com.wsi.annotation.api.database.domain.cytomine.Inner.InnerTag;
import com.wsi.annotation.api.database.domain.cytomine.UserAnnotation;
import com.wsi.annotation.api.manager.domain.response.cytomine.ConnectTagResp;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;

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
    public QueryBuilder getBaseQueryBuilder() {
        QueryBuilder queryBuilder = new QueryBuilder();
//        queryBuilder.and("companyInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getCompanyInfo().getForeignKeyId());
//        queryBuilder.and("departmentInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getDepartmentInfo().getForeignKeyId());
        //  queryBuilder.and("orgnizationInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getOrgnizationInfo().getForeignKeyId());
        return queryBuilder;
    }

    public QueryBuilder getBaseCondition(QueryBuilder queryBuilder) {
        queryBuilder.and("companyInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getCompanyInfo().getForeignKeyId());
        queryBuilder.and("orgnizationInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getOrgnizationInfo().getForeignKeyId());
        queryBuilder.and("delFlag").is(0);
        return queryBuilder;
    }

    protected JSONObject getJsonObject(List collection, int offset, int max) {
        JSONObject json = new JSONObject();
        json.put("collection", collection);
        json.put("offset", offset);
        json.put("perPage", max != 0 ? Math.min(max, collection.size()) : collection.size());
        json.put("size", collection.size());
        json.put("totalPages:", max != 0 ? Math.ceil(collection.size() / max) : 1);
        return json;
    }


    protected JSONObject TagRespJson(String domainIdent, InnerTag innerTag, Class<?> classT) {
        ConnectTagResp resp = new ConnectTagResp();
        resp.setDomainClassName(classT.getName());
        resp.setDomainIdent(domainIdent);
        resp.setId(innerTag.getId());
        resp.setTag(innerTag.getTagId());
        resp.setTagName(innerTag.getTagName());

        return RespJson(resp, ConnectTagResp.class);
    }

    protected JSONObject RespJson(Object resp, Class<?> classT) {
        JSONObject tagJson = JSONObject.parseObject(JSONObject.toJSONString(resp));
        tagJson.put("class", classT.getName());
        return tagJson;
    }

}
