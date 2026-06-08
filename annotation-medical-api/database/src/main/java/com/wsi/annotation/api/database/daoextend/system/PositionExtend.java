package com.wsi.annotation.api.database.daoextend.system;

import com.wsi.annotation.api.database.domain.system.SysPosition;
import com.mongodb.client.result.UpdateResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PositionExtend {
    @Autowired
    private MongoTemplate mongoTemplate;

    public List<SysPosition> getList(Query query) {
        List<SysPosition> deptList = mongoTemplate.find(query, SysPosition.class);
        return deptList;
    }

    public long getListCount(Query query) {
        long count = mongoTemplate.count(query, SysPosition.class);
        return count;
    }

    public UpdateResult updateResult(BasicQuery query, Update update) {
        UpdateResult updateResult = mongoTemplate.updateMulti(query, update, SysPosition.class);
        return updateResult;
    }
}
