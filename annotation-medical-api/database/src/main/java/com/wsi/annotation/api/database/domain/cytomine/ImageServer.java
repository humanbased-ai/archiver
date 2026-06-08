package com.wsi.annotation.api.database.domain.cytomine;

import com.wsi.annotation.api.database.domain.BaseEntity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(value = "image_server")
public class ImageServer extends BaseEntity {
    @Id
    private String id;
    private Integer id_num;
    private String name;
    private String service;
    private String url;
}
