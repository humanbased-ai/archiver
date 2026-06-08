package com.wsi.annotation.api.database.dao.basics;

import com.wsi.annotation.api.database.domain.basic.BasicUser;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SysUserDao extends MongoRepository<BasicUser, String> {
    BasicUser getSysUserByUserName(String userName);
    BasicUser getSysUserById(String id);
}
