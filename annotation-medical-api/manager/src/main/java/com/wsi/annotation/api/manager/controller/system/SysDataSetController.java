package com.wsi.annotation.api.manager.controller.system;


import com.wsi.annotation.api.common.core.controller.BaseController;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.database.domain.basic.DataSet;
import com.wsi.annotation.api.database.domain.system.SysOrgan;
import com.wsi.annotation.api.manager.domain.request.base.DataSetReq;
import com.wsi.annotation.api.manager.domain.response.base.BasicUserResp;
import com.wsi.annotation.api.manager.domain.response.base.DataSetListResp;
import com.wsi.annotation.api.manager.domain.response.system.OrganListResp;
import com.wsi.annotation.api.manager.service.system.DataSetService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 数据集
 *
 * @author wxy
 */
@RestController
@RequestMapping("/system/dataSet")
@Api(tags = "dataSet")
public class SysDataSetController extends BaseController {

    @Autowired
    private DataSetService dataSetService;

    @PostMapping(value = "/add", produces = {"application/json"})
    @ApiOperation(value = "添加数据集", notes = "添加数据集", nickname = "addOrgan")
    public DataSet add(@RequestBody DataSet dataSet) {
        return dataSetService.add(dataSet);
    }

    @PostMapping(value = "/delete", produces = {"application/json"})
    @ApiOperation(value = "删除数据集", notes = "删除数据集", nickname = "deleteOrgan")
    public String delete(@RequestBody DataSet dataSet) {
        long Result = dataSetService.delete(dataSet);
        if (Result > 0) {
            return "删除成功!";
        }
        throw new HTTPDataException(400, "删除失败!");
    }

    @PostMapping(value = "/update", produces = {"application/json"})
    @ApiOperation(value = "编辑数据集", notes = "编辑数据集", nickname = "updateOrgan")
    public String update(@RequestBody DataSet dataSet) {
        long Result = dataSetService.update(dataSet);
        if (Result > 0) {
            return "编辑成功!";
        }
        throw new HTTPDataException(400, "编辑失败!");
    }

    @PostMapping(value = "/change", produces = {"application/json"})
    @ApiOperation(value = "改变数据集状态", notes = "改变数据集状态", nickname = "changeOrganStatus")
    public String changeStatus(@RequestBody DataSet dataSet) {
        long Result = dataSetService.change(dataSet);
        if (Result > 0) {
            return "更改成功!";
        }
        throw new HTTPDataException(400, "更改失败!");
    }

    @PostMapping(value = "/getDataSetById", produces = {"application/json"})
    @ApiOperation(value = "根据ID获取公司信息", notes = "根据ID获取公司信息", nickname = "getDataSetById")
    public DataSet getDataSetById(@RequestBody DataSet dataSet) {
        return dataSetService.getDetail(dataSet);
    }

    @PostMapping(value = "/dataSetList", produces = {"application/json"})
    @ApiOperation(value = "获取数据集列表", notes = "获取数据集列表", nickname = "dataSetList")
    public List<DataSetListResp> dataSetList(@RequestBody(required = false) DataSetReq dataSet) {
        List<DataSetListResp> setList = dataSetService.list(dataSet);
        return setList;
    }

    @PostMapping(value = "/getSelectManagerList")
    @ApiOperation(value = "获取数据集可选所有者", notes = "获取数据集可选所有者", nickname = "getSelectManagerList")
    public List<BasicUserResp> getSelectManagerList() {
        List<BasicUserResp> userList = dataSetService.getSelectManagerList();
        return userList;
    }

}
