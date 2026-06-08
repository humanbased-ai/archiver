package com.wsi.annotation.api.manager.service.system;

import com.mongodb.QueryBuilder;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.database.domain.basic.DataSet;
import com.wsi.annotation.api.database.domain.basic.Subspecialty;
import com.wsi.annotation.api.database.domain.system.SysOrgan;
import com.wsi.annotation.api.manager.domain.response.system.OrganListResp;
import com.wsi.annotation.api.manager.service.BaseService;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class SubspecialtyService extends BaseService {

    @Autowired
    private MongoTemplate mongoTemplate;

    public List<Subspecialty> list(){
        QueryBuilder queryBuilder = new QueryBuilder();
//        queryBuilder.and("subspecialtyName").regex(Pattern.compile(subspecialty.getSubspecialtyName()));
        queryBuilder.and("delFlag").is(0);
        Query query = new BasicQuery(queryBuilder.get().toString());
        List<Subspecialty> subspecialtyList = mongoTemplate.find(query, Subspecialty.class);
        return subspecialtyList;
    }
}
