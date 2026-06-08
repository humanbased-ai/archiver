package com.wsi.annotation.api.manager.controller.basic;

import com.mongodb.QueryBuilder;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.database.domain.basic.DataSet;
import com.wsi.annotation.api.database.domain.basic.Subspecialty;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import com.wsi.annotation.api.database.domain.system.SysOrgan;
import com.wsi.annotation.api.manager.domain.response.base.DataSetListResp;
import com.wsi.annotation.api.manager.domain.response.system.OrganListResp;
import com.wsi.annotation.api.manager.service.system.DataSetService;
import com.wsi.annotation.api.manager.service.system.OrganService;
import com.wsi.annotation.api.manager.service.system.SubspecialtyService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.apache.poi.hssf.usermodel.HSSFCell;
import org.apache.poi.hssf.usermodel.HSSFSheet;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.CellType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.web.bind.annotation.*;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.List;

@RestController
@Api(tags = "index")
@RequestMapping("/index")
public class IndexController {

    @Autowired
    private OrganService organService;

    @Autowired
    private DataSetService dataSetService;

    @Autowired
    private SubspecialtyService subspecialtyService;

    @PostMapping(value = "/subspecialtyList")
    @ApiOperation(value = "获取亚专科列表", notes = "获取亚专科列表", nickname = "subspecialtyList")
    public List<Subspecialty> subspecialtyList() {
        List<Subspecialty> subspecialtyList = subspecialtyService.list();
        return subspecialtyList;
    }



}
