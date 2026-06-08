package com.wsi.annotation.api.manager.domain.request.cytomine;

import com.wsi.annotation.api.common.core.domain.BaseEntity;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("LastUserPositionHistory")
public class LastUserPositionHistory extends BaseEntity {
    @Id
    private String id;
    private boolean broadcast;
    private String image;
    private String imageName;
    private String location;
    private String project;
    private String rotation;
    private String user;
    private int zoom;
}
