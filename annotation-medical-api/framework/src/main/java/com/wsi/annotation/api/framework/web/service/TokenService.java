package com.wsi.annotation.api.framework.web.service;

import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.common.constant.Constants;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.core.redis.RedisCache;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.common.utils.StringUtils;
import com.wsi.annotation.api.common.utils.ip.AddressUtils;
import com.wsi.annotation.api.common.utils.ip.IpUtils;
import com.wsi.annotation.api.common.utils.uuid.IdUtils;
import com.wsi.annotation.api.database.domain.system.SysLoginInfo;
import eu.bitwalker.useragentutils.UserAgent;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import javax.servlet.http.HttpServletRequest;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * token验证处理
 *
 * @author early
 */
@Component
public class TokenService
{
    // 令牌自定义标识
    @Value("${token.header}")
    private String header;

    @Value("${cookie.header}")
    private String cookieHeader;

    // 令牌秘钥
    @Value("${token.secret}")
    private String secret;

    // 令牌有效期（默认30分钟）
    @Value("${token.expireTime}")
    private int expireTime;

    @Value("${token.saveTime}")
    private int saveTime;

    protected static final long MILLIS_SECOND = 1000;

    protected static final long MILLIS_MINUTE = 60 * MILLIS_SECOND;

    private static final Long MILLIS_MINUTE_TEN = 20 * 60 * 1000L;

    @Autowired
    private RedisCache redisCache;

    @Autowired
    private MongoTemplate mongoTemplate;

    /**
     * 获取用户身份信息
     *
     * @return 用户信息
     */
    public LoginUser getLoginUser(HttpServletRequest request)
    {
        // 获取请求携带的令牌
        String token = getToken(request);
        if (StringUtils.isNotEmpty(token))
        {
            Claims claims = parseToken(token);
            // 解析对应的权限以及用户信息
            String uuid = (String) claims.get(Constants.LOGIN_USER_KEY);
            String userKey = getTokenKey(uuid);
            String userStr = redisCache.getCacheObject(userKey);
//            System.out.println("userStr:"+userStr);
            if (ObjectUtils.isEmpty(userStr))
            {
//                System.out.println("token:"+token);
                //根据token查询用户信息
                SysLoginInfo sysLoginInfo = mongoTemplate.findOne(new Query(Criteria.where("token").is(token)
                        .and("expireTime").gte(new Date())), SysLoginInfo.class);
                if (ObjectUtils.isNotEmpty(sysLoginInfo))
                {
                    userStr = sysLoginInfo.getLoginUserJson();
                    System.out.println("userStr:"+userStr);
                    redisCache.setCacheObject(userKey, userStr, expireTime, TimeUnit.MINUTES);
                }
            }
            LoginUser user= JSONObject.parseObject(userStr,LoginUser.class);
            return user;
        }
        return null;
    }

//    public LoginUser getLoginUser(String token)
//    {
//        if (StringUtils.isNotEmpty(token))
//        {
//            Claims claims = parseToken(token);
//            // 解析对应的权限以及用户信息
//            String uuid = (String) claims.get(Constants.LOGIN_USER_KEY);
//            String userKey = getTokenKey(uuid);
//            String userStr = redisCache.getCacheObject(userKey);
//            LoginUser user= JSONObject.parseObject(userStr,LoginUser.class);
//            return user;
//        }
//        return null;
//    }

    /**
     * 设置用户身份信息
     */
    public void setLoginUser(LoginUser loginUser)
    {
        if (StringUtils.isNotNull(loginUser) && StringUtils.isNotEmpty(loginUser.getToken()))
        {
            refreshToken(loginUser);
        }
    }

    /**
     * 删除用户身份信息
     */
    public void delLoginUser(String token)
    {
        if (StringUtils.isNotEmpty(token))
        {
            String userKey = getTokenKey(token);
            redisCache.deleteObject(userKey);
        }
    }

    /**
     * 创建令牌
     *
     * @param loginUser 用户信息
     * @return 令牌
     */
    public String createToken(LoginUser loginUser)
    {
        String token = IdUtils.fastUUID();
        loginUser.setToken(token);
        setUserAgent(loginUser);
        refreshToken(loginUser);



        Map<String, Object> claims = new HashMap<>();
        claims.put(Constants.LOGIN_USER_KEY, token);

        String realToken = createToken(claims);
        SysLoginInfo sysLoginInfo = new SysLoginInfo();

        sysLoginInfo.setToken(realToken);
        sysLoginInfo.setLoginUserJson(JSONObject.toJSONString(loginUser));
        Calendar calendar = Calendar.getInstance();
        calendar.add(Calendar.MINUTE, saveTime);
        Date expireDate = calendar.getTime();
        sysLoginInfo.setExpireTime(expireDate);
        mongoTemplate.insert(sysLoginInfo);
        return realToken;
    }

    /**
     * 验证令牌有效期，相差不足20分钟，自动刷新缓存
     *
     * @param loginUser
     * @return 令牌
     */
    public void verifyToken(LoginUser loginUser)
    {
        long expireTime = loginUser.getExpireTime();
        long currentTime = System.currentTimeMillis();
        if (expireTime - currentTime <= MILLIS_MINUTE_TEN)
        {
            refreshToken(loginUser);
        }
    }

    /**
     * 刷新令牌有效期
     *
     * @param loginUser 登录信息
     */
    public void refreshToken(LoginUser loginUser)
    {
        loginUser.setLoginTime(System.currentTimeMillis());
        loginUser.setExpireTime(loginUser.getLoginTime() + expireTime * MILLIS_MINUTE);
        // 根据uuid将loginUser缓存
        String userKey = getTokenKey(loginUser.getToken());
        redisCache.setCacheObject(userKey, loginUser, expireTime, TimeUnit.MINUTES);
    }

    /**
     * 设置用户代理信息
     *
     * @param loginUser 登录信息
     */
    public void setUserAgent(LoginUser loginUser)
    {
        UserAgent userAgent = UserAgent.parseUserAgentString(ServletUtils.getRequest().getHeader("User-Agent"));
        String ip = IpUtils.getIpAddr(ServletUtils.getRequest());
        loginUser.setIpaddr(ip);
        loginUser.setLoginLocation(AddressUtils.getRealAddressByIP(ip));
        loginUser.setBrowser(userAgent.getBrowser().getName());
        loginUser.setOs(userAgent.getOperatingSystem().getName());
    }

    /**
     * 从数据声明生成令牌
     *
     * @param claims 数据声明
     * @return 令牌
     */
    private String createToken(Map<String, Object> claims)
    {
        String token = Jwts.builder()
                .setClaims(claims)
                .signWith(SignatureAlgorithm.HS512, secret).compact();
        return token;
    }

    /**
     * 从令牌中获取数据声明
     *
     * @param token 令牌
     * @return 数据声明
     */
    private Claims parseToken(String token)
    {
        return Jwts.parser()
                .setSigningKey(secret)
                .parseClaimsJws(token)
                .getBody();
    }

    /**
     * 从令牌中获取用户名
     *
     * @param token 令牌
     * @return 用户名
     */
    public String getUsernameFromToken(String token)
    {
        Claims claims = parseToken(token);
        return claims.getSubject();
    }

    /**
     * 获取请求token
     *
     * @param request
     * @return token
     */
    private String getToken(HttpServletRequest request)
    {
//        String token = request.getHeader(header);
        //通过cookie获取token
//        if (StringUtils.isEmpty(token))
//        {
//        System.out.println("cookieHeader:"+cookieHeader);
        String   token = ServletUtils.getCookie(request, cookieHeader);
//        System.out.println("token:"+token);
//        }
        if (StringUtils.isNotEmpty(token) && token.startsWith(Constants.TOKEN_PREFIX))
        {
            token = token.replace(Constants.TOKEN_PREFIX, "");
        }
        return token;
    }

    private String getTokenKey(String uuid)
    {
        return Constants.LOGIN_TOKEN_KEY + uuid;
    }
}
