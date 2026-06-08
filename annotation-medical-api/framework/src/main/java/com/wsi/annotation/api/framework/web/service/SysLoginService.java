package com.wsi.annotation.api.framework.web.service;

import com.alibaba.fastjson.JSONObject;
import com.google.gson.Gson;
import com.mongodb.QueryBuilder;
import com.wsi.annotation.api.common.config.ProjectConfig;
import com.wsi.annotation.api.common.constant.Constants;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.core.redis.RedisCache;
import com.wsi.annotation.api.common.exception.CustomException;
import com.wsi.annotation.api.common.exception.user.UserPasswordNotMatchException;
import com.wsi.annotation.api.common.utils.MessageUtils;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.common.utils.SecurityUtils;
import com.wsi.annotation.api.common.utils.http.HttpUtils;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import com.wsi.annotation.api.database.domain.basic.CodaLoginResp;
import com.wsi.annotation.api.database.domain.system.SysOrgan;
import com.wsi.annotation.api.framework.manager.AsyncManager;
import com.wsi.annotation.api.framework.manager.factory.AsyncFactory;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.HttpEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.List;

/**
 * 登录校验方法
 * 
 * @author early
 */
@Component
@Slf4j
public class SysLoginService
{
    @Value("${codatta.login.url}")
    private String loginUrl;

    @Autowired
    private TokenService tokenService;

    @Resource
    private AuthenticationManager authenticationManager;

    @Autowired
    private RedisCache redisCache;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Autowired
    private MongoTemplate mongoTemplate;

    /**
     * 登录验证
     * 
     * @param username 用户名
     * @param password 密码
     * @param code 验证码
     * @param uuid 唯一标识
     * @return 结果
     */
    public String login(String username, String password, String code, String uuid)
    {
        // 用户验证
        Authentication authentication = null;
        try
        {
            // 该方法会去调用UserDetailsServiceImpl.loadUserByUsername
            authentication = authenticationManager
                    .authenticate(new UsernamePasswordAuthenticationToken(username, password));
        }
        catch (Exception e)
        {
            if (e instanceof BadCredentialsException)
            {
                AsyncManager.me().execute(AsyncFactory.recordLogininfor(username, Constants.LOGIN_FAIL, MessageUtils.message("user.password.not.match")));
                throw new UserPasswordNotMatchException();
            }
            else
            {
                AsyncManager.me().execute(AsyncFactory.recordLogininfor(username, Constants.LOGIN_FAIL, e.getMessage()));
                throw new CustomException(e.getMessage());
            }
        }
        AsyncManager.me().execute(AsyncFactory.recordLogininfor(username, Constants.LOGIN_SUCCESS, MessageUtils.message("user.login.success")));
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        // 生成token
        return tokenService.createToken(loginUser);
    }

    /**
     * 登录验证
     *
     * @param username 用户名
     * @param password 密码
     * @param email 邮箱
     * @param code 验证码
     * @param uuid 唯一标识
     * @return 结果
     */
    public String newLogin(String username, String password,String email, String code, String uuid)
    {
        //先进行邮箱验证初始化用户
        BasicUser user = emailLogin(email,code);
        username = user.getUserName();
        password = "123456";

        // 用户验证
        Authentication authentication = null;
        try
        {
            // 该方法会去调用UserDetailsServiceImpl.loadUserByUsername
            authentication = authenticationManager
                    .authenticate(new UsernamePasswordAuthenticationToken(username, password));
        }
        catch (Exception e)
        {
            if (e instanceof BadCredentialsException)
            {
                AsyncManager.me().execute(AsyncFactory.recordLogininfor(username, Constants.LOGIN_FAIL, MessageUtils.message("user.password.not.match")));
                throw new UserPasswordNotMatchException();
            }
            else
            {
                AsyncManager.me().execute(AsyncFactory.recordLogininfor(username, Constants.LOGIN_FAIL, e.getMessage()));
                throw new CustomException(e.getMessage());
            }
        }
        AsyncManager.me().execute(AsyncFactory.recordLogininfor(username, Constants.LOGIN_SUCCESS, MessageUtils.message("user.login.success")));
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        // 生成token
        return tokenService.createToken(loginUser);
    }

    public String loginWithToken(String username, String token){
        LoginUser loginUser = null;
        try
        {
            log.info("url:{}",ProjectConfig.getCheckLoginUrl());
            String result = HttpUtils.sendGet(ProjectConfig.getCheckLoginUrl(),"username="+username+"&token="+token);
            JSONObject resultObj = JSONObject.parseObject(result);
            if(ObjectUtils.isNotEmpty(resultObj.getInteger("code"))&&resultObj.getInteger("code").equals(200)){
                loginUser = (LoginUser)userDetailsService.loadUserByUsername(resultObj.getString("data"));
            }
            // 该方法会去调用UserDetailsServiceImpl.loadUserByUsername
        }
        catch (Exception e)
        {
            throw new CustomException("登录失败");
        }
        if (ObjectUtils.isEmpty(loginUser)){
            throw new CustomException("登录失败");
        }
        // 生成token
        return tokenService.createToken(loginUser);
    }

    /**
     *  登录验证
     *
     * @param email 邮箱
     * @param code 验证码
     * @return 结果
     */
    public BasicUser emailLogin(String email, String code){
        BasicUser user = new BasicUser();
        String url = loginUrl;
        String jsonInputString = "{\"connector\":\"email\",\"connect_info\":{\"email\":\""+email+"\",\"email_code\":\""+code+"\"},\"sign_up_source\":\"medical\"}";
        System.out.println(jsonInputString);
        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            HttpPost postRequest = new HttpPost(url);
            postRequest.setHeader("Content-Type", "application/json");
            postRequest.setEntity(new StringEntity(jsonInputString, "UTF-8"));

            try (CloseableHttpResponse response = httpClient.execute(postRequest)) {
                HttpEntity entity = response.getEntity();
                String responseString = EntityUtils.toString(entity, "UTF-8");
                System.out.println("Response: " + responseString);
                Gson gson = new Gson();
                CodaLoginResp codaLoginResp = gson.fromJson(responseString, CodaLoginResp.class);
                System.out.println(JSONObject.toJSONString(codaLoginResp));
                if (codaLoginResp.getErrorCode().equals(0) && ObjectUtils.isNotEmpty(codaLoginResp.getData()) && ObjectUtils.isNotEmpty(codaLoginResp.getData().getUser_info())){
                    QueryBuilder queryBuilder = new QueryBuilder();
                    queryBuilder.and("codaId").is(codaLoginResp.getData().getUser_info().getUser_id());
                    queryBuilder.and("delFlag").is(0);
                    Query query = new BasicQuery(queryBuilder.get().toString());
                    user = mongoTemplate.findOne(query, BasicUser.class);
                    if (ObjectUtils.isEmpty(user)){
                        //根据返回对象生成用户数据
                        user = new BasicUser();
                        user.setEmail(email);
                        user.setUserName(email);
                        user.setPassword(SecurityUtils.encryptPassword("123456"));
                        user.setLanguage("en");
                        user.setAvatar(codaLoginResp.getData().getUser_info().getAvatar_url());
                        user.setCodaId(codaLoginResp.getData().getUser_info().getUser_id());
                        user.setCodaToken(codaLoginResp.getData().getToken());
                        user.setStatus("0");
                        List<String> roleIds = new ArrayList<>();
                        roleIds.add("66e4f8104e33c45d8c9b7b5d");
                        user.setRoleIds(roleIds);
                        mongoTemplate.insert(user);
                    }else{
                        Update update = new Update();
                        update.set("codaToken",codaLoginResp.getData().getToken());
                        mongoTemplate.updateMulti(query,update,BasicUser.class);
                        user.setCodaToken(codaLoginResp.getData().getToken());
                    }
                }

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return user;
    }
}
