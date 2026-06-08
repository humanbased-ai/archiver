package com.wsi.annotation.api.framework.web.service;

import com.wsi.annotation.api.framework.manager.AsyncManager;
import com.wsi.annotation.api.framework.manager.factory.AsyncFactory;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.enums.BusinessType;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.common.utils.ip.IpUtils;
import com.wsi.annotation.api.common.utils.reflect.ReflectUtils;
import com.wsi.annotation.api.common.utils.spring.SpringUtils;
import com.wsi.annotation.api.database.domain.system.SysDataOperLog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class SysDataOperLogService {

    private static final Logger logger = LoggerFactory.getLogger(SysDataOperLogService.class);

    public <T> void getDataLog(T oldO, T newO, Class<T> t) {

        try {
            SysDataOperLog log = new SysDataOperLog();
            LoginUser loginUser = SpringUtils.getBean(TokenService.class).getLoginUser(ServletUtils.getRequest());
            log.setOperIp(IpUtils.getIpAddr(ServletUtils.getRequest()));
            log.setTableName(t.getName());
            if (loginUser != null) {
                log.setOperName(loginUser.getUsername());
            }
            if (oldO == null) {
                log.setBusinessType(BusinessType.INSERT.ordinal());
                String id = ReflectUtils.getFieldValue(newO, "id").toString();
                log.setNewObject(newO);
                log.setRecordID(id);
            } else if (newO == null) {
                log.setBusinessType(BusinessType.DELETE.ordinal());
                String id = ReflectUtils.getFieldValue(oldO, "id").toString();
                log.setRecordID(id);
                log.setOldObject(oldO);
            } else {
                log.setBusinessType(BusinessType.UPDATE.ordinal());
                String id = ReflectUtils.getFieldValue(oldO, "id").toString();
                log.setRecordID(id);
                log.setOldObject(oldO);
                log.setNewObject(newO);
            }
            AsyncManager.me().execute(AsyncFactory.recordDataOper(log));
        } catch (Exception e) {
            logger.error("==前置通知异常==");
            logger.error("异常信息:{}", e.getMessage());
            e.printStackTrace();
        }
    }

    public <T> void getDataListLog(List<T> oldO, List<T> newO, Class<T> t) {

        try {
            LoginUser loginUser = SpringUtils.getBean(TokenService.class).getLoginUser(ServletUtils.getRequest());
            List<T> objs = new ArrayList<>();
            if (oldO != null && oldO.size() > 0) {
                objs = oldO;
            } else if (newO != null && newO.size() > 0) {
                objs = newO;
            }
            for (T obj :
                    objs) {
                SysDataOperLog log = new SysDataOperLog();
                log.setOperIp(IpUtils.getIpAddr(ServletUtils.getRequest()));
                log.setTableName(t.getName());
                if (loginUser != null) {
                    log.setOperName(loginUser.getUsername());
                }
                String id = ReflectUtils.getFieldValue(obj, "id").toString();
                log.setRecordID(id);
                if (newO != null && newO.size() > 0) {
                    log.setBusinessType(BusinessType.INSERT.ordinal());
                    log.setNewObject(obj);
                } else if (oldO != null && oldO.size() > 0) {
                    log.setBusinessType(BusinessType.DELETE.ordinal());
                    log.setOldObject(obj);
                }
                AsyncManager.me().execute(AsyncFactory.recordDataOper(log));
            }

        } catch (Exception e) {
            logger.error("==前置通知异常==");
            logger.error("异常信息:{}", e.getMessage());
            e.printStackTrace();
        }
    }
}
