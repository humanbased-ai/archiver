package com.wsi.annotation.api.manager.service.ai.imp;

import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.database.domain.ai.AIResult;
import com.wsi.annotation.api.database.domain.ai.AITag;
import com.wsi.annotation.api.database.domain.ai.inner.InnerPoint;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import com.wsi.annotation.api.manager.domain.request.ai.AddResultReq;
import com.wsi.annotation.api.manager.domain.request.ai.inner.InnerPatch;
import com.wsi.annotation.api.manager.service.ai.IAIService;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class AIService implements IAIService {

    @Resource
    private MongoTemplate mongoTemplate;

    @Override
    public JSONObject addResult(AddResultReq addResultReq) {
        List<AITag> aiTags = getAITags(addResultReq.getModel());
        List<InnerPatch> patches = addResultReq.getPatches();
        setImageModel(addResultReq.getImageId(),addResultReq.getModel());
        ImageInstance imageInstance = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(addResultReq.getImageId()))), ImageInstance.class);
        for (AITag aiTag: aiTags) {
            List<InnerPoint> point = new ArrayList<>();
            for (InnerPatch innerPatch: patches) {
//                getPolugon(point,innerPatch.getProbability().get(aiTag.getIndex()),innerPatch.getCoordinate(),aiTag.getWidth(),imageInstance);
                getPolugon(point,innerPatch.getProbability(),aiTag.getIndex(),innerPatch.getCoordinate(),aiTag.getWidth(),imageInstance);
            }
            if(point.size()>0){
                AIResult aiResult = new AIResult();
                aiResult.setTagId(aiTag.getId());
                aiResult.setTagName(aiTag.getName());
                aiResult.setImageId(addResultReq.getImageId());
                aiResult.setPoint(point);
                mongoTemplate.save(aiResult);
            }
        }
        JSONObject result = new JSONObject();
        result.put("code",200);
        result.put("message","success");
        return null;
    }

    @Override
    public JSONObject getTagByPlace(String module) {
        Query query = new Query(Criteria.where("place").is(module).and("delFlag").is(0).and("isShow").is(1));
        List<AITag> aiTags = mongoTemplate.find(query, AITag.class);
        JSONObject result = new JSONObject();
        result.put("collection",aiTags);
        return result;
    }

    @Override
    public JSONObject getResult(String imageId, String tagId) {
        Query query = new Query(Criteria.where("imageId").is(imageId).and("delFlag").is(0).and("tagId").is(tagId));
        AIResult aiResult = mongoTemplate.findOne(query, AIResult.class);
        JSONObject result = new JSONObject();
        result.put("collection",new ArrayList());
        if(ObjectUtils.isNotEmpty(aiResult)){
            result.put("collection",aiResult.getPoint());
        }
        return result;
    }

    private void getPoint(List<InnerPoint> point,Double probability,List<Integer> coordinate,Integer width,ImageInstance imageInstance){
        Integer space = 500;
        if(probability>0.1){
            if(probability>0.6){
                space = 1000;
            }
            if(probability>0.7){
                space = 750;
            }
            if(probability>0.8){
                space = 600;
            }
            if(probability>0.9){
                space = 500;
            }
            Integer xP = coordinate.get(0);
            Integer yP = imageInstance.getHeight()-coordinate.get(1)-width;
            Integer maxX = xP+width;
            Integer maxY = yP+width;
            for (int x = xP; x < maxX; x+=space) {
                for (int y = yP; y < maxY; y+=space) {
                    String p = "POINT("+x+" "+y+")";
                    InnerPoint innerPoint = new InnerPoint();
                    innerPoint.setLocaltion(p);
                    innerPoint.setWeight(probability);
                    point.add(innerPoint);
                }
            }
        }
    }

    private void getPolugon(List<InnerPoint> point,List<Double> probability,Integer index,List<Integer> coordinate,Integer width,ImageInstance imageInstance){
        boolean isMax = true;
        Double pro = probability.get(index);
        for (int i = 0; i < probability.size(); i++) {
            if(index == i){
                continue;
            }
            if(pro<probability.get(i)){
                isMax = false;
                break;
            }
        }
        if(isMax){
            Integer xP = coordinate.get(0);
            Integer yP = imageInstance.getHeight()-coordinate.get(1)-width;
            Integer maxX = xP+width-1;
            Integer maxY = yP+width-1;
            String p = String.format("POLYGON((%d %d,%d %d,%d %d,%d %d,%d %d))",xP,yP,maxX,yP,maxX,maxY,xP,maxY,xP,yP);
            InnerPoint innerPoint = new InnerPoint();
            innerPoint.setLocaltion(p);
            innerPoint.setWeight(pro);
            point.add(innerPoint);
        }
    }

    private List<AITag> getAITags(String module){
        Query query = new Query(Criteria.where("place").is(module).and("delFlag").is(0));
        return mongoTemplate.find(query, AITag.class);
    }

    private void setImageModel(String imageId,String model){
        Query query = new Query();
        query.addCriteria(Criteria.where("_id").is(new ObjectId(imageId)));
        Update update = new Update();
        update.set("place",model);
        mongoTemplate.updateFirst(query,update, ImageInstance.class);
    }


}
