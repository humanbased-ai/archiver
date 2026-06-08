package com.wsi.annotation.api.manager.service.system;

import com.mongodb.QueryBuilder;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.database.domain.basic.CaseInfo;
import com.wsi.annotation.api.database.domain.basic.DataSet;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import com.wsi.annotation.api.manager.domain.request.base.CaseInfoReq;
import com.wsi.annotation.api.manager.service.BaseService;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.regex.Pattern;

@Service
public class ImageMarkService extends BaseService {

    @Autowired
    private MongoTemplate mongoTemplate;

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
        if(ObjectUtils.isNotEmpty(caseInfo.getIsJoin())){
//            queryBuilder.and("userAccountID").is(getUser().getId());
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



    public long delete(CaseInfo sysOrgan) {
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(sysOrgan.getId());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        Update update = new Update();
        update.set("delFlag", 1);

        return mongoTemplate.updateMulti(query, update, CaseInfo.class).getModifiedCount();
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
            Update update = new Update();
            update.set("sliceNum",sliceNum);
            mongoTemplate.updateMulti(query,update,DataSet.class);
        }
    }
}
