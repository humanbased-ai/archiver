package com.wsi.annotation.api.manager.service.cytomine.imp;

import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.mongodb.QueryBuilder;
import com.wsi.annotation.api.common.config.ProjectConfig;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.common.utils.StringUtils;
import com.wsi.annotation.api.common.utils.bean.BeanUtils;
import com.wsi.annotation.api.common.utils.http.HttpUtils;
import com.wsi.annotation.api.database.domain.cytomine.AbstractImage;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import com.wsi.annotation.api.database.domain.cytomine.ImageServer;
import com.wsi.annotation.api.database.domain.cytomine.UserAnnotation;
import com.wsi.annotation.api.manager.domain.request.ai.AIResult;
import com.wsi.annotation.api.manager.domain.request.ai.AITask;
import com.wsi.annotation.api.manager.domain.request.ai.Heatmap;
import com.wsi.annotation.api.manager.domain.request.ai.inner.InnerKeyValue;
import com.wsi.annotation.api.manager.domain.request.base.Page;
import com.wsi.annotation.api.manager.domain.request.cytomine.ImageInstanceSearchReq;
import com.wsi.annotation.api.manager.domain.request.cytomine.LastUserPosition;
import com.wsi.annotation.api.manager.domain.request.cytomine.LastUserPositionHistory;
import com.wsi.annotation.api.manager.domain.request.cytomine.PositionReq;
import com.wsi.annotation.api.manager.domain.request.image.ImageListReq;
import com.wsi.annotation.api.manager.domain.response.base.CollectionBaseResp;
import com.wsi.annotation.api.manager.domain.response.cytomine.ConsultationResp;
import com.wsi.annotation.api.manager.domain.response.cytomine.ImageInstanceResp;
import com.wsi.annotation.api.manager.domain.response.cytomine.PositionResp;
import com.wsi.annotation.api.manager.domain.response.result.CommonResult;
import com.wsi.annotation.api.manager.service.BaseService;
import com.wsi.annotation.api.manager.service.cytomine.IImageInstanceService;
import com.wsi.annotation.api.manager.util.ApiUtil;
import com.wsi.annotation.api.manager.util.SecurityUtils;
import org.bson.types.ObjectId;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKTReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLEncoder;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ImageInstanceService extends BaseService implements IImageInstanceService {

    @Autowired
    private MongoTemplate mongoTemplate;

//    @Value("${server.host}")
//    private String hostServer;

    public void tile(String zoomify, String tileGroup, int z, int x, int y) {
        String fif = zoomify;
        /*remove the "/" at the end of the path injected by openlayers (OL2).
          I Did not find the way to avoid it from OL2 (BS)
         */
        if (fif.endsWith("/"))
            fif = fif.substring(0, fif.length() - 1);
        try {
            String url = ProjectConfig.getIipsrvUrl() + "?zoomify=" + URLEncoder.encode(fif, "UTF-8") + "/TileGroup"
                    + tileGroup + "/" + z + "-" + x + "-" + y + ".jpg";
            HttpUtils.downloadImage(ServletUtils.getResponse(), url);
        } catch (Exception e) {
            e.printStackTrace();
        }

    }


    public ImageInstanceResp detail(String imageId) {
        ImageInstance imageInstance = mongoTemplate.findById(imageId, ImageInstance.class);
        ImageInstanceResp resq = new ImageInstanceResp(imageInstance);
        return resq;
    }

    public CollectionBaseResp<ImageInstanceResp> listByProject(ImageInstanceSearchReq req) {
        CollectionBaseResp<ImageInstanceResp> resp = new CollectionBaseResp<>();
        Criteria criteria = Criteria.where("delFlag").is(0)
                .and("projectId").is(StringUtils.toObjectId(req.getProjectId()))
                .and("baseImageId").ne(null);
        Query query = Query.query(criteria);
        long count = mongoTemplate.count(query, ImageInstance.class);

        if (req.getOffset() > 0) {
            query.skip(req.getOffset());
        }
        if (req.getMax() > 0) {
            query.limit(req.getMax());
        }
        List<ImageInstance> imageInstances = mongoTemplate.find(query, ImageInstance.class);
        imageInstances = imageInstances.stream().sorted(Comparator.comparing(ImageInstance::getId_num)).collect(Collectors.toList());
        List<ImageInstanceResp> imageInstanceResps = imageInstances.stream().map(ImageInstanceResp::new).collect(Collectors.toList());
        resp.setCollection(imageInstanceResps);
        resp.setSize(count);
        return resp;
    }


    public Page<ImageInstanceResp> list(ImageListReq imageListReq) {
        QueryBuilder queryBuilder = new QueryBuilder();

        Query query = new BasicQuery(queryBuilder.get().toString());

        if (ObjectUtils.isEmpty(imageListReq.getCurrent())) {
            imageListReq.setCurrent(1);
        }

        if (ObjectUtils.isEmpty(imageListReq.getPageSize())) {
            imageListReq.setPageSize(10);
        }

        int count = (int) mongoTemplate.count(query, ImageInstance.class);

        Page<ImageInstanceResp> page = new Page<>(imageListReq.getCurrent(), imageListReq.getPageSize(), count);

        query.with(Sort.by(Sort.Direction.DESC, "_id"));
        query.skip((imageListReq.getCurrent() - 1) * imageListReq.getPageSize()).limit(imageListReq.getPageSize());

        List<ImageInstance> list = mongoTemplate.find(query, ImageInstance.class);

        List<ImageInstanceResp> imageInstanceResqs = new ArrayList<>();

        list.forEach(item -> {
            ImageInstanceResp resq = new ImageInstanceResp(item);
            resq.setThumb(ProjectConfig.getServerUrl() + ApiUtil.getAbstractImageThumbURL(item.id) + "?maxSize=512");
            imageInstanceResqs.add(resq);
        });

        page.setRecords(imageInstanceResqs);

        return page;
    }

    public BufferedImage thumb(String id, int maxSize) throws UnsupportedEncodingException, MalformedURLException {
        ImageInstance imageInstance = mongoTemplate.findById(new ObjectId(id), ImageInstance.class);

        AbstractImage abstractImage = mongoTemplate.findById(new ObjectId(imageInstance.getBaseImageId()), AbstractImage.class);

        String fif = URLEncoder.encode(abstractImage.getAbsolutePath(), "UTF-8");
        String mimeType = abstractImage.getMimeType();
        String url = "/image/thumb.jpg?fif=" + fif + "&mimeType=" + mimeType + "&maxSize=" + maxSize;


//        AttachedFile attachedFile = AttachedFile.findByDomainIdentAndFilename(id, url);
//        if (!attachedFile || refresh) {
        List<String> serverIds = imageInstance.getImageServerIds();

        ImageServer imageServer = null;

        if (serverIds.size() > 0) {
            String serverId = serverIds.get(new Random().nextInt(serverIds.size() - 1));
            imageServer = mongoTemplate.findById(serverId, ImageServer.class);
        }
        String imageServerURL = imageServer.getUrl();
        try {
            URL realUrl = new URL(imageServerURL + url);
            URLConnection connection = realUrl.openConnection();
            connection.connect();
            BufferedImage bufferedImage = ImageIO.read(connection.getInputStream());
            return bufferedImage;
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }


    public ConsultationResp consultation(String image, String mode) {
        ConsultationResp resp = new ConsultationResp();
        ImageInstance imageInstance = mongoTemplate.findById(image, ImageInstance.class);
        resp.setUser(imageInstance.getUserId());
        resp.setImage(imageInstance.getId());
        resp.setProject(imageInstance.getProjectId());
        resp.setMode(mode);
        resp.setImageName(imageInstance.getInstanceFilename());
        resp.setUser(imageInstance.getUserId());
        resp.setImageThumb(ApiUtil.getThumbImage(imageInstance.getBaseImageId(), 256));
        return resp;
    }

    public JSONObject annotationindex(String image) {
        List<UserAnnotation> userAnnotations = mongoTemplate.find(Query.query(Criteria.where("delFlag").is(0).and("image_id").is(image)), UserAnnotation.class);

        Map<String, Long> counts = userAnnotations.stream().collect(Collectors.groupingBy(UserAnnotation::getUser_id, Collectors.counting()));

        JSONArray array = new JSONArray();
        counts.entrySet().forEach(x -> {
            JSONObject collection = new JSONObject();
            collection.put("user", x.getKey());
            collection.put("image", image);
            collection.put("countAnnotation", x.getValue());
            collection.put("countReviewedAnnotation", 0);
            array.add(collection);
        });

        return getJsonObject(array, 0, 0);
    }

    public PositionResp position(String image, PositionReq req) throws ParseException {
        ImageInstance imageInstance = mongoTemplate.findById(image, ImageInstance.class);
        String polygon = "POLYGON((" + req.getTopLeftX() + " " + req.getTopLeftY()
                + "," + req.getTopRightX() + " " + req.getTopRightY()
                + "," + req.getBottomRightX() + " " + req.getBottomRightY()
                + "," + req.getBottomLeftX() + " " + req.getBottomLeftY()
                + "," + req.getTopLeftX() + " " + req.getTopLeftY() + "))";
        List<LastUserPosition> lastUserPositions = mongoTemplate.find(Query.query(Criteria.where("image").is(image)
                .and("user").is(SecurityUtils.getCookieUser().getId())), LastUserPosition.class);
        if (lastUserPositions.size() > 0) {
            for (LastUserPosition lastUserPosition : lastUserPositions) {
                LastUserPositionHistory history = new LastUserPositionHistory();
                BeanUtils.copyProperties(lastUserPosition, history);
                history.setId(null);
                history.setCreateTime(new Date());
                mongoTemplate.insert(history);
                mongoTemplate.remove(lastUserPosition);
            }
        }

        LastUserPosition lastUserPosition = new LastUserPosition();
        lastUserPosition.setImage(image);
        lastUserPosition.setImageName(imageInstance.getInstanceFilename());
        lastUserPosition.setProject(imageInstance.getProjectId());
        lastUserPosition.setBroadcast(req.getBroadcast());
        lastUserPosition.setZoom(req.getZoom());
        lastUserPosition.setRotation(req.getRotation());
        lastUserPosition.setLocation(polygon);
        lastUserPosition.setUser(SecurityUtils.getCookieUser().getId());
        mongoTemplate.insert(lastUserPosition);

        PositionResp resp = new PositionResp();
        BeanUtils.copyProperties(lastUserPosition, resp);
        WKTReader reader = new WKTReader();
        Geometry geometry = reader.read(polygon);
        resp.setX(geometry.getCentroid().getX());
        resp.setY(geometry.getCentroid().getY());
        return resp;
    }

    public List<String> online(String image, Boolean broadcast) {
        List<LastUserPosition> lastUserPositions = mongoTemplate.find(Query.query(Criteria.where("image").is(image).and("broadcast").is(broadcast)), LastUserPosition.class);
        return lastUserPositions.stream().map(x -> x.getUser()).distinct().collect(Collectors.toList());
    }

    public PositionResp getPosition(String image, String user) throws ParseException {
        List<LastUserPosition> lastUserPositions = mongoTemplate.find(Query.query(Criteria.where("image").is(image)
                .and("broadcast").is(true)
                .and("user").is(user)), LastUserPosition.class);

        PositionResp resp = new PositionResp();
        if(lastUserPositions.size()>0){
            BeanUtils.copyProperties(lastUserPositions.get(0), resp);
            WKTReader reader = new WKTReader();
            Geometry geometry = reader.read(resp.getLocation());
            resp.setX(geometry.getCentroid().getX());
            resp.setY(geometry.getCentroid().getY());
        }
        return resp;
    }

    @Override
    public JSONObject getAIResult(String image) {
        Criteria criteria = Criteria.where("sliceId").is(image).and("status").is(2);
        Sort sort = Sort.by(Sort.Direction.DESC,"_id");
        AITask aiTask = mongoTemplate.findOne(new Query().addCriteria(criteria).with(sort), AITask.class);

        JSONObject result = new JSONObject();

        if(ObjectUtils.isNotEmpty(aiTask)){
            Criteria criteriaResult = Criteria.where("taskId").is(aiTask.getId()).and("isShow").is(1).and("delFlag").is(0);
            List<AIResult> aiResults = mongoTemplate.find(new Query().addCriteria(criteriaResult), AIResult.class);
            List<JSONObject> list = new ArrayList<>();
            JSONObject detail = new JSONObject();
            JSONObject resultConfirm = null;
            for (AIResult aiResult : aiResults) {
                if(aiResult.getResultType()==2){
                    JSONObject obj = setReturnData(aiResult.getResult());
                    obj.put("gradient",aiResult.getGradient());
                    obj.put("name",aiResult.getTagName());
                    list.add(obj);
                }else if(aiResult.getResultType()==1){
                    detail = setReturnData(aiResult.getResult());
                }else {
                    resultConfirm = setReturnData(aiResult.getResult());
                }
            }
            result.put("code",200);
            result.put("message","成功");
            result.put("list",list);
            result.put("detail",detail);
            result.put("resultConfirm",resultConfirm);
            result.put("taskId",aiTask.getId());
            result.put("model",aiTask.getModel());
        }else {
            result.put("code",201);
            result.put("message","没有已经完成的AI任务");
        }

        return result;
    }

    @Override
    public JSONObject getHeatmap(String image) {
        Criteria criteria = Criteria.where("imageId").is(image);
        Sort sort = Sort.by(Sort.Direction.DESC,"_id");
        Heatmap heatmap = mongoTemplate.findOne(new Query().addCriteria(criteria).with(sort), Heatmap.class);
        JSONObject result = new JSONObject();
        if(ObjectUtils.isNotEmpty(heatmap)){
            result.put("code",200);
            result.put("message","成功");
            result.put("data",heatmap.getHeatmaps());
            return result;
        }
        result.put("code",201);
        result.put("message","没有已经完成的AI任务");
        return result;
    }


    @Override
    public JSONObject saveUserAIResult(String image, JSONObject userResult) {
        JSONObject result = new JSONObject();
        String taskId = userResult.getString("taskId");
        Criteria criteriaResult = Criteria.where("taskId").is(taskId).and("resultType").is(3).and("delFlag").is(0);
        AIResult aiResult = mongoTemplate.findOne(new Query().addCriteria(criteriaResult), AIResult.class);

        JSONObject data = userResult.getJSONObject("data");
        List<InnerKeyValue> keyValueList = new ArrayList<>();
        for (String key : data.keySet()) {
            keyValueList.add(new InnerKeyValue(key,data.get(key)));
        }
        if(ObjectUtils.isNotEmpty(aiResult)){
            Update update = new Update();
            update.set("result",keyValueList);
            mongoTemplate.updateFirst(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(aiResult.getId()))),update,AIResult.class);
        }else {
            AITask aiTask = mongoTemplate.findOne(new Query().addCriteria(Criteria.where("_id").is(new ObjectId(taskId))), AITask.class);
            aiResult = new AIResult();
            aiResult.setResult(keyValueList);
            aiResult.setImageId(aiTask.getSliceId());
            aiResult.setResultType(3);
            aiResult.setTaskId(taskId);
            aiResult.setIsShow(1);
            mongoTemplate.save(aiResult);
        }
        result.put("code",200);
        result.put("message","成功");
        return result;
    }

    private JSONObject setReturnData(List<InnerKeyValue> keyValueList){
        JSONObject obj = new JSONObject();
        for (InnerKeyValue innerKeyValue:keyValueList) {
            obj.put(innerKeyValue.getKey(),innerKeyValue.getValue());
        }
        return obj;
    }

//    @Override
//    public CommonResult getSvsSearchResult(ImageInstance imageInstance){
//        List<CaseSearchInfo.ResultItem> searchResult = new ArrayList<>();
//        CaseSearchInfo caseSearchInfo = mongoTemplate.findOne(new Query().addCriteria(Criteria
//                .where("instanceId").is(imageInstance.getId())
//                .and("delFlag").is(0)
//                .and("searchStatus").is(1)).with(Sort.by(Sort.Order.desc("_id")))
//                ,CaseSearchInfo.class);
//
//        if (ObjectUtils.isNotEmpty(caseSearchInfo) && ObjectUtils.isNotEmpty(caseSearchInfo.getSearchResult())){
//            for (CaseSearchInfo.ResultItem resultItem:caseSearchInfo.getSearchResult()){
//                MorphologicalLibrary library = mongoTemplate.findOne(new Query().addCriteria(
//                        Criteria.where("fileName").is(resultItem.getFile_name())
//                ), MorphologicalLibrary.class);
//
//                ImageInstance instance = mongoTemplate.findOne(new Query().addCriteria(
//                        Criteria.where("libraryId").is(library.getId())
//                ), ImageInstance.class);
//                resultItem.setInstance(new ImageInstanceResp(instance));
//            }
//            searchResult = caseSearchInfo.getSearchResult();
//        }
//        return CommonResult.success(searchResult,"获取搜索结果成功");
//    }
}
