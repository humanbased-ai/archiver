package com.wsi.annotation.api.database.domain.cytomine.Inner;

import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;

import java.io.PipedReader;

@Data
public class InnerTag {
    private String id;
    private String tagId;
    private String tagName;
}
