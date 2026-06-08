package com.wsi.annotation.api.manager.domain.request.ai;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class HeatmapObj {
    private List<HeatmapLocaltion> heatmap = new ArrayList<>();
    private Integer index;
    private String color;
}
