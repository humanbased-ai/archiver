package com.wsi.annotation.api.ims.core;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ChineseYuanUtil {
//    /**
//     * 通用型金钱转换类
//     */
//
//    private static final String HanDigiStr[] = new String[]{"零", "壹", "贰", "叁", "肆", "伍",
//            "陆", "柒", "捌", "玖"};
//    private static final String HanDiviStr[] = new String[]{"", "拾", "佰", "仟", "万", "拾",
//            "佰", "仟", "亿", "拾", "佰", "仟", "万", "拾", "佰", "仟", "亿", "拾", "佰",
//            "仟", "万", "拾", "佰", "仟"};
//
//    /**
//     * @param NumStr 输入字符串必须正整数，只允许前导空格(必须右对齐)，不宜有前导零
//     * @return
//     */
//    public static String convert(String NumStr) {
//        String RMBStr = "";
//        boolean lastzero = false;
//        boolean hasvalue = false; // 亿、万进位前有数值标记
//        int len, n;
//        len = NumStr.length();
//        if (len > 15)
//            return "数值过大!";
//        for (int i = len - 1; i >= 0; i--) {
//            if (NumStr.charAt(len - i - 1) == ' ')
//                continue;
//            n = NumStr.charAt(len - i - 1) - '0';
//            if (n < 0 || n > 9)
//                return "输入含非数字字符!";
//
//            if (n != 0) {
//                if (lastzero)
//                    RMBStr += HanDigiStr[0]; // 若干零后若跟非零值，只显示一个零
//                // 除了亿万前的零不带到后面
//                // if( !( n==1 && (i%4)==1 && (lastzero || i==len-1) ) ) //
//                // 如十进位前有零也不发壹音用此行
//                if (!(n == 1 && (i % 4) == 1 && i == len - 1)) // 十进位处于第一位不发壹音
//                    RMBStr += HanDigiStr[n];
//                RMBStr += HanDiviStr[i]; // 非零值后加进位，个位为空
//                hasvalue = true; // 置万进位前有值标记
//
//            } else {
//                if ((i % 8) == 0 || ((i % 8) == 4 && hasvalue)) // 亿万之间必须有非零值方显示万
//                    RMBStr += HanDiviStr[i]; // “亿”或“万”
//            }
//            if (i % 8 == 0)
//                hasvalue = false; // 万进位前有值标记逢亿复位
//            lastzero = (n == 0) && (i % 4 != 0);
//        }
//
//        if (RMBStr.length() == 0)
//            return HanDigiStr[0]; // 输入空字符或"0"，返回"零"
//        return RMBStr;
//    }

    private static final Pattern AMOUNT_PATTERN = Pattern.compile("^(0|[1-9]\\d{0,11})\\.(\\d\\d)$"); // 不考虑分隔符的正确性
    private static final char[] RMB_NUMS = "零壹贰叁肆伍陆柒捌玖".toCharArray();
    private static final String[] UNITS = {"元", "角", "分", "整"};
    private static final String[] U1 = {"", "拾", "佰", "仟"};
    private static final String[] U2 = {"", "万", "亿"};

    /**
     * 将金额（整数部分等于或少于 12 位，小数部分 2 位）转换为中文大写形式.
     *
     * @param amount 金额数字
     * @return 中文大写
     * @throws IllegalArgumentException
     */
    public static String convert(String amount) throws IllegalArgumentException {
        // 去掉分隔符
        amount = amount.replace(",", "");

        // 验证金额正确性
        String result = "";
        if (amount.equals("0.00") || amount.equals("0")) {
            //throw new IllegalArgumentException("金额不能为零.");
            return "零";
        }
        Matcher matcher = AMOUNT_PATTERN.matcher(amount);
        if (!matcher.find()) {
            throw new IllegalArgumentException("输入金额有误.");
        }

        String integer = matcher.group(1); // 整数部分
        String fraction = matcher.group(2); // 小数部分

        //String result = "";
        if (!integer.equals("0")) {
            result += integer2rmb(integer) + UNITS[0]; // 整数部分
        }
        if (fraction.equals("00")) {
            result += UNITS[3]; // 添加[整]
        } else if (fraction.startsWith("0") && integer.equals("0")) {
            result += fraction2rmb(fraction).substring(1); // 去掉分前面的[零]
        } else {
            result += fraction2rmb(fraction); // 小数部分
        }

        return result;
    }

    // 将金额小数部分转换为中文大写
    private static String fraction2rmb(String fraction) {
        char jiao = fraction.charAt(0); // 角
        char fen = fraction.charAt(1); // 分
        return (RMB_NUMS[jiao - '0'] + (jiao > '0' ? UNITS[1] : ""))
                + (fen > '0' ? RMB_NUMS[fen - '0'] + UNITS[2] : "");
    }

    // 将金额整数部分转换为中文大写
    private static String integer2rmb(String integer) {
        StringBuilder buffer = new StringBuilder();
        // 从个位数开始转换
        int i, j;
        for (i = integer.length() - 1, j = 0; i >= 0; i--, j++) {
            char n = integer.charAt(i);
            if (n == '0') {
                // 当 n 是 0 且 n 的右边一位不是 0 时，插入[零]
                if (i < integer.length() - 1 && integer.charAt(i + 1) != '0') {
                    buffer.append(RMB_NUMS[0]);
                }
                // 插入[万]或者[亿]
                if (j % 4 == 0) {
                    if (i > 0 && integer.charAt(i - 1) != '0' || i > 1 && integer.charAt(i - 2) != '0'
                            || i > 2 && integer.charAt(i - 3) != '0') {
                        buffer.append(U2[j / 4]);
                    }
                }
            } else {
                if (j % 4 == 0) {
                    buffer.append(U2[j / 4]); // 插入[万]或者[亿]
                }
                buffer.append(U1[j % 4]); // 插入[拾]、[佰]或[仟]
                buffer.append(RMB_NUMS[n - '0']); // 插入数字
            }
        }
        return buffer.reverse().toString();
    }
}