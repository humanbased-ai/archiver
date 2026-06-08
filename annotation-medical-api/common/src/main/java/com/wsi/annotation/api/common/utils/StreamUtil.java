package com.wsi.annotation.api.common.utils;


import java.io.InputStream;

public class StreamUtil {

    public static String streamToString(InputStream stream) {
        String str = "";
        try {
            byte[] bytes = new byte[stream.available()];
            while (stream.read(bytes) != -1) {
                str += new String(bytes, "utf-8");
            }
            return str;
        } catch (Exception e) {
            return str;
        }
    }
}
