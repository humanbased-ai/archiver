package com.wsi.annotation.api.database.dao.system;

import com.wsi.annotation.api.database.domain.system.SysOperator;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SysOperatorDao extends MongoRepository<SysOperator, String> {
    SysOperator getSysOperatorById(String id);
    SysOperator getSysOperatorByOperatorNumber(String operatorNumber);
}
