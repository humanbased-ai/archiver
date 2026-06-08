package com.wsi.annotation.api.ims.controller.system;

import com.wsi.annotation.api.common.core.domain.model.LoginBody;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.database.domain.system.SysMenu;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import com.wsi.annotation.api.ims.domain.response.system.UserInfo;
import com.wsi.annotation.api.ims.service.system.MenuService;
import com.wsi.annotation.api.ims.service.basic.SysUserService;
import com.wsi.annotation.api.framework.web.service.SysLoginService;
import com.wsi.annotation.api.framework.web.service.SysPermissionService;
import com.wsi.annotation.api.framework.web.service.TokenService;
//import com.early.system.service.ISysMenuService;
import com.wsi.annotation.api.ims.vo.RouterVo;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

/**
 * 登录验证
 * 
 * @author early
 */
@RestController
@Api(tags = "login")
@RequestMapping("/system/login")
public class SysLoginController
{
    @Autowired
    private SysLoginService loginService;

    @Autowired
    private SysPermissionService permissionService;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private SysUserService sysUserService;

    @Autowired
    private MenuService menuService;

    /**
     * 登录方法
     * 
     * @param loginBody 登录信息
     * @return 结果
     */
    @PostMapping("/login")
    @ApiOperation(value="登录", notes="登录",nickname="login")
    public String login(@RequestBody LoginBody loginBody)
    {
        sysUserService.initUser();
        // 生成令牌
        String token = loginService.login(loginBody.getUsername(), loginBody.getPassword(), loginBody.getCode(),
                loginBody.getUuid());
        return token;
    }

    /**
     * 获取用户信息
     *
     * @return 用户信息
     */
    @GetMapping("/getInfo")
    @ApiOperation(value="获取用户信息", notes="获取用户信息",nickname="getInfo")
    public UserInfo getInfo()
    {
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
        BasicUser user = loginUser.getUser();
        // 角色集合
        Set<String> roles = permissionService.getRolePermission(user);
        // 权限集合
        Set<String> permissions = permissionService.getMenuPermission(user);

        UserInfo userInfo = new UserInfo();
        userInfo.setUser(user);
        userInfo.setPermissions(permissions);
        userInfo.setRoles(roles);
        return userInfo;
    }

    /**
     * 获取路由信息
     *
     * @return 路由信息
     */
    @GetMapping("getRouters")
    @ApiOperation(value="获取路由信息", notes="获取路由信息",nickname="getRouters")
    public List<RouterVo> getRouters()
    {
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
        // 用户信息
        BasicUser user = loginUser.getUser();
        List<SysMenu> menus = menuService.selectMenuTreeByUserId(user.getId());
        return menuService.buildMenus(menus,"",0L);
    }

    @GetMapping("loginOut")
    @ApiOperation(value="注销", notes="注销",nickname="loginOut")
    public String loginOut()
    {
        return "Success";
    }



}
