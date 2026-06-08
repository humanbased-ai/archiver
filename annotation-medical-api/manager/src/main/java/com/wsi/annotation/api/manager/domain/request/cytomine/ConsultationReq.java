package com.wsi.annotation.api.manager.domain.request.cytomine;

import lombok.Data;

import java.io.PipedReader;

@Data
public class ConsultationReq {
    private String image;
    private String mode;
}
