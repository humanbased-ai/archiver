package com.wsi.annotation.api.database.dao.system;

import com.wsi.annotation.api.database.domain.system.SysOperLog;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SysOperLogDao extends MongoRepository<SysOperLog,String> {
}
