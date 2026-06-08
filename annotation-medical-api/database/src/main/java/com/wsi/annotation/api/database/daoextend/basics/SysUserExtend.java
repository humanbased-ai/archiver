package com.wsi.annotation.api.database.daoextend.basics;

import com.wsi.annotation.api.database.domain.basic.BasicUser;
import com.mongodb.client.result.UpdateResult;
import com.wsi.annotation.api.database.domain.message.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class SysUserExtend {
    @Autowired
    MongoTemplate mongoTemplate;

    public BasicUser findById(String userId) {
        Query query = Query.query(Criteria.where("_id").is(userId));
        BasicUser basicUser = mongoTemplate.findOne(query, BasicUser.class);

        return basicUser;
    }

    public List<BasicUser> list(Query query) {
        return mongoTemplate.find(query, BasicUser.class);
    }

    public Long count(Query query) {
        return mongoTemplate.count(query, BasicUser.class);
    }

    public UpdateResult del(BasicQuery query, Update update) {
        return mongoTemplate.updateMulti(query, update, BasicUser.class);
    }

    public BasicUser checkUnique(BasicQuery query) {
        return mongoTemplate.findOne(query,BasicUser.class);
    }
}
