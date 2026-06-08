package com.wsi.annotation.api.manager.vo;

import lombok.Data;

@Data
public class ZoomLevelVo {
    private Integer min;
    private Integer max;
    private Integer middle ;
    private double overviewWidth;
    private double overviewHeight ;
    private double width;
    private double height;
}
