package com.wsi.annotation.api.database.annotation;

import java.lang.annotation.*;

/*
 * 自定义注解，标识主键字段需要自动增长  前3位为字段开头字母大写  后5位为自增数字
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AutoIncKeyString {

    AutoIncKeyString.Access access() default AutoIncKeyString.Access.BAT;

    public static enum Access {
        BAT,
        CAB,
        COM,
        FLO,
        GRO,
        MAI,
        CIR,
        DIR,
        REC,
        OTH,
        PRO,
        XQD,     //需求单
        CGD,     //采购单
        OPE,     //运营商
        ACC,     //户号
        LAN,     //土地业主
        ELE,     //电费业主
        SUP,     //供应商
        KUW,     //库位
        SUB,     //分表
        SUM,     //主表
        BID,     //招标协议框架
        GYS,     //供应商框架协议
        TCO,     //铁塔租赁合同
        DOR,
        CNO,
        MNO,
        CONO,
        DSU,
        COP;     //租赁收款计划

        private Access() {
        }
    }

}
