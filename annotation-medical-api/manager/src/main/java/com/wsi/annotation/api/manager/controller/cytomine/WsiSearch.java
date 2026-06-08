package com.wsi.annotation.api.manager.controller.cytomine;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.mongodb.QueryBuilder;
import com.wsi.annotation.api.common.utils.http.HttpUtils;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import com.wsi.annotation.api.manager.domain.request.cytomine.AnnotationSearchReq;
import com.wsi.annotation.api.manager.domain.request.cytomine.WsiSearchReq;
import com.wsi.annotation.api.manager.domain.response.cytomine.ImageInstanceResp;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/wsi")
@Slf4j
public class WsiSearch {

    @Value("${wsi.search.server}")
    private String wsiServer;
    @Autowired
    private MongoTemplate mongoTemplate;

    @PostMapping(value = "/search", produces = {"application/json"})
    @ApiOperation(value = "切片搜索", notes = "切片搜索", nickname = "tile")
    public List<ImageInstanceResp> search(@RequestBody WsiSearchReq req) {
        String url = wsiServer + "/search";
        String result = HttpUtils.sendGet(url,"id="+req.getId());
        JSONObject resultObj = JSONObject.parseObject(result);
        JSONArray list = resultObj.getJSONArray("data");
        List<ImageInstanceResp> imageInstanceResps = new ArrayList<>();
        try {
            List<String> names = new ArrayList<>();
            for (int i = 0; i < list.size(); i++) {
                JSONObject jsonObject = list.getJSONObject(i);
                names.add(jsonObject.getString("slide_name"));
            }
            QueryBuilder queryBuilder = new QueryBuilder();
            queryBuilder.and("slide_name").in(names);
            List<ImageInstance> resultList = mongoTemplate.find(new BasicQuery(queryBuilder.get().toString()), ImageInstance.class);

            int similarity = 90;

            for (int i = 0; i < list.size(); i++) {
                JSONObject jsonObject = list.getJSONObject(i);
                String slideName = jsonObject.getString("slide_name");
                for (ImageInstance item:resultList) {
                    if(slideName.equals(item.getSlideName())){
                        ImageInstanceResp resp = new ImageInstanceResp(item);
                        resp.setMatchedPatch(jsonObject.getInteger("match_patch"));
                        resp.setSimilarity(similarity);
                        imageInstanceResps.add(resp);
                        similarity--;
                        break;
                    }
                }
                if(i>=10){
                    break;
                }

            }

        }catch (Exception e){
            log.info("error");
            e.printStackTrace();
        }
        return imageInstanceResps;
    }
}
