package com.wsi.annotation.api.manager.controller.cytomine;

import com.alibaba.fastjson.JSONObject;
import com.mongodb.QueryBuilder;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.common.utils.StringUtils;
import com.wsi.annotation.api.database.dao.basics.SysUserDao;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import com.wsi.annotation.api.database.domain.cytomine.SecUser;
import com.wsi.annotation.api.framework.web.service.TokenService;
import com.wsi.annotation.api.manager.domain.response.base.BasicUserResp;
import com.wsi.annotation.api.manager.domain.response.system.UserResp;
import com.wsi.annotation.api.manager.util.SecurityUtils;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/")
@Api(tags = "project")
public class UserController {
    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private TokenService tokenService;

    @GetMapping(value = "/imagecore/api/user.json", produces = {"application/json"})
    @ApiOperation(value = "user", notes = "user", nickname = "user")
    public JSONObject user(int max, int offset) {
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("delFlag").is(0);
        List<BasicUser> users = mongoTemplate.find(new BasicQuery(queryBuilder.get().toString()), BasicUser.class);
        List<SecUser> secUsers = new ArrayList<>();
        for (BasicUser user: users) {
            SecUser secUser = new SecUser();
            secUser.setId(user.getId());
            secUser.setColor("#FF0000");
            secUser.setFirstname("");
            secUser.setUsername(user.getUserName());
            secUser.setLastname(StringUtils.isNotEmpty(user.getNickName())?user.getNickName():"");
            secUser.setLanguage("ENGLISH");
            secUsers.add(secUser);
        }
        JSONObject json = new JSONObject();
        json.put("collection",secUsers);
        json.put("size", 0);
        return json;
    }

    @GetMapping(value = "/imagecore/api/user/current.json", produces = {"application/json"})
    @ApiOperation(value = "current", notes = "current", nickname = "current")
    public BasicUserResp current() {
        BasicUserResp resp = new BasicUserResp();
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
        BasicUser user = loginUser.getUser();
//        System.out.println(user);
        user = mongoTemplate.findOne(new BasicQuery(new QueryBuilder().and("_id").is(user.getId()).get().toString()), BasicUser.class);
//        System.out.println(user);
        BeanUtils.copyProperties(user, resp);

        //保留原逻辑
        resp.setId(user.getId());
        resp.setUsername(StringUtils.isNotEmpty(user.getNickName())?user.getNickName():"");
        resp.setAdmin(user.getIsAdmin());
        resp.setLanguage(user.getLanguage());
        return resp;
    }
}
