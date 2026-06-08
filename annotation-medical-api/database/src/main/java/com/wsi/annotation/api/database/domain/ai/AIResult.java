package com.wsi.annotation.api.database.domain.ai;

import com.wsi.annotation.api.database.domain.BaseEntity;
import com.wsi.annotation.api.database.domain.ai.inner.InnerPoint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(value = "ai_result")
public class AIResult extends BaseEntity {

    @Id
    private String id;

    private String imageId;

    private String tagId;

    private String tagName;

    private List<InnerPoint> point;

    private Object data;
}
