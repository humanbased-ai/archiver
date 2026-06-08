package com.wsi.annotation.api.manager.controller.cytomine;


import com.alibaba.fastjson.JSONObject;
import com.mongodb.QueryBuilder;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.common.utils.StringUtils;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import com.wsi.annotation.api.database.domain.basic.CaseInfo;
import com.wsi.annotation.api.database.domain.basic.CaseOwnership;
import com.wsi.annotation.api.database.domain.basic.ImageMark;
import com.wsi.annotation.api.database.domain.cytomine.SecUser;
import com.wsi.annotation.api.framework.web.service.TokenService;
import com.wsi.annotation.api.manager.domain.request.cytomine.ImageInstanceSearchReq;
import com.wsi.annotation.api.manager.domain.request.cytomine.UserconnectionReq;
import com.wsi.annotation.api.manager.domain.response.base.CollectionBaseResp;
import com.wsi.annotation.api.manager.domain.response.cytomine.ImageInstanceResp;
import com.wsi.annotation.api.manager.domain.response.cytomine.ProjectResp;
import com.wsi.annotation.api.manager.domain.response.cytomine.UserconnectionResp;
import com.wsi.annotation.api.manager.service.cytomine.IImageInstanceService;
import com.wsi.annotation.api.manager.service.cytomine.IProjectService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/imagecore/api/project")
@Api(tags = "project")
public class ProjectController {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private IProjectService projectService;

    @Autowired
    private IImageInstanceService imageService;

    @Autowired
    private TokenService tokenService;

    @GetMapping(value = "/{project}/imagefilterproject.json", produces = {"application/json"})
    @ApiOperation(value = "imagefilterproject", notes = "imagefilterproject", nickname = "imagefilterproject")
    public JSONObject imagefilterproject(@PathVariable String project, int max, int offset) {
        return getJsonObject();
        //return imageService.consultation(image,mode);
    }


    @GetMapping(value = "/{project}/userjob.json", produces = {"application/json"})
    @ApiOperation(value = "userjob", notes = "userjob", nickname = "userjob")
    public JSONObject userjob(@PathVariable String project, int max, int offset) {
//        List<SecUser> secUser = mongoTemplate.findAll(SecUser.class);
        return getJsonObject();
        //return imageService.consultation(image,mode);
    }


    @GetMapping(value = "/{project}/userlayer.json", produces = {"application/json"})
    @ApiOperation(value = "userlayer", notes = "userlayer", nickname = "userlayer")
    public JSONObject userlayer(@PathVariable String project, String image,String action) {
        //List<SecUser> secUser = mongoTemplate.find(Query.query(Criteria.where("_id").is("63046952d63f0000c7001b1c")), SysUserDao.class);
//        Criteria criteria = Criteria.where("project_id").is(project).and("image_id").is(image);
//        Aggregation aggregation = Aggregation.newAggregation(Aggregation.match(criteria),Aggregation.group("user_id"));
//        AggregationResults<MongoReusltId> mongoReusltIds = mongoTemplate.aggregate(aggregation, UserAnnotation.class,MongoReusltId.class);
//        List<ObjectId> ids = new ArrayList<>();
//        for (MongoReusltId mongoReusltId: mongoReusltIds) {
//            ids.add(new ObjectId(mongoReusltId.getId()));
//        }
//        QueryBuilder queryBuilder = new QueryBuilder();
//        queryBuilder.and("_id").in(ids);


        List<Document> userAccounts = mongoTemplate.findAll(Document.class,"userAccount");
        List<SecUser> secUsers = new ArrayList<>();
        if ("annotate".equals(action)){
            LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
            BasicUser user = loginUser.getUser();
            user = mongoTemplate.findOne(new BasicQuery(new QueryBuilder().and("_id").is(user.getId()).get().toString()), BasicUser.class);
            SecUser secUser = new SecUser();
            secUser.setId(user.getId());
            secUser.setFirstname("");
            secUser.setLastname(StringUtils.isNotEmpty(user.getNickName())?user.getNickName():"");
            secUser.setUsername(user.getUserName());
            secUsers.add(secUser);

        } else if ("validate".equals(action)){
           List<ImageMark> imageMarks = mongoTemplate.find(new BasicQuery(new QueryBuilder().and("caseId").is(project).and("delFlag").is(0).get().toString()), ImageMark.class);
              for (ImageMark imageMark: imageMarks) {

                BasicUser user = mongoTemplate.findOne(new BasicQuery(new QueryBuilder().and("_id").is(new ObjectId(imageMark.getUserId())).get().toString()), BasicUser.class);
                SecUser secUser = new SecUser();
                secUser.setId(user.getId());
                secUser.setFirstname("");
                secUser.setLastname(StringUtils.isNotEmpty(user.getNickName())?user.getNickName():"");
                secUser.setUsername(user.getUserName());
                secUser.setScore(imageMark.getMarkScore());
                secUser.setSelected(imageMark.getSelected());
                secUsers.add(secUser);
              }

        } else if ("view".equals(action)) {
            ImageMark imageMark = mongoTemplate.findOne(new BasicQuery(new QueryBuilder().and("caseId").is(project)
                    .and("selected").is(1)
                    .get().toString()), ImageMark.class);
            BasicUser user = mongoTemplate.findOne(new BasicQuery(new QueryBuilder().and("_id").is(new ObjectId(imageMark.getUserId())).get().toString()), BasicUser.class);
            SecUser secUser = new SecUser();
            secUser.setId(user.getId());
            secUser.setFirstname("");
            secUser.setLastname(StringUtils.isNotEmpty(user.getNickName())?user.getNickName():"");
            secUser.setUsername(user.getUserName());
            secUser.setScore(imageMark.getMarkScore());
            secUser.setSelected(imageMark.getSelected());
            secUsers.add(secUser);
        } else{
            for (Document user: userAccounts) {
                SecUser secUser = new SecUser();
                secUser.setId(user.getObjectId("_id").toString());
                secUser.setFirstname(user.getString("customerName"));
                secUser.setLastname("");
                secUser.setUsername(user.getString("username"));
                secUsers.add(secUser);
            }
        }

        //如果案例已经完成，为用户设置ownership值
        CaseInfo caseInfo = mongoTemplate.findOne(new BasicQuery(new QueryBuilder().and("_id").is(project).get().toString()), CaseInfo.class);
        if (caseInfo.getCaseStatus() == 3){
            for (SecUser secUser: secUsers) {
                //查CaseOwnership表
                CaseOwnership caseOwnership = mongoTemplate.findOne(new BasicQuery(new QueryBuilder().and("caseId").is(project)
                        .and("userId").is(secUser.getId())
                .and("delFlag").is(0).get().toString()), CaseOwnership.class);
                if (caseOwnership != null){
                    secUser.setOwnership(caseOwnership.getOwnership());
                }
            }
        }

        return getJsonObject(secUsers);
        //return imageService.consultation(image,mode);
    }


    @GetMapping(value = "/{project}/defaultlayer.json", produces = {"application/json"})
    @ApiOperation(value = "defaultlayer", notes = "defaultlayer", nickname = "defaultlayer")
    public JSONObject defaultlayer(@PathVariable String project, int max, int offset) {
        return getJsonObject();
        //return imageService.consultation(image,mode);
    }

    @GetMapping(value = "/{project}.json", produces = {"application/json"})
    @ApiOperation(value = "project", notes = "project", nickname = "project")
    public ProjectResp project(@PathVariable String project) {//
        return projectService.getProjectDetail(project);
        //return imageService.consultation(image,mode);
    }

    @GetMapping(value = "/{project}/tagList.json", produces = {"application/json"})
    @ApiOperation(value = "tagList", notes = "tagList", nickname = "tagList")
    public List getOrganTagList(@PathVariable String project) {
        return projectService.getOrganTagList(project);
    }

    @GetMapping(value = "/{project}/tagAreaList.json", produces = {"application/json"})
    @ApiOperation(value = "tagAreaList", notes = "tagAreaList", nickname = "tagAreaList")
    public List getOrganAreaTagList(@PathVariable String project) {
        return projectService.getOrganAreaTagList(project);
    }

    @GetMapping(value = "/{project}/user.json", produces = {"application/json"})
    @ApiOperation(value = "user", notes = "user", nickname = "user")
    public JSONObject user(@PathVariable String project, int max, int offset) {
        List<Document> userAccount = mongoTemplate.findAll(Document.class,"userAccount");
        List<SecUser> secUsers = new ArrayList<>();
        for (Document user: userAccount) {
            SecUser secUser = new SecUser();
            secUser.setId(user.getObjectId("_id").toString());
            secUser.setFirstname(user.getString("customerName"));
            secUser.setLastname("");
            secUser.setUsername(user.getString("username"));
            secUsers.add(secUser);
        }
        JSONObject json = new JSONObject();
        json.put("collection", secUsers);
        json.put("size", 0);
        return json;
    }

    @PostMapping(value = "/{project}/userconnection.json", produces = {"application/json"})
    @ApiOperation(value = "userConnection", notes = "user", nickname = "userConnection")
    public UserconnectionResp userConnection(@PathVariable String project, @RequestBody UserconnectionReq req) {
        UserconnectionResp resp = new UserconnectionResp();
        BeanUtils.copyProperties(req, resp);
        resp.setId(ObjectId.get().toString());
        return resp;
    }


    @GetMapping(value = "/{project}/imageinstance.json", produces = {"application/json"})
    @ApiOperation(value = "imageinstance", notes = "imageinstance", nickname = "imageinstance")
    public CollectionBaseResp<ImageInstanceResp> imageinstance(@PathVariable String project, int max, int offset) {
        ImageInstanceSearchReq searchReq = new ImageInstanceSearchReq();
        CollectionBaseResp<ImageInstanceResp> result = new CollectionBaseResp<>();
        try {
            searchReq.setProjectId(project);
            searchReq.setMax(max);
            searchReq.setOffset(offset);
            result = imageService.listByProject(searchReq);
        }catch (Exception e){
            e.printStackTrace();
        }
        return result;
    }

    @PostMapping(value = "/saveImageMark.json", produces = {"application/json"})
    @ApiOperation(value = "saveImageMark", notes = "saveImageMark", nickname = "saveImageMark")
    public ImageMark saveImageMark(@RequestBody ImageMark imageMark) {
        return projectService.saveImageMark(imageMark);
    }

    @PostMapping(value = "/getMyImageMark.json", produces = {"application/json"})
    @ApiOperation(value = "getMyImageMark", notes = "getMyImageMark", nickname = "getMyImageMark")
    public ImageMark getMyImageMark(@RequestBody ImageMark imageMark) {
        return projectService.getMyImageMark(imageMark);
    }

    @PostMapping(value = "/getImageMark.json", produces = {"application/json"})
    @ApiOperation(value = "getImageMark", notes = "getImageMark", nickname = "getImageMark")
    public ImageMark getImageMark(@RequestBody ImageMark imageMark) {
        return projectService.getImageMark(imageMark);
    }

    @PostMapping(value = "/setImageMark.json", produces = {"application/json"})
    @ApiOperation(value = "setImageMark", notes = "setImageMark", nickname = "setImageMark")
    public ImageMark setImageMark(@RequestBody ImageMark imageMark) {
        return projectService.setImageMark(imageMark);
    }

    @PostMapping(value = "/scoreImageMark.json", produces = {"application/json"})
    @ApiOperation(value = "scoreImageMark", notes = "scoreImageMark", nickname = "scoreImageMark")
    public ImageMark scoreImageMark(@RequestBody ImageMark imageMark) {
        return projectService.scoreImageMark(imageMark);
    }

    @PostMapping(value = "/selectImageMark.json", produces = {"application/json"})
    @ApiOperation(value = "selectImageMark", notes = "selectImageMark", nickname = "selectImageMark")
    public ImageMark selectImageMark(@RequestBody ImageMark imageMark) {
        return projectService.selectImageMark(imageMark);
    }

    @PostMapping(value = "/{project}/completeCase.json", produces = {"application/json"})
    @ApiOperation(value = "completeCase", notes = "completeCase", nickname = "completeCase")
    public CaseInfo completeCase(@PathVariable String project) {
        return projectService.completeCase(project);
    }

    @PostMapping(value = "/{project}/resetCase.json", produces = {"application/json"})
    @ApiOperation(value = "resetCase", notes = "resetCase", nickname = "resetCase")
    public CaseInfo resetCase(@PathVariable String project) {
        return projectService.resetCase(project);
    }


    private JSONObject getJsonObject(List collection) {
        JSONObject json = new JSONObject();
        json.put("collection", collection);
        json.put("offset", 0);
        json.put("perPage", 1);
        json.put("size", collection.size());
        json.put("totalPages:", 1);
        return json;
    }

    private JSONObject getJsonObject() {
        JSONObject json = new JSONObject();
        json.put("collection", new ArrayList<>());
        json.put("offset", 0);
        json.put("perPage", 0);
        json.put("size", 0);
        json.put("totalPages:", 0);
        return json;
    }


}
