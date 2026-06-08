package com.wsi.annotation.api.ims.controller.basic;

import com.wsi.annotation.api.common.annotation.DataInit;
import com.wsi.annotation.api.common.annotation.DataScope;
import com.wsi.annotation.api.common.annotation.Log;
import com.wsi.annotation.api.common.constant.UserConstants;
import com.wsi.annotation.api.common.core.controller.BaseController;
import com.wsi.annotation.api.common.core.domain.AjaxResult;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.core.mvc.JqGridPage;
import com.wsi.annotation.api.common.enums.BusinessType;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.common.utils.SecurityUtils;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import com.wsi.annotation.api.framework.web.service.TokenService;
import com.wsi.annotation.api.ims.domain.request.basic.SysUserSearch;
import com.wsi.annotation.api.ims.service.basic.SysUserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@Api(tags = "sysUser")
@RequestMapping("/basic/sysUser")
public class SysUserController extends BaseController {
    @Autowired
    SysUserService sysUserService;
    @Autowired
    private TokenService tokenService;

    @PostMapping(value = "/add", produces = {"application/json"})
    @Log(title = "职员添加", businessType = BusinessType.INSERT)
    @DataInit
    @PreAuthorize("@ss.hasPermi('basic:sysUser:add')")
    @ApiOperation(value = "职员添加",notes = "职员添加", nickname = "userAdd")
    public AjaxResult add(@RequestBody BasicUser basicUser){
//        basicUser.setUserName(basicUser.getPhonenumber());
        String unique = sysUserService.checkUnique(basicUser);
        if (UserConstants.NOT_UNIQUE.equals(unique)){
           throw new HTTPDataException(400,"已存在该职员");
        }
        BasicUser user = sysUserService.addUser(basicUser);
        if (user!= null){
            return AjaxResult.success("添加职员:"+user.getNickName()+"成功!");
        }
        return AjaxResult.error("添加职员失败!");
    }

    @GetMapping(value = "/list")
    @PreAuthorize("@ss.hasPermi('basic:sysUser:list')")
    @DataScope
    @ApiOperation(value = "职员列表",notes = "职员列表", nickname = "userList")
    public JqGridPage<BasicUser> list(SysUserSearch sysUserSearch){
        JqGridPage<BasicUser> companies = sysUserService.list(sysUserSearch);
        return companies;
    }

    @GetMapping(value = "/getUser/{id}")
    @DataScope
    @ApiOperation(value = "获取用户信息",notes = "获取用户信息", nickname = "getUser")
    public AjaxResult getUser(@PathVariable String id){
        BasicUser basicUser = sysUserService.getUserById(id);
//        JqGridPage<BasicUser> companies = sysUserService.list(sysUserSearch);
        return AjaxResult.success(basicUser);
    }

    @PostMapping(value = "/update", produces = {"application/json"})
    @PreAuthorize("@ss.hasPermi('basic:sysUser:update')")
    @ApiOperation(value = "职员修改",notes = "职员修改", nickname = "userEdit")
    public AjaxResult update(@RequestBody BasicUser basicUser){
        String unique = sysUserService.checkUnique(basicUser);
        if (UserConstants.UNIQUE.equals(unique)){
            Integer update = sysUserService.update(basicUser);
            return toAjax(update);
        }
        return AjaxResult.error("职员修改失败！有重复数据");
    }

    @PostMapping(value = "/del", produces = {"application/json"})
    @PreAuthorize("@ss.hasPermi('basic:sysUser:del')")
    @ApiOperation(value = "职员离职",notes = "职员离职", nickname = "userDel")
    public AjaxResult del(@RequestParam String id){
        List<String> ids = new ArrayList();
        ids.add(id);
        Long result = sysUserService.del(ids);
        if (result>0){
            return AjaxResult.success("删除成功！");
        }
        return AjaxResult.error("操作失败！");
    }

    @PostMapping(value = "/updatePsw", produces = {"application/json"})
    @PreAuthorize("@ss.hasPermi('basic:sysUser:password')")
    @ApiOperation(value = "职员修改密码",notes = "职员修改密码", nickname = "updatePsw")
    public AjaxResult updatePsw(@RequestParam String id,@RequestParam String psw){
        Long result = sysUserService.updatePsw(id,psw);
        if (result>0){
            return AjaxResult.success("职员修改密码！");
        }
        return AjaxResult.error("操作失败！");
    }

    @PostMapping(value = "/updatePwd", produces = {"application/json"})
    @ApiOperation(value = "修改自己的密码",notes = "修改自己的密码", nickname = "updatePwd")
    public AjaxResult updatePwd(@RequestParam String oldPassword,@RequestParam String newPassword){
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
        String userId = loginUser.getUser().getId();
        BasicUser basicUser = sysUserService.getUserById(userId);
        logger.info(SecurityUtils.encryptPassword(oldPassword));
        if(!SecurityUtils.matchesPassword(oldPassword, basicUser.getPassword())){
            return AjaxResult.error("原密码错误！");
        }
        Long result = sysUserService.updatePsw(userId,newPassword);
        if (result>0){
            return AjaxResult.success("职员修改密码！");
        }
        return AjaxResult.error("操作失败！");
    }

    @PostMapping(value = "/changeStatus", produces = {"application/json"})
    @ApiOperation(value = "修改状态",notes = "修改状态", nickname = "changeStatus")
    public AjaxResult changeStatus(@RequestParam String id,@RequestParam String status){
        Long result = sysUserService.changeStatus(id,status);
        if (result>0){
            return AjaxResult.success("修改职员状态成功！");
        }
        return AjaxResult.error("操作失败！");
    }



}
