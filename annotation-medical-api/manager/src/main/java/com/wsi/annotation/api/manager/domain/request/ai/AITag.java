package com.wsi.annotation.api.manager.domain.request.ai;

import com.wsi.annotation.api.common.core.domain.BaseEntity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(value = "ai_tag")
public class AITag extends BaseEntity {

    @Id
    private String id;

    private String model;
    private String name;
    private Integer index;
    private Integer isShow;
    private Integer width;
    private List<String> gradient;
}
