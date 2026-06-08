package com.wsi.annotation.api.manager.oss.controller;

import com.wsi.annotation.api.manager.oss.domain.FileUploadReq;
import com.wsi.annotation.api.manager.oss.domain.FileUploadResp;
import com.wsi.annotation.api.manager.oss.service.AliOSSService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping(value = "/oss/file")
@Api(tags = "file")
public class FileRest {
    @Autowired
    private AliOSSService ossService;

    @RequestMapping(value = "upload", method = RequestMethod.POST)
    @ApiOperation(value = "上传文件数据流", notes = "上传文件数据流", nickname = "upload")
    public FileUploadResp upload(@RequestBody FileUploadReq fileUploadReq) {

        FileUploadResp fileUploadResp = ossService.upload(fileUploadReq);

        return fileUploadResp;
    }

    @RequestMapping(value = "/uploadFile", method = RequestMethod.POST,consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    @ApiOperation(value = "上传文件", notes = "上传文件", nickname = "uploadFile")
    public FileUploadResp uploadFile(@RequestParam("file") MultipartFile file) {
        FileUploadResp fileUploadResp = ossService.upload(file);
        return fileUploadResp;
    }
}
