package com.wsi.annotation.api.database.dao.system;

import com.wsi.annotation.api.database.domain.system.SysPosition;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SysPositionDao extends MongoRepository<SysPosition,String> {
    SysPosition getSysPositionById(String id);
}
