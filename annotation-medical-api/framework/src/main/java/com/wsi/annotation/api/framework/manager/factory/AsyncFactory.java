package com.wsi.annotation.api.framework.manager.factory;

import com.wsi.annotation.api.common.constant.Constants;
import com.wsi.annotation.api.common.utils.LogUtils;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.common.utils.ip.AddressUtils;
import com.wsi.annotation.api.common.utils.ip.IpUtils;
import com.wsi.annotation.api.common.utils.spring.SpringUtils;
//import com.early.system.domain.SysLogininfor;
//import com.early.system.domain.SysOperLog;
//import com.early.system.service.ISysLogininforService;
//import com.early.system.service.ISysOperLogService;
import com.wsi.annotation.api.database.dao.system.SysDataOperLogDao;
import com.wsi.annotation.api.database.dao.system.SysLogininforDao;
import com.wsi.annotation.api.database.dao.system.SysOperLogDao;
import com.wsi.annotation.api.database.domain.system.SysDataOperLog;
import com.wsi.annotation.api.database.domain.system.SysLogininfor;
import com.wsi.annotation.api.database.domain.system.SysOperLog;
import eu.bitwalker.useragentutils.UserAgent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Date;
import java.util.TimerTask;

/**
 * 异步工厂（产生任务用）
 * 
 * @author early
 */
public class AsyncFactory
{
    private static final Logger sys_user_logger = LoggerFactory.getLogger("sys-user");

    /**
     * 记录登陆信息
     * 
     * @param username 用户名
     * @param status 状态
     * @param message 消息
     * @param args 列表
     * @return 任务task
     */
    public static TimerTask recordLogininfor(final String username, final String status, final String message,
            final Object... args)
    {
        final UserAgent userAgent = UserAgent.parseUserAgentString(ServletUtils.getRequest().getHeader("User-Agent"));
        final String ip = IpUtils.getIpAddr(ServletUtils.getRequest());
        return new TimerTask()
        {
            @Override
            public void run()
            {
                String address = AddressUtils.getRealAddressByIP(ip);
                StringBuilder s = new StringBuilder();
                s.append(LogUtils.getBlock(ip));
                s.append(address);
                s.append(LogUtils.getBlock(username));
                s.append(LogUtils.getBlock(status));
                s.append(LogUtils.getBlock(message));
                // 打印信息到日志
                sys_user_logger.info(s.toString(), args);
                // 获取客户端操作系统
                String os = userAgent.getOperatingSystem().getName();
                // 获取客户端浏览器
                String browser = userAgent.getBrowser().getName();
                // 封装对象
                SysLogininfor logininfor = new SysLogininfor();
                logininfor.setUserName(username);
                logininfor.setIpaddr(ip);
                logininfor.setLoginLocation(address);
                logininfor.setBrowser(browser);
                logininfor.setOs(os);
                logininfor.setMsg(message);
                logininfor.setLoginTime(new Date());
                 //日志状态
                if (Constants.LOGIN_SUCCESS.equals(status) || Constants.LOGOUT.equals(status))
                {
                    logininfor.setStatus(Constants.SUCCESS);
                }
                else if (Constants.LOGIN_FAIL.equals(status))
                {
                    logininfor.setStatus(Constants.FAIL);
                }
                 //插入数据
                SpringUtils.getBean(SysLogininforDao.class).insert(logininfor);
            }
        };
    }

    /**
     * 操作日志记录
     * 
     * @param operLog 操作日志信息
     * @return 任务task
     */
    public static TimerTask recordOper(final SysOperLog operLog)
    {
        return new TimerTask()
        {
            @Override
            public void run()
            {
                // 远程查询操作地点
                operLog.setOperLocation(AddressUtils.getRealAddressByIP(operLog.getOperIp()));
                SpringUtils.getBean(SysOperLogDao.class).insert(operLog);
            }
        };
    }

    /**
     * 操作数据日志记录
     *
     * @param operDataLog 操作日志信息
     * @return 任务task
     */
    public static TimerTask recordDataOper(final SysDataOperLog operLog)
    {
        return new TimerTask()
        {
            @Override
            public void run()
            {
                // 远程查询操作地点
                operLog.setOperLocation(AddressUtils.getRealAddressByIP(operLog.getOperIp()));
                SpringUtils.getBean(SysDataOperLogDao.class).insert(operLog);
            }
        };
    }
}
