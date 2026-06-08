package com.wsi.annotation.api.ims.service.system;

import com.wsi.annotation.api.ims.vo.MetaVo;
import com.wsi.annotation.api.ims.vo.RouterVo;
import com.mongodb.QueryBuilder;
import com.mongodb.client.result.DeleteResult;
import com.mongodb.client.result.UpdateResult;
import com.wsi.annotation.api.common.constant.UserConstants;
import com.wsi.annotation.api.common.core.domain.TreeSelect;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.common.utils.SecurityUtils;
import com.wsi.annotation.api.common.utils.StringUtils;
import com.wsi.annotation.api.database.dao.system.SysMenuDao;
import com.wsi.annotation.api.database.dao.system.SysRoleDao;
import com.wsi.annotation.api.database.dao.basics.SysUserDao;
import com.wsi.annotation.api.database.daoextend.system.SysMenuExtend;
import com.wsi.annotation.api.database.domain.system.SysMenu;
import com.wsi.annotation.api.database.domain.system.SysRole;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import com.wsi.annotation.api.ims.domain.request.system.MenuListReq;
import com.wsi.annotation.api.ims.domain.response.system.SysMenuListResp;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class MenuService {

    @Autowired
    private SysUserDao sysUserDao;

    @Autowired
    private SysMenuDao sysMenuDao;


    @Autowired
    private SysRoleDao sysRoleDao;

    @Autowired
    private SysMenuExtend sysMenuExtend;

    @Autowired
    private MongoTemplate mongoTemplate;

    public List<SysMenu> selectMenuTreeByUserId(String userId) {

        List<SysMenu> menuList = new ArrayList<>();
        BasicUser user = sysUserDao.findById(userId).get();
        if (SecurityUtils.isAdmin(user.getUserId())) {
            menuList = selectMenuTreeAll(0L);
        } else {
            menuList = getMenusByUser(user);
        }
        return menuList;
    }

    public List<SysMenu> selectMenuTreeAll(Long parentId) {
        List<String> menuTypes = new ArrayList<>();
        menuTypes.add("M");
        menuTypes.add("C");
        return sysMenuDao.getSysMenusByMenuTypeInAndStatusAndParentIdOrderByOrderNumAsc(menuTypes, 0, parentId);
    }


    /**
     * 获取菜单数据权限
     *
     * @param user 用户信息
     * @return 菜单权限信息
     */
    public List<SysMenu> getMenusByUser(BasicUser user) {
        List<SysMenu> menus = new ArrayList<>();

        List<SysRole> sysRoles = sysRoleDao.getSysRolesByIdIn(user.getRoleIds());
        List<String> menuTypes = new ArrayList<>();
        menuTypes.add("M");
        menuTypes.add("C");
        for (SysRole role : sysRoles
        ) {
            List<SysMenu> sysMenus = sysMenuDao.getSysMenusByMenuIdInAndMenuTypeIn(role.getMenuIds(), menuTypes);
            menus.addAll(sysMenus);
        }
        menus = menus.stream().distinct().collect(Collectors.toList());
        return menus;
    }

    /**
     * 获取路由名称
     *
     * @param menu 菜单信息
     * @return 路由名称
     */
    public String getRouteName(SysMenu menu) {
        String routerName = menu.getPath();//StringUtils.capitalize(menu.getPath());
        // 非外链并且是一级目录（类型为目录）
        if (isMeunFrame(menu)) {
            routerName = StringUtils.EMPTY;
        }
        return routerName;
    }

    /**
     * 是否为菜单内部跳转
     *
     * @param menu 菜单信息
     * @return 结果
     */
    public boolean isMeunFrame(SysMenu menu) {
        return (menu.getParentId() == null || menu.getParentId().intValue() == 0) && UserConstants.TYPE_MENU.equals(menu.getMenuType());
    }

    /**
     * 获取路由地址
     *
     * @param menu 菜单信息
     * @return 路由地址
     */
    public String getRouterPath(SysMenu menu, String parentPath) {
        String routerPath = parentPath + "/" + menu.getPath();
        // 非外链并且是一级目录（类型为目录）
        if (0 == menu.getParentId().intValue() && UserConstants.TYPE_DIR.equals(menu.getMenuType())) {
            routerPath = parentPath + "/" + menu.getPath();
        }
        // 非外链并且是一级目录（类型为菜单）
        else if (isMeunFrame(menu)) {
            routerPath = "/";
        }
        return routerPath;
    }

    /**
     * 获取组件信息
     *
     * @param menu 菜单信息
     * @return 组件信息
     */
    public String getComponent(SysMenu menu) {
        String component = UserConstants.LAYOUT;
        if (StringUtils.isNotEmpty(menu.getComponent()) && !isMeunFrame(menu)) {
            component = menu.getComponent();
        }
        return component;
    }

    /**
     * 构建前端路由所需要的菜单
     *
     * @param menus 菜单列表
     * @return 路由列表
     */
    public List<RouterVo> buildMenus(List<SysMenu> menus, String parentPath, Long parentId) {
        List<RouterVo> routers = new LinkedList<RouterVo>();
        List<SysMenu> menusRoot = menus.stream().filter(p -> p.getParentId().equals(parentId)).collect(Collectors.toList());
        for (SysMenu menu : menusRoot) {
            RouterVo router = new RouterVo();
            router.setHidden("1".equals(menu.getVisible()));
            router.setName(getRouteName(menu));
            router.setPath(getRouterPath(menu, parentPath));
            router.setComponent(getComponent(menu));
            router.setIcon(menu.getIcon());
            router.setMeta(new MetaVo(menu.getMenuName(), menu.getIcon()));
            List<SysMenu> cMenus = new ArrayList<>();
            List<SysMenu> menusChild = menus.stream().filter(p -> p.getParentId().equals(menu.getMenuId())).collect(Collectors.toList());
            if (menusChild.size() > 0) {
                cMenus = menusChild;
            } else {
                cMenus = selectMenuTreeAll(menu.getMenuId());
            }
            if (!cMenus.isEmpty() && cMenus.size() > 0 && UserConstants.TYPE_DIR.equals(menu.getMenuType())) {
                router.setAlwaysShow(true);
                //router.setRedirect("noRedirect");
                router.setChildren(buildMenus(cMenus, router.getPath(), menu.getMenuId()));
            } else if (isMeunFrame(menu)) {
                List<RouterVo> childrenList = new ArrayList<RouterVo>();
                RouterVo children = new RouterVo();
                children.setPath(menu.getPath());
                children.setComponent(menu.getComponent());
                children.setName(menu.getPath());
                children.setIcon(menu.getIcon());
                children.setMeta(new MetaVo(menu.getMenuName(), menu.getIcon()));
                childrenList.add(children);
                router.setChildren(childrenList);
            }
            routers.add(router);
        }
        return routers;
    }

    public List<SysMenu> selectMenuList(MenuListReq menu, Long userId) {
        List<SysMenu> menuList = null;
        QueryBuilder queryBuilder = new QueryBuilder();

        //动态拼接查询条件
        if (!org.springframework.util.StringUtils.isEmpty(menu.getMenuName())) {
            Pattern pattern = Pattern.compile("^.*" + menu.getMenuName() + ".*$", Pattern.CASE_INSENSITIVE);
            queryBuilder.and("menuName").regex(pattern);
        }

        if (menu.getStatus() != null) {
            queryBuilder.and("status").is(menu.getStatus());
        }

        if (menu.getMenuType() != null && menu.getMenuType().size() > 0) {
            queryBuilder.and("menuType").in(menu.getMenuType());
        }

        Query query = new BasicQuery(queryBuilder.get().toString());

        menuList = sysMenuExtend.getList(query);

        return menuList;
    }

    /**
     * 根据菜单ID查询信息
     *
     * @param menuId 菜单ID
     * @return 菜单信息
     */
    public SysMenu selectMenuById(String menuId) {
        return sysMenuExtend.getMenuById(menuId);
    }

    /**
     * 构建前端所需要下拉树结构
     *
     * @param menus 菜单列表
     * @return 下拉树结构列表
     */
    public List<TreeSelect> buildMenuTreeSelect(List<SysMenu> menus) {
        List<SysMenu> menuTrees = buildMenuTree(menus);
        return menuTrees.stream().map(TreeSelect::new).collect(Collectors.toList());
    }

    /**
     * 构建前端所需要下拉树结构
     *
     * @param menus 菜单列表
     * @return 下拉树结构列表
     */
    public List<SysMenuListResp> buildMenuTreeList(List<SysMenu> menus) {
        List<SysMenu> menuTrees = buildMenuTree(menus);
        return menuTrees.stream().map(SysMenuListResp::new).collect(Collectors.toList());
    }

    /**
     * 构建前端所需要树结构
     *
     * @param menus 菜单列表
     * @return 树结构列表
     */
    public List<SysMenu> buildMenuTree(List<SysMenu> menus) {
        List<SysMenu> returnList = new ArrayList<SysMenu>();
        List<Long> tempList = new ArrayList<Long>();
        for (SysMenu dept : menus) {
            tempList.add(dept.getMenuId());
        }
        for (Iterator<SysMenu> iterator = menus.iterator(); iterator.hasNext(); ) {
            SysMenu menu = (SysMenu) iterator.next();
            // 如果是顶级节点, 遍历该父节点的所有子节点
            if (!tempList.contains(menu.getParentId())) {
                recursionFn(menus, menu);
                returnList.add(menu);
            }
        }
        if (returnList.isEmpty()) {
            returnList = menus;
        }
        return returnList;
    }

    /**
     * 递归列表
     *
     * @param list
     * @param t
     */
    private void recursionFn(List<SysMenu> list, SysMenu t) {
        // 得到子节点列表
        List<SysMenu> childList = getChildList(list, t);
        if (childList.size() > 0) {
            t.setChildren(childList);
        } else {
            t.setChildren(null);
        }
        for (SysMenu tChild : childList) {
            if (hasChild(list, tChild)) {
                recursionFn(list, tChild);
            }
        }
    }

    /**
     * 得到子节点列表
     */
    private List<SysMenu> getChildList(List<SysMenu> list, SysMenu t) {
        List<SysMenu> tlist = new ArrayList<SysMenu>();
        Iterator<SysMenu> it = list.iterator();
        while (it.hasNext()) {
            SysMenu n = (SysMenu) it.next();
            if (n.getParentId().longValue() == t.getMenuId().longValue()) {
                tlist.add(n);
            }
        }
        return tlist;
    }

    /**
     * 递归列表
     *
     * @param list
     * @param t
     */
    private List<SysMenu> getAllChildList(List<SysMenu> list, SysMenu t) {
        // 得到子节点列表
        List<SysMenu> childList = getChildList(list, t);
        for (SysMenu tChild : childList) {
            if (hasChild(list, tChild)) {
                childList.addAll(getAllChildList(list, tChild));
            }
        }
        return childList;
    }

    /**
     * 判断是否有子节点
     */
    private boolean hasChild(List<SysMenu> list, SysMenu t) {
        return getChildList(list, t).size() > 0 ? true : false;
    }

    /**
     * 根据角色ID查询菜单树信息
     *
     * @param roleId 角色ID
     * @return 选中菜单列表
     */
    public List<Long> selectMenuListByRoleId(String roleId)
    {
        SysRole role = mongoTemplate.findById(roleId,SysRole.class);
        return role.getMenuIds();
    }

    /**
     * 新增保存菜单信息
     *
     * @param menu 菜单信息
     * @return 结果
     */
    public SysMenu insertMenu(SysMenu menu) {
        return mongoTemplate.insert(menu);
    }

    /**
     * 修改保存菜单信息
     *
     * @param menu 菜单信息
     * @return 结果
     */
    public SysMenu updateMenu(SysMenu menu) {
        SysMenu sourceMenu = sysMenuDao.findById(menu.getId()).get();
        if (sourceMenu == null) {
            throw new HTTPDataException(400, "数据不存在不能编辑");
        }
        List<SysMenu> sysMenus = sysMenuDao.getSysMenusByDelFlag(0);
        List<SysMenu> allChilds = getAllChildList(sysMenus, sourceMenu);
        allChilds.add(sourceMenu);
        if (allChilds.stream().anyMatch(x -> x.getMenuId().equals(menu.getParentId()))) {
            throw new HTTPDataException(400, "上级不能选择下级或自己");
        }
        return mongoTemplate.save(menu);
    }

    /**
     * 删除菜单管理信息
     *
     * @param menuId 菜单ID
     * @return 结果
     */
    public int deleteMenuById(String menuId) {
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("id").is(menuId);
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());
        DeleteResult result = mongoTemplate.remove(query, SysMenu.class);
        return (int) result.getDeletedCount();
    }

    /**
     * 删除菜单管理信息
     *
     * @param menuIds 菜单ID
     * @return 结果
     */
    public int del(List<String> menuIds) {
        hasChildByMenuId(menuIds);

        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("id").in(menuIds);
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());
        DeleteResult result = mongoTemplate.remove(query, SysMenu.class);
        return (int) result.getDeletedCount();
    }

    public void hasChildByMenuId(List<String> menuIds) {
        List<SysMenu> sysMenus = (List<SysMenu>) sysMenuDao.findAllById(menuIds);
        for (SysMenu sysMenu : sysMenus
        ) {
            Long count = sysMenuDao.countSysMenusByParentId(sysMenu.getMenuId());
            if (count > 0) {
                throw new HTTPDataException(405, "存在子菜单不允许操作");
            }
        }
    }

    public String checkUnique(SysMenu menu, Integer min) {
        Long count = sysMenuDao.countSysMenusByDelFlagAndMenuName(0,menu.getMenuName());
        if (count > min) {
            return UserConstants.NOT_UNIQUE;
        }
        return UserConstants.UNIQUE;
    }
}
