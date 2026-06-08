package com.wsi.annotation.api.ims.controller.system;

import com.wsi.annotation.api.common.annotation.DataInit;
import com.wsi.annotation.api.common.annotation.DataScope;
import com.wsi.annotation.api.common.annotation.Log;
import com.wsi.annotation.api.common.constant.UserConstants;
import com.wsi.annotation.api.common.core.controller.BaseController;
import com.wsi.annotation.api.common.core.domain.TreeSelect;
import com.wsi.annotation.api.common.enums.BusinessType;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.database.domain.system.BasicDept;
import com.wsi.annotation.api.ims.domain.request.system.DeptListReq;
import com.wsi.annotation.api.ims.domain.response.system.DeptListResp;
import com.wsi.annotation.api.ims.service.system.DeptService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;


/**
 * 部门信息
 *
 * @author early
 */
@RestController
@RequestMapping("/system/dept")
@Api(tags = "dept")
public class SysDeptController extends BaseController {
    @Autowired
    private DeptService deptService;

    /**
     * 获取部门列表
     */
    @PreAuthorize("@ss.hasPermi('basic:dept:list')")
    @DataScope
    @GetMapping(value = "/list")
    @ApiOperation(value = "获取部门列表", notes = "获取部门列表", nickname = "deptList")
    public List<DeptListResp> list(DeptListReq deptListReq) {
        List<BasicDept> depts = deptService.selectDeptList(deptListReq);
        return deptService.buildDeptTreeList(depts);
    }

    @PreAuthorize("@ss.hasPermi('basic:dept:add')")
    @DataInit
    @Log(title = "部门管理", businessType = BusinessType.INSERT)
    @PostMapping(value = "/add", produces = {"application/json"})
    @ApiOperation(value = "添加部门", notes = "添加部门", nickname = "deptAdd")
    public String add(@RequestBody BasicDept dept) {
        String unique = deptService.checkUnique(dept,0);
        if (UserConstants.NOT_UNIQUE.equals(unique)) {
            throw new HTTPDataException(400, "添加失败，数据库有重复数据!");
        }
        BasicDept add = deptService.add(dept);
        if (add != null) {
            return "添加成功!";
        }
        throw new HTTPDataException(400, "添加失败!");
    }

    @PreAuthorize("@ss.hasPermi('basic:dept:update')")
    @Log(title = "部门管理", businessType = BusinessType.UPDATE)
    @PutMapping(value = "/update", produces = {"application/json"})
    @ApiOperation(value = "编辑部门", notes = "编辑部门", nickname = "deptEdit")
    public String update(@Validated @RequestBody BasicDept dept) {
        String unique = deptService.checkUnique(dept,1);
        if (UserConstants.NOT_UNIQUE.equals(unique)) {
            throw new HTTPDataException(400, "更新失败，数据库有重复数据!");
        }
        BasicDept update = deptService.update(dept);
        if (update != null) {
            return "更新成功！";
        } else {
            throw new HTTPDataException(400, "更新失败!");
        }

    }

    @PreAuthorize("@ss.hasPermi('basic:dept:del')")
    @Log(title = "部门管理", businessType = BusinessType.DELETE)
    @DeleteMapping(value = "/del", produces = {"application/json"})
    @ApiOperation(value = "删除部门", notes = "删除部门", nickname = "deptDel")
    public String del(@RequestParam String id) {
        long del = deptService.del(id);
        if (del > 0) {
            return "删除成功！";
        }
        return "删除失败！";
    }

    @PreAuthorize("@ss.hasPermi('basic:dept:change')")
    @Log(title = "部门管理", businessType = BusinessType.CHANGE)
    @GetMapping(value = "/changeDeptStatus", produces = {"application/json"})
    @ApiOperation(value = "修改状态", notes = "修改状态", nickname = "changeDeptStatus")
    public String changeStatus(@RequestParam String id) {
        long update = deptService.changeDeptStatus(id);
        if (update > 0) {
            return "更新成功！";
        } else {
            return "更新失败！";
        }
    }

    @PreAuthorize("@ss.hasPermi('basic:dept:detail')")
    @Log(title = "部门管理", businessType = BusinessType.DETAIL)
    @GetMapping(value = "/getDeptDetail")
    @ApiOperation(value = "得到部门详情", notes = "得到部门详情", nickname = "getDeptDetail")
    public BasicDept getDeptDetail(@RequestParam String id) {
        return deptService.getDeptDetail(id);
    }


    /**
     * 获取菜单下拉树列表
     */
    @PreAuthorize("@ss.hasPermi('basic:dept:treeSelect')")
    @GetMapping(value = "/treeSelect")
    @ApiOperation(value = "获取菜单下拉树列表", notes = "获取菜单下拉树列表", nickname = "deptTreeSelect")
    public List<TreeSelect> treeSelect(DeptListReq deptListReq) {
        List<BasicDept> depts = deptService.selectDeptList(deptListReq);
        return deptService.buildDeptTreeSelect(depts);
    }

//
//    /**
//     * 查询部门列表（排除节点）
//     */
//    @PreAuthorize("@ss.hasPermi('system:dept:list')")
//    @GetMapping("/list/exclude/{deptId}")
//    public AjaxResult excludeChild(@PathVariable(value = "deptId", required = false) Long deptId)
//    {
//        List<SysDept> depts = deptService.selectDeptList(new SysDept());
//        Iterator<SysDept> it = depts.iterator();
//        while (it.hasNext())
//        {
//            SysDept d = (SysDept) it.next();
//            if (d.getDeptId().intValue() == deptId
//                    || ArrayUtils.contains(StringUtils.split(d.getAncestors(), ","), deptId + ""))
//            {
//                it.remove();
//            }
//        }
//        return AjaxResult.success(depts);
//    }
//
//    /**
//     * 根据部门编号获取详细信息
//     */
//    @PreAuthorize("@ss.hasPermi('system:dept:query')")
//    @GetMapping(value = "/{deptId}")
//    public AjaxResult getInfo(@PathVariable Long deptId)
//    {
//        return AjaxResult.success(deptService.selectDeptById(deptId));
//    }
//
//    /**
//     * 获取部门下拉树列表
//     */
//    @GetMapping("/treeselect")
//    public AjaxResult treeselect(SysDept dept)
//    {
//        List<SysDept> depts = deptService.selectDeptList(dept);
//        return AjaxResult.success(deptService.buildDeptTreeSelect(depts));
//    }
//
//    /**
//     * 加载对应角色部门列表树
//     */
//    @GetMapping(value = "/roleDeptTreeselect/{roleId}")
//    public AjaxResult roleDeptTreeselect(@PathVariable("roleId") Long roleId)
//    {
//        List<SysDept> depts = deptService.selectDeptList(new SysDept());
//        AjaxResult ajax = AjaxResult.success();
//        ajax.put("checkedKeys", deptService.selectDeptListByRoleId(roleId));
//        ajax.put("depts", deptService.buildDeptTreeSelect(depts));
//        return ajax;
//    }
//
//    /**
//     * 新增部门
//     */
//    @PreAuthorize("@ss.hasPermi('system:dept:add')")
//    @Log(title = "部门管理", businessType = BusinessType.INSERT)
//    @PostMapping
//    public AjaxResult add(@Validated @RequestBody SysDept dept)
//    {
//        if (UserConstants.NOT_UNIQUE.equals(deptService.checkDeptNameUnique(dept)))
//        {
//            return AjaxResult.error("新增部门'" + dept.getDeptName() + "'失败，部门名称已存在");
//        }
//        dept.setCreateBy(SecurityUtils.getUsername());
//        return toAjax(deptService.insertDept(dept));
//    }
//
//    /**
//     * 修改部门
//     */
//    @PreAuthorize("@ss.hasPermi('system:dept:edit')")
//    @Log(title = "部门管理", businessType = BusinessType.UPDATE)
//    @PutMapping
//    public AjaxResult edit(@Validated @RequestBody SysDept dept)
//    {
//        if (UserConstants.NOT_UNIQUE.equals(deptService.checkDeptNameUnique(dept)))
//        {
//            return AjaxResult.error("修改部门'" + dept.getDeptName() + "'失败，部门名称已存在");
//        }
//        else if (dept.getParentId().equals(dept.getDeptId()))
//        {
//            return AjaxResult.error("修改部门'" + dept.getDeptName() + "'失败，上级部门不能是自己");
//        }
//        else if (StringUtils.equals(UserConstants.DEPT_DISABLE, dept.getStatus())
//                && deptService.selectNormalChildrenDeptById(dept.getDeptId()) > 0)
//        {
//            return AjaxResult.error("该部门包含未停用的子部门！");
//        }
//        dept.setUpdateBy(SecurityUtils.getUsername());
//        return toAjax(deptService.updateDept(dept));
//    }
//
//    /**
//     * 删除部门
//     */
//    @PreAuthorize("@ss.hasPermi('system:dept:remove')")
//    @Log(title = "部门管理", businessType = BusinessType.DELETE)
//    @DeleteMapping("/{deptId}")
//    public AjaxResult remove(@PathVariable Long deptId)
//    {
//        if (deptService.hasChildByDeptId(deptId))
//        {
//            return AjaxResult.error("存在下级部门,不允许删除");
//        }
//        if (deptService.checkDeptExistUser(deptId))
//        {
//            return AjaxResult.error("部门存在用户,不允许删除");
//        }
//        return toAjax(deptService.deleteDeptById(deptId));
//    }
}

