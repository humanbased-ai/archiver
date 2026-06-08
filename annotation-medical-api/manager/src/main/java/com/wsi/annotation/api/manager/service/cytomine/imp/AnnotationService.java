package com.wsi.annotation.api.manager.service.cytomine.imp;

import com.alibaba.fastjson.JSONObject;
import com.mongodb.DBObject;
import com.wsi.annotation.api.common.config.ProjectConfig;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.common.utils.GeoUtil;
import com.wsi.annotation.api.common.utils.JWDUtil;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.common.utils.StringUtils;
import com.wsi.annotation.api.common.utils.bean.BeanUtils;
import com.wsi.annotation.api.common.utils.http.HttpUtils;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import com.wsi.annotation.api.database.domain.cytomine.Tag;
import com.wsi.annotation.api.database.domain.cytomine.UserAnnotation;
import com.wsi.annotation.api.database.domain.cytomine.UserAnnotationLog;
import com.wsi.annotation.api.manager.domain.request.cytomine.*;
import com.wsi.annotation.api.manager.domain.response.cytomine.AnnotationActionSelectResp;
import com.wsi.annotation.api.manager.domain.response.cytomine.AnnotationDescriptionResp;
import com.wsi.annotation.api.manager.domain.response.cytomine.AnnotationDetailResp;
import com.wsi.annotation.api.manager.service.BaseService;
import com.wsi.annotation.api.manager.service.cytomine.IAbstractImageService;
import com.wsi.annotation.api.manager.service.cytomine.IAnnotationService;
import com.wsi.annotation.api.manager.util.SecurityUtils;
import org.bson.BsonDocument;
import org.geotools.data.mongodb.MongoGeometryBuilder;
import org.locationtech.jts.geom.*;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKTReader;
import org.locationtech.jts.precision.GeometryPrecisionReducer;
import org.locationtech.jts.simplify.DouglasPeuckerSimplifier;
import org.locationtech.jts.simplify.TopologyPreservingSimplifier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@Service
public class AnnotationService extends BaseService implements IAnnotationService {

    @Autowired
    MongoTemplate mongoTemplate;

    @Autowired
    IAbstractImageService abstractImageService;

    public List<JSONObject> search(AnnotationSearchReq req) {
        MongoGeometryBuilder builder = new MongoGeometryBuilder();

        ImageInstance imageInstance = mongoTemplate.findById(req.getImage(), ImageInstance.class);

        String[] bboxs = req.getBbox().split(",");
        Polygon geometry = GeoUtil.boxToPolygon(bboxs, imageInstance.getHeight(), imageInstance.getWidth());


        List<UserAnnotation> userAnnotationList = mongoTemplate.find(Query.query(Criteria.where("delFlag").is(0)
                .and("image_id").is(req.getImage())
                .and("user_id").is(req.getUser())
                .and("location").is(BsonDocument.parse("{$geoIntersects:{$geometry:" + builder.toObject(geometry).toString() + "}}"))), UserAnnotation.class);


        return userAnnotationList.stream().map(x -> {
            AnnotationDetailResp resp = new AnnotationDetailResp(x);
            JSONObject annotation = JSONObject.parseObject(JSONObject.toJSONString(resp));
            annotation.put("class", AnnotationDetailResp.class.getName());
            return annotation;
        }).collect(Collectors.toList());

    }

    public JSONObject add(AnnotationAddReq req) {

        JSONObject json = new JSONObject();

        UserAnnotation userAnnotation = new UserAnnotation();
        userAnnotation.setImage_id(req.getImage());
        userAnnotation.setUser_id(req.getUser());
        userAnnotation.setWkt_location(req.getLocation());
        try {
            userAnnotation = save(userAnnotation);

            ImageInstance imageInstance = mongoTemplate.findById(req.getImage(), ImageInstance.class);
            //保存图片数据标注数
            imageInstance.setNumberOfAnnotations(imageInstance.getNumberOfAnnotations() != null ? imageInstance.getNumberOfAnnotations() + 1 : 1);
            mongoTemplate.save(imageInstance);
            String logId = addUserAnnotationLog(userAnnotation, 0, null);
            return getAnnotationJson(userAnnotation, logId);


        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;

//        JSONObject json = new JSONObject();
//
//        UserAnnotation userAnnotation = new UserAnnotation();
//        userAnnotation.setImage_id(req.getImage());
//        userAnnotation.setUser_id(req.getUser());
//
//        WKTReader reader = new WKTReader();
//        MongoGeometryBuilder builder = new MongoGeometryBuilder();
//        try {
//            Geometry geometry = reader.read(req.getLocation());
//            userAnnotation.setArea(geometry.getArea());
//            userAnnotation.setArea_unit(3);
//            userAnnotation.setPerimeter(geometry.getLength());
//            userAnnotation.setPerimeter_unit(2);
//            userAnnotation.setWkt_location(req.getLocation());
//
//
//            ImageInstance imageInstance = mongoTemplate.findById(req.getImage(), ImageInstance.class);
//
//            userAnnotation.setProject_id(imageInstance.getProjectId());
//
//            Geometry imageBounds = reader.read("POLYGON((0 0,0 " + imageInstance.getHeight()
//                    + "," + imageInstance.getWidth()
//                    + " " + imageInstance.getHeight()
//                    + "," + imageInstance.getWidth() + " 0,0 0))");
//
//            geometry = geometry.intersection(imageBounds);
//
//            if (!(geometry.getGeometryType().equals("LineString"))) {
//                Map<String, Object> boundaries = GeoUtil.getGeometryBoundaries(geometry);
//                if (boundaries == null || boundaries.isEmpty() || boundaries.size() == 0
//                        || (Long) boundaries.get("width") == 0 || (Long) boundaries.get("height") == 0) {
//                    throw new HTTPDataException(505, "Annotation dimension not valid");
//                }
//            }
//
//            Map<String, Object> simplifyMap = simplifyPolygon(geometry);
//            geometry = (Geometry) simplifyMap.get("geometry");
//            userAnnotation.setSimplify_location(geometry.toText());
//            userAnnotation.setGeometryCompression((Double) simplifyMap.get("rate"));
//
//
//            //转成地理空间经纬度
//            if (geometry.getGeometryType().equals("LineString")) {
//                for (int i = 0; i < geometry.getCoordinates().length; i++) {
//                    geometry.getCoordinates()[i] = JWDUtil.XYTOJWD(geometry.getCoordinates()[i], imageInstance.getHeight(), imageInstance.getWidth());
//                }
//            } else if (geometry.getGeometryType().equals("Polygon")) {
//                Coordinate[] coordinates = geometry.getCoordinates();
//                GeometryFactory factory = new GeometryFactory();
//                for (int i = 0; i < coordinates.length; i++) {
//                    coordinates[i] = JWDUtil.XYTOJWD(geometry.getCoordinates()[i], imageInstance.getHeight(), imageInstance.getWidth());
//                }
//                LinearRing line = new LinearRing(factory.getCoordinateSequenceFactory().create(coordinates), factory);
//                geometry = new Polygon(line, null, factory);
//            } else if (geometry.getGeometryType().equals("MultiPolygon")) {
//                List<Polygon> polygons = new ArrayList<>();
//                GeometryFactory factory = new GeometryFactory();
//                for (int j = 0; j < geometry.getNumGeometries(); j++) {
//                    Coordinate[] coordinates = geometry.getGeometryN(j).getCoordinates();
//                    for (int i = 0; i < coordinates.length; i++) {
//                        coordinates[i] = JWDUtil.XYTOJWD(coordinates[i], imageInstance.getHeight(), imageInstance.getWidth());
//                    }
//                    LinearRing line = new LinearRing(factory.getCoordinateSequenceFactory().create(coordinates), factory);
//                    polygons.add(new Polygon(line, null, factory));
//                }
//                geometry = new MultiPolygon(polygons.toArray(new Polygon[polygons.size()]), factory);
//            } else if (geometry.getGeometryType().equals(Geometry.TYPENAME_POINT)) {
//                Coordinate point = JWDUtil.XYTOJWD(geometry.getCoordinate(), imageInstance.getHeight(), imageInstance.getWidth());
//                geometry.getCoordinate().setX(point.getX());
//                geometry.getCoordinate().setY(point.getY());
//            }
//            DBObject dbObject = builder.toObject(geometry);
//            userAnnotation.setLocation(dbObject);
//            mongoTemplate.save(userAnnotation);
//
//            //保存图片数据标注数
//            imageInstance.setNumberOfAnnotations(imageInstance.getNumberOfAnnotations() != null ? imageInstance.getNumberOfAnnotations() + 1 : 1);
//            mongoTemplate.save(imageInstance);
//
//            getUserAnnotationJson(userAnnotation, json);
//
//            return json;
//
//
//        } catch (Exception e) {
//            e.printStackTrace();
//        }
//        return json;
    }

    public void crop(String annotationId, String format, Integer maxSize, boolean draw, boolean complete, double increaseArea) throws IOException {
        UserAnnotation userAnnotation = mongoTemplate.findById(annotationId, UserAnnotation.class);
        Map<String, Object> param = retrieveCropParams(userAnnotation, format, maxSize, draw, complete, increaseArea);
        String url = getCropURL(param, format);
        HttpServletResponse response = ServletUtils.getResponse();
        if (url.length() < 3584) {
            response.sendRedirect(url);
        } else {
            param.put("id", param.get("baseImageId"));
            url = abstractImageService.getCropIMSUrl(param.get("baseImageId").toString(), HttpUtils.getQueryStringByMap(param));
            HttpUtils.responseUrl(url, format, response);
        }
    }


    public String getCropURL(Map<String, Object> parameters, String format) {
        String url = ProjectConfig.getServerUrl() + "/api/abstractimage/crop.jpg?format=" + format;
        return url + "&" + HttpUtils.getQueryStringByMap(parameters);
    }

    // In the window service, boundaries are already set and do not correspond to geometry/location boundaries
    public Map<String, Object> retrieveCropParams(UserAnnotation userAnnotation, String format, Integer maxSize, boolean draw, boolean complete, double increaseArea) {
        Map<String, Object> boundaries = new HashMap<>();
        try {
            WKTReader reader = new WKTReader();
            Geometry geometry = reader.read(userAnnotation.getWkt_location());
            boundaries = GeoUtil.getGeometryBoundaries(geometry);
            ImageInstance imageInstance = mongoTemplate.findById(userAnnotation.getImage_id(), ImageInstance.class);
            boundaries.put("baseImageId", imageInstance.getBaseImageId());
            boundaries.put("imageWidth", imageInstance.getWidth());
            boundaries.put("imageHeight", imageInstance.getHeight());
            boundaries.put("format", "png");
            if (StringUtils.isNotEmpty(format)) {
                boundaries.put("format", format);
            }
            if (maxSize != null && maxSize > 0) {
                boundaries.put("maxSize", maxSize);
            }
            if (draw) {
                boundaries.put("draw", true);
                boundaries.put("location", geometry.toText());
            }
            if (increaseArea != 0) {
                boundaries.put("increaseArea", increaseArea);
            }

            if (complete) {
                GeometryPrecisionReducer reducer = new GeometryPrecisionReducer(new PrecisionModel(100));
                boundaries.put("location", reducer.reduce(geometry).toText());
            } else {
                geometry = simplifyPolygonForCrop(geometry);
                boundaries.put("location", geometry.toText());
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return boundaries;
    }


    private Geometry simplifyPolygonForCrop(Geometry geometry) {
        if (geometry.getNumPoints() < 100)
            return reduceGeometryPrecision(geometry);

        double index = 2d;
        int max = 1000;
        while (index < max) {
            geometry = TopologyPreservingSimplifier.simplify(geometry, index);
            if (geometry.getNumPoints() < 150) {
                break;
            }
            index = (index + 5) * 1.1;
        }
        return reduceGeometryPrecision(geometry);
    }

    private Geometry reduceGeometryPrecision(Geometry geometry) {
        int scale = 100;
        GeometryPrecisionReducer reducer = new GeometryPrecisionReducer(new PrecisionModel(scale));
        return reducer.reduce(geometry);
    }

    // Fast response for simple geometries
    private Map<String, Object> simplifyPolygon(Geometry geometry) {
        if (geometry.getNumPoints() < 100)
            return new HashMap<String, Object>() {
                {
                    put("geometry", geometry);
                    put("rate", 0.0d);
                }
            };

        int numOfGeometry = 0;
        if (geometry instanceof MultiPolygon) {
            for (int i = 0; i < geometry.getNumGeometries(); i++) {
                Geometry geom = geometry.getGeometryN(i);
                int nbInteriorRing = 1;
                if (geom instanceof Polygon)
                    nbInteriorRing = ((Polygon) geom).getNumInteriorRing();
                numOfGeometry += geom.getNumGeometries() * nbInteriorRing;
            }
        } else {
            int nbInteriorRing = 1;
            if (geometry instanceof Polygon)
                nbInteriorRing = ((Polygon) geometry).getNumInteriorRing();
            numOfGeometry = geometry.getNumGeometries() * nbInteriorRing;
        }
        numOfGeometry = Math.max(1, numOfGeometry);

        if (numOfGeometry > 10) {
            numOfGeometry = numOfGeometry / 2;
        }
        numOfGeometry = Math.min(10, numOfGeometry);

        double ratioMax = 1.3d;
        double ratioMin = 1.7d;
        double maxNumberOfPoint = 200.0d;
        double minNumberOfPoint = 100.0d;

        double numberOfPoint = geometry.getNumPoints();

        /* Maximum number of point that we would have (500/5 (max 150)=max 100 points)*/
        double rateLimitMax = Math.max(numberOfPoint / ratioMax, numOfGeometry * maxNumberOfPoint);

        /* Minimum number of point that we would have (500/10 (min 10 max 100)=min 50 points)*/
        double rateLimitMin = Math.min(Math.max(numberOfPoint / ratioMin, 10), numOfGeometry * minNumberOfPoint);

        /* Increase value for the increment (allow to converge faster) */
        double incrThreshold = 0.25d;
        double i = 0;
        double rate = 0;

        /* Max number of loop (prevent infinite loop) */
        int maxLoop = 1000;

        Geometry newGeometry = geometry.copy();
        Boolean isPolygonAndNotValid = (geometry instanceof Polygon && !geometry.isValid());
        Boolean isMultiPolygon = (geometry instanceof MultiPolygon);
        while (numberOfPoint > rateLimitMax && maxLoop > 0) {
            rate = i;
            if (isPolygonAndNotValid || isMultiPolygon) {
                newGeometry = TopologyPreservingSimplifier.simplify(geometry, rate);
            } else {
                newGeometry = DouglasPeuckerSimplifier.simplify(geometry, rate);
            }

            if (newGeometry.getNumPoints() < rateLimitMin)
                break;

            i = i + ((incrThreshold));
            numberOfPoint = newGeometry.getNumPoints();
            maxLoop--;
        }
        double finalRate = rate;
        Geometry finalNewGeometry = newGeometry;
        return new HashMap<String, Object>() {
            {
                put("geometry", finalNewGeometry);
                put("rate", finalRate);
            }
        };
    }


    public void description(AnnotationDescriptionSaveReq req) {
        UserAnnotation userAnnotation = mongoTemplate.findById(req.getDomainIdent(), UserAnnotation.class);
        userAnnotation.setDescription(req.getData());
        mongoTemplate.save(userAnnotation);
    }

    public void saveTag(AnnotationDescriptionSaveReq req) {
        UserAnnotation userAnnotation = mongoTemplate.findById(req.getDomainIdent(), UserAnnotation.class);
        System.out.println("tagId:"+req.getTagId());
        Tag tag = mongoTemplate.findById(req.getTagId(), Tag.class);
        userAnnotation.setTag(tag);
        System.out.println("Tag:"+JSONObject.toJSONString(tag));
        mongoTemplate.save(userAnnotation);
    }

    public AnnotationDescriptionResp getTag(AnnotationDescriptionSaveReq req) {
        UserAnnotation userAnnotation = mongoTemplate.findById(req.getDomainIdent(), UserAnnotation.class);
        AnnotationDescriptionResp resp = new AnnotationDescriptionResp();
        resp.setDomainIdent(req.getDomainIdent());
        resp.setTag(userAnnotation.getTag());
        System.out.println("Tag:"+JSONObject.toJSONString(userAnnotation.getTag()));
        return resp;
    }

    public JSONObject del(String id) {
        UserAnnotation userAnnotation = mongoTemplate.findById(id, UserAnnotation.class);
        userAnnotation.setDelFlag(1);
        mongoTemplate.save(userAnnotation);
        String logId = addUserAnnotationLog(userAnnotation, 2, userAnnotation.getWkt_location());
        mongoTemplate.findAndModify(Query.query(Criteria.where("_id").is(userAnnotation.getImage_id())),
                new Update().inc("numberOfAnnotations", -1), ImageInstance.class);
        return getAnnotationJson(userAnnotation, logId);
    }

    public JSONObject detail(String id) {
        UserAnnotation userAnnotation = mongoTemplate.findById(id, UserAnnotation.class);
        AnnotationDetailResp resp = new AnnotationDetailResp();
        BeanUtils.copyBeanProp(resp, userAnnotation);
        return RespJson(resp, AnnotationDetailResp.class);
    }

    public AnnotationDescriptionResp getDescription(String annotationId) {
        AnnotationDescriptionResp resp = new AnnotationDescriptionResp();
        resp.setDomainIdent(annotationId);
        UserAnnotation userAnnotation = mongoTemplate.findById(annotationId, UserAnnotation.class);
        resp.setData(userAnnotation.getDescription() != null ? userAnnotation.getDescription() : "");
        resp.setId("0");
        return resp;
    }

    public JSONObject actionSelect(AnnotationActionReq req) {
        UserAnnotation userAnnotation = mongoTemplate.findById(req.getAnnotationIdent(), UserAnnotation.class);
        AnnotationActionSelectResp resp = new AnnotationActionSelectResp();
        resp.setAction(req.getAction());
        resp.setAnnotationClassName(UserAnnotation.class.getName());
        resp.setAnnotationCreator(userAnnotation.getUser_id());
        resp.setAnnotationIdent(userAnnotation.getId());
        resp.setImage(userAnnotation.getImage_id());
        resp.setProject(userAnnotation.getProject_id());
        resp.setUser(userAnnotation.getUser_id());
        resp.setCreated(userAnnotation.getCreateTime().getTime());
        return super.RespJson(resp, UserAnnotation.class);
    }

//    public JSONObject undo() {
//        UserAnnotation userAnnotation = mongoTemplate.findOne(Query.query(Criteria.where("delFlag").is(1)
//                .and("user_id").is(SecurityUtils.getCookieUser().getId())).with(Sort.by(Sort.Direction.DESC, "updateTime")), UserAnnotation.class);
//        if (userAnnotation != null) {
//            userAnnotation.setDelFlag(0);
//            mongoTemplate.save(userAnnotation);
//        }
//        JSONObject json = new JSONObject();
//        getUserAnnotationJson(userAnnotation, json);
//
//        List<JSONObject> collects = new ArrayList<>();
//        collects.add(json);
//
//
//        return getJsonObject(collects, 0, 0);
//
//    }

    @Override
    public JSONObject update(AnnotationUpdateReq req) throws ParseException {
        UserAnnotation userAnnotation = mongoTemplate.findById(req.getId(), UserAnnotation.class);
        String undo_wkt_location = userAnnotation.getWkt_location();
        userAnnotation.setWkt_location(req.getLocation());
        userAnnotation = save(userAnnotation);
        String logId = addUserAnnotationLog(userAnnotation, 1, undo_wkt_location);
        return getAnnotationJson(userAnnotation, logId);


//        JSONObject json = new JSONObject();
//
//        UserAnnotation userAnnotation = mongoTemplate.findById(new ObjectId(req.getId()),UserAnnotation.class);
//        userAnnotation.setImage_id(req.getImage());
//        userAnnotation.setUser_id(req.getUser());
//
//        WKTReader reader = new WKTReader();
//        MongoGeometryBuilder builder = new MongoGeometryBuilder();
//        try {
//            Geometry geometry = reader.read(req.getLocation());
//            userAnnotation.setArea(geometry.getArea());
//            userAnnotation.setArea_unit(3);
//            userAnnotation.setPerimeter(geometry.getLength());
//            userAnnotation.setPerimeter_unit(2);
//            userAnnotation.setWkt_location(req.getLocation());
//
//
//            ImageInstance imageInstance = mongoTemplate.findById(req.getImage(), ImageInstance.class);
//
//            userAnnotation.setProject_id(imageInstance.getProjectId());
//
//            Geometry imageBounds = reader.read("POLYGON((0 0,0 " + imageInstance.getHeight()
//                    + "," + imageInstance.getWidth()
//                    + " " + imageInstance.getHeight()
//                    + "," + imageInstance.getWidth() + " 0,0 0))");
//
//            geometry = geometry.intersection(imageBounds);
//
//            if (!(geometry.getGeometryType().equals("LineString"))) {
//                Map<String, Object> boundaries = GeoUtil.getGeometryBoundaries(geometry);
//                if (boundaries == null || boundaries.isEmpty() || boundaries.size() == 0
//                        || (Long) boundaries.get("width") == 0 || (Long) boundaries.get("height") == 0) {
//                    throw new HTTPDataException(505, "Annotation dimension not valid");
//                }
//            }
//
//            Map<String, Object> simplifyMap = simplifyPolygon(geometry);
//            geometry = (Geometry) simplifyMap.get("geometry");
//            userAnnotation.setSimplify_location(geometry.toText());
//            userAnnotation.setGeometryCompression((Double) simplifyMap.get("rate"));
//
//
//            //转成地理空间经纬度
//            if (geometry.getGeometryType().equals("LineString")) {
//                for (int i = 0; i < geometry.getCoordinates().length; i++) {
//                    geometry.getCoordinates()[i] = JWDUtil.XYTOJWD(geometry.getCoordinates()[i], imageInstance.getHeight(), imageInstance.getWidth());
//                }
//            } else if (geometry.getGeometryType().equals("Polygon")) {
//                Coordinate[] coordinates = geometry.getCoordinates();
//                GeometryFactory factory = new GeometryFactory();
//                for (int i = 0; i < coordinates.length; i++) {
//                    coordinates[i] = JWDUtil.XYTOJWD(geometry.getCoordinates()[i], imageInstance.getHeight(), imageInstance.getWidth());
//                }
//                LinearRing line = new LinearRing(factory.getCoordinateSequenceFactory().create(coordinates), factory);
//                geometry = new Polygon(line, null, factory);
//            } else if (geometry.getGeometryType().equals(Geometry.TYPENAME_POINT)) {
//                Coordinate point = JWDUtil.XYTOJWD(geometry.getCoordinate(), imageInstance.getHeight(), imageInstance.getWidth());
//                geometry.getCoordinate().setX(point.getX());
//                geometry.getCoordinate().setY(point.getY());
//            }
//            DBObject dbObject = builder.toObject(geometry);
//            userAnnotation.setLocation(dbObject);
//            mongoTemplate.save(userAnnotation);
//
//            //保存图片数据标注数
////            imageInstance.setNumberOfAnnotations(imageInstance.getNumberOfAnnotations() != null ? imageInstance.getNumberOfAnnotations() + 1 : 1);
////            mongoTemplate.save(imageInstance);
//
//            getUserAnnotationJson(userAnnotation, json);
//
//            return json;
//        } catch (Exception e) {
//            e.printStackTrace();
//        }
//        return json;
    }

    private UserAnnotation save(UserAnnotation userAnnotation) throws ParseException {
        WKTReader reader = new WKTReader();
        MongoGeometryBuilder builder = new MongoGeometryBuilder();
        Geometry geometry = reader.read(userAnnotation.getWkt_location());
        userAnnotation.setArea(geometry.getArea());
        userAnnotation.setArea_unit(3);
        userAnnotation.setPerimeter(geometry.getLength());
        userAnnotation.setPerimeter_unit(2);
        ImageInstance imageInstance = mongoTemplate.findById(userAnnotation.getImage_id(), ImageInstance.class);
        Geometry imageBounds = reader.read("POLYGON((0 0,0 " + imageInstance.getHeight()
                + "," + imageInstance.getWidth()
                + " " + imageInstance.getHeight()
                + "," + imageInstance.getWidth() + " 0,0 0))");

        geometry = geometry.intersection(imageBounds);

        if (!(geometry.getGeometryType().equals("LineString"))) {
            Map<String, Object> boundaries = GeoUtil.getGeometryBoundaries(geometry);
            if (boundaries == null || boundaries.isEmpty() || boundaries.size() == 0
                    || (Long) boundaries.get("width") == 0 || (Long) boundaries.get("height") == 0) {
                throw new HTTPDataException(505, "Annotation dimension not valid");
            }
        }

        Map<String, Object> simplifyMap = simplifyPolygon(geometry);
        geometry = (Geometry) simplifyMap.get("geometry");
        userAnnotation.setSimplify_location(geometry.toText());
        userAnnotation.setGeometryCompression((Double) simplifyMap.get("rate"));

        //转成地理空间经纬度
        if (geometry.getGeometryType().equals("LineString")) {
            for (int i = 0; i < geometry.getCoordinates().length; i++) {
                geometry.getCoordinates()[i] = JWDUtil.XYTOJWD(geometry.getCoordinates()[i], imageInstance.getHeight(), imageInstance.getWidth());
            }
        } else if (geometry.getGeometryType().equals("Polygon")) {
            Coordinate[] coordinates = geometry.getCoordinates();
            GeometryFactory factory = new GeometryFactory();
            for (int i = 0; i < coordinates.length; i++) {
                coordinates[i] = JWDUtil.XYTOJWD(geometry.getCoordinates()[i], imageInstance.getHeight(), imageInstance.getWidth());
            }
            LinearRing line = new LinearRing(factory.getCoordinateSequenceFactory().create(coordinates), factory);
            geometry = new Polygon(line, null, factory);
        } else if (geometry.getGeometryType().equals("MultiPolygon")) {
            List<Polygon> polygons = new ArrayList<>();
            GeometryFactory factory = new GeometryFactory();
            for (int j = 0; j < geometry.getNumGeometries(); j++) {
                Coordinate[] coordinates = geometry.getGeometryN(j).getCoordinates();
                for (int i = 0; i < coordinates.length; i++) {
                    coordinates[i] = JWDUtil.XYTOJWD(coordinates[i], imageInstance.getHeight(), imageInstance.getWidth());
                }
                LinearRing line = new LinearRing(factory.getCoordinateSequenceFactory().create(coordinates), factory);
                polygons.add(new Polygon(line, null, factory));
            }
            geometry = new MultiPolygon(polygons.toArray(new Polygon[polygons.size()]), factory);
        } else if (geometry.getGeometryType().equals(Geometry.TYPENAME_POINT)) {
            Coordinate point = JWDUtil.XYTOJWD(geometry.getCoordinate(), imageInstance.getHeight(), imageInstance.getWidth());
            geometry.getCoordinate().setX(point.getX());
            geometry.getCoordinate().setY(point.getY());
        }
        DBObject dbObject = builder.toObject(geometry);
        userAnnotation.setLocation(dbObject);
        mongoTemplate.save(userAnnotation);
        return userAnnotation;
    }

    public String addUserAnnotationLog(UserAnnotation userAnnotation, int opType, String undo_wkt_location) {
        mongoTemplate.updateMulti(Query.query(Criteria.where("delFlag").is(0)), Update.update("valid", false), UserAnnotationLog.class);
        UserAnnotationLog userAnnotationLog = new UserAnnotationLog();
        userAnnotationLog.setAnnotation_id(userAnnotation.getId());
        userAnnotationLog.setUser_id(userAnnotation.getUser_id());
        userAnnotationLog.setOpType(opType);
        userAnnotationLog.setValid(true);
        userAnnotationLog.setWkt_location(userAnnotation.getWkt_location());
        userAnnotationLog.setUndo_wkt_location(undo_wkt_location);
        mongoTemplate.save(userAnnotationLog);
        return userAnnotationLog.getId();
    }

    private JSONObject getAnnotationJson(UserAnnotation userAnnotation, String logId) {
        AnnotationDetailResp resp = new AnnotationDetailResp(userAnnotation);
        JSONObject annotation = JSONObject.parseObject(JSONObject.toJSONString(resp));
        annotation.put("class", AnnotationDetailResp.class.getName());
        JSONObject json = new JSONObject();
        json.put("annotation", annotation);
        json.put("printMessage", true);
        if (logId != null) {
            json.put("command", logId);
        }
        json.put("message", "Just an Admin added an annotation in test_018.tif on layer Just an Admin");
        json.put("callback", JSONObject.parse("{\n" +
                "        \"userannotationID\":\"" + userAnnotation.getId() + "\",\n" +
                "        \"imageID\":\"" + userAnnotation.getImage_id() + "\",\n" +
                "        \"method\":\"" + Thread.currentThread().getStackTrace()[1].getClassName() + "." + Thread.currentThread().getStackTrace()[1].getMethodName() + "\",\n" +
                "        \"annotationID\":\"" + userAnnotation.getId() + "\"\n" +
                "    }"));
        return json;
    }

    public JSONObject action(String command, int type) throws ParseException {
        UserAnnotationLog userAnnotationLog = mongoTemplate.findById(command, UserAnnotationLog.class);
        UserAnnotation userAnnotation = mongoTemplate.findById(userAnnotationLog.getAnnotation_id(), UserAnnotation.class);
        if (type == 1) {
            userAnnotation.setWkt_location(userAnnotationLog.getUndo_wkt_location());
            if (userAnnotationLog.getOpType() == 2) { //新增数据撤回之后重做调用undo接口
                userAnnotation.setDelFlag(0);
            }
        } else {
            userAnnotation.setWkt_location(userAnnotationLog.getWkt_location());
//            userAnnotation.setDelFlag(0);
        }
        userAnnotation = save(userAnnotation);

        List<JSONObject> collects = new ArrayList<>();
        collects.add(getAnnotationJson(userAnnotation, null));

        mongoTemplate.updateMulti(Query.query(Criteria.where("_id").ne(userAnnotationLog.getId())
                .and("user_id").is(SecurityUtils.getCookieUser().getId())
                .and("annotation_id").is(userAnnotationLog.getAnnotation_id())), Update.update("valid", false), UserAnnotationLog.class);

        userAnnotationLog.setValid(true);
        mongoTemplate.save(userAnnotationLog);

        return getJsonObject(collects, 0, 0);

    }

}
