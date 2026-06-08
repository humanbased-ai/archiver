package com.wsi.annotation.api.framework.aspectj;

import com.wsi.annotation.api.framework.web.service.TokenService;
import com.wsi.annotation.api.common.annotation.DataScope;
import com.wsi.annotation.api.common.constant.DataScopeConstants;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.utils.SecurityUtils;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.common.utils.StringUtils;
import com.wsi.annotation.api.common.utils.spring.SpringUtils;
import com.wsi.annotation.api.database.domain.system.SysRole;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import com.wsi.annotation.api.common.core.mvc.BaseListSearch;
import com.mongodb.QueryBuilder;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.Signature;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.Pointcut;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 数据过滤处理
 *
 * @author ruoyi
 */
@Aspect
@Component
public class DataScopeAspect {
    /**
     * 数据权限过滤关键字
     */
    public static final String DATA_SCOPE = "dataScope";

    // 配置织入点
    @Pointcut("@annotation(com.wsi.annotation.api.common.annotation.DataScope)")
    public void dataScopePointCut() {
    }

    @Before("dataScopePointCut()")
    public void doBefore(JoinPoint point) throws Throwable {
        handleDataScope(point);
    }

    protected void handleDataScope(final JoinPoint joinPoint) {
        // 获得注解
        DataScope controllerDataScope = getAnnotationLog(joinPoint);
        if (controllerDataScope == null) {
            return;
        }
        // 获取当前的用户
        LoginUser loginUser = SpringUtils.getBean(TokenService.class).getLoginUser(ServletUtils.getRequest());
        if (StringUtils.isNotNull(loginUser)) {
            BasicUser currentUser = loginUser.getUser();
            // 如果是超级管理员，则不过滤数据
            if (StringUtils.isNotNull(currentUser) ) {
                dataScopeFilter(joinPoint, loginUser, controllerDataScope.roleKey());
            }
        }
    }

    /**
     * 数据范围过滤
     *
     * @param joinPoint 切点
     * @param user      用户
     * @param roleKey   指定role
     */
    public static void dataScopeFilter(JoinPoint joinPoint, LoginUser user, String roleKey) {
        QueryBuilder queryBuilder = new QueryBuilder();
        List<SysRole> roles = user.getRoles();
        if (StringUtils.isNotEmpty(roleKey)) {
            roles = roles.stream().filter(p -> p.getRoleKey().equals(roleKey)).collect(Collectors.toList());
        }
        Integer minDAtaScope = 10000;
        for (SysRole role : roles) {
            Integer dataScope = role.getDataRoleScope();
            if(dataScope < minDAtaScope){
                minDAtaScope = dataScope;
                if (DataScopeConstants.DATA_SCOPE_ALL.equals(dataScope)) {
                    break;
                } else if (DataScopeConstants.DATA_SCOPE_COMPANY.equals(dataScope)) {
                    queryBuilder.and("companyInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getCompanyInfo().getForeignKeyId());
               } else if (DataScopeConstants.DATA_SCOPE_DEPT_AND_CHILD.equals(dataScope)) {
                    queryBuilder.and("companyInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getCompanyInfo().getForeignKeyId());
                    queryBuilder.and("orgnizationInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getOrgnizationInfo().getForeignKeyId());
                    queryBuilder.and("departmentInfo.foreignKeyId").in(user.getDepts());
                } else if (DataScopeConstants.DATA_SCOPE_DEPT.equals(dataScope)) {
                    queryBuilder.and("companyInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getCompanyInfo().getForeignKeyId());
                    queryBuilder.and("orgnizationInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getOrgnizationInfo().getForeignKeyId());
                    queryBuilder.and("departmentInfo.foreignKeyId").is(user.getUser().getDepartmentInfo().getForeignKeyId());
                } else {
                    // 包括个人
                    queryBuilder.and("companyInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getCompanyInfo().getForeignKeyId());
                    queryBuilder.and("orgnizationInfo.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getOrgnizationInfo().getForeignKeyId());
                    queryBuilder.and("createUser.foreignKeyId").is(SecurityUtils.getLoginUser().getUser().getId());
                }
            }
        }

        QueryBuilder queryBuilderRes = new QueryBuilder();

        queryBuilderRes.and("delFlag").is(0);
        queryBuilderRes.and(queryBuilder.get());

        Object params = joinPoint.getArgs()[0];
        if (StringUtils.isNotNull(params) && params instanceof BaseListSearch) {
            BaseListSearch baseListSearch = (BaseListSearch) params;
            baseListSearch.setDataScope(queryBuilderRes.get());
        }
    }

    /**
     * 是否存在注解，如果存在就获取
     */
    private DataScope getAnnotationLog(JoinPoint joinPoint) {
        Signature signature = joinPoint.getSignature();
        MethodSignature methodSignature = (MethodSignature) signature;
        Method method = methodSignature.getMethod();

        if (method != null) {
            return method.getAnnotation(DataScope.class);
        }
        return null;
    }
}
