package com.wsi.annotation.api.database.domain.baseInner;


import com.alibaba.fastjson.annotation.JSONField;
import com.wsi.annotation.api.database.domain.system.SysCompany;
import com.wsi.annotation.api.database.serializer.ObjectIdSerializer;
import org.bson.types.ObjectId;

public class InnerCompanyInfo {

    public ObjectId getForeignKeyId() {
        return foreignKeyId;
    }

    public void setForeignKeyId(ObjectId foreignKeyId) {
        this.foreignKeyId = foreignKeyId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getCompanyNo() {
        return companyNo;
    }

    public void setCompanyNo(String companyNo) {
        this.companyNo = companyNo;
    }

    @JSONField(serializeUsing = ObjectIdSerializer.class, deserializeUsing = ObjectIdSerializer.class)
    private ObjectId foreignKeyId;

    private String companyName;

    private String companyNo;

    public InnerCompanyInfo(){

    }

    public InnerCompanyInfo(SysCompany company) {
        if(company!=null) {
            this.foreignKeyId = new ObjectId(company.getId());
            this.companyName = company.getCompanyName();
        }
    }
}
