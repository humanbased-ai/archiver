package com.wsi.annotation.api.database.dao.system;

import com.wsi.annotation.api.database.domain.system.SysDictData;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SysDictDataDao extends MongoRepository<SysDictData, String> {
    List<SysDictData> findSysDictDatasByDictTypeAndStatus(String dictType,Integer status);
}
