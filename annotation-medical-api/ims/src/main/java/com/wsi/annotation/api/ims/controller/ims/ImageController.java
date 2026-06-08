package com.wsi.annotation.api.ims.controller.ims;

import com.alibaba.fastjson.JSONObject;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import com.wsi.annotation.api.ims.service.ims.IImageService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import javax.websocket.DeploymentException;
import java.io.IOException;

@RestController
@RequestMapping("/image")
@Api(tags = "image")
@Slf4j
public class ImageController {

    @Autowired
    private IImageService imageService;


    @GetMapping(value = "/tile")
    @ApiOperation(value = "获取切片图片", notes = "获取切片图片", nickname = "tile")
    public void tile(@RequestParam(name = "zoomify") String zoomify,
                     @RequestParam(name = "tileGroup") String tileGroup,
                     @RequestParam(name = "z") int z,
                     @RequestParam(name = "x") int x,
                     @RequestParam(name = "y") int y,
                     @RequestParam(name = "mimeType") String mimeType) {
        imageService.tile(zoomify, tileGroup, z, x, y,mimeType);
    }

    @GetMapping(value = "/crop", produces = {"application/json"})
    @ApiOperation(value = "crop", notes = "crop", nickname = "tile")
    public void crop() {
        try {
            imageService.crop();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @GetMapping(value = "/nested", produces = {"application/json"})
    @ApiOperation(value = "nested", notes = "nested", nickname = "nested")
    public void nested() {
        try {
            imageService.nested();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @GetMapping(value = "/thumb", produces = {"application/json"})
    @ApiOperation(value = "thumb", notes = "thumb", nickname = "thumb")
    public void thumb() {
        try {
            imageService.thumb();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @GetMapping(value = "/associated", produces = {"application/json"})
    @ApiOperation(value = "associated", notes = "associated", nickname = "associated")
    public void associated() {
        try {
            imageService.associated();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @PostMapping(value = "/uploadFile")
    @ApiOperation(value = "上传文件", notes = "上传文件", nickname = "uploadFile")
    public JSONObject uploadFile(@RequestParam(required = false)String imageId,MultipartFile file, String idStorage, String idProject, String name,
                                 String md5,
                                 Long size,
                                 Integer chunks,
                                 Integer chunk) {


        JSONObject jsonObject = new JSONObject();
        try {
            ImageInstance instance = new ImageInstance();

            instance = imageService.upload(file, idStorage, idProject);

            jsonObject.put("code", 200);
            if (instance != null) {
                jsonObject.put("data", JSONObject.toJSONString(instance));
            } else {
                jsonObject.put("data", false);
            }
            jsonObject.put("message", "SUCCESS");
        } catch (DeploymentException | IOException e) {
            log.info("上传文件异常", e);
            jsonObject.put("code", 500);
            jsonObject.put("message", "FAILED");
            e.printStackTrace();
            return jsonObject;
        }
        return jsonObject;
    }

    @PostMapping(value = "/uploadFileFromInfo")
    @ApiOperation(value = "上传文件", notes = "上传文件", nickname = "uploadFile")
    public JSONObject uploadFile(@RequestParam(required = false)String imageId, MultipartFile file, String idStorage) {


        JSONObject jsonObject = new JSONObject();
        try {
            ImageInstance data = imageService.upload(imageId,file, idStorage);
            jsonObject.put("code", 200);
            jsonObject.put("data",data);
//            if (instance != null) {
//                jsonObject.put("data", JSONObject.toJSONString(instance));
//            } else {
//                jsonObject.put("data", false);
//            }
            jsonObject.put("message", "SUCCESS");
        } catch (DeploymentException | IOException e) {
            log.info("上传文件异常", e);
            jsonObject.put("code", 500);
            jsonObject.put("message", "FAILED");
            e.printStackTrace();
            return jsonObject;
        }
        return jsonObject;
    }

    @PostMapping(value = "/init")
    @ApiOperation(value = "初始化", notes = "初始化", nickname = "init")
    public void init(String idStorage, String idProject) {
        try {
            imageService.init(idStorage, idProject);
        } catch (DeploymentException | IOException e) {
            log.info("上传文件异常", e);

        }
    }

    @PostMapping(value = "/initByFileName")
    @ApiOperation(value = "初始化", notes = "初始化", nickname = "initByFileName")
    public void initByFileName(String idStorage, String idProject,String fileName) {
        try {
            imageService.initByFileName(idStorage, idProject,fileName);
        } catch (DeploymentException | IOException e) {
            log.info("上传文件异常", e);

        }
    }
}
