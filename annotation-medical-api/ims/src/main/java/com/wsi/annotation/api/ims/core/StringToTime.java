package com.wsi.annotation.api.ims.core;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;

public class StringToTime {
    public static Date getTime(String value) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        Date date = new Date();
        try {
            date = sdf.parse(value + " 08:00:00");
        } catch (ParseException e) {
            e.printStackTrace();
        }

        return date;
    }
}
