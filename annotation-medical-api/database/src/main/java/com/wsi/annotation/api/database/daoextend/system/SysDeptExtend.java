package com.wsi.annotation.api.database.daoextend.system;

import com.wsi.annotation.api.database.domain.system.BasicDept;
import com.mongodb.client.result.UpdateResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class SysDeptExtend {
    @Autowired
    private MongoTemplate mongoTemplate;

    public List<BasicDept> getList(Query query) {
        return mongoTemplate.find(query, BasicDept.class);
    }

    public BasicDept add(BasicDept basicDept) {
        return mongoTemplate.save(basicDept, "basic_dept");

    }

    public UpdateResult update(Query query, Update update) {
        return mongoTemplate.updateMulti(query, update, BasicDept.class);
    }

    public BasicDept checkUnique(BasicQuery query) {
        return mongoTemplate.findOne(query, BasicDept.class);
    }

    public long getListCount(Query query) {
        long count = mongoTemplate.count(query, BasicDept.class);
        return count;
    }
}
