package com.wsi.annotation.api.database.daoextend.common;

import com.wsi.annotation.api.database.domain.basic.BasicUser;
import com.wsi.annotation.api.database.domain.message.Message;
import com.wsi.annotation.api.database.domain.message.MessagesDeteil;
import com.mongodb.client.result.UpdateResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;


@Component
public class MessageExtend {

    @Autowired
    MongoTemplate mongoTemplate;

    public void addMessage(Message message){

        Message save = mongoTemplate.save(message, "message");
        System.out.println("数据："+save);
    }

    public Message findById(String userId) {
        Query query = Query.query(Criteria.where("_id").is(userId));
        Message message = mongoTemplate.findOne(query, Message.class);

        return message;
    }

    public void saveMessage(String userId,MessagesDeteil message) {
        Query query = Query.query(Criteria.where("_id").is(userId));
        Update update = new Update();
        update.addToSet("messagesDeteils",message);
        UpdateResult upsert = mongoTemplate.upsert(query, update, Message.class);
        System.out.println(upsert);
    }

    public Message getHistory(Query query) {
        Message message = mongoTemplate.findOne(query, Message.class);
        return message;
    }

    public UpdateResult isRead(String id, String loginUserId) {
        Query query = Query.query(Criteria.where("_id").is(loginUserId).and("messagesDeteils.sendId").is(id));
        Update update = new Update();
        update.set("flag",1);
        UpdateResult result = mongoTemplate.updateFirst(query,update,Message.class);

        return result;
    }

    public BasicUser getReceiveUser(String userId) {
        return mongoTemplate.findOne(Query.query(Criteria.where("_id").is(userId)), BasicUser.class);
    }
}
