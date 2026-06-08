package com.wsi.annotation.api.database.dao.system;

import com.wsi.annotation.api.database.domain.system.SysCompany;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SysCompanyDao extends MongoRepository<SysCompany, String> {
    SysCompany getSysCompanyById(String id);
    List<SysCompany> getSysCompaniesByIdIn(List<String> id);
    SysCompany getSysCompanyByCompanyName(String companyName);
}
