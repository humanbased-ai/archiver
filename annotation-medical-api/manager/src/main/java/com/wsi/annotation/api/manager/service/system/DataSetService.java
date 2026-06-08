package com.wsi.annotation.api.manager.service.system;

import com.mongodb.QueryBuilder;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.database.domain.basic.BasicUser;
import com.wsi.annotation.api.database.domain.basic.DataSet;
import com.wsi.annotation.api.database.domain.system.BasicDept;
import com.wsi.annotation.api.database.domain.system.SysOrgan;
import com.wsi.annotation.api.database.domain.system.SysRole;
import com.wsi.annotation.api.framework.web.domain.server.Sys;
import com.wsi.annotation.api.framework.web.service.TokenService;
import com.wsi.annotation.api.manager.domain.request.base.DataSetReq;
import com.wsi.annotation.api.manager.domain.response.base.BasicUserResp;
import com.wsi.annotation.api.manager.domain.response.base.DataSetListResp;
import com.wsi.annotation.api.manager.domain.response.system.OrganListResp;
import com.wsi.annotation.api.manager.service.BaseService;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class DataSetService extends BaseService {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private TokenService tokenService;

    public List<DataSetListResp> list(DataSetReq dataSet){
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());

        BasicUser basicUser = mongoTemplate.findOne(new BasicQuery(new QueryBuilder().and("_id").is(loginUser.getUser().getId()).get().toString()), BasicUser.class);
        SysRole managerRole = mongoTemplate.findOne(new BasicQuery(new QueryBuilder().and("roleKey").is("taskManger").get().toString()), SysRole.class);

        SysRole adminRole = mongoTemplate.findOne(new BasicQuery(new QueryBuilder().and("roleKey").is("adminCompany").get().toString()), SysRole.class);

        SysRole superAdminRole = mongoTemplate.findOne(new BasicQuery(new QueryBuilder().and("roleKey").is("superAdmin").get().toString()), SysRole.class);



        QueryBuilder queryBuilder = new QueryBuilder();
        if(!StringUtils.isEmpty(dataSet.getSetName())){
            queryBuilder.and("setName").regex(Pattern.compile(dataSet.getSetName()));
        }
        if (!StringUtils.isEmpty(dataSet.getOrganId())){
            queryBuilder.and("organId").is(dataSet.getOrganId());
        }
        //如果是managerRole而不是adminRole superAdminRole
        if (ObjectUtils.isNotEmpty(basicUser.getRoleIds()) && basicUser.getRoleIds().contains(managerRole.getId()) && !basicUser.getRoleIds().contains(adminRole.getId()) && !basicUser.getRoleIds().contains(superAdminRole.getId())){
            queryBuilder.and("managerId").is(basicUser.getId());
        }
        queryBuilder.and("delFlag").is(0);
        Query query = new BasicQuery(queryBuilder.get().toString());
        List<DataSet> setList = mongoTemplate.find(query, DataSet.class);
        List<DataSetListResp> setListRespList = new ArrayList<>();
        for (DataSet set:setList){
            DataSetListResp setListResp = new DataSetListResp();
            BeanUtils.copyProperties(set,setListResp);
            setListRespList.add(setListResp);
        }
        return setListRespList;
    }

    public DataSet add(DataSet dataSet) {
        if (StringUtils.isEmpty(dataSet.getSetName())) {
            throw new HTTPDataException(400, "数据集名字不能为空");
        }
        if (!StringUtils.isEmpty(dataSet.getOrganId())){
            QueryBuilder queryBuilder = new QueryBuilder();
            queryBuilder.and("_id").is(dataSet.getOrganId());
            Query query = new BasicQuery(queryBuilder.get().toString());
            SysOrgan sysOrgan = mongoTemplate.findOne(query,SysOrgan.class);
            dataSet.setOrganName(sysOrgan.getOrganName());
        }
        mongoTemplate.insert(dataSet);
        updateDatasetNum(dataSet.getOrganId());
        return dataSet;
    }

    public DataSet getDetail(DataSet dataSet) {
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(dataSet.getId());
        queryBuilder.and("delFlag").is(0);
        Query query = new BasicQuery(queryBuilder.get().toString());
        dataSet = mongoTemplate.findOne(query,DataSet.class);
        return dataSet;
    }

    public long update(DataSet dataSet) {
        if (StringUtils.isEmpty(dataSet.getSetName())) {
            throw new HTTPDataException(400, "数据集名字不能为空");
        }

        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(dataSet.getId());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        Update update = new Update();
        update.set("setName", dataSet.getSetName())
                .set("organId", dataSet.getOrganId())
                .set("markRequire",dataSet.getMarkRequire())
                .set("markCourse",dataSet.getMarkCourse())
                .set("markLevel",dataSet.getMarkLevel())
                .set("markNum",dataSet.getMarkNum())
                .set("auditLevel",dataSet.getAuditLevel())
                .set("managerId",dataSet.getManagerId());

        if (!StringUtils.isEmpty(dataSet.getOrganId())){
            QueryBuilder oqBuilder = new QueryBuilder();
            oqBuilder.and("_id").is(dataSet.getOrganId());
            Query oq = new BasicQuery(oqBuilder.get().toString());
            SysOrgan sysOrgan = mongoTemplate.findOne(oq,SysOrgan.class);
            update.set("organName",sysOrgan.getOrganName());
        }

        return mongoTemplate.updateMulti(query, update, DataSet.class).getModifiedCount();
    }



    public long delete(DataSet sysOrgan) {
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(sysOrgan.getId());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        Update update = new Update();
        update.set("delFlag", 1);

        return mongoTemplate.updateMulti(query, update, DataSet.class).getModifiedCount();
    }

    public long change(DataSet dataSet){
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(dataSet.getId());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        DataSet organ = mongoTemplate.findOne(query, DataSet.class);

        Update update = new Update();
        if (organ.getStatus() == 1) {
            update.set("status", 0);
        } else {
            update.set("status", 1);
        }

        return mongoTemplate.updateMulti(query, update, DataSet.class).getModifiedCount();
    }

    public void updateDatasetNum(String organId){
        if (!StringUtils.isEmpty(organId)){
            QueryBuilder queryBuilder = new QueryBuilder();
            queryBuilder.and("_id").is(organId);
            BasicQuery query = new BasicQuery(queryBuilder.get().toString());
            SysOrgan sysOrgan = mongoTemplate.findOne(query, SysOrgan.class);
            if (ObjectUtils.isNotEmpty(sysOrgan)){
                QueryBuilder setBuilder = new QueryBuilder();
                setBuilder.and("organId").is(organId);
                setBuilder.and("delFlag").is(0);
                BasicQuery setQuery = new BasicQuery(setBuilder.get().toString());
                Long setNum = mongoTemplate.count(setQuery, DataSet.class);
                Update update = new Update();
                update.set("datasetNum",setNum);
                mongoTemplate.updateMulti(query,update,SysOrgan.class);
            }
        }
    }

    public List<BasicUserResp> getSelectManagerList(){
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("delFlag").is(0);
        queryBuilder.and("userId").is(0);
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());
        List<BasicUserResp> basicUserRespList = new ArrayList<>();
        List<BasicUser> basicUserList = mongoTemplate.find(query,BasicUser.class);
        for (BasicUser basicUser:basicUserList){
            BasicUserResp basicUserResp = new BasicUserResp();
            BeanUtils.copyProperties(basicUser,basicUserResp);
            basicUserResp.setUsername(basicUser.getUserName());
            basicUserRespList.add(basicUserResp);
        }
        return basicUserRespList;
    }
}
