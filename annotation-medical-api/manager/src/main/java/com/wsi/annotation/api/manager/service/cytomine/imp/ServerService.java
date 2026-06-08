package com.wsi.annotation.api.manager.service.cytomine.imp;

import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.common.config.ProjectConfig;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.framework.web.service.TokenService;
import com.wsi.annotation.api.manager.domain.request.cytomine.ServerPingReq;
import com.wsi.annotation.api.manager.domain.response.cytomine.ServerPingResp;
import com.wsi.annotation.api.manager.service.cytomine.IServerService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.servlet.http.Cookie;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ServerService implements IServerService {

    @Autowired
    private TokenService tokenService;

    public ServerPingResp ping(ServerPingReq req) {
        ServerPingResp resp = new ServerPingResp();
        resp.setAlive(true);
        resp.setServerID(UUID.randomUUID().toString());
        resp.setVersion("3.0.0");
        resp.setServerURL(ProjectConfig.getServerUrl());
//        System.out.println(JSONObject.toJSONString(ServletUtils.getRequest().getCookies()));
        if (ServletUtils.getRequest().getCookies() != null) {
            LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
//            System.out.println(loginUser);
            if (ObjectUtils.isNotEmpty(loginUser)&&ObjectUtils.isNotEmpty(loginUser.getUser())) {
                resp.setAuthenticated(true);
                resp.setUser(loginUser.getUser().getId());
            }
//            List<Cookie> userCookie = Arrays.stream(ServletUtils.getRequest().getCookies()).filter(x -> x.getName().equals("hrsaas-info")).collect(Collectors.toList());
//            if (userCookie.size() > 0) {
//                resp.setAuthenticated(true);
//                JSONObject sessionJson = null;
//                try {
//                    sessionJson = JSONObject.parseObject(URLDecoder.decode(userCookie.get(0).getValue(), "UTF-8"));
//                    resp.setUser(sessionJson.getString("id"));
//                } catch (UnsupportedEncodingException e) {
//                    e.printStackTrace();
//                }
//            }
        }

//        HttpSession session = ServletUtils.getRequest().getSession(false);
//        if (session != null && session.getAttribute("userInfo") != null) {
//            JSONObject sessionJson = JSONObject.parseObject(session.getAttribute("userInfo").toString());
//            resp.setAuthenticated(true);
//            log.info(sessionJson.getString("id"));
//            resp.setUser(sessionJson.getString("id"));
//        }

        return resp;

    }
}
