package com.wsi.annotation.api.database.domain.cytomine;

import com.wsi.annotation.api.database.domain.BaseEntity;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("mime")
public class Mime extends BaseEntity {
    @Id
    private String id;
    private Integer id_num;
    private String extension;
    private String mime_type;
}
