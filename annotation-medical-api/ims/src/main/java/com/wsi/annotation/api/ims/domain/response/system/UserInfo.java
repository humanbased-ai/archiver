package com.wsi.annotation.api.ims.domain.response.system;

import com.wsi.annotation.api.database.domain.basic.BasicUser;
import lombok.Data;

import java.util.Set;

@Data
public class UserInfo {

    private BasicUser user;

    private Set<String> roles;

    Set<String> permissions;
}
