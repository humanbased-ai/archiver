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
@Document(value = "tag")
public class Tag extends BaseEntity {
    @Id
    private String id;
    private String name;
    private String user_id;
    private String position;
    private String color;
    private Integer type;
    private Integer sort;
    private String organId;
}
