package com.wsi.annotation.api.manager.domain.request.ai.inner;

import lombok.Data;

@Data
public class InnerKeyValue {

    public InnerKeyValue(String key,Object value){
        this.key = key;
        this.value = value;
    }

    public InnerKeyValue(){

    }
    private String key;
    private Object value;
}
