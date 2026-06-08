package com.wsi.annotation.api.manager.domain.request.system;

import com.wsi.annotation.api.common.core.mvc.BaseListSearch;

public class CompanySearch extends BaseListSearch {

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public String getCompanyNo() {
        return companyNo;
    }

    public void setCompanyNo(String companyNo) {
        this.companyNo = companyNo;
    }

    public Integer getCompanyType() {
        return companyType;
    }

    public void setCompanyType(Integer companyType) {
        this.companyType = companyType;
    }

    public Integer getDistributionLevel() {
        return distributionLevel;
    }

    public void setDistributionLevel(Integer distributionLevel) {
        this.distributionLevel = distributionLevel;
    }

    public String getAncestors() {
        return ancestors;
    }

    public void setAncestors(String ancestors) {
        this.ancestors = ancestors;
    }

    private String companyName;
    private Integer status;
    private String companyNo;
    private Integer companyType;
    private Integer distributionLevel;
    private String ancestors;
}



