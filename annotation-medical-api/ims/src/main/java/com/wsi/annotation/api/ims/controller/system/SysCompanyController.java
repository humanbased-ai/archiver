package com.wsi.annotation.api.ims.controller.system;


import com.wsi.annotation.api.common.core.controller.BaseController;
import com.wsi.annotation.api.common.core.mvc.JqGridPage;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.database.domain.system.SysCompany;
import com.wsi.annotation.api.ims.domain.request.system.Company;
import com.wsi.annotation.api.ims.domain.request.system.CompanyListReq;
import com.wsi.annotation.api.ims.domain.response.system.CompanyListResp;
import com.wsi.annotation.api.ims.service.system.CompanyService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 公司信息
 *
 * @author early
 */
@RestController
@RequestMapping("/system/company")
@Api(tags = "company")
public class SysCompanyController extends BaseController {

    @Autowired
    private CompanyService companyService;

    @PostMapping(value = "/add", produces = {"application/json"})
    @ApiOperation(value = "添加分公司", notes = "添加分公司", nickname = "addCompany")
    public SysCompany add(@RequestBody Company company) {
        return companyService.add(company);
    }

    @DeleteMapping(value = "/delete", produces = {"application/json"})
    @ApiOperation(value = "删除分公司", notes = "删除分公司", nickname = "deleteCompany")
    public String delete(@RequestParam("id") String id) {
        long Result = companyService.delete(id);
        if (Result > 0) {
            return "删除成功!";
        }
        throw new HTTPDataException(400, "删除失败!");
    }

    @PutMapping(value = "/update", produces = {"application/json"})
    @ApiOperation(value = "编辑分公司", notes = "编辑分公司", nickname = "updateCompany")
    public String update(@RequestBody Company company) {
        long Result = companyService.update(company);
        if (Result > 0) {
            return "编辑成功!";
        }
        throw new HTTPDataException(400, "编辑失败!");
    }

    @PutMapping(value = "/change", produces = {"application/json"})
    @ApiOperation(value = "改变分公司状态", notes = "改变分公司状态", nickname = "changeCompanyStatus")
    public String changeStatus(@RequestParam("id") String id) {
        long Result = companyService.change(id);
        if (Result > 0) {
            return "更改成功!";
        }
        throw new HTTPDataException(400, "更改失败!");
    }

    @GetMapping(value = "/getCompanyById", produces = {"application/json"})
    @ApiOperation(value = "根据ID获取公司信息", notes = "根据ID获取公司信息", nickname = "getCompanyById")
    public SysCompany getCompanyById(@RequestParam String id) {
        return companyService.getDetail(id);
    }

    @PostMapping(value = "/companyList", produces = {"application/json"})
    @ApiOperation(value = "获取分公司列表", notes = "获取分公司列表", nickname = "companyList")
    public JqGridPage<CompanyListResp> companyList(@RequestBody CompanyListReq companyListReq) {
        JqGridPage<CompanyListResp> companies = companyService.selectCompanyList(companyListReq);
        return companies;
    }

}
