package com.wsi.annotation.api.ims.service.system;

import com.wsi.annotation.api.common.utils.DictUtils;
import com.wsi.annotation.api.common.utils.StringUtils;
import com.wsi.annotation.api.database.dao.system.SysDictDataDao;
import com.wsi.annotation.api.database.dao.system.SysDictTypeDao;
import com.wsi.annotation.api.database.domain.system.SysDictData;
import com.wsi.annotation.api.database.domain.system.SysDictType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DictTypeService {

    @Autowired
    private SysDictDataDao sysDictDataDao;

    @Autowired
    private SysDictTypeDao sysDictTypeDao;
//    /**
//     * 项目启动时，初始化字典到缓存
//     */
//    @PostConstruct
//    public void init()
//    {
//        List<SysDictType> dictTypeList = sysDictTypeDao.findSysDictTypesByStatus(0);
//        for (SysDictType dictType : dictTypeList)
//        {
//            List<SysDictData> dictDatas = sysDictDataDao.findSysDictDatasByDictTypeAndStatus(dictType.getDictType(),0);
//            DictUtils.setDictCache(dictType.getDictType(), dictDatas);
//        }
//    }

    /**
     * 根据字典类型查询字典数据
     *
     * @param dictType 字典类型
     * @return 字典数据集合信息
     */
    public List<SysDictData> selectDictDataByType(String dictType)
    {
        List<SysDictData> dictDatas = DictUtils.getDictCache(dictType);
        if (StringUtils.isNotEmpty(dictDatas))
        {
            return dictDatas;
        }
        dictDatas = sysDictDataDao.findSysDictDatasByDictTypeAndStatus(dictType,0);
        if (StringUtils.isNotEmpty(dictDatas))
        {
            DictUtils.setDictCache(dictType, dictDatas);
            return dictDatas;
        }
        return null;
    }
}
