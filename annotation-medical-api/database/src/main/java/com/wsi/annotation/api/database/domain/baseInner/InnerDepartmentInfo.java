package com.wsi.annotation.api.database.domain.baseInner;


import com.alibaba.fastjson.annotation.JSONField;
import com.wsi.annotation.api.database.domain.system.BasicDept;
import com.wsi.annotation.api.database.serializer.ObjectIdSerializer;
import org.bson.types.ObjectId;

public class InnerDepartmentInfo {

    public ObjectId getForeignKeyId() {
        return foreignKeyId;
    }

    public void setForeignKeyId(ObjectId foreignKeyId) {
        this.foreignKeyId = foreignKeyId;
    }

    public String getDepartmentName() {
        return departmentName;
    }

    public void setDepartmentName(String departmentName) {
        this.departmentName = departmentName;
    }

    @JSONField(serializeUsing = ObjectIdSerializer.class, deserializeUsing = ObjectIdSerializer.class)
    private ObjectId foreignKeyId;

    private String departmentName;

    public InnerDepartmentInfo(){

    }

    public InnerDepartmentInfo(BasicDept dept) {
        if (dept != null) {
            this.foreignKeyId = new ObjectId(dept.getId());
            this.departmentName = dept.getDeptName();
        }
    }

}
