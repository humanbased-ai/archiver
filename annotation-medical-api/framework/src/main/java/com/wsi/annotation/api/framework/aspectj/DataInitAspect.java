package com.wsi.annotation.api.framework.aspectj;

import com.wsi.annotation.api.framework.web.service.TokenService;
import com.wsi.annotation.api.common.annotation.DataInit;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.common.utils.StringUtils;
import com.wsi.annotation.api.common.utils.spring.SpringUtils;
import com.wsi.annotation.api.database.domain.BaseEntity;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.Signature;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

/**
 * 新增数据初始化
 *
 * @author lixiugui
 */
@Aspect
@Component
public class DataInitAspect {
    // 配置织入点
    @Pointcut("@annotation(com.wsi.annotation.api.common.annotation.DataInit)")
    public void dataInitPointCut() {
    }

    @Before("dataInitPointCut()")
    public void doBefore(JoinPoint point) throws Throwable {
        handleDataInit(point);
    }

    protected void handleDataInit(final JoinPoint joinPoint) {
        // 获得注解
        DataInit controllerDataInit = getAnnotationLog(joinPoint);
        if (controllerDataInit == null) {
            return;
        }
        // 获取当前的用户
        LoginUser loginUser = SpringUtils.getBean(TokenService.class).getLoginUser(ServletUtils.getRequest());
        if (StringUtils.isNotNull(loginUser)) {
            BasicUser currentUser = loginUser.getUser();
            // 如果是超级管理员，则不过滤数据
            if (StringUtils.isNotNull(currentUser)) {
                dataInit(joinPoint, loginUser);
            }
        }
    }

    /**
     * 数据初始化
     *
     * @param joinPoint 切点
     * @param user      用户
     */
    public static void dataInit(JoinPoint joinPoint, LoginUser user) {
        Object params = joinPoint.getArgs()[0];
        if (StringUtils.isNotNull(params) && params instanceof BaseEntity) {
            BaseEntity entity = (BaseEntity) params;
            entity.setDelFlag(0);
            entity.setCompanyInfo(user.getUser().getCompanyInfo());
            entity.setOrgnizationInfo(user.getUser().getOrgnizationInfo());
            entity.setDepartmentInfo(user.getUser().getDepartmentInfo());
        }

    }

    /**
     * 是否存在注解，如果存在就获取
     */
    private DataInit getAnnotationLog(JoinPoint joinPoint) {
        Signature signature = joinPoint.getSignature();
        MethodSignature methodSignature = (MethodSignature) signature;
        Method method = methodSignature.getMethod();

        if (method != null) {
            return method.getAnnotation(DataInit.class);
        }
        return null;
    }
}
