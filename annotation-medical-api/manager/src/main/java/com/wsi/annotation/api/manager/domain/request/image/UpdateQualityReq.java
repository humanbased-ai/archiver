package com.wsi.annotation.api.manager.domain.request.image;

import lombok.Data;

@Data
public class UpdateQualityReq {
    private String id;
    private Integer quality;
}
