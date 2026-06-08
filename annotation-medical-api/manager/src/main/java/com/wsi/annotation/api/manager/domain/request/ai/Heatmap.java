package com.wsi.annotation.api.manager.domain.request.ai;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@Document(value = "heatmap")
public class Heatmap {
    @Id
    private String id;

    private String imageId;

    private String modelName;

    private List<HeatmapObj> heatmaps = new ArrayList<>();

}
