package com.wsi.annotation.api.manager.service.cytomine.imp;

import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.common.core.domain.model.LoginUser;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.database.domain.basic.*;
import com.wsi.annotation.api.database.domain.cytomine.Tag;
import com.wsi.annotation.api.database.domain.system.SysOrgan;
import com.wsi.annotation.api.framework.web.domain.server.Sys;
import com.wsi.annotation.api.framework.web.service.TokenService;
import com.wsi.annotation.api.manager.domain.response.base.BasicUserResp;
import com.wsi.annotation.api.manager.domain.response.cytomine.ProjectResp;
import com.wsi.annotation.api.manager.service.cytomine.IProjectService;
import org.apache.ibatis.annotations.Case;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class ProjectService implements IProjectService {
    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private TokenService tokenService;

    @Override
    public ProjectResp getProjectDetail(String id) {
        Document projectInfo = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("projectId").is(id)), Document.class,"project_info");
        ProjectResp resp = new ProjectResp();
        if (ObjectUtils.isNotEmpty(projectInfo)){
            resp.setId(projectInfo.getString("projectId"));
            resp.setName(projectInfo.getString("projectName"));
            resp.setTableName(projectInfo.getString("tableName"));
        }else {
            CaseInfo caseInfo = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(id))), CaseInfo.class);

            resp.setId(id);
            if (ObjectUtils.isNotEmpty(caseInfo)){
                resp.setName(caseInfo.getCaseName());
                resp.setTableName("case_Info");
                resp.setCaseStatus(caseInfo.getCaseStatus());
                resp.setCaseRemark(caseInfo.getCaseRemark());
                if (ObjectUtils.isNotEmpty(caseInfo.getAuditUserId())){
                    BasicUser auditUser = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(caseInfo.getAuditUserId()))), BasicUser.class);
                    BasicUserResp auditUserResp = new BasicUserResp();
                    auditUserResp.setId(auditUser.getId());
                    auditUserResp.setUserId(auditUser.getUserId());
                    auditUserResp.setUsername(auditUser.getUserName());
                    auditUserResp.setNickName(auditUser.getNickName());
                    auditUserResp.setEmail(auditUser.getEmail());
                    CaseOwnership auditOwnership = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("caseId").is(id)
                            .and("userId").is(auditUser.getId())
                            .and("type").is("audit")
                            .and("delFlag").is(0)), CaseOwnership.class);
                    if (ObjectUtils.isNotEmpty(auditOwnership)){
                        auditUserResp.setOwnership(auditOwnership.getOwnership());
                    }
                    resp.setAuditUser(auditUserResp);
                }
                if (caseInfo.getCaseStatus() == 3){
                    List<CaseOwnership> ownershipList = mongoTemplate.find(new Query().addCriteria(Criteria.where("caseId").is(id)
                            .and("type").is("mark")
                            .and("delFlag").is(0)), CaseOwnership.class);
                    System.out.println(id);
                    System.out.println("ownershipList:"+JSONObject.toJSONString(ownershipList));
                    if (ObjectUtils.isNotEmpty(ownershipList)){
                        List<BasicUserResp> markUsers = new ArrayList<>();
                        for (CaseOwnership ownership : ownershipList){
                            BasicUser markUser = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(ownership.getUserId()))), BasicUser.class);
                            BasicUserResp markUserResp = new BasicUserResp();
                            markUserResp.setId(markUser.getId());
                            markUserResp.setUserId(markUser.getUserId());
                            markUserResp.setUsername(markUser.getUserName());
                            markUserResp.setNickName(markUser.getNickName());
                            markUserResp.setEmail(markUser.getEmail());
                            //保留两位小数
                            markUserResp.setOwnership(ownership.getOwnership().setScale(2, BigDecimal.ROUND_HALF_UP));
                            markUsers.add(markUserResp);
                        }
                        resp.setMarkUsers(markUsers);
                    }
                }else {
                    List<BasicUserResp> markUsers = new ArrayList<>();
                    List<String> markUserIds = caseInfo.getMarkUserIds();
                    if (ObjectUtils.isNotEmpty(markUserIds)){
                        for (String userId : markUserIds){
                            BasicUser markUser = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(userId))), BasicUser.class);
                            BasicUserResp markUserResp = new BasicUserResp();
                            markUserResp.setId(markUser.getId());
                            markUserResp.setUserId(markUser.getUserId());
                            markUserResp.setUsername(markUser.getUserName());
                            markUserResp.setNickName(markUser.getNickName());
                            markUserResp.setEmail(markUser.getEmail());
                            markUsers.add(markUserResp);
                        }
                        resp.setMarkUsers(markUsers);
                    }
                }

                DataSet dataSet = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(caseInfo.getDataSetId()))), DataSet.class);
                resp.setSetName(dataSet.getSetName());
                resp.setAuditLevel(dataSet.getAuditLevel());
                resp.setMarkCourse(dataSet.getMarkCourse());
                resp.setMarkNum(dataSet.getMarkNum());
                resp.setMarkLevel(dataSet.getMarkLevel());
                resp.setMarkRequire(dataSet.getMarkRequire());


                //获取案例所有权
                if (ObjectUtils.isNotEmpty(dataSet.getManagerId())){
                    BasicUser manager = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(dataSet.getManagerId()))), BasicUser.class);
                    BasicUserResp managerResp = new BasicUserResp();
                    managerResp.setId(manager.getId());
                    managerResp.setUserId(manager.getUserId());
                    managerResp.setUsername(manager.getUserName());
                    managerResp.setNickName(manager.getNickName());
                    managerResp.setEmail(manager.getEmail());
                    CaseOwnership caseOwnership = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("caseId").is(id)
                            .and("userId").is(manager.getId())
                            .and("type").is("dataset")
                            .and("delFlag").is(0)), CaseOwnership.class);
                    if (ObjectUtils.isNotEmpty(caseOwnership)){
                        managerResp.setOwnership(caseOwnership.getOwnership());
                    }
                    resp.setOwner(managerResp);
                }

//                List<CaseOwnership> ownershipList = mongoTemplate.find(new Query().addCriteria(Criteria.where("caseId").is(id).and("delFlag").is(0)), CaseOwnership.class);
//                resp.setOwnershipList(ownershipList);

//                //如果案例已经完成，为markUses设置ownership值
//                if (caseInfo.getCaseStatus()==3){
//                    for (BasicUserResp user : resp.getMarkUsers()){
//                        CaseOwnership ownership = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("caseId").is(id).and("userId").is(user.getId()).and("delFlag").is(0)), CaseOwnership.class);
//                        if (ObjectUtils.isNotEmpty(ownership)){
//                            user.setOwnership(ownership.getOwnership());
//                        }
//                    }
//                }

            }else {
                resp.setName("");
                resp.setTableName("");
            }

        }
        return resp;
    }


    @Override
    public List<Tag> getOrganTagList(String id) {
        List<Tag> tagList = new ArrayList<>();
        CaseInfo caseInfo = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(id))), CaseInfo.class);
        if (ObjectUtils.isNotEmpty(caseInfo)){
            DataSet dataSet = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(caseInfo.getDataSetId()))), DataSet.class);
            if (ObjectUtils.isNotEmpty(dataSet)){
                tagList = mongoTemplate.find(new Query().addCriteria(Criteria.where("organId").is(dataSet.getOrganId()).and("type").is(2).and("delFlag").is(0)), Tag.class);
            }
        }
        return tagList;

    }

    @Override
    public List<Tag> getOrganAreaTagList(String id) {
        List<Tag> tagList = new ArrayList<>();
        CaseInfo caseInfo = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(id))), CaseInfo.class);
        if (ObjectUtils.isNotEmpty(caseInfo)){
            DataSet dataSet = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(caseInfo.getDataSetId()))), DataSet.class);
            if (ObjectUtils.isNotEmpty(dataSet)){
                tagList = mongoTemplate.find(new Query().addCriteria(Criteria.where("organId").is(dataSet.getOrganId()).and("type").is(1).and("delFlag").is(0)), Tag.class);
            }
        }
        return tagList;
    }

    @Override
    public ImageMark saveImageMark(ImageMark imageMark) {
        ImageMark exsitMark = getMyImageMark(imageMark);
        if (ObjectUtils.isNotEmpty(exsitMark)){
            imageMark.setId(exsitMark.getId());
        }else {
            updateCaseMarkInfo(imageMark.getCaseId());
        }

        if(ObjectUtils.isNotEmpty(imageMark.getTagId())){
            Tag tag = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(imageMark.getTagId()))), Tag.class);
            imageMark.setMarkTag(tag);
        }
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
        imageMark.setUserId(loginUser.getUser().getId());
        return mongoTemplate.save(imageMark);
    }

    @Override
    public ImageMark getMyImageMark(ImageMark imageMark) {
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
//        System.out.println(imageMark.getCaseId());
//        System.out.println(loginUser.getUser().getId());
        return mongoTemplate.findOne(new Query().addCriteria(Criteria
                        .where("caseId").is(imageMark.getCaseId())
                        .and("userId").is(loginUser.getUser().getId())
                        .and("delFlag").is(0))

                , ImageMark.class);
    }

    @Override
    public ImageMark getImageMark(ImageMark imageMark) {
        return mongoTemplate.findOne(new Query().addCriteria(Criteria
                        .where("caseId").is(imageMark.getCaseId())
                        .and("userId").is(imageMark.getUserId())
                        .and("delFlag").is(0))
                , ImageMark.class);
    }

    public void updateCaseMarkInfo(String caseId){
        CaseInfo caseInfo = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(caseId))), CaseInfo.class);
        DataSet dataSet = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(caseInfo.getDataSetId()))), DataSet.class);
        caseInfo.setMarkNum(caseInfo.getMarkNum()+1);
        if (caseInfo.getCaseStatus().equals(0)){
            caseInfo.setCaseStatus(1);
        }
        if (caseInfo.getCaseStatus()<=1 && caseInfo.getMarkNum()>=dataSet.getMarkNum()){
            caseInfo.setCaseStatus(2);
        }
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
        List<String> markUserIds = new ArrayList<>();
        if (ObjectUtils.isNotEmpty(caseInfo.getMarkUserIds())){
            markUserIds = caseInfo.getMarkUserIds();
        }
        markUserIds.add(loginUser.getUser().getId());
        caseInfo.setMarkUserIds(markUserIds);
        mongoTemplate.save(caseInfo);

        this.updateDatasetCount(caseInfo.getDataSetId());
    }

    public void updateDatasetCount(String datasetId){
        DataSet dataSet = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(datasetId))), DataSet.class);
        if (ObjectUtils.isNotEmpty(dataSet)){
            Long annotated = mongoTemplate.count(new Query().addCriteria(Criteria.where("dataSetId").is(dataSet.getId()).and("caseStatus").gte(1).and("delFlag").is(0)), CaseInfo.class);
            dataSet.setAnnotatedNum(annotated.intValue());
            Long validated = mongoTemplate.count(new Query().addCriteria(Criteria.where("dataSetId").is(dataSet.getId()).and("caseStatus").is(3).and("delFlag").is(0)), CaseInfo.class);
            dataSet.setValidatedNum(validated.intValue());
            mongoTemplate.save(dataSet);
        }
    }

    public void updateCaseOwnership(String caseId){
        CaseInfo caseInfo = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(caseId))), CaseInfo.class);
        if (ObjectUtils.isNotEmpty(caseInfo)){
            //将之前该caseId的记录delFlag置为1
            Update update = new Update();
            update.set("delFlag", 1);
            mongoTemplate.updateMulti(new Query().addCriteria(Criteria
                            .where("caseId").is(caseId)),
                    update,
                    CaseOwnership.class);
            //系统20%
            CaseOwnership systemOwnership = new CaseOwnership();
            systemOwnership.setCaseId(caseId);
            systemOwnership.setUserId("system");
            systemOwnership.setOwnership(new BigDecimal(20));
            systemOwnership.setType("system");
            mongoTemplate.insert(systemOwnership);

            //dataset的所有者10%
            DataSet dataSet = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(caseInfo.getDataSetId()))), DataSet.class);
            if (ObjectUtils.isNotEmpty(dataSet) && ObjectUtils.isNotEmpty(dataSet.getManagerId())){
                CaseOwnership caseOwnership = new CaseOwnership();
                caseOwnership.setCaseId(caseId);
                caseOwnership.setUserId(dataSet.getManagerId());
                caseOwnership.setOwnership(new BigDecimal(10));
                caseOwnership.setType("dataset");
                mongoTemplate.insert(caseOwnership);
            }

            //审核人30%
            if (ObjectUtils.isNotEmpty(caseInfo.getAuditUserId())){
                CaseOwnership caseOwnership = new CaseOwnership();
                caseOwnership.setCaseId(caseId);
                caseOwnership.setUserId(caseInfo.getAuditUserId());
                caseOwnership.setOwnership(new BigDecimal(30));
                caseOwnership.setType("audit");
                mongoTemplate.insert(caseOwnership);
            }
            //标注人分享40%
            List<ImageMark> imageMarks = mongoTemplate.find(new Query().addCriteria(Criteria.where("caseId").is(caseId).and("delFlag").is(0)), ImageMark.class);
            if (ObjectUtils.isNotEmpty(imageMarks)){
                Double totalMarkScore = imageMarks.stream()
                        .map(ImageMark::getMarkScore) // 提取 markScore
                        .reduce(0.0, Double::sum); // 求和

                for (ImageMark mark : imageMarks){
                    CaseOwnership caseOwnership = new CaseOwnership();
                    caseOwnership.setCaseId(caseId);
                    caseOwnership.setUserId(mark.getUserId());
                    caseOwnership.setOwnership(new BigDecimal(mark.getMarkScore()/totalMarkScore*40));
                    caseOwnership.setType("mark");
                    mongoTemplate.insert(caseOwnership);
                }
            }
        }
    }

    @Override
    public ImageMark setImageMark(ImageMark imageMark) {
        ImageMark exsitMark = getImageMark(imageMark);
        if (ObjectUtils.isEmpty(exsitMark)){
            return imageMark;
        }
        if(ObjectUtils.isNotEmpty(imageMark.getTagId())){
            Tag tag = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(imageMark.getTagId()))), Tag.class);
            exsitMark.setMarkTag(tag);
        }
        if(ObjectUtils.isNotEmpty(imageMark.getMarkContent())){
            exsitMark.setMarkContent(imageMark.getMarkContent());
        }
        return mongoTemplate.save(exsitMark);
    }

    @Override
    public ImageMark scoreImageMark(ImageMark imageMark) {
        ImageMark exsitMark = getImageMark(imageMark);
        if (ObjectUtils.isEmpty(exsitMark)){
            return imageMark;
        }
        exsitMark.setMarkScore(imageMark.getMarkScore());
        return mongoTemplate.save(exsitMark);
    }

    @Override
    public ImageMark selectImageMark(ImageMark imageMark) {
        //将该caseId记录改为未选中
        Update update = new Update();
        update.set("selected", 0);
        mongoTemplate.updateMulti(new Query().addCriteria(Criteria
                        .where("caseId").is(imageMark.getCaseId())),
                update,
                ImageMark.class);

        ImageMark exsitMark = getImageMark(imageMark);
        if (ObjectUtils.isEmpty(exsitMark)){
            return imageMark;
        }
        exsitMark.setSelected(1);
        mongoTemplate.save(exsitMark);

        //提交
        CaseInfo caseInfo = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(imageMark.getCaseId()))), CaseInfo.class);
        caseInfo.setCaseStatus(3);
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
        caseInfo.setAuditUserId(loginUser.getUser().getId());
        //添加到参与者列表
        List<String> markUserIds = new ArrayList<>();
        if (ObjectUtils.isNotEmpty(caseInfo.getMarkUserIds())){
            markUserIds = caseInfo.getMarkUserIds();
        }
        markUserIds.add(loginUser.getUser().getId());
        //dataset所有者也添加到参与者列表
        DataSet dataSet = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(caseInfo.getDataSetId()))), DataSet.class);
        if (ObjectUtils.isNotEmpty(dataSet) && ObjectUtils.isNotEmpty(dataSet.getManagerId())){
            markUserIds.add(dataSet.getManagerId());
        }
        caseInfo.setMarkUserIds(markUserIds);
        mongoTemplate.save(caseInfo);

        //新增案例所有权
        this.updateCaseOwnership(imageMark.getCaseId());

        //更新数据集统计
        this.updateDatasetCount(caseInfo.getDataSetId());

        return exsitMark;
    }

    @Override
    public CaseInfo completeCase(String id) {
        CaseInfo caseInfo = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(id))), CaseInfo.class);
        caseInfo.setCaseStatus(3);
        LoginUser loginUser = tokenService.getLoginUser(ServletUtils.getRequest());
        caseInfo.setAuditUserId(loginUser.getUser().getId());
        return mongoTemplate.save(caseInfo);
    }

    @Override
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

        return mongoTemplate.save(caseInfo);
    }
}
