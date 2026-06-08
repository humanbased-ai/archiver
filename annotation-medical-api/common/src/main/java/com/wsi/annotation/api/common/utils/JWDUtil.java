package com.wsi.annotation.api.common.utils;


import org.geotools.geojson.geom.GeometryJSON;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.io.WKTReader;


import java.io.StringWriter;
import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.List;

/**
 * 运用米勒投影原理
 */
public class JWDUtil {
    private static DecimalFormat format = new DecimalFormat("###0.000");

    public static List<Double> MillierConvertion(List<Double> xy) {
        return MillierConvertion(xy.get(0), xy.get(1));
    }

    public static List<Double> XYTOJWD(List<Double> xy) {
        return XYTOJWD(xy.get(0), xy.get(1));
    }

    //经纬度代码转换成XY坐标系
    public static List<Double> MillierConvertion(double lon, double lat) {
        ArrayList<Double> list = new ArrayList<>();
        double L = 6381372 * Math.PI * 2;//地球周长
        double W = L;// 平面展开后，x轴等于周长
        double H = L / 2;// y轴约等于周长一半
        double mill = 2.3;// 米勒投影中的一个常数，范围大约在正负2.3之间
        double x = lon * Math.PI / 180;// 将经度从度数转换为弧度
        double y = lat * Math.PI / 180;// 将纬度从度数转换为弧度
        y = 1.25 * Math.log(Math.tan(0.25 * Math.PI + 0.4 * y));// 米勒投影的转换
        // 弧度转为实际距离
        x = (W / 2) + (W / (2 * Math.PI)) * x;
        y = (H / 2) - (H / (2 * mill)) * y;
        Double v1 = (double) Math.round(x * 1000) / 1000000; //精确小数后三位，单位KM
        Double v2 = (double) Math.round(y * 1000) / 1000000;
        String format1 = format.format(v1); //科学计数法下转换
        String format2 = format.format(v2);
        Double xDouble = Double.valueOf(format1);
        Double yDouble = Double.valueOf(format2);
        list.add(xDouble);
        list.add(yDouble);
        return list;
    }


    //XY坐标系转换成经纬度代码
    public static List<Double> XYTOJWD(double X, double Y) {
        double L = 6381372 * Math.PI * 2;
        double mill = 2.3;
        double JD = (X * 1000 - (L / 2)) * 360 / L; // 根据X轴计算经度
        double v = (L / 4 - Y * 1000) * mill * 2 / (L / 2);
        double WD = (Math.atan(Math.pow(Math.E, (v / 1.25))) - (0.25 * Math.PI)) / 0.4 * 180 / Math.PI;//根据Y轴计算纬度
        ArrayList<Double> list = new ArrayList<>();
        list.add(JD);
        list.add(WD);
        return list;
    }

    //经度是x，纬度y
    public static List<Double> XYTOJWD(double X, double Y, double height, double width) {
        double zoomh = height / 180;
        double zoomw = width / 360;
        double zoom = zoomh > zoomw ? zoomh : zoomw;
        List<Double> list = new ArrayList<>();
        list.add(X / zoom - 180);
        list.add(Y / zoom - 90);
        return list;
    }

    public static List<Double> UTMWGSXYtoBL(double Xn, double Yn) {
        double[] XYtoBL = new double[2];

        double Mf;
        double L0 = 0;//中央经度（可以根据实际情况进行修改）
        double Nf;
        double Tf, Bf;
        double Cf;
        double Rf;
        double b1, b2, b3;
        double r1, r2;
        double K0 = 0.9996;
        double D, S;
        double FE = 500000;//东纬偏移
        double FN = 0;
        double a = 6378137;
        double b = 6356752.3142;
        double e1, e2, e3;
        double B;
        double L;

        L0 = L0 * Math.PI / 180;//弧度

        e1 = Math.sqrt(1 - Math.pow((b / a), 2.00));
        e2 = Math.sqrt(Math.pow((a / b), 2.00) - 1);
        e3 = (1 - b / a) / (1 + b / a);

        Mf = (Xn - FN) / K0;
        S = Mf / (a * (1 - Math.pow(e1, 2.00) / 4 - 3 * Math.pow(e1, 4.00) / 64 - 5 * Math.pow(e1, 6.00) / 256));

        b1 = (3 * e3 / 2.00 - 27 * Math.pow(e3, 3.00) / 32.00) * Math.sin(2.00 * S);
        b2 = (21 * Math.pow(e3, 2.00) / 16 - 55 * Math.pow(e3, 4.00) / 32) * Math.sin(4 * S);
        b3 = (151 * Math.pow(e3, 3.00) / 96) * Math.sin(6 * S);
        Bf = S + b1 + b2 + b3;

        double v1 = Math.pow(e2, 2.00) * Math.pow(Math.cos(Bf), 2.00);
        Nf = (Math.pow(a, 2.00) / b) / Math.sqrt(1 + v1);
        r1 = a * (1 - Math.pow(e1, 2.00));
        r2 = Math.pow((1 - Math.pow(e1, 2.00) * Math.pow(Math.sin(Bf), 2.00)), 3.0 / 2.0);
        Rf = r1 / r2;
        Tf = Math.pow(Math.tan(Bf), 2.00);
        double cf = v1;
        Cf = cf;
        D = (Yn - FE) / (K0 * Nf);

        b1 = Math.pow(D, 2.00) / 2.0;
        b2 = (5 + 3 * Tf + 10 * Cf - 4 * Math.pow(Cf, 2.0) - 9 * Math.pow(e2, 2.0)) * Math.pow(D, 4.00) / 24;
        b3 = (61 + 90 * Tf + 298 * Cf + 45 * Math.pow(Tf, 2.00) - 252 * Math.pow(e2, 2.0) - 3 * Math.pow(Cf, 2.0)) * Math.pow(D, 6.00) / 720;
        B = Bf - Nf * Math.tan(Bf) / Rf * (b1 - b2 + b3);
        B = B * 180 / Math.PI;
        L = (L0 + (1 / Math.cos(Bf)) * (D - (1 + 2 * Tf + Cf) * Math.pow(D, 3) / 6 + (5 + 28 * Tf - 2 * Cf - 3
                * Math.pow(Cf, 2.0) + 8 * Math.pow(e2, 2.0) + 24 * Math.pow(Tf, 2.0)) * Math.pow(D, 5.00) / 120)) * 180 / Math.PI;
        L0 = L0 * 180 / Math.PI;//转化为度

        XYtoBL[0] = B;
        XYtoBL[1] = L;

        List<Double> list = new ArrayList<>();
        list.add(XYtoBL[0]);
        list.add(XYtoBL[1]);
        return list;
    }


    //经度是x，纬度y
    public static Coordinate XYTOJWD(Coordinate coordinate, double height, double width) {
        //List<Double> list = XYTOJWD(coordinate.getX(), coordinate.getY(), height, width);
        List<Double> list = UTMWGSXYtoBL(coordinate.getX(), coordinate.getY());
        return new Coordinate(list.get(0), list.get(1));
    }


    public static String wktToJson(String wkt) {
        String json = null;
        try {
            WKTReader reader = new WKTReader();
            Geometry geometry = reader.read(wkt);
            StringWriter writer = new StringWriter();
            //GeometryJSON g = new GeometryJSON();
            GeometryJSON g = new GeometryJSON(20);// 这个参数必须测试，不然精度丢失
            g.write(geometry, writer);
            json = writer.toString();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return json;
    }


    public static void main(String[] args) {
        String wkt = "LINESTRING(82464 21363,82464 21363,82144 22067,82016 22259,81440 22643,81312 22707,80480 22963,80352 22963,79840 22963,79776 22963,79072 22835,78944 22835,77728 22195,77536 22003,76704 21427,76640 21363,76448 20787,76448 20659,76448 20083,76448 19955,76512 19699,76576 19635,77088 19507,77152 19507,77280 19507,77920 19443,78240 19443,80608 19507,80928 19571,82144 19763,82208 19763,82592 19955,82720 19955,82976 20467,83040 20595,83168 20915,83168 21043,82976 22003,82976 22067,82784 22451,82720 22515,82464 22707,82400 22707,82208 22835,82144 22835,82016 22835,81952 22835)";

        System.out.println(wktToJson(wkt));
    }

}