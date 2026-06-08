package com.wsi.annotation.api.database.domain.cytomine;

import com.wsi.annotation.api.database.annotation.AutoIncKey;
import com.wsi.annotation.api.database.domain.BaseEntity;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("uploaded_file")
public class UploadedFile extends BaseEntity {
    @Id
    private String id;
    @AutoIncKey
    private Long id_num;
    private String content_type;
    private String ext;
    private String filename;
    private String image_id;
    private String original_filename;
    private String path;
    private double size;
    private int status;
    private String user_id;
    private String storage_id;
    private String project_id;
}
