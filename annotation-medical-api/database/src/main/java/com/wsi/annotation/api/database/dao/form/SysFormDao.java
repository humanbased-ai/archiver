package com.wsi.annotation.api.database.dao.form;

import com.wsi.annotation.api.database.domain.form.SysForm;
import org.springframework.data.mongodb.repository.MongoRepository;


public interface SysFormDao extends MongoRepository<SysForm,String> {
}