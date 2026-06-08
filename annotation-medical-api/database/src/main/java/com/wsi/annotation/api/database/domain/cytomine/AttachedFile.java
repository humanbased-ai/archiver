package com.wsi.annotation.api.database.domain.cytomine;

import com.wsi.annotation.api.database.domain.BaseEntity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(value = "attached_file")
public class AttachedFile extends BaseEntity {
    private String data;
    private Long domainIdent;
    private String filename;
}
