package com.wsi.annotation.api.manager.service.system;

import com.mongodb.QueryBuilder;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.core.mvc.JqGridPage;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.database.domain.basic.CaseInfo;
import com.wsi.annotation.api.database.domain.basic.CaseOwnership;
import com.wsi.annotation.api.database.domain.basic.DataSet;
import com.wsi.annotation.api.database.domain.basic.ImageMark;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import com.wsi.annotation.api.database.domain.cytomine.UserAnnotation;
import com.wsi.annotation.api.framework.web.service.TokenService;
import com.wsi.annotation.api.manager.domain.request.base.CaseInfoReq;
import com.wsi.annotation.api.manager.domain.response.base.DataSetListResp;
import com.wsi.annotation.api.manager.domain.response.system.CaseListResp;
import com.wsi.annotation.api.manager.service.BaseService;
import org.apache.ibatis.annotations.Case;
import org.bson.types.ObjectId;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class CaseInfoService extends BaseService {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private TokenService tokenService;

    public JqGridPage<CaseListResp> casePage(CaseInfoReq caseInfo) {
//        Sort sort = Sort.by(Sort.Direction.DESC, "createTime");

        QueryBuilder queryBuilder = new QueryBuilder();
        if(!StringUtils.isEmpty(caseInfo.getCaseName())){
            queryBuilder.and("caseName").regex(Pattern.compile(caseInfo.getCaseName()));
        }
        if (!StringUtils.isEmpty(caseInfo.getDataSetId())){
            queryBuilder.and("dataSetId").is(caseInfo.getDataSetId());
        }
        if(ObjectUtils.isNotEmpty(caseInfo.getCaseStatus())){
            queryBuilder.and("caseStatus").is(caseInfo.getCaseStatus());
        }
        if(ObjectUtils.isNotEmpty(caseInfo.getIsJoin()) && caseInfo.getIsJoin()==1){
            LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
            //markUserIds 字段包含当前用户的id
            queryBuilder.and("markUserIds").is(loginUser.getUser().getId());
        }
        queryBuilder.and("delFlag").is(0);
        Query query = new BasicQuery(queryBuilder.get().toString());
        long listCount = mongoTemplate.count(query, CaseInfo.class);

        if(ObjectUtils.isNotEmpty(caseInfo.getStatusSort())){
            if(caseInfo.getStatusSort() == 0){
                query.with(Sort.by(Sort.Order.asc("caseStatus")));
            }else{
                query.with(Sort.by(Sort.Order.desc("caseStatus")));
            }
        }
        query = query.skip((caseInfo.getCurrent() - 1) * caseInfo.getPageSize()).limit(caseInfo.getPageSize());

        List<CaseInfo> caseList = mongoTemplate.find(query, CaseInfo.class);

        List<CaseListResp> caseListRespList = new ArrayList<>();

        for (CaseInfo innerCase : caseList) {
            CaseListResp caseListResp = new CaseListResp();
            BeanUtils.copyProperties(innerCase, caseListResp);

            QueryBuilder imageBuilder = new QueryBuilder();
            imageBuilder.and("projectId").is(new ObjectId(innerCase.getId()));
            imageBuilder.and("delFlag").is(0);
            BasicQuery imageQuery = new BasicQuery(imageBuilder.get().toString());
            List<ImageInstance> imageInstanceList = mongoTemplate.find(imageQuery, ImageInstance.class);
            if (ObjectUtils.isNotEmpty(imageInstanceList)){
                caseListResp.setSvsList(imageInstanceList);
            }
            //判断当前用户是否标注过该案例
            if (ObjectUtils.isNotEmpty(innerCase.getMarkUserIds())) {
                innerCase.getMarkUserIds().forEach(userId -> {
                    if (userId.equals(tokenService.getLoginUser(ServletUtils.getRequest()).getUser().getId())) {
                        caseListResp.setIsJoin(1);
                    }
                });
            }
            caseListRespList.add(caseListResp);
        }

        JqGridPage<CaseListResp> respJqGridPage = new JqGridPage<>(
                caseListRespList,
                (int) listCount,
                caseInfo.getPageSize(),
                caseInfo.getCurrent());

        return respJqGridPage;
    }

    public List<CaseInfo> list(CaseInfoReq caseInfo){
        QueryBuilder queryBuilder = new QueryBuilder();
        if(!StringUtils.isEmpty(caseInfo.getCaseName())){
            queryBuilder.and("caseName").regex(Pattern.compile(caseInfo.getCaseName()));
        }
        if (!StringUtils.isEmpty(caseInfo.getDataSetId())){
            queryBuilder.and("dataSetId").is(caseInfo.getDataSetId());
        }
        if(ObjectUtils.isNotEmpty(caseInfo.getCaseStatus())){
            queryBuilder.and("caseStatus").is(caseInfo.getCaseStatus());
        }
        if(ObjectUtils.isNotEmpty(caseInfo.getIsJoin()) && caseInfo.getIsJoin()==1){
            LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
            //markUserIds 字段包含当前用户的id
            queryBuilder.and("markUserIds").is(loginUser.getUser().getId());
        }
        queryBuilder.and("delFlag").is(0);
        Query query = new BasicQuery(queryBuilder.get().toString());
        if(ObjectUtils.isNotEmpty(caseInfo.getStatusSort())){
            if(caseInfo.getStatusSort() == 0){
                query.with(Sort.by(Sort.Order.asc("caseStatus")));
            }else{
                query.with(Sort.by(Sort.Order.desc("caseStatus")));
            }
        }
        List<CaseInfo> caseList = mongoTemplate.find(query, CaseInfo.class);
        for(CaseInfo caseInner:caseList){
            QueryBuilder imageBuilder = new QueryBuilder();
            imageBuilder.and("projectId").is(new ObjectId(caseInner.getId()));
            imageBuilder.and("delFlag").is(0);
            BasicQuery imageQuery = new BasicQuery(imageBuilder.get().toString());
            List<ImageInstance> imageInstanceList = mongoTemplate.find(imageQuery, ImageInstance.class);
            if (ObjectUtils.isNotEmpty(imageInstanceList)){
                caseInner.setSvsList(imageInstanceList);
            }
            //判断当前用户是否标注过该案例
            if (ObjectUtils.isNotEmpty(caseInner.getMarkUserIds())) {
                caseInner.getMarkUserIds().forEach(userId -> {
                    if (userId.equals(tokenService.getLoginUser(ServletUtils.getRequest()).getUser().getId())) {
                        caseInner.setIsJoin(1);
                    }
                });
            }
        }
        return caseList;
    }

    public CaseInfo add(CaseInfo caseInfo) {
        if (StringUtils.isEmpty(caseInfo.getCaseName())) {
            throw new HTTPDataException(400, "案例名字不能为空");
        }
        if (ObjectUtils.isEmpty(caseInfo.getCaseStatus())){
            caseInfo.setCaseStatus(0);
        }
        mongoTemplate.insert(caseInfo);
        this.updateSliceNum(caseInfo.getDataSetId());
        return caseInfo;
    }

    public CaseInfo getDetail(CaseInfo caseInfo) {
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(caseInfo.getId());
        queryBuilder.and("delFlag").is(0);
        Query query = new BasicQuery(queryBuilder.get().toString());
        caseInfo = mongoTemplate.findOne(query,CaseInfo.class);

        QueryBuilder imageBuilder = new QueryBuilder();
        imageBuilder.and("projectId").is(new ObjectId(caseInfo.getId()));
        imageBuilder.and("delFlag").is(0);
        BasicQuery imageQuery = new BasicQuery(imageBuilder.get().toString());
        List<ImageInstance> imageInstanceList = mongoTemplate.find(imageQuery, ImageInstance.class);
        if (ObjectUtils.isNotEmpty(imageInstanceList)){
            caseInfo.setSvsList(imageInstanceList);
        }

        return caseInfo;
    }

    public long update(CaseInfo caseInfo) {
        if (StringUtils.isEmpty(caseInfo.getCaseName())) {
            throw new HTTPDataException(400, "案例名字不能为空");
        }

        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(caseInfo.getId());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        Update update = new Update();
        update.set("caseName", caseInfo.getCaseName())
                .set("dataSetId", caseInfo.getDataSetId())
                .set("caseRemark",caseInfo.getCaseRemark());

        return mongoTemplate.updateMulti(query, update, CaseInfo.class).getModifiedCount();
    }



    public long delete(CaseInfo caseInfo) {
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(caseInfo.getId());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        Update update = new Update();
        update.set("delFlag", 1);
        long count = mongoTemplate.updateMulti(query, update, CaseInfo.class).getModifiedCount();
        this.updateSliceNum(caseInfo.getDataSetId());
        return count;
    }

    public long deleteImageInstance(ImageInstance imageInstance){
        System.out.println("imageInstance = " + imageInstance);
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(imageInstance.getId());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        Update update = new Update();
        update.set("delFlag", 1);

        return mongoTemplate.updateMulti(query, update, ImageInstance.class).getModifiedCount();
    }

    public long change(CaseInfo caseInfo){
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(caseInfo.getId());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        caseInfo = mongoTemplate.findOne(query, CaseInfo.class);

        Update update = new Update();
        if (caseInfo.getCaseStatus() == 1) {
            update.set("status", 0);
        } else {
            update.set("status", 1);
        }

        return mongoTemplate.updateMulti(query, update, CaseInfo.class).getModifiedCount();
    }

    public void updateSliceNum(String dataSetId){
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(dataSetId);
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());
        DataSet dataSet = mongoTemplate.findOne(query, DataSet.class);
        if (ObjectUtils.isNotEmpty(dataSet)){
            QueryBuilder setBuilder = new QueryBuilder();
            setBuilder.and("dataSetId").is(dataSetId);
            setBuilder.and("delFlag").is(0);
            BasicQuery setQuery = new BasicQuery(setBuilder.get().toString());
            Long sliceNum = mongoTemplate.count(setQuery, CaseInfo.class);
            dataSet.setSliceNum(sliceNum.intValue());
            mongoTemplate.save(dataSet);
        }
    }

    public CaseInfo resetCase(String id) {
        CaseInfo caseInfo = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(id))), CaseInfo.class);
        caseInfo.setCaseStatus(0);
        caseInfo.setMarkNum(0);
        caseInfo.setAuditUserId("");
        caseInfo.setMarkUserIds(new ArrayList<>());

        //删除ImageMark对应记录
        Update update = new Update();
        update.set("delFlag", 1);
        mongoTemplate.updateMulti(new Query().addCriteria(Criteria
                        .where("caseId").is(id)),
                update,
                ImageMark.class);

        //删除onwership
        Update update2 = new Update();
        update2.set("delFlag", 1);
        mongoTemplate.updateMulti(new Query().addCriteria(Criteria
                        .where("caseId").is(id)),
                update2,
                CaseOwnership.class);

        List<ImageInstance> imageInstanceList = mongoTemplate.find(new Query().addCriteria(Criteria
                .where("projectId").is(new ObjectId(id)).and("delFlag").is(0)), ImageInstance.class);
        for (ImageInstance instance:imageInstanceList){
            //删除user_annotation记录
            Update update3 = new Update();
            update3.set("delFlag", 1);
            mongoTemplate.updateMulti(new Query().addCriteria(Criteria
                            .where("image_id").is(instance.getId())),
                    update3,
                    UserAnnotation.class);
        }

        return mongoTemplate.save(caseInfo);
    }
}
