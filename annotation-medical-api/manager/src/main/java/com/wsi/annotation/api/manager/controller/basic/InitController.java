package com.wsi.annotation.api.manager.controller.basic;

import com.mongodb.QueryBuilder;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.database.domain.cytomine.ImageInstance;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.apache.poi.hssf.usermodel.HSSFCell;
import org.apache.poi.hssf.usermodel.HSSFSheet;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.CellType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.List;

@RestController
@Api(tags = "init")
@RequestMapping("/init")
public class InitController {

    @Autowired
    private MongoTemplate mongoTemplate;

    @GetMapping(value = "/imageInfo")
    @ApiOperation(value = "初始化切片信息",notes = "初始化切片信息", nickname = "初始化切片信息")
    public void imageInfo(){
        try {
            //创建工作簿
            HSSFWorkbook hssfWorkbook = new HSSFWorkbook(new FileInputStream("D://扫描记录//扫描记录表(前列腺-20221013).xls"));
            //获取工作簿下sheet的个数
            int sheetNum = hssfWorkbook.getNumberOfSheets();
            System.out.println("该excel文件中总共有："+sheetNum+"个sheet");
            //遍历工作簿中的所有数据
//            for(int i = 0;i<sheetNum;i++) {
                //读取第i个工作表
                System.out.println("读取第"+(0+1)+"个sheet");
                HSSFSheet sheet = hssfWorkbook.getSheetAt(0);
                //获取最后一行的num，即总行数。此处从0开始
                int maxRow = sheet.getLastRowNum();
                for (int row = 1; row <= maxRow; row++) {
                    //获取最后单元格num，即总单元格数 ***注意：此处从1开始计数***
                    int maxRol = sheet.getRow(row).getLastCellNum();
//                    System.out.println("--------第" + row + "行的数据如下--------");
                    QueryBuilder queryBuilder = new QueryBuilder();
                    HSSFCell pathologyNumberCell = sheet.getRow(row).getCell(2);
                    String pathologyNumber = "";
                    if(ObjectUtils.isNotEmpty(pathologyNumberCell)){
                        pathologyNumberCell.setCellType(CellType.STRING);
                        pathologyNumber = pathologyNumberCell.getStringCellValue();
                    }
//                    System.out.println(pathologyNumber);

                    HSSFCell wsiTypeCell = sheet.getRow(row).getCell(5);
                    String wsiType = "";
                    if(ObjectUtils.isNotEmpty(wsiTypeCell)){
                        wsiTypeCell.setCellType(CellType.STRING);
                        wsiType = wsiTypeCell.getStringCellValue();
                    }

                    String instanceFilename = "";
                    HSSFCell instanceFilenameCell = sheet.getRow(row).getCell(6);
                    if(ObjectUtils.isNotEmpty(instanceFilenameCell)){
                        instanceFilenameCell.setCellType(CellType.STRING);
                        instanceFilename = instanceFilenameCell.getStringCellValue() + ".svs";
                    }

//                    System.out.println(instanceFilename);
                    queryBuilder.and("pathologyNumber").is(pathologyNumber);
                    queryBuilder.and("wsiType").is(wsiType);
                    queryBuilder.and("instanceFilename").is(instanceFilename);
                    List<ImageInstance> imageInstanceList = mongoTemplate.find(new BasicQuery(queryBuilder.get().toString()), ImageInstance.class);
                    if(imageInstanceList.size()>0){
                        ImageInstance imageInstance = imageInstanceList.get(0);
                        String pickingDetails = "";
                        HSSFCell pickingDetailsCell = sheet.getRow(row).getCell(11);
                        if(ObjectUtils.isNotEmpty(pickingDetailsCell)){
                            pickingDetails = pickingDetailsCell.getStringCellValue();
                        }
                        HSSFCell markersCell = sheet.getRow(row).getCell(7);
                        if(ObjectUtils.isNotEmpty(markersCell)){
                            imageInstance.setMarkers(markersCell.getStringCellValue());
                        }
                        imageInstance.setPickingDetails(pickingDetails);
                        imageInstance.setHospital(sheet.getRow(row).getCell(8).getStringCellValue());
                        imageInstance.setCancerName(sheet.getRow(row).getCell(12).getStringCellValue());
                        imageInstance.setOperationMode(sheet.getRow(row).getCell(10).getStringCellValue());
                        mongoTemplate.save(imageInstance);
                    }else {

                    }

                }
//            }

        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
