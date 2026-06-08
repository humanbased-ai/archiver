package com.wsi.annotation.api.manager.oss.utils;

import org.apache.commons.codec.binary.Base64;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.zip.DeflaterOutputStream;

public class StringUtils extends org.apache.commons.lang3.StringUtils {
    // 判断字符串是否为空
    public static boolean isEmpty(String str){
        if (str == null || "".equals(str) || "null".equals(str))
            return true;
        return false;
    }

    // 判断字符串是否为非空
    public static boolean isNotEmpty(String str){
        if (str != null && !"".equals(str) && !"null".equals(str))
            return true;
        return false;
    }

    // 去除字符串开头的空格
    public static String trimLeft(String str){
        if (str == null || "".equals(str))
            return str;
        int idx = 0;
        for (int i = 0, stop = str.length(); i < stop; i++){
            if (Character.isWhitespace(str.charAt(i)))
                idx++;
            else break;
        }
        return idx != 0 ? str.substring(idx) : str;
    }

    // 去除字符串结尾的空格
    public static String trimRight(String str){
        if (str == null || "".equals(str))
            return str;
        int idx = str.length();
        int length = str.length();
        for (int i = str.length()-1; i > 0; i--){
            if (Character.isWhitespace(str.charAt(i)))
                idx--;
            else break;
        }
        return idx == length ? str : str.substring(0, idx);
    }

    // 去除字符串开头和结尾的空格
    public static String trim(String str){
        if (str == null || "".equals(str))
            return str;
        return str.trim();
    }

    // 去除字符串中的所有空格
    public static String trimAll(String str){
        if (str == null || "".equals(str))
            return str;
        return str.replaceAll(" ", "");
    }

    // 判断字符串是否是数字
    public static boolean isNumber(String str){
        if (isEmpty(str))
            return false;

        for (int i = 0, stop = str.length(); i < stop; i++)
            if (!Character.isDigit(str.charAt(i)))
                return false;

        return true;
    }

    // 获取异常的堆栈信息
    public static String getStackTrace(Throwable t){
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        try{
            t.printStackTrace(pw);
            return sw.toString();
        }finally{
            pw.close();
        }
    }

    //限制字符串长度
    public static String fmtStrLength(String str,int length){
        if(isEmpty(str)) {
            return "";
        }else if(str.length()<length) {
            return str;
        }else {
            return str.substring(0, length);
        }
    }

    public static String getRandomStr(int length) {
        String base = "1234567890abcdefghijkmnopqrstuvwxyz";
        StringBuffer sb = new StringBuffer();
        int len = base.length();
        for (int i = 0; i < length; i++) {
            sb.append(base.charAt((int) Math.round(Math.random()*(len-1))));
        }
        return sb.toString();
    }

    public static String compressData(String data) {
        try {
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            DeflaterOutputStream zos = new DeflaterOutputStream(bos);
            zos.write(data.getBytes());
            zos.close();
            return new String(getenBASE64inCodec(bos.toByteArray()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return "ZIP_ERR";
        }
    }

    public static String getenBASE64inCodec(byte [] b) {
        if (b == null)
            return null;
        return new String((new Base64()).encode(b));
    }
}
