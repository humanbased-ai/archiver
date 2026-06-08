package com.wsi.annotation.api.database.dao.system;

import com.wsi.annotation.api.database.domain.system.SysMenu;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SysMenuDao extends MongoRepository<SysMenu, String> {
    List<SysMenu> getSysMenusByMenuTypeInAndStatusAndParentIdOrderByOrderNumAsc(List<String> menuTypes,int status,Long parentId);

    List<SysMenu> getSysMenusByMenuIdIn(List<Long> menuIds);
    List<SysMenu> getSysMenusByMenuIdInAndMenuTypeIn(List<Long> menuIds,List<String> menuTypes);

    List<SysMenu> getSysMenusByDelFlag(Integer delFlag);

    long countSysMenusByParentId(Long menuId);

    Long countSysMenusByDelFlagAndMenuName(Integer delFlag,String menuName);
}
