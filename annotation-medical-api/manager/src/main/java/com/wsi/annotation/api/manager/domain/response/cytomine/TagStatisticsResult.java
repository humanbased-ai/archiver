package com.wsi.annotation.api.manager.domain.response.cytomine;

import lombok.Data;

@Data
public class TagStatisticsResult {
    private String id;
    private String tagId;
    private String tagName;
    private Integer count;
}
