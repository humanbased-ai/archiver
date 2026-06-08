package com.wsi.annotation.api.database.daoextend.system;

import com.wsi.annotation.api.database.domain.system.SysDepartment;
import com.mongodb.client.result.UpdateResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class SysDepartmentExtend {
    @Autowired
    private MongoTemplate mongoTemplate;

    public List<SysDepartment> getList(Query query) {
        List<SysDepartment> deptList = mongoTemplate.find(query, SysDepartment.class);
        return deptList;
    }

    public long getListCount(Query query) {
        long count = mongoTemplate.count(query, SysDepartment.class);
        return count;
    }

    public UpdateResult updateResult(Query query, Update update) {
        UpdateResult updateResult = mongoTemplate.updateMulti(query, update, SysDepartment.class);
        return updateResult;
    }
}
