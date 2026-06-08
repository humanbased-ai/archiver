package com.wsi.annotation.api.common.enums;

import java.util.*;

public enum UnitEnum {
    PIXEL(0, "pixels"),
    PIXELS2(1, "pixels'"),
    MM(2, "mm"),
    MICRON2(3, "micron²"),
    UM(4, "µm"),
    UM2(5, "µm²");

    private int code;
    private String name;

    private UnitEnum(int code, String name) {
        this.code = code;
        this.name = name;
    }

    public int getCode() {
        return code;
    }

    public void setCode(int code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    /**
     * 根据code取枚举类型
     *
     * @param code
     * @return
     */
    public static UnitEnum findByCode(int code) {
        for (UnitEnum alarmType : values()) {
            if (alarmType.getCode() == code) {
                return alarmType;
            }
        }
        return null;
    }

    /**
     * 获得所有枚举类型到list
     *
     * @return
     */
    public static List<UnitEnum> getAllToList() {
        List<UnitEnum> list = new ArrayList<>();
        UnitEnum[] values = values();
        Collections.addAll(list, values);
        return list;
    }

    /**
     * 获得所有枚举类型到map
     *
     * @return
     */
    public static Map<Integer, UnitEnum> getAllToMap() {
        Map<Integer, UnitEnum> map = new HashMap<>();
        for (UnitEnum alarmType : values()) {
            map.put(alarmType.getCode(), alarmType);
        }
        return map;
    }

}
