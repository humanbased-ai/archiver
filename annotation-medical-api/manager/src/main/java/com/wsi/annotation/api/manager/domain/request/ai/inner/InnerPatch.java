package com.wsi.annotation.api.manager.domain.request.ai.inner;

import lombok.Data;

import java.util.List;

@Data
public class InnerPatch {

    private String patchName;
    private List<Integer> coordinate;

    private List<Double> probability;
}
