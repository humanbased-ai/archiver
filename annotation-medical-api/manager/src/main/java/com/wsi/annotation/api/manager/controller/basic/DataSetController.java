package com.wsi.annotation.api.manager.controller.basic;

import com.wsi.annotation.api.database.domain.basic.DataSet;
import com.wsi.annotation.api.database.domain.basic.Subspecialty;
import com.wsi.annotation.api.manager.domain.request.base.DataSetReq;
import com.wsi.annotation.api.manager.domain.response.base.BasicUserResp;
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
@Api(tags = "dataset")
@RequestMapping("/dataset")
public class DataSetController {

    @Autowired
    private DataSetService dataSetService;

    @PostMapping(value = "/dataSetList")
    @ApiOperation(value = "获取数据集列表", notes = "获取数据集列表", nickname = "dataSetList")
    public List<DataSetListResp> dataSetList(@RequestBody DataSetReq dataSet) {
        List<DataSetListResp> setList = dataSetService.list(dataSet);
        return setList;
    }

    @PostMapping(value = "/getDataSet")
    @ApiOperation(value = "获取数据集", notes = "获取数据集", nickname = "getDataSet")
    public DataSet getDataSet(@RequestBody DataSet dataSet) {
        DataSet set = dataSetService.getDetail(dataSet);
        return set;
    }






}
