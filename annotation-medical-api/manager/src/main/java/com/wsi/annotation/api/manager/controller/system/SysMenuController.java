package com.wsi.annotation.api.manager.controller.system;


import com.wsi.annotation.api.common.annotation.DataInit;
import com.wsi.annotation.api.common.annotation.Log;
import com.wsi.annotation.api.common.core.controller.BaseController;
import com.wsi.annotation.api.common.core.domain.AjaxResult;
import com.wsi.annotation.api.common.core.domain.TreeSelect;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.enums.BusinessType;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.database.domain.system.SysMenu;
import com.wsi.annotation.api.framework.web.service.TokenService;
import com.wsi.annotation.api.manager.domain.request.system.MenuListReq;
import com.wsi.annotation.api.manager.domain.response.system.SysMenuListResp;
import com.wsi.annotation.api.manager.service.system.MenuService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import com.wsi.annotation.api.common.constant.UserConstants;

import java.util.List;

/**
 * 菜单信息
 *
 * @author early
 */
@RestController
@RequestMapping("/system/menu")
@Api(tags = "menu")
public class SysMenuController extends BaseController {
    @Autowired
    private MenuService menuService;

    @Autowired
    private TokenService tokenService;

    /**
     * 获取菜单列表
     */
    @PreAuthorize("@ss.hasPermi('system:menu:list')")
    @GetMapping(value = "/list")
    @ApiOperation(value = "获取菜单", notes = "获取菜单", nickname = "menuList")
    public List<SysMenuListResp> list(MenuListReq menu) {
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
        Long userId = loginUser.getUser().getUserId();
        List<SysMenu> menus = menuService.selectMenuList(menu, userId);
        return menuService.buildMenuTreeList(menus);
    }

    /**
     * 根据菜单编号获取详细信息
     */
    @PreAuthorize("@ss.hasPermi('system:menu:detail')")
    @GetMapping(value = "/{menuId}" , produces = {"application/json"})
    @ApiOperation(value = "获取菜单详情", notes = "获取菜单详情", nickname = "menuDetail")
    public AjaxResult getInfo(@PathVariable String menuId)
    {
        return AjaxResult.success(menuService.selectMenuById(menuId));
    }

    /**
     * 获取菜单下拉树列表
     */
//    @PreAuthorize("@ss.hasPermi('system:menu:treeSelect')")
    @GetMapping(value = "/treeSelect")
    @ApiOperation(value = "获取菜单下拉树列表", notes = "获取菜单下拉树列表", nickname = "menuTreeSelect")
    public List<TreeSelect> treeSelect(MenuListReq menu)
    {
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
        Long userId = loginUser.getUser().getUserId();
        List<SysMenu> menus = menuService.selectMenuList(menu, userId);
        return menuService.buildMenuTreeSelect(menus);
    }

//    /**
//     * 加载对应角色菜单列表树
//     */
    @GetMapping(value = "/roleMenuTreeselect/{roleId}")
    public AjaxResult roleMenuTreeselect(@PathVariable("roleId") String roleId)
    {
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
        MenuListReq menu = new MenuListReq();
        List<SysMenu> menus = menuService.selectMenuList(menu,loginUser.getUser().getUserId());
        AjaxResult ajax = AjaxResult.success();
        ajax.put("checkedKeys", menuService.selectMenuListByRoleId(roleId));
        ajax.put("menus", menuService.buildMenuTreeSelect(menus));
        return ajax;
    }

    /**
     * 新增菜单
     */
    @DataInit
    @PreAuthorize("@ss.hasPermi('system:menu:add')")
    @Log(title = "菜单管理", businessType = BusinessType.INSERT)
    @PostMapping(value = "/add")
    @ApiOperation(value = "新增菜单", notes = "新增菜单", nickname = "menuAdd")
    public AjaxResult add(@Validated @RequestBody SysMenu menu)
    {
        if (UserConstants.NOT_UNIQUE.equals(menuService.checkUnique(menu,0)))
        {
            throw new HTTPDataException(400,"新增菜单'" + menu.getMenuName() + "'失败，菜单名称已存在");
        }
//        else if (UserConstants.YES_FRAME.equals(menu.getIsFrame())
//                && !StringUtils.startsWithAny(menu.getPath(), Constants.HTTP, Constants.HTTPS))
//        {
//            return AjaxResult.error("新增菜单'" + menu.getMenuName() + "'失败，地址必须以http(s)://开头");
//        }

        return AjaxResult.success(menuService.insertMenu(menu));

    }

    /**
     * 修改菜单
     */
    @PreAuthorize("@ss.hasPermi('system:menu:edit')")
    @Log(title = "菜单管理", businessType = BusinessType.UPDATE)
    @PutMapping(value = "/edit", produces = {"application/json"})
    @ApiOperation(value = "编辑菜单", notes = "编辑菜单", nickname = "menuEdit")
    public AjaxResult edit(@RequestBody SysMenu menu)
    {
        if (UserConstants.NOT_UNIQUE.equals(menuService.checkUnique(menu,1)))
        {
            throw new HTTPDataException(400,"修改菜单'" + menu.getMenuName() + "'失败，菜单名称已存在");
        }
//        else if (UserConstants.YES_FRAME.equals(menu.getIsFrame())
//                && !StringUtils.startsWithAny(menu.getPath(), Constants.HTTP, Constants.HTTPS))
//        {
//            return AjaxResult.error("新增菜单'" + menu.getMenuName() + "'失败，地址必须以http(s)://开头");
//        }
//        else if (menu.getMenuId().equals(menu.getParentId()))
//        {
//            return AjaxResult.error("新增菜单'" + menu.getMenuName() + "'失败，上级菜单不能选择自己");
//        }
//        menu.setUpdateBy(SecurityUtils.getUsername());
        return AjaxResult.success(menuService.updateMenu(menu));
    }

    /**
     * 禁用菜单
     */
    @PreAuthorize("@ss.hasPermi('system:menu:disable')")
    @Log(title = "菜单管理", businessType = BusinessType.DELETE)
    @DeleteMapping(value = "/{menuId}",produces = {"application/json"})
    @ApiOperation(value = "禁用菜单", notes = "禁用菜单", nickname = "menuDisable")
    public AjaxResult remove(@PathVariable("menuId") String menuId)
    {
//        if (menuService.hasChildByMenuId(menuId))
//        {
//            return AjaxResult.error("存在子菜单,不允许删除");
//        }
//        if (menuService.checkMenuExistRole(menuId))
//        {
//            return AjaxResult.error("菜单已分配,不允许删除");
//        }
        return toAjax(menuService.deleteMenuById(menuId));
    }

    /**
     * 删除菜单
     */
    @PreAuthorize("@ss.hasPermi('system:menu:remove')")
    @Log(title = "菜单管理", businessType = BusinessType.DELETE)
    @DeleteMapping(value = "/del")
    @ApiOperation(value = "删除菜单", notes = "删除菜单", nickname = "menuDel")
    public AjaxResult del(@RequestBody List<String> menuIds)
    {
        return toAjax(menuService.del(menuIds));
    }
}