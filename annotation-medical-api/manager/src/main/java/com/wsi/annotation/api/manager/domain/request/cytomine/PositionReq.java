package com.wsi.annotation.api.manager.domain.request.cytomine;

import lombok.Data;

@Data
public class PositionReq {
    private Long bottomLeftX;
    private Long bottomLeftY;
    private Long bottomRightX;
    private Long bottomRightY;
    private Boolean broadcast;
    private String image;
    private Long rotation;
    private Long topLeftX;
    private Long topLeftY;
    private Long topRightX;
    private Long topRightY;
    private int zoom;
}
