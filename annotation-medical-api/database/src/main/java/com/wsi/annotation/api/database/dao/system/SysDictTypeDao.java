package com.wsi.annotation.api.database.dao.system;

import com.wsi.annotation.api.database.domain.system.SysDictType;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SysDictTypeDao extends MongoRepository<SysDictType, String> {
    List<SysDictType> findSysDictTypesByStatus(Integer status);
}
