package com.wsi.annotation.api.manager.controller.cytomine;

import com.wsi.annotation.api.manager.domain.response.cytomine.ImageServerResq;
import com.wsi.annotation.api.manager.service.cytomine.IAbstractImageService;
import com.wsi.annotation.api.manager.service.cytomine.IImageInstanceService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.imageio.ImageIO;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.OutputStream;

@RestController
@RequestMapping("/imagecore/api/abstractimage")
@Api(tags = "abstractImage")
public class AbstractImageController {

    @Autowired
    IAbstractImageService abstractImageService;

    @Autowired
    private IImageInstanceService iImageService;

    @GetMapping(value = "/thumb.png")
    @ApiOperation(value = "获取基础图片thumb", notes = "获取基础图片thumb", nickname = "thumb")
    public void thumb(String abstractImageId, Integer maxSize) {
        abstractImageService.thumb(abstractImageId, maxSize);
    }

    @GetMapping(value = "/associated.png")
    @ApiOperation(value = "获取基础图片associated", notes = "获取基础图片associated", nickname = "associated")
    public void associated(String abstractImageId, Integer maxSize, String label) {
        abstractImageService.associated(abstractImageId, maxSize, label);
    }

    @GetMapping(value = "/{abstractImageId}/imageservers.json")
    @ApiOperation(value = "获取基础图片服务地址", notes = "获取基础图片服务地址", nickname = "imageservers")
    public ImageServerResq imageServers(@PathVariable String abstractImageId) {
        return abstractImageService.imageServers(abstractImageId);
    }

    @GetMapping(value = "/crop.png")
    @ApiOperation(value = "crop", notes = "corp", nickname = "crop")
    public void corp(HttpServletRequest request) {
        try {
            abstractImageService.crop(request);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }


    @GetMapping(value = "/thumb/{imageId}", produces = {"application/json"})
    @ApiOperation(value = "获取静态图片地址", notes = "获取静态图片地址", nickname = "thumbImage")
    public void thumb(HttpServletResponse response, @RequestParam Integer maxSize, @PathVariable("imageId") String imageId) throws IOException {
        response.setHeader("max-age", "86400");
        responseBufferedImage(iImageService.thumb(imageId, maxSize), response);
    }

    protected void responseBufferedImage(BufferedImage bufferedImage, HttpServletResponse response) throws IOException {
        OutputStream os = null;
        os = response.getOutputStream();
        response.setContentType("image/png");
        response.setHeader("Connection", "Keep-Alive");
        response.setHeader("Accept-Ranges", "bytes");
        ImageIO.write(bufferedImage, "png", os);
        os.flush();
        os.close();
    }

}
