package com.wsi.annotation.api.database.domain.cytomine;

import com.wsi.annotation.api.database.annotation.AutoIncKey;
import com.wsi.annotation.api.database.domain.BaseEntity;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;

@Data
@Document("sec_user")
public class SecUser extends BaseEntity {
    @Id
    private String id;

    @AutoIncKey
    private String id_num;
    private String account_expired;
    private String account_locked;
    private String enabled;
    private String origin;
    private String password;
    private String password_expired;
    private String private_key;
    private String public_key;
    private String updated;
    private String username;
    private String color;
    private String user_id;
    private String email;
    private String firstname;
    private String language;
    private String lastname;
    private String job_id;
    private String rate;
    private Double score;
    private BigDecimal ownership;
    private Integer selected = 0;
}
