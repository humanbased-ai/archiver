package com.wsi.annotation.api.manager.domain.response.cytomine;

import lombok.Data;

@Data
public class ConsultationResp {
    private String id;
    private String user;
    private String image;
    private String imageName;
    private String imageThumb;
    private String mode;
    private String project;
    private String projectConnection;
}
