package com.wsi.annotation.api.manager.domain.request.ai;

import lombok.Data;

@Data
public class HeatmapLocaltion {
    private String location;
    private Double probability;
}
