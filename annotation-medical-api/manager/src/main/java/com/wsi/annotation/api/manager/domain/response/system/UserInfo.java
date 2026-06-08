package com.wsi.annotation.api.manager.domain.response.system;

import com.wsi.annotation.api.database.domain.basic.BasicUser;
import lombok.Data;

import java.util.Set;

@Data
public class UserInfo {

    private BasicUser user;

    private Set<String> roles;

    Set<String> permissions;

    private String language;
}
