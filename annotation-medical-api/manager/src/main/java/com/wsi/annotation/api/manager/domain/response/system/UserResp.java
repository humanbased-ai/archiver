package com.wsi.annotation.api.manager.domain.response.system;

import lombok.Data;

@Data
public class UserResp {
    private Boolean admin;
    private Boolean adminByNow;
    private Boolean algo;

    private String color;
    private String created;
    private String deleted;
    private String email;
    private Boolean enabled;
    private String firstname;
    private boolean guest;
    private Boolean guestByNow;
    private String id;
    private Boolean isSwitched;
    private String language;
    private String lastname;
    private String origin;
    private Boolean passwordExpired;
    private String privateKey;
    private String publicKey;
    private String updated;
    private Boolean user;
    private Boolean userByNow;
    private String username;
}
