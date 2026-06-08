package com.wsi.annotation.api.database.dao.system;

import com.wsi.annotation.api.database.domain.system.SysRole;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SysRoleDao extends MongoRepository<SysRole,String> {
    List<SysRole> getSysRolesByRoleIdIn(List<Integer> roleIds);

    List<SysRole> getSysRolesByIdIn(List<String> roleIds);

    Long countSysRolesByDelFlagAndRoleName(Integer delFlag,String roleName);

    Long countSysRolesByDelFlagAndRoleKey(Integer delFlag,String roleKey);
}
