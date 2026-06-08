package com.wsi.annotation.api.framework.web.service;

//import com.early.common.core.domain.entity.SysUser;
//import com.early.system.service.ISysMenuService;
//import com.early.system.service.ISysRoleService;

import com.wsi.annotation.api.database.dao.system.SysDeptDao;
import com.wsi.annotation.api.database.dao.system.SysMenuDao;
import com.wsi.annotation.api.database.dao.system.SysRoleDao;
import com.wsi.annotation.api.database.domain.system.SysMenu;
import com.wsi.annotation.api.database.domain.system.SysRole;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 用户权限处理
 *
 * @author early
 */
@Component
public class SysPermissionService {
    @Autowired
    private SysRoleDao sysRoleDao;

    @Autowired
    private SysMenuDao sysMenuDao;


    @Autowired
    private SysDeptDao sysDeptDao;

    /**
     * 获取角色数据权限对象
     *
     * @param user 用户信息
     * @return 角色权限信息
     */
    public List<SysRole> getSysRoles(BasicUser user) {
        List<SysRole> roles = new ArrayList<>();
        // 管理员拥有所有权限
        List<String> roleIds = new ArrayList<>();
        if (user.isAdmin()) {
            roleIds.add("1");
        } else {
            roleIds = user.getRoleIds();
        }
        List<SysRole> sysRoles = sysRoleDao.getSysRolesByIdIn(roleIds);
        roles.addAll(sysRoles.stream().distinct().collect(Collectors.toList()));
        return roles;
    }


    /**
     * 获取角色数据权限,字符串
     *
     * @param user 用户信息
     * @return 角色权限信息
     */
    public Set<String> getRolePermission(BasicUser user) {
        Set<String> roles = new HashSet<>();
        // 管理员拥有所有权限
        if (user.isAdmin()) {
            roles.add("admin");
        } else {
            List<SysRole> sysRoles = sysRoleDao.getSysRolesByIdIn(user.getRoleIds());
            roles.addAll(sysRoles.stream().map(p -> p.getRoleKey()).collect(Collectors.toSet()));
        }
        return roles;
    }


    /**
     * 获取用户部门数据
     *
     * @param user 用户信息
     * @return 角色权限信息
     */
    public List<Long> getSysDepts(BasicUser user) {

//        List<ObjectId> depts = new ArrayList<>();
//
//        if(ObjectUtils.isNotEmpty(user.getManageDepts())){
//            for (InnerDepartmentInfo innerDepartmentInfo: user.getManageDepts()){
//                depts.add(innerDepartmentInfo.getForeignKeyId());
//            }
//        }
//        depts = sysDeptDao.getSysDeptsByAncestorsContaining("," + user.getDeptId().toString() + ",");
        return user.getDeptOids();
    }

    /**
     * 获取菜单数据权限
     *
     * @param user 用户信息
     * @return 菜单权限信息
     */
    public Set<String> getMenuPermission(BasicUser user) {
        Set<String> perms = new HashSet<String>();
        // 管理员拥有所有权限
        if (user.isAdmin()) {
                perms.add("*:*:*");
        } else {
            List<SysRole> sysRoles = sysRoleDao.getSysRolesByIdIn(user.getRoleIds());
            for (SysRole role : sysRoles
            ) {
                List<SysMenu> sysMenus = sysMenuDao.getSysMenusByMenuIdIn(role.getMenuIds());
                perms.addAll(sysMenus.stream().map(p -> p.getPerms()).collect(Collectors.toSet()));
            }
            perms = perms.stream().distinct().collect(Collectors.toSet());

            // perms.addAll(menuService.selectMenuPermsByUserId(user.getUserId()));
        }
        return perms;
    }
}
