package com.wsi.annotation.api.manager.domain.request.ai;

import lombok.Data;

@Data
public class GetResultReq {

    private String imageId;
    private String tagId;
}
