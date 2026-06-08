package com.wsi.annotation.api.manager.controller.basic;

import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.database.domain.basic.DataSet;
import com.wsi.annotation.api.database.domain.basic.Subspecialty;
import com.wsi.annotation.api.database.domain.system.SysOrgan;
import com.wsi.annotation.api.manager.domain.response.base.DataSetListResp;
import com.wsi.annotation.api.manager.domain.response.system.OrganListResp;
import com.wsi.annotation.api.manager.service.system.DataSetService;
import com.wsi.annotation.api.manager.service.system.OrganService;
import com.wsi.annotation.api.manager.service.system.SubspecialtyService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@Api(tags = "organ")
@RequestMapping("/organ")
public class OrganController {

    @Autowired
    private OrganService organService;


    @PostMapping(value = "/organList")
    @ApiOperation(value = "获取器官列表", notes = "获取器官列表", nickname = "organList")
    public List<OrganListResp> organList() {
        List<OrganListResp> organList = organService.list();
        return organList;
    }

    @PostMapping(value = "/getOrganById", produces = {"application/json"})
    @ApiOperation(value = "根据ID获取公司信息", notes = "根据ID获取公司信息", nickname = "getOrganById")
    public SysOrgan getOrganById(@RequestBody SysOrgan organ) {
        return organService.getDetail(organ);
    }

}
