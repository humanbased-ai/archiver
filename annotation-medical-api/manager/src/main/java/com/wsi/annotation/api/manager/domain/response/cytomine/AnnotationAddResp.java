package com.wsi.annotation.api.manager.domain.response.cytomine;

import com.alibaba.fastjson.JSONObject;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AnnotationAddResp {
    private AnnotationDetailResp annotation;
    private String printMessage;
    private String message;
    private String command;
    private JSONObject callback;
}
