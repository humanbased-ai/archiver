package com.wsi.annotation.api.database.daoextend.form;

import com.wsi.annotation.api.database.domain.form.SysForm;
import org.springframework.stereotype.Component;

@Component
public class SysFormExtend {
    public SysForm selectSysDeployFormByDeployId(String id){
        return  new SysForm();
    }
}
