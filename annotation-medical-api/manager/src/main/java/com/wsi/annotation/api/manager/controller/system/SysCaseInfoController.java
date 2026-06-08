package com.wsi.annotation.api.manager.controller.system;


import com.wsi.annotation.api.common.core.controller.BaseController;
import com.wsi.annotation.api.common.core.mvc.JqGridPage;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.database.domain.basic.CaseInfo;
import com.wsi.annotation.api.database.domain.basic.DataSet;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import com.wsi.annotation.api.manager.domain.request.base.CaseInfoReq;
import com.wsi.annotation.api.manager.domain.request.base.DataSetReq;
import com.wsi.annotation.api.manager.domain.response.base.DataSetListResp;
import com.wsi.annotation.api.manager.domain.response.system.CaseListResp;
import com.wsi.annotation.api.manager.domain.response.system.CompanyListResp;
import com.wsi.annotation.api.manager.service.system.CaseInfoService;
import com.wsi.annotation.api.manager.service.system.DataSetService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 数据集
 *
 * @author wxy
 */
@RestController
@RequestMapping("/system/caseInfo")
@Api(tags = "caseInfo")
public class SysCaseInfoController extends BaseController {

    @Autowired
    private CaseInfoService caseInfoService;

    @PostMapping(value = "/casePage", produces = {"application/json"})
    @ApiOperation(value = "案例分页", notes = "案例分页", nickname = "caseInfoPage")
    public JqGridPage<CaseListResp> casePage(@RequestBody CaseInfoReq caseInfo) {
        return caseInfoService.casePage(caseInfo);
    }

    @PostMapping(value = "/list", produces = {"application/json"})
    @ApiOperation(value = "案例列表", notes = "案例列表", nickname = "caseInfoList")
    public List<CaseInfo> list(@RequestBody CaseInfoReq caseInfo) {
        return caseInfoService.list(caseInfo);
    }

    @PostMapping(value = "/add", produces = {"application/json"})
    @ApiOperation(value = "添加案例", notes = "添加案例", nickname = "addCaseInfo")
    public CaseInfo add(@RequestBody CaseInfo caseInfo) {
        return caseInfoService.add(caseInfo);
    }

    @PostMapping(value = "/getCaseInfoById", produces = {"application/json"})
    @ApiOperation(value = "案例详情", notes = "案例详情", nickname = "getCaseInfoById")
    public CaseInfo getDetail(@RequestBody CaseInfo caseInfo) {
        return caseInfoService.getDetail(caseInfo);
    }

    @PostMapping(value = "/update", produces = {"application/json"})
    @ApiOperation(value = "编辑案例", notes = "编辑案例", nickname = "updateCaseInfo")
    public String update(@RequestBody CaseInfo caseInfo) {
        long Result = caseInfoService.update(caseInfo);
        return "编辑成功!";
    }

    @PostMapping(value = "/delete", produces = {"application/json"})
    @ApiOperation(value = "删除案例", notes = "删除案例", nickname = "deleteCaseInfo")
    public String delete(@RequestBody CaseInfo caseInfo) {
        long Result = caseInfoService.delete(caseInfo);
        if (Result > 0) {
            return "删除成功!";
        }
        throw new HTTPDataException(400, "删除失败!");
    }

    @PostMapping(value = "/deleteImageInstance", produces = {"application/json"})
    @ApiOperation(value = "删除案例图片", notes = "删除案例图片", nickname = "deleteImageInstance")
    public String deleteImageInstance(@RequestBody ImageInstance imageInstance) {
        long Result = caseInfoService.deleteImageInstance(imageInstance);
        if (Result > 0) {
            return "删除成功!";
        }
        throw new HTTPDataException(400, "删除失败!");
    }

    @PostMapping(value = "/change", produces = {"application/json"})
    @ApiOperation(value = "改变案例状态", notes = "改变案例状态", nickname = "changeCaseInfoStatus")
    public String changeStatus(@RequestBody CaseInfo caseInfo) {
        long Result = caseInfoService.change(caseInfo);
        if (Result > 0) {
            return "更改成功!";
        }
        throw new HTTPDataException(400, "更改失败!");
    }

    @PostMapping(value = "/resetCase", produces = {"application/json"})
    @ApiOperation(value = "重置案例", notes = "重置案例", nickname = "resetCase")
    public String resetCase(@RequestBody CaseInfo caseInfo) {
        caseInfoService.resetCase(caseInfo.getId());
        return "重置成功!";
    }


}
