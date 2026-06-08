package com.wsi.annotation.api.database.domain.cytomine;

import com.wsi.annotation.api.database.annotation.AutoConvertObjectId;
import com.wsi.annotation.api.database.annotation.AutoIncKey;
import com.wsi.annotation.api.database.annotation.AutoIncKeySerialNumber;
import com.wsi.annotation.api.database.domain.BaseEntity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(value = "abstract_image")
public class AbstractImage extends BaseEntity {
    @Id
    private String id;
    @AutoIncKey
    private Long id_num;
    private Integer version;
    private String filename;
    private Integer height;
    private Integer width;
    private String base_path;
    private String path;
    private String user_id;
    private String original_filename;
    private Double resolution;
    private Double magnification;

    //===========文件后缀=========
    private Integer mime_num;
    @AutoConvertObjectId
    private String mime;
    private String extension;
    private String mimeType;

    @AutoConvertObjectId
    private List<String> imageServerIds;


    public String getAbsolutePath() {
        return this.base_path + this.path;
    }
}
