package com.wsi.annotation.api.manager.controller.system;

import com.wsi.annotation.api.manager.domain.request.system.RoleListReq;
import com.wsi.annotation.api.common.annotation.Log;
import com.wsi.annotation.api.common.constant.UserConstants;
import com.wsi.annotation.api.common.core.controller.BaseController;
import com.wsi.annotation.api.common.core.domain.AjaxResult;
import com.wsi.annotation.api.common.core.mvc.JqGridPage;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.database.domain.system.SysRole;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.enums.BusinessType;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.framework.web.service.SysPermissionService;
import com.wsi.annotation.api.framework.web.service.TokenService;
import com.wsi.annotation.api.manager.domain.response.system.RoleListResp;
import com.wsi.annotation.api.manager.service.basic.SysUserService;
import com.wsi.annotation.api.manager.service.system.SysRoleService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;

import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

/**
 * 角色信息
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/system/role")
@Api(tags = "role")
public class SysRoleController extends BaseController {
    @Autowired
    private SysRoleService roleService;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private SysPermissionService permissionService;

    @Autowired
    private SysUserService userService;

    @PreAuthorize("@ss.hasPermi('system:role:list')")
    @GetMapping(value = "/list")
    @ApiOperation(value = "获取角色", notes = "获取角色", nickname = "roleList")
    public JqGridPage<RoleListResp> list(RoleListReq role) {
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
        Long userId = loginUser.getUser().getUserId();
        JqGridPage<RoleListResp> list = roleService.selectRoleList(role, userId);
        return list;
    }

//    @Log(title = "角色管理", businessType = BusinessType.EXPORT)
//    @PreAuthorize("@ss.hasPermi('system:role:export')")
//    @GetMapping(value = "/export", produces = {"application/json"})
//    @ApiOperation(value = "导出角色", notes = "导出角色", nickname = "roleExport")
//    public AjaxResult export(SysRole role)
//    {
//        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
//        Long userId = loginUser.getUser().getUserId();
//        List<SysRole> list = roleService.selectRoleList(role,userId);
//        ExcelUtil<SysRole> util = new ExcelUtil<SysRole>(SysRole.class);
//        return util.exportExcel(list, "角色数据");
//    }

//    /**
//     * 根据角色编号获取详细信息
//     */
    @PreAuthorize("@ss.hasPermi('system:role:query')")
    @GetMapping(value = "/{roleId}", produces = {"application/json"})
    @ApiOperation(value = "获取角色详情", notes = "获取角色详情", nickname = "roleDetail")
    public AjaxResult getInfo(@PathVariable String roleId)
    {
        return AjaxResult.success(roleService.selectRoleById(roleId));
    }

    /**
     * 新增角色
     */
    @PreAuthorize("@ss.hasPermi('system:role:add')")
    @Log(title = "角色管理", businessType = BusinessType.INSERT)
    @PostMapping(value = "/add", produces = {"application/json"})
    @ApiOperation(value = "新增角色", notes = "新增角色", nickname = "roleAdd")
    public AjaxResult add(@RequestBody SysRole role) {
        if (role.getRoleName().equals("")) {
            return AjaxResult.error("新增角色不能为空");
        }
        if (UserConstants.NOT_UNIQUE.equals(roleService.checkRoleUnique(role, 0))) {
            throw new HTTPDataException(400, "新增角色'" + role.getRoleName() + "'失败，角色已存在");
        }
        return toAjax(roleService.insertRole(role));

    }

    /**
     * 修改保存角色
     */
    @PreAuthorize("@ss.hasPermi('system:role:edit')")
    @Log(title = "角色管理", businessType = BusinessType.UPDATE)
    @PutMapping(value = "/edit", produces = {"application/json"})
    @ApiOperation(value = "编辑角色", notes = "编辑角色", nickname = "roleEdit")
    public AjaxResult edit(@RequestBody SysRole role) {
        if (UserConstants.NOT_UNIQUE.equals(roleService.checkRoleUnique(role, 1))) {
            throw new HTTPDataException(400, "修改角色'" + role.getRoleName() + "'失败，角色已存在");
        }
        return toAjax(roleService.updateRole(role));
    }

//    /**
//     * 修改保存数据权限
//     */
//    @PreAuthorize("@ss.hasPermi('system:role:edit')")
//    @Log(title = "角色管理", businessType = BusinessType.UPDATE)
//    @PutMapping("/dataScope")
//    public AjaxResult dataScope(@RequestBody SysRole role)
//    {
//        roleService.checkRoleAllowed(role);
//        return toAjax(roleService.authDataScope(role));
//    }
//
//    /**
//     * 状态修改
//     */
    @PreAuthorize("@ss.hasPermi('system:role:edit')")
    @Log(title = "角色管理", businessType = BusinessType.UPDATE)
    @PutMapping("/changeStatus")
    public AjaxResult changeStatus(@RequestParam String id,Integer status)
    {
        return toAjax(roleService.updateRoleStatus(id,status));
    }
//

    /**
     * 删除角色
     */
//    @PreAuthorize("@ss.hasPermi('system:role:remove')")
//    @Log(title = "角色管理", businessType = BusinessType.DELETE)
//    @DeleteMapping(value = "/del", produces = {"application/json"})
//    @ApiOperation(value = "删除角色", notes = "删除角色", nickname = "roleDel")
//    public AjaxResult remove(@RequestBody List<String> roleIds) {
//        return toAjax(roleService.deleteRoleByIds(roleIds));
//    }

    @PreAuthorize("@ss.hasPermi('system:role:remove')")
    @Log(title = "角色管理", businessType = BusinessType.DELETE)
    @DeleteMapping(value = "/del", produces = {"application/json"})
    @ApiOperation(value = "删除角色", notes = "删除角色", nickname = "roleDel")
    public AjaxResult remove(@RequestParam String roleId) {
        List<String> roleIds = new ArrayList<>();
        roleIds.add(roleId);
        return toAjax(roleService.deleteRoleByIds(roleIds));
    }
//
//    /**
//     * 获取角色选择框列表
//     */
//    @PreAuthorize("@ss.hasPermi('system:role:query')")
//    @GetMapping("/optionselect")
//    public AjaxResult optionselect()
//    {
//        return AjaxResult.success(roleService.selectRoleAll());
//    }
//
//    /**
//     * 查询已分配用户角色列表
//     */
//    @PreAuthorize("@ss.hasPermi('system:role:list')")
//    @GetMapping("/authUser/allocatedList")
//    public TableDataInfo allocatedList(SysUser user)
//    {
//        startPage();
//        List<SysUser> list = userService.selectAllocatedList(user);
//        return getDataTable(list);
//    }
//
//    /**
//     * 查询未分配用户角色列表
//     */
//    @PreAuthorize("@ss.hasPermi('system:role:list')")
//    @GetMapping("/authUser/unallocatedList")
//    public TableDataInfo unallocatedList(SysUser user)
//    {
//        startPage();
//        List<SysUser> list = userService.selectUnallocatedList(user);
//        return getDataTable(list);
//    }
//
//    /**
//     * 取消授权用户
//     */
//    @PreAuthorize("@ss.hasPermi('system:role:edit')")
//    @Log(title = "角色管理", businessType = BusinessType.GRANT)
//    @PutMapping("/authUser/cancel")
//    public AjaxResult cancelAuthUser(@RequestBody SysUserRole userRole)
//    {
//        return toAjax(roleService.deleteAuthUser(userRole));
//    }
//
//    /**
//     * 批量取消授权用户
//     */
//    @PreAuthorize("@ss.hasPermi('system:role:edit')")
//    @Log(title = "角色管理", businessType = BusinessType.GRANT)
//    @PutMapping("/authUser/cancelAll")
//    public AjaxResult cancelAuthUserAll(Long roleId, Long[] userIds)
//    {
//        return toAjax(roleService.deleteAuthUsers(roleId, userIds));
//    }
//
//    /**
//     * 批量选择用户授权
//     */
//    @PreAuthorize("@ss.hasPermi('system:role:edit')")
//    @Log(title = "角色管理", businessType = BusinessType.GRANT)
//    @PutMapping("/authUser/selectAll")
//    public AjaxResult selectAuthUserAll(Long roleId, Long[] userIds)
//    {
//        return toAjax(roleService.insertAuthUsers(roleId, userIds));
//    }
}
