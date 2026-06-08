package com.wsi.annotation.api.database.dao.system;

import com.wsi.annotation.api.database.domain.system.SysDepartment;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SysDepartmentDao extends MongoRepository<SysDepartment, String> {
    SysDepartment getSysDeptById(String id);
}
