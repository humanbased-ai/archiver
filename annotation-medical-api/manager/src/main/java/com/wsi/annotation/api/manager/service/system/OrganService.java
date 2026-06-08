package com.wsi.annotation.api.manager.service.system;

import com.mongodb.QueryBuilder;
import com.mongodb.client.result.UpdateResult;
import com.wsi.annotation.api.common.core.mvc.JqGridPage;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.database.dao.system.SysCompanyDao;
import com.wsi.annotation.api.database.daoextend.system.SysCompanyExtend;
import com.wsi.annotation.api.database.domain.basic.DataSet;
import com.wsi.annotation.api.database.domain.cytomine.Tag;
import com.wsi.annotation.api.database.domain.system.SysCompany;
import com.wsi.annotation.api.database.domain.system.SysOrgan;
import com.wsi.annotation.api.framework.web.domain.server.Sys;
import com.wsi.annotation.api.manager.domain.request.system.Company;
import com.wsi.annotation.api.manager.domain.request.system.CompanyListReq;
import com.wsi.annotation.api.manager.domain.response.system.CompanyListResp;
import com.wsi.annotation.api.manager.domain.response.system.OrganListResp;
import com.wsi.annotation.api.manager.service.BaseService;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.regex.Pattern;

@Service
public class OrganService extends BaseService {

    @Autowired
    private MongoTemplate mongoTemplate;

//    public JqGridPage<OrganListResp> organPage(SysOrgan sysOrgan) {
//        Sort sort = Sort.by(Sort.Direction.DESC, "createTime");
//
//        QueryBuilder queryBuilder = new QueryBuilder();
//        if (companyListReq.getOPCO() != null && !StringUtils.isEmpty(companyListReq.getOPCO())) {
//            queryBuilder.and("companyName").is(companyListReq.getOPCO());
//        }
//        if (companyListReq.getStatus() != null) {
//            queryBuilder.and("status").is(companyListReq.getStatus());
//        }
//
//        queryBuilder.and("delFlag").is(0);
//
//        Query query = new BasicQuery(queryBuilder.get().toString());
//        long listCount = sysCompanyExtend.getListCount(query);
//
//        query.with(sort);
//        query = query.skip((companyListReq.getCurrent() - 1) * companyListReq.getPageSize()).limit(companyListReq.getPageSize());
//
//        List<SysCompany> companyList = sysCompanyExtend.getList(query);
//
//        List<CompanyListResp> companyListRespList = new ArrayList<>();
//
//        for (SysCompany sysCompany : companyList) {
//            CompanyListResp companyListResp = new CompanyListResp();
//            companyListResp.setIncId(sysCompany.getIncId());
//            companyListResp.setCompanyName(sysCompany.getCompanyName());
//            companyListResp.setAddress(sysCompany.getAddress());
//            companyListResp.setLeader(sysCompany.getLeader());
//            companyListResp.setPhone(sysCompany.getPhone());
//            companyListResp.setFax(sysCompany.getFax());
//            companyListResp.setCreateTime(sysCompany.getCreateTime());
//            companyListResp.setStatus(sysCompany.getStatus());
//            companyListResp.setId(sysCompany.getId());
//            if (sysCompany.getUpdateUser() != null) {
//                companyListResp.setUpdateUser(sysCompany.getUpdateUser().getName());
//            }
//
//            companyListRespList.add(companyListResp);
//        }
//
//        JqGridPage<CompanyListResp> respJqGridPage = new JqGridPage<>(
//                companyListRespList,
//                (int) listCount,
//                companyListReq.getPageSize(),
//                companyListReq.getCurrent());
//
//        return respJqGridPage;
//    }

    public List<OrganListResp> list(){
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("delFlag").is(0);
        Query query = new BasicQuery(queryBuilder.get().toString());
        List<SysOrgan> organList = mongoTemplate.find(query, SysOrgan.class);
        List<OrganListResp> organListRespList = new ArrayList<>();
        for (SysOrgan organ:organList){
            OrganListResp organListResp = new OrganListResp();
            BeanUtils.copyProperties(organ,organListResp);

            organListRespList.add(organListResp);
        }
        return organListRespList;
    }

    public SysOrgan add(SysOrgan sysOrgan) {
        if (StringUtils.isEmpty(sysOrgan.getOrganName())) {
            throw new HTTPDataException(400, "器官名字不能为空");
        }

        sysOrgan = mongoTemplate.insert(sysOrgan);

        return sysOrgan;
    }

    public SysOrgan getDetail(SysOrgan sysOrgan) {
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(sysOrgan.getId());
        queryBuilder.and("delFlag").is(0);
        Query query = new BasicQuery(queryBuilder.get().toString());
        sysOrgan = mongoTemplate.findOne(query,SysOrgan.class);
        return sysOrgan;
    }

    public long update(SysOrgan sysOrgan) {
        if (StringUtils.isEmpty(sysOrgan.getOrganName())) {
            throw new HTTPDataException(400, "器官名字不能为空");
        }

        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(sysOrgan.getId());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        Update update = new Update();
        update.set("organName", sysOrgan.getOrganName())
                .set("parentNo", sysOrgan.getParentNo());

        return mongoTemplate.updateMulti(query, update, SysOrgan.class).getModifiedCount();
    }



    public long delete(SysOrgan sysOrgan) {
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(sysOrgan.getId());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        Update update = new Update();
        update.set("delFlag", 1);

        return mongoTemplate.updateMulti(query, update, SysOrgan.class).getModifiedCount();
    }

    public long change(SysOrgan sysOrgan){
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(sysOrgan.getId());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        SysOrgan organ = mongoTemplate.findOne(query, SysOrgan.class);

        Update update = new Update();
        if (organ.getStatus() == 1) {
            update.set("status", 0);
        } else {
            update.set("status", 1);
        }

        return mongoTemplate.updateMulti(query, update, SysOrgan.class).getModifiedCount();
    }

    public Tag addTag(Tag tag){
        if (StringUtils.isEmpty(tag.getName())) {
            throw new HTTPDataException(400, "标签名字不能为空");
        }
        if (StringUtils.isEmpty(tag.getOrganId())) {
            throw new HTTPDataException(400, "所属器官不能为空");
        }
        tag.setType(2);
        tag = mongoTemplate.insert(tag);
        return tag;
    }

    public Long deleteTag(Tag tag){
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(tag.getId());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        Update update = new Update();
        update.set("delFlag", 1);

        return mongoTemplate.updateMulti(query, update, Tag.class).getModifiedCount();
    }

    public List<Tag> tagList(Tag tag){
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("organId").is(tag.getOrganId());
        queryBuilder.and("type").is(2);
        queryBuilder.and("delFlag").is(0);
        Query query = new BasicQuery(queryBuilder.get().toString());
        List<Tag> tagList = mongoTemplate.find(query, Tag.class);

        return tagList;
    }

    public Tag addAreaTag(Tag tag){
        if (StringUtils.isEmpty(tag.getName())) {
            throw new HTTPDataException(400, "标签名字不能为空");
        }
        if (StringUtils.isEmpty(tag.getOrganId())) {
            throw new HTTPDataException(400, "所属器官不能为空");
        }
        tag.setType(1);
        tag = mongoTemplate.insert(tag);
        return tag;
    }

    public Long deleteAreaTag(Tag tag){
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("_id").is(tag.getId());
        BasicQuery query = new BasicQuery(queryBuilder.get().toString());

        Update update = new Update();
        update.set("delFlag", 1);

        return mongoTemplate.updateMulti(query, update, Tag.class).getModifiedCount();
    }

    public List<Tag> areaTagList(Tag tag){
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("organId").is(tag.getOrganId());
        queryBuilder.and("type").is(1);
        queryBuilder.and("delFlag").is(0);
        Query query = new BasicQuery(queryBuilder.get().toString());
        List<Tag> tagList = mongoTemplate.find(query, Tag.class);

        return tagList;
    }

}
