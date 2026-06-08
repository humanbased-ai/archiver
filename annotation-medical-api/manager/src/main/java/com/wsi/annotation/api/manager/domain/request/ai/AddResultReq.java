package com.wsi.annotation.api.manager.domain.request.ai;

import com.wsi.annotation.api.manager.domain.request.ai.inner.InnerPatch;
import lombok.Data;

import java.util.List;

@Data
public class AddResultReq {

    private String imageId;

    private String model;

    private List<InnerPatch> patches;
}
