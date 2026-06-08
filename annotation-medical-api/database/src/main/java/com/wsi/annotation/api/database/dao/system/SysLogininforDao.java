package com.wsi.annotation.api.database.dao.system;

import com.wsi.annotation.api.database.domain.system.SysLogininfor;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SysLogininforDao extends MongoRepository<SysLogininfor,String> {
}
