package com.wsi.annotation.api.manager.controller.system;


import com.wsi.annotation.api.common.core.controller.BaseController;
import com.wsi.annotation.api.common.core.mvc.JqGridPage;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.database.domain.cytomine.Tag;
import com.wsi.annotation.api.database.domain.system.SysCompany;
import com.wsi.annotation.api.database.domain.system.SysOrgan;
import com.wsi.annotation.api.manager.domain.request.system.Company;
import com.wsi.annotation.api.manager.domain.request.system.CompanyListReq;
import com.wsi.annotation.api.manager.domain.response.system.CompanyListResp;
import com.wsi.annotation.api.manager.domain.response.system.OrganListResp;
import com.wsi.annotation.api.manager.service.system.CompanyService;
import com.wsi.annotation.api.manager.service.system.OrganService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 器官
 *
 * @author wxy
 */
@RestController
@RequestMapping("/system/organ")
@Api(tags = "organ")
public class SysOrganController extends BaseController {

    @Autowired
    private OrganService organService;

    @PostMapping(value = "/add", produces = {"application/json"})
    @ApiOperation(value = "添加器官", notes = "添加器官", nickname = "addOrgan")
    public SysOrgan add(@RequestBody SysOrgan organ) {
        return organService.add(organ);
    }

    @PostMapping(value = "/delete", produces = {"application/json"})
    @ApiOperation(value = "删除器官", notes = "删除器官", nickname = "deleteOrgan")
    public String delete(@RequestBody SysOrgan organ) {
        long Result = organService.delete(organ);
        if (Result > 0) {
            return "删除成功!";
        }
        throw new HTTPDataException(400, "删除失败!");
    }

    @PostMapping(value = "/update", produces = {"application/json"})
    @ApiOperation(value = "编辑器官", notes = "编辑器官", nickname = "updateOrgan")
    public String update(@RequestBody SysOrgan organ) {
        long Result = organService.update(organ);
        return "编辑成功!";
    }

    @PostMapping(value = "/change", produces = {"application/json"})
    @ApiOperation(value = "改变器官状态", notes = "改变器官状态", nickname = "changeOrganStatus")
    public String changeStatus(@RequestBody SysOrgan organ) {
        long Result = organService.change(organ);
        if (Result > 0) {
            return "更改成功!";
        }
        throw new HTTPDataException(400, "更改失败!");
    }

    @PostMapping(value = "/getOrganById", produces = {"application/json"})
    @ApiOperation(value = "根据ID获取公司信息", notes = "根据ID获取公司信息", nickname = "getOrganById")
    public SysOrgan getOrganById(@RequestBody SysOrgan organ) {
        return organService.getDetail(organ);
    }

    @PostMapping(value = "/organList", produces = {"application/json"})
    @ApiOperation(value = "获取器官列表", notes = "获取器官列表", nickname = "organList")
    public List<OrganListResp> organList() {
        List<OrganListResp> organList = organService.list();
        return organList;
    }

    @PostMapping(value = "/addTag", produces = {"application/json"})
    @ApiOperation(value = "添加标签", notes = "添加标签", nickname = "addTag")
    public Tag addTag(@RequestBody Tag tag){
        return organService.addTag(tag);
    }

    @PostMapping(value = "/deleteTag", produces = {"application/json"})
    @ApiOperation(value = "删除标签", notes = "删除标签", nickname = "deleteTag")
    public String deleteTag(@RequestBody Tag tag){
        Long result = organService.deleteTag(tag);
        if (result > 0) {
            return "删除成功!";
        }
        throw new HTTPDataException(400, "删除失败!");
    }

    @PostMapping(value = "/tagList", produces = {"application/json"})
    @ApiOperation(value = "获取标签列表", notes = "获取标签列表", nickname = "tagList")
    public List<Tag> tagList(@RequestBody Tag tag){
        return organService.tagList(tag);
    }

    @PostMapping(value = "/addAreaTag", produces = {"application/json"})
    @ApiOperation(value = "添加区域标签", notes = "添加区域标签", nickname = "addAreaTag")
    public Tag addAreaTag(@RequestBody Tag tag){
        return organService.addAreaTag(tag);
    }

    @PostMapping(value = "/deleteAreaTag", produces = {"application/json"})
    @ApiOperation(value = "删除区域标签", notes = "删除区域标签", nickname = "deleteAreaTag")
    public String deleteAreaTag(@RequestBody Tag tag){
        Long result = organService.deleteAreaTag(tag);
        if (result > 0) {
            return "删除成功!";
        }
        throw new HTTPDataException(400, "删除失败!");
    }

    @PostMapping(value = "/areaTagList", produces = {"application/json"})
    @ApiOperation(value = "获取区域标签列表", notes = "获取区域标签列表", nickname = "areaTagList")
    public List<Tag> areaTagList(@RequestBody Tag tag){
        return organService.areaTagList(tag);
    }

}
