package com.wsi.annotation.api.manager.controller.basic;

import com.wsi.annotation.api.common.core.mvc.JqGridPage;
import com.wsi.annotation.api.database.domain.basic.CaseInfo;
import com.wsi.annotation.api.manager.domain.request.base.CaseInfoReq;
import com.wsi.annotation.api.manager.domain.request.base.DataSetReq;
import com.wsi.annotation.api.manager.domain.response.base.DataSetListResp;
import com.wsi.annotation.api.manager.domain.response.system.CaseListResp;
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

@RestController
@Api(tags = "caseinfo")
@RequestMapping("/caseinfo")
public class CaseInfoController {

    @Autowired
    private CaseInfoService caseInfoService;

    @PostMapping(value = "/caseList")
    @ApiOperation(value = "获取案例列表", notes = "获取案例列表", nickname = "caseList")
    public List<CaseInfo> caseList(@RequestBody CaseInfoReq caseInfo) {
        List<CaseInfo> caseList = caseInfoService.list(caseInfo);
        return caseList;
    }

    @PostMapping(value = "/casePage", produces = {"application/json"})
    @ApiOperation(value = "案例分页", notes = "案例分页", nickname = "caseInfoPage")
    public JqGridPage<CaseListResp> casePage(@RequestBody CaseInfoReq caseInfo) {
        return caseInfoService.casePage(caseInfo);
    }


}
