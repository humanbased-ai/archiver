package com.wsi.annotation.api.database.daoextend.system;

import com.wsi.annotation.api.database.domain.system.SysOperator;
import com.mongodb.client.result.UpdateResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class SysOperatorExtend {
    @Autowired
    private MongoTemplate mongoTemplate;

    public List<SysOperator> getList(Query query) {
        List<SysOperator> operators = mongoTemplate.find(query, SysOperator.class);
        return operators;
    }

    public long getListCount(Query query) {
        long count = mongoTemplate.count(query, SysOperator.class);
        return count;
    }

    public UpdateResult updateResult(Query query, Update update) {
        UpdateResult updateResult = mongoTemplate.updateMulti(query, update, SysOperator.class);
        return updateResult;
    }
}
