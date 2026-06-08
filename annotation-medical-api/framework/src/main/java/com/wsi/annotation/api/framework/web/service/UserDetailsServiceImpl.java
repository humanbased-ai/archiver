package com.wsi.annotation.api.framework.web.service;

//import com.early.common.core.domain.entity.SysUser;

import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.utils.StringUtils;
//import com.early.system.service.ISysUserService;
import com.wsi.annotation.api.database.dao.basics.SysUserDao;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * 用户验证处理
 *
 * @author early
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    private static final Logger log = LoggerFactory.getLogger(UserDetailsServiceImpl.class);

    @Autowired
    private SysUserDao sysUserDao;

    @Autowired
    private SysPermissionService permissionService;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        BasicUser user = sysUserDao.getSysUserByUserName(username);

        if (StringUtils.isNull(user)) {
            log.info("登录用户：{} 不存在.", username);
            throw new UsernameNotFoundException("邮箱验证码不正确！");
        }
//        else if (UserStatus.DELETED.getCode().equals(user.getDelFlag()))
//        {
//            log.info("登录用户：{} 已被删除.", username);
//            throw new BaseException("对不起，您的账号：" + username + " 已被删除");
//        }
//        else if (UserStatus.DISABLE.getCode().equals(user.getStatus()))
//        {
//            log.info("登录用户：{} 已被停用.", username);
//            throw new BaseException("对不起，您的账号：" + username + " 已停用");
//        }

        return createLoginUser(user);
    }

    public UserDetails createLoginUser(BasicUser user) {
        return new LoginUser(user, permissionService.getMenuPermission(user), permissionService.getSysRoles(user), permissionService.getSysDepts(user));
        //return new LoginUser();
    }


}
