package com.wsi.annotation.api.manager.domain.response.cytomine;

import lombok.Data;

@Data
public class PositionResp {
    private String id;
    private String user;
    private String image;
    private String project;
    private int zoom;
    private double rotation;
    private boolean broadcast;
    private String location;
    private double x;
    private double y;
}
