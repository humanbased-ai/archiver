package com.wsi.annotation.api.database.domain.form;

import com.wsi.annotation.api.database.annotation.Excel;
import com.wsi.annotation.api.database.domain.BaseEntity;

/**
 * 流程表单对象 sys_task_form
 * 
 * @author XuanXuan Xuan
 * @date 2021-03-30
 */
public class SysForm extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 表单主键 */
    private Long formId;

    /** 表单名称 */
    @Excel(name = "表单名称")
    private String formName;

    /** 表单内容 */
    @Excel(name = "表单内容")
    private String formContent;


    /**
     * 挂载流程ID
     */
    private String deployId;

    public void setFormId(Long formId) 
    {
        this.formId = formId;
    }

    public Long getFormId() 
    {
        return formId;
    }
    public void setFormName(String formName) 
    {
        this.formName = formName;
    }

    public String getFormName() 
    {
        return formName;
    }
    public void setFormContent(String formContent) 
    {
        this.formContent = formContent;
    }

    public String getFormContent() 
    {
        return formContent;
    }


    public String getDeployId() {
        return deployId;
    }

    public void setDeployId(String deployId) {
        this.deployId = deployId;
    }


}
