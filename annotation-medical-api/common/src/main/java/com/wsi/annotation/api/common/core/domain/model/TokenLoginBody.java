package com.wsi.annotation.api.common.core.domain.model;

import lombok.Data;

@Data
public class TokenLoginBody {

    private String username;

    private String tokenKey;
}
