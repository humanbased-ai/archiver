package com.wsi.annotation.api.common.utils;

import com.alibaba.fastjson.JSONObject;
import org.locationtech.jts.geom.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public class GeoUtil {
    public static Polygon boxToPolygon(String[] boxs, double height, double width) {
        GeometryFactory factory = new GeometryFactory();
        Coordinate[] points = new Coordinate[5];
        points[0] = JWDUtil.XYTOJWD(new Coordinate(Double.parseDouble(boxs[0]), Double.parseDouble(boxs[1])), height, width);
        points[1] = JWDUtil.XYTOJWD(new Coordinate(Double.parseDouble(boxs[0]), Double.parseDouble(boxs[3])), height, width);
        points[2] = JWDUtil.XYTOJWD(new Coordinate(Double.parseDouble(boxs[2]), Double.parseDouble(boxs[3])), height, width);
        points[3] = JWDUtil.XYTOJWD(new Coordinate(Double.parseDouble(boxs[2]), Double.parseDouble(boxs[1])), height, width);
        points[4] = JWDUtil.XYTOJWD(new Coordinate(Double.parseDouble(boxs[0]), Double.parseDouble(boxs[1])), height, width);
        LinearRing line = new LinearRing(factory.getCoordinateSequenceFactory().create(points), factory);
        Polygon polygon = new Polygon(line, null, factory);
        return polygon;
    }

    public static Map<String, Object> getGeometryBoundaries(Geometry geometry) {
        if (geometry.getNumPoints() > 1) {
            Envelope env = geometry.getEnvelopeInternal();
            long maxY = Math.round(env.getMaxY());
            long minX = Math.round(env.getMinX());
            long width = Math.round(env.getWidth());
            long height = Math.round(env.getHeight());

            Collections.singletonMap("key1", "value1");

            return new HashMap<String, Object>() {{
                put("topLeftX", minX);
                put("topLeftY", maxY);
                put("width", width);
                put("height", height);
            }};
        } else if (geometry.getNumPoints() == 1) {
            Envelope env = geometry.getEnvelopeInternal();
            long maxY = Math.round(env.getMaxY() + 50);
            long minX = Math.round(env.getMinX() - 50);
            long width = 100;
            long height = 100;
            return new HashMap<String, Object>() {{
                put("topLeftX", minX);
                put("topLeftY", maxY);
                put("width", width);
                put("height", height);
            }};
        }
        return new HashMap<>();
    }
}
