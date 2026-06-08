package com.wsi.annotation.api.database.dao.system;

import com.wsi.annotation.api.database.domain.system.SysDataOperLog;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SysDataOperLogDao extends MongoRepository<SysDataOperLog,String> {
}
