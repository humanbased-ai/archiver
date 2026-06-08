package com.wsi.annotation.api.ims.service.ims.imp;

import com.alibaba.fastjson.JSONObject;
import com.mongodb.QueryBuilder;

import com.wsi.annotation.api.common.config.ProjectConfig;
import com.wsi.annotation.api.common.core.domain.Page;
import com.wsi.annotation.api.common.exception.FormatException;
import com.wsi.annotation.api.common.exception.HTTPDataException;
import com.wsi.annotation.api.common.exception.MiddlewareException;
import com.wsi.annotation.api.common.utils.ObjectUtils;
import com.wsi.annotation.api.common.utils.ServletUtils;
import com.wsi.annotation.api.common.utils.StringUtils;
import com.wsi.annotation.api.common.utils.file.FileUtils;
import com.wsi.annotation.api.common.utils.http.HttpUtils;
import com.wsi.annotation.api.common.utils.spring.SpringUtils;
import com.wsi.annotation.api.database.domain.basic.CaseInfo;
import com.wsi.annotation.api.database.domain.basic.DataSet;
import com.wsi.annotation.api.database.domain.cytomine.*;
import com.wsi.annotation.api.framework.web.domain.server.Sys;
import com.wsi.annotation.api.ims.domain.response.cytomine.ImageInfo;
import com.wsi.annotation.api.ims.formats.Format;
import com.wsi.annotation.api.ims.formats.FormatIdentifier;
import com.wsi.annotation.api.ims.formats.IConvertableImageFormat;
import com.wsi.annotation.api.ims.formats.heavyconvertable.BioFormatConvertable;
import com.wsi.annotation.api.ims.formats.supported.SupportedImageFormat;
import com.wsi.annotation.api.ims.formats.supported.digitalpathology.OpenSlideFormat;
import com.wsi.annotation.api.ims.formats.supported.digitalpathology.OpenSlideMultipleFileFormat;
import com.wsi.annotation.api.ims.service.ims.IImageService;
import ij.ImagePlus;
import ij.process.ImageProcessor;
import ij.process.PolygonFiller;
import io.swagger.models.auth.In;
import lombok.extern.slf4j.Slf4j;
import org.apache.ibatis.javassist.tools.rmi.ObjectNotFoundException;
import org.bson.types.ObjectId;
import org.checkerframework.checker.units.qual.A;
import org.locationtech.jts.geom.*;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKTReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.BasicQuery;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.websocket.DeploymentException;
import java.awt.*;
import java.awt.geom.AffineTransform;
import java.awt.geom.Path2D;
import java.awt.image.BufferedImage;
import java.io.*;
import java.net.*;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.DecimalFormat;
import java.util.*;
import java.util.List;
import java.util.stream.Collectors;

import static com.wsi.annotation.api.common.utils.http.HttpUtils.responseBufferedImage;

@Service
@Slf4j
public class ImageService implements IImageService {

    @Autowired
    private MongoTemplate mongoTemplate;


    public void tile(String zoomify, String tileGroup, int z, int x, int y, String mimeType) {
        String fif = zoomify;
        /*remove the "/" at the end of the path injected by openlayers (OL2).
          I Did not find the way to avoid it from OL2 (BS)
         */
        if (fif.endsWith("/"))
            fif = fif.substring(0, fif.length() - 1);
        try {
            SupportedImageFormat imageFormat = FormatIdentifier.getImageFormatByMimeType(fif, mimeType);
            HashMap<String, Object> params = new HashMap<>();
            params.put("tileGroup", tileGroup);
            params.put("x", x);
            params.put("y", y);
            params.put("z", z);
            //String url = ProjectConfig.getIipsrvUrl() + "?zoomify=" + URLEncoder.encode(fif, "UTF-8") + "/TileGroup"
            // + tileGroup + "/" + z + "-" + x + "-" + y + ".jpg";
            //log.info(url);
            String url = imageFormat.tileURL(fif, params);
            log.info("url:" + url);
            HttpUtils.downloadImage(ServletUtils.getResponse(), url);
        } catch (Exception e) {
            e.printStackTrace();
        }

    }

    public BufferedImage readCropBufferedImage() throws IOException {
        String fif = ServletUtils.getParameter("fif");
        String mimeType = ServletUtils.getParameter("mimeType");

        SupportedImageFormat imageFormat = FormatIdentifier.getImageFormatByMimeType(fif, mimeType);

        Double width = ServletUtils.getParameterToDouble("width");
        Double height = ServletUtils.getParameterToDouble("height");
        Double topLeftX = ServletUtils.getParameterToDouble("topLeftX");
        Double topLeftY = ServletUtils.getParameterToDouble("topLeftY");
        Double imageWidth = ServletUtils.getParameterToDouble("imageWidth");
        Double imageHeight = ServletUtils.getParameterToDouble("imageHeight");
        Double increaseArea = ServletUtils.getParameterToDouble("increaseArea");
        if (increaseArea != null && increaseArea > 0) {
            topLeftX -= width * (increaseArea - 1) / 2;
            topLeftY += height * (increaseArea - 1) / 2;
            width *= increaseArea;
            height *= increaseArea;
        }


        Boolean square = ServletUtils.getParameterToBoolean("square", false);
        //we will increase the missing direction to make a square
        if (square) {
            if (width < height) {
                double delta = height - width;
                topLeftX -= delta / 2;
                width += delta;
            } else if (width > height) {
                double delta = width - height;
                topLeftY += delta / 2;
                height += delta;
            }
        }

        width = Math.min(width, imageWidth);
        if (topLeftX < 0) {
            topLeftX = 0D;
        } else {
            topLeftX = Math.min((double) topLeftX, imageWidth - width);
        }

        height = Math.min(height, imageHeight);
        if (topLeftY > imageHeight) {
            topLeftY = imageHeight;
        } else {
            topLeftY = Math.max((double) topLeftY, height);
        }


        Map<String, Object> params = ServletUtils.getParameterMap();

        params.put("topLeftX", topLeftX);
        params.put("topLeftY", topLeftY);
        params.put("width", width);
        params.put("height", height);


        String cropURL = imageFormat.cropURL(params);


        BufferedImage bufferedImage = ImageIO.read(new URL(cropURL));

        int i = 0;
        while (bufferedImage == null && i < 3) {
            bufferedImage = ImageIO.read(new URL(cropURL));
            i++;
        }

        if (bufferedImage == null) {
            throw new MiddlewareException("Not a valid image: " + cropURL);
        }


        Boolean safe = ServletUtils.getParameterToBoolean("safe", false);
        if (safe) {
            //if safe mode, skip annotation too large
            if (width > 200000 || height > 200000) {
                throw new MiddlewareException("Too big annotation!");
            }
        }
        return bufferedImage;
    }

    public void drawPoint(BufferedImage image) {
        Graphics g = image.createGraphics();
        g.setColor(Color.RED);

        int length = 10;
        int x = image.getWidth() / 2;
        int y = image.getHeight() / 2;

        ((Graphics2D) g).setStroke(new BasicStroke(1));
        g.drawLine(x, y - length, x, y + length);
        g.drawLine(x - length, y, x + length, y);
        g.dispose();
    }


    BufferedImage createCropWithDraw(BufferedImage image, Geometry geometry) {
        Double paramwidth = ServletUtils.getParameterToDouble("width");
        Double paramheight = ServletUtils.getParameterToDouble("height");
        Integer topLeftX = ServletUtils.getParameterToInt("topLeftX");
        Integer topLeftY = ServletUtils.getParameterToInt("topLeftY");

        int width = image.getWidth();
        int height = image.getHeight();
        double x_ratio = width / paramwidth;
        double y_ratio = height / paramheight;

        Integer borderWidth = ServletUtils.getParameterToInt("thickness", (int) Math.round(2 + ((double) Math.max(width, height)) / 1000d));

        String colorStr = ServletUtils.getParameter("color");

        Color color = StringUtils.isNotEmpty(colorStr) ? new Color(Integer.parseInt(colorStr.replace("0x", ""), 16)) : Color.BLACK;

        return drawGeometries(
                image,
                Arrays.asList(geometry),
                color,
                borderWidth,
                topLeftX,
                topLeftY,
                x_ratio,
                y_ratio);
    }

    BufferedImage drawGeometries(BufferedImage image, Collection<Geometry> geometryCollection, Color c, int borderWidth, int x, int y, double x_ratio, double y_ratio) {

        for (Geometry geometry : geometryCollection) {
            if (geometry instanceof MultiPolygon) {
                MultiPolygon multiPolygon = (MultiPolygon) geometry;
                for (int i = 0; i < multiPolygon.getNumGeometries(); i++) {
                    geometry = multiPolygon.getGeometryN(i);
                    image = drawGeometry(image, geometry, c, borderWidth, x, y, x_ratio, y_ratio);
                }
            } else {
                image = drawGeometry(image, geometry, c, borderWidth, x, y, x_ratio, y_ratio);
            }
        }

        return image;
    }

    BufferedImage drawGeometry(BufferedImage image, Geometry geometry, Color c, int borderWidth, int x, int y, double x_ratio, double y_ratio) {
        if (geometry instanceof Polygon) {
            Polygon polygon = (Polygon) geometry;
            image = drawPolygon(image, polygon, c, borderWidth, x, y, x_ratio, y_ratio);
        } else if (geometry instanceof Point) {
            Point point = (Point) geometry;
            image = drawPoint(image, point, c, borderWidth, x, y, x_ratio, y_ratio);
        } else if (geometry instanceof LineString) {
            LineString line = (LineString) geometry;
            image = drawLineString(image, line, c, borderWidth, x, y, x_ratio, y_ratio);
        }

        return image;
    }


    BufferedImage drawPoint(BufferedImage image, Point point, Color c, int borderWidth, int x, int y, double x_ratio, double y_ratio) {
        Graphics g = image.createGraphics();
        g.setColor(c);
        ((Graphics2D) g).setStroke(new BasicStroke(borderWidth));

        int length = 10;
        double xLocal = Math.min((point.getX() - x) * x_ratio, image.getWidth());
        xLocal = Math.max(0, xLocal);
        double yLocal = Math.min((y - point.getY()) * y_ratio, image.getHeight());
        yLocal = Math.max(0, yLocal);


        g.drawLine((int) xLocal, (int) yLocal - length, (int) xLocal, (int) yLocal + length);
        g.drawLine((int) xLocal - length, (int) yLocal, (int) xLocal + length, (int) yLocal);
        g.dispose();
        return image;
    }

    BufferedImage drawPolygon(BufferedImage image, Polygon polygon, Color c, int borderWidth, int x, int y, double x_ratio, double y_ratio) {
        image = drawLineString(image, polygon.getExteriorRing(), c, borderWidth, x, y, x_ratio, y_ratio);
        for (int j = 0; j < polygon.getNumInteriorRing(); j++) {
            image = drawLineString(image, polygon.getInteriorRingN(j), c, borderWidth, x, y, x_ratio, y_ratio);
        }
        return image;
    }

    BufferedImage drawLineString(BufferedImage image, LineString lineString, Color c, int borderWidth, int x, int y, double x_ratio, double y_ratio) {
        Path2D.Float regionOfInterest = new Path2D.Float();
        boolean isFirst = true;

        Coordinate[] coordinates = lineString.getCoordinates();
        for (Coordinate coordinate : coordinates) {
            double xLocal = Math.min((coordinate.x - x) * x_ratio, image.getWidth() - 1);
            xLocal = Math.max(0, xLocal);
            double yLocal = Math.min((y - coordinate.y) * y_ratio, image.getHeight() - 1);
            yLocal = Math.max(0, yLocal);

            if (isFirst) {
                regionOfInterest.moveTo(xLocal, yLocal);
                isFirst = false;
            }
            regionOfInterest.lineTo(xLocal, yLocal);
        }

        Graphics2D g2d = (Graphics2D) image.getGraphics();
        g2d.setStroke(new BasicStroke(borderWidth));
        g2d.setColor(c);
        g2d.draw(regionOfInterest);

        return image;
    }


    public BufferedImage createMask(BufferedImage bufferedImage, Geometry geometry, boolean withAlpha) {
        Integer width = ServletUtils.getParameterToInt("width");
        Integer height = ServletUtils.getParameterToInt("height");
        Integer topLeftX = ServletUtils.getParameterToInt("topLeftX");
        Integer topLeftY = ServletUtils.getParameterToInt("topLeftY");
        Integer imageHeight = ServletUtils.getParameterToInt("imageHeight");


        BufferedImage mask = new BufferedImage(bufferedImage.getWidth(), bufferedImage.getHeight(), BufferedImage.TYPE_INT_ARGB);
        double x_ratio = bufferedImage.getWidth() / width;
        double y_ratio = bufferedImage.getHeight() / height;

        mask = colorizeWindow(mask, Arrays.asList(geometry), topLeftX, imageHeight - topLeftY, x_ratio, y_ratio);

        if (withAlpha) {
            return applyMaskToAlpha(bufferedImage, mask);
        } else {
            return mask;
        }

    }

    public BufferedImage applyMaskToAlpha(BufferedImage image, BufferedImage mask) {
        //TODO:: document this method
        int width = image.getWidth();
        int height = image.getHeight();
        int[] imagePixels = image.getRGB(0, 0, width, height, null, 0, width);
        int[] maskPixels = mask.getRGB(0, 0, width, height, null, 0, width);
        int black_rgb = Color.BLACK.getRGB();
        for (int i = 0; i < imagePixels.length; i++) {
            int color = imagePixels[i] & 0x00FFFFFF; // mask away any alpha present
            int alphaValue = (maskPixels[i] == black_rgb) ? 0x00 : 0xFF;
            int maskColor = alphaValue << 24; // shift value into alpha bits
            imagePixels[i] = color | maskColor;
        }
        BufferedImage combined = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        combined.setRGB(0, 0, width, height, imagePixels, 0, width);
        return combined;
    }


    public BufferedImage colorizeWindow(BufferedImage window, Collection<Geometry> geometryCollection, int x, int y, double x_ratio, double y_ratio) {
        for (Geometry geometry : geometryCollection) {

            if (geometry instanceof GeometryCollection) {
                GeometryCollection multiPolygon = (GeometryCollection) geometry;
                for (int i = 0; i < multiPolygon.getNumGeometries(); i++) {
                    window = colorizeWindow(window, multiPolygon.getGeometryN(i), x, y, x_ratio, y_ratio);
                }
            } else {
                window = colorizeWindow(window, geometry, x, y, x_ratio, y_ratio);
            }
        }
        return window;
    }

    public BufferedImage colorizeWindow(BufferedImage window, Geometry geometry, int x, int y, double x_ratio, double y_ratio) {
        if (geometry instanceof Polygon) {
            Polygon polygon = (Polygon) geometry;
            window = colorizeWindow(window, polygon, x, y, x_ratio, y_ratio);
        }
        return window;
    }

    public BufferedImage colorizeWindow(BufferedImage window, Polygon polygon, int x, int y, double x_ratio, double y_ratio) {
        window = colorizeWindow(window, polygon.getExteriorRing(), Color.WHITE, x, y, x_ratio, y_ratio);
        for (int j = 0; j < polygon.getNumInteriorRing(); j++) {
            window = colorizeWindow(window, polygon.getInteriorRingN(j), Color.BLACK, x, y, x_ratio, y_ratio);
        }

        return window;
    }

    public BufferedImage colorizeWindow(BufferedImage window, LineString lineString, Color color, int x, int y, double x_ratio, double y_ratio) {
        Integer imageHeight = ServletUtils.getParameterToInt("imageHeight");
        ImagePlus imagePlus = new ImagePlus("", window);
        ImageProcessor ip = imagePlus.getProcessor();
        ip.setColor(color);
        //int[] pixels = (int[]) ip.getPixels()

        Coordinate[] coordinates = lineString.getCoordinates();
        int[] _x = new int[coordinates.length];
        int[] _y = new int[coordinates.length];
        for (int i = 0; i < coordinates.length; i++) {
            Coordinate coordinate = coordinates[i];
            int xLocal = (int) Math.min((coordinate.x - x) * x_ratio, window.getWidth());
            xLocal = Math.max(0, xLocal);
            int yLocal = (int) Math.min((imageHeight - coordinate.y - y) * y_ratio, window.getHeight());
            yLocal = Math.max(0, yLocal);
            _x[i] = xLocal;
            _y[i] = yLocal;
        }
        PolygonFiller polygonFiller = new PolygonFiller();
        polygonFiller.setPolygon(_x, _y, coordinates.length);
        polygonFiller.fill(ip, new Rectangle(window.getWidth(), window.getHeight()));
        //ip.setPixels(pixels)
        return ip.getBufferedImage();
    }

    public static BufferedImage resize(BufferedImage img, int newW, int newH) {
        int type = img.getType() == 0 ? BufferedImage.TYPE_INT_ARGB : img.getType();

        BufferedImage scaledImage = new BufferedImage(newW, newH, type);

        Graphics2D graphics2D = scaledImage.createGraphics();
        graphics2D.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        graphics2D.drawImage(img, 0, 0, newW, newH, null);

        graphics2D.dispose();
        return scaledImage;
    }

    public BufferedImage rotateImageByDegrees(BufferedImage img, Double radian) {

        double sin = Math.abs(Math.sin(radian)), cos = Math.abs(Math.cos(radian));
        int w = img.getWidth();
        int h = img.getHeight();
        int newWidth = (int) Math.floor(w * cos + h * sin);
        int newHeight = (int) Math.floor(h * cos + w * sin);

        BufferedImage rotated = new BufferedImage(newWidth, newHeight, img.getType());
        Graphics2D g2d = rotated.createGraphics();
        AffineTransform at = new AffineTransform();
        at.translate((newWidth - w) / 2, (newHeight - h) / 2);

        int x = w / 2;
        int y = h / 2;

        at.rotate(radian, x, y);
        g2d.setTransform(at);
        g2d.drawImage(img, null, 0, 0);
        g2d.dispose();

        return rotated;
    }

    public BufferedImage drawScaleBar(BufferedImage image, Double resolution, Double ratioWith, Double magnification) {


        double scaleBarSize = 100d;
        int sclaBarXPosition = 20;
        int sclaBarYPosition = 20;


        int space = (int) (scaleBarSize / 10);
        int boxSizeWidth = (int) (scaleBarSize + (space * 2));
        int boxSizeHeight = (int) (scaleBarSize * 0.5);

        //draw white rectangle in the bottom-left of the screen
        Graphics2D graphBox = image.createGraphics();
        graphBox.setColor(Color.WHITE);
        graphBox.fillRect(sclaBarXPosition, image.getHeight() - boxSizeHeight - sclaBarYPosition, boxSizeWidth, boxSizeHeight);
        graphBox.dispose();

        //draw the scale bar
        Graphics2D graphScaleBar = image.createGraphics();
        graphScaleBar.setColor(Color.BLACK);

        int xStartBar = sclaBarXPosition + space;
        int xStopBar = (int) (sclaBarXPosition + scaleBarSize + space);
        int yStartBar = image.getHeight() - (int) Math.floor(boxSizeHeight / 2) - sclaBarYPosition;
        int yStopBar = yStartBar;

        graphScaleBar.setStroke(new BasicStroke(2));
        //draw the main line of the scale bar
        graphScaleBar.drawLine(xStartBar, yStartBar, xStopBar, yStopBar);
        //draw the two vertical line
        graphScaleBar.drawLine(xStartBar, yStartBar - ((int) Math.floor(scaleBarSize / 6)), xStartBar, yStopBar + ((int) Math.floor(scaleBarSize / 6)));
        graphScaleBar.drawLine(xStopBar, yStartBar - ((int) Math.floor(scaleBarSize / 6)), xStopBar, yStopBar + ((int) Math.floor(scaleBarSize / 6)));

        graphScaleBar.dispose();

        Double realSize = resolution != null ? (scaleBarSize / ratioWith) * resolution : null;


        DecimalFormat f = new DecimalFormat("##.00");
        String textUp, textBelow;
        //draw text
        int textSize = 9;//8*(scaleBarSize/100)
        int textXPosition = xStartBar + (xStopBar - xStartBar) / 2 - 25;
        Graphics2D graphText = image.createGraphics();
        graphText.setFont(new Font("Monaco", Font.BOLD, textSize));

        if (realSize != null) {
            textUp = f.format(realSize) + " µm";
            graphText.setColor(Color.BLACK);
        } else {
            textUp = "Size unknown";
            graphText.setColor(Color.RED);
        }
        graphText.drawString(textUp, textXPosition, yStartBar - 5);

        if (magnification != null) {
            textBelow = f.format(magnification) + " X";
            graphText.setColor(Color.BLACK);
        } else {
            textBelow = "Magnitude unknown";
            textXPosition -= 25;
            graphText.setColor(Color.RED);
        }

        graphText.drawString(textBelow, textXPosition, yStartBar + (5 + textSize));
        graphText.dispose();
        return image;
    }

    public void crop() throws IOException, ParseException {
        Double savedWidth = ServletUtils.getParameterToDouble("width");
        Double savedHeight = ServletUtils.getParameterToDouble("height");
        String fif = ServletUtils.getParameter("fif");

        String mimeType = ServletUtils.getParameter("mimeType");
        //if(savedHeight <= 0 || savedWidth <= 0) throw new InvalidRequestException("Width or Height cannot be null")

        SupportedImageFormat imageFormat = FormatIdentifier.getImageFormatByMimeType(URLDecoder.decode(fif, "UTF-8"), mimeType);

        BufferedImage bufferedImage = readCropBufferedImage();


        Boolean point = ServletUtils.getParameterToBoolean("point", false);
        if (point) {
            drawPoint(bufferedImage);
        }

        Boolean draw = ServletUtils.getParameterToBoolean("draw", false);
        Boolean mask = ServletUtils.getParameterToBoolean("mask", false);
        Boolean alphaMask = ServletUtils.getParameterToBoolean("alphaMask", false);
        String location = ServletUtils.getParameter("location");
        Integer zoom = ServletUtils.getParameterToInt("zoom", 0);
        if (draw) {

            Geometry geometry = new WKTReader().read(location);
            bufferedImage = createCropWithDraw(bufferedImage, geometry);
        } else if (mask) {
            Geometry geometry = new WKTReader().read(location);
            bufferedImage = createMask(bufferedImage, geometry, false);
        } else if (alphaMask) {

            Geometry geometry = new WKTReader().read(location);

            if (zoom > 0) {
                int maxWidth = (int) (savedWidth / Math.pow(2, zoom));
                int maxHeight = (int) (savedHeight / Math.pow(2, zoom));

                bufferedImage = resize(bufferedImage, maxWidth, maxHeight);
            }


            bufferedImage = createMask(bufferedImage, geometry, true);
        }

        if (zoom > 0 && !alphaMask) {
            int maxWidth = (int) (savedWidth / Math.pow(2, zoom));
            int maxHeight = (int) (savedHeight / Math.pow(2, zoom));

            bufferedImage = resize(bufferedImage, maxWidth, maxHeight);
        }

        double ratioWidth = ((double) bufferedImage.getWidth() / savedWidth);


        Double rotation = ServletUtils.getParameterToDouble("rotation", 0D);

        if (rotation != 0)
            bufferedImage = rotateImageByDegrees(bufferedImage, rotation);


        Boolean drawScaleBar = ServletUtils.getParameterToBoolean("drawScaleBar", false);
        if (drawScaleBar) {
//            if(proport1==porpert2) {
            //If the crop mage has been resized, the image may be "cut" (how to know that?).
            //(we may have oldWidth/oldHeight <> newWidth/newHeight)
            //This mean that its impossible to compute the real size of the image because the size of the image change (not a problem) AND the image change (the image server cut somepart of the image).
            //I first try to compute the ratio (double ratioWidth = (double)((double)bufferedImage.getWidth()/params.double('width'))),
            //but if the image is cut , its not possible to compute the good width size
            Double resolution = ServletUtils.getParameterToDouble("resolution", 0D);
            Double magnification = ServletUtils.getParameterToDouble("magnification", 0D);
            bufferedImage = drawScaleBar(bufferedImage, resolution, ratioWidth, magnification);
//            }
        }

        responseBufferedImage(bufferedImage);
    }

    public BufferedImage scaleImage(BufferedImage img, Integer width, Integer height) {
        int imgWidth = img.getWidth();
        int imgHeight = img.getHeight();

        // if ratio height/imgHeight < width/imgWidth then we apply the same ratio to width => we took the smaller ratio
        if (imgWidth * height < imgHeight * width) {
            width = imgWidth * height / imgHeight;
        } else {
            height = imgHeight * width / imgWidth;
        }
        BufferedImage newImage = new BufferedImage(width, height, img.getType());
        Graphics2D g = newImage.createGraphics();
//        g.setBackground (color);
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                    RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.drawImage(img, 0, 0, width, height, null);
        } catch (Exception e) {
            log.info("scaleImage", e);
        } finally {
            g.dispose();
        }
        return newImage;
    }

    public void nested() throws IOException, InterruptedException, ObjectNotFoundException {
        String fif = ServletUtils.getParameter("fif");
        String label = ServletUtils.getParameter("label");
        String mimeType = ServletUtils.getParameter("mimeType");
        fif = URLDecoder.decode(fif, "UTF-8");
        Integer maxSize = ServletUtils.getParameterToInt("maxSize", 512);
        SupportedImageFormat imageFormat = FormatIdentifier.getImageFormatByMimeType(fif, mimeType);
        BufferedImage bufferedImage = imageFormat.associated(label);
        log.info("nestedimage" + bufferedImage.toString());
        if (bufferedImage != null) {
            bufferedImage = changeImageType(bufferedImage);
            bufferedImage = scaleImage(bufferedImage, maxSize, maxSize);
//            log.info("image" + bufferedImage.toString());
            responseBufferedImage(bufferedImage);
        } else {
            throw new ObjectNotFoundException(label + " not found");
        }
    }

    public void thumb() throws IOException {
        String fif = ServletUtils.getParameter("fif");
        String mimeType = ServletUtils.getParameter("mimeType");
        fif = URLDecoder.decode(fif, "UTF-8");
        Integer maxSize = ServletUtils.getParameterToInt("maxSize", 512);

        SupportedImageFormat imageFormat = FormatIdentifier.getImageFormatByMimeType(fif, mimeType);
        BufferedImage bufferedImage = imageFormat.thumb(maxSize);
        bufferedImage = scaleImage(bufferedImage, maxSize, maxSize);
        if (bufferedImage != null) {
            log.info("image" + bufferedImage.toString());
            responseBufferedImage(bufferedImage);
        } else {
            //return 404 image
        }
    }

    @Override
    public ImageInstance upload(MultipartFile file, String idStorage, String idProject) throws DeploymentException, IOException {
        Storage storage = mongoTemplate.findById(idStorage, Storage.class);
        long timestamp = new Date().getTime();
        String filename = File.separator + timestamp + File.separator + FileUtils.correctFileName(file.getOriginalFilename());
        String diskUrl = storage.getBase_path() + filename;
        File diskFile = new File(diskUrl);
        if (!diskFile.getParentFile().exists()) {
            diskFile.getParentFile().mkdirs();
        }
        try {
            file.transferTo(diskFile);
        } catch (IOException e) {
            throw new HTTPDataException(500, "上传文件异常");
        }

        UploadedFile uploadedFile = new UploadedFile();
        uploadedFile.setOriginal_filename(file.getOriginalFilename());
        uploadedFile.setFilename(filename);
        uploadedFile.setPath(storage.getBase_path());
        uploadedFile.setSize(file.getSize());
        uploadedFile.setExt(FileUtils.getExtensionFromFilename(file.getOriginalFilename()));
        ImageInstance imageInstance = saveUploadInfo(idProject, storage, diskUrl, uploadedFile, null);
        return imageInstance;
    }

    @Override
    public void init(String idStorage, String idProject) throws DeploymentException, IOException {
        idStorage = ObjectUtils.isNotEmpty(idStorage)?idStorage:"62fddb62d63f0000c7001b16";
        Storage storage = mongoTemplate.findById(idStorage, Storage.class);
        long timestamp = new Date().getTime();
//        File temp = new File("/data/images");
//        String dir = "Y:";
//        String dir = "/data/images/TCGA";
//        File tcga = new File(dir);
        List<String> fileString = new ArrayList<>();
//        getAllFile(tcga, files);
        String dir2 = "/data/images/TBPDC";
//        String dir2 = "/home/wxy/Git/image-data/TBPDC";
        File coreone = new File(dir2);
        File[] files = coreone.listFiles();
        for (File file1 : files) {
            if (file1.isDirectory()) {
                File[] innerFiles = file1.listFiles();
                for (File innerFile:innerFiles){
                    String extensionName = FileUtils.getExtensionFromFilename(innerFile.getName());
                    String sourceName = innerFile.getName().replace("."+extensionName,"");
                    if(innerFile.isFile() && (extensionName.equals("svs")||extensionName.equals("kfb"))) {
                        CaseInfo caseInfo = new CaseInfo();
                        caseInfo.setCaseName(sourceName);
                        caseInfo.setDataSetId("66f2cc9e2b246612c98585ac");
                        caseInfo.setCaseStatus(0);
                        caseInfo = mongoTemplate.insert(caseInfo);

                        idProject = caseInfo.getId();


                        String filename = innerFile.getAbsolutePath().replace("/data/images", "");
                        ImageInfo imageInfo = new ImageInfo();
                        imageInfo.setSource("TBPDC");
                        imageInfo.setMultiple(20);
                        imageInfo.setWsiType("HE");
                        String diskUrl = storage.getBase_path() + filename;
                        File diskFile = new File(diskUrl);
                        UploadedFile uploadedFile = new UploadedFile();
                        uploadedFile.setOriginal_filename(innerFile.getName());
                        uploadedFile.setFilename(filename);
                        uploadedFile.setPath(storage.getBase_path());
                        uploadedFile.setSize(innerFile.length());
                        uploadedFile.setExt(FileUtils.getExtensionFromFilename(innerFile.getName()));
                        try {
                            saveUploadInfo(idProject, storage, innerFile.getAbsolutePath(), uploadedFile, imageInfo);
                        }catch (Exception e){
                            e.printStackTrace();
                        }
                    }
                }
            }
        }

        DataSet dataSet = mongoTemplate.findById("66f2cc9e2b246612c98585ac",DataSet.class);
        QueryBuilder setBuilder = new QueryBuilder();
        setBuilder.and("dataSetId").is("66f2cc9e2b246612c98585ac");
        setBuilder.and("delFlag").is(0);
        BasicQuery setQuery = new BasicQuery(setBuilder.get().toString());
        Long sliceNum = mongoTemplate.count(setQuery, CaseInfo.class);
        dataSet.setSliceNum(sliceNum.intValue());
        mongoTemplate.save(dataSet);
//        getAllFile(coreone, files);
//        for (String fileName : fileString) {
//            File file = new File(fileName);
//            String extensionName = FileUtils.getExtensionFromFilename(file.getName());
//            if (file.isFile() && (extensionName.equals("svs")||extensionName.equals("kfb"))) {
//                String filename = file.getAbsolutePath().replace("/data/images", "");
////                log.info("file:" + file.getAbsolutePath());
////                log.info("Extension:" + FileUtils.getExtensionFromFilename(file.getName()));
////                log.info("filename:" + filename);
//                String[] paths = filename.split("/");
//                log.info("paths：{}", filename);
//                ImageInfo imageInfo = new ImageInfo();
//                if (paths.length > 3) {
//                    switch (paths[1]) {
//                        case "TCGA":
//                            imageInfo.setSource("TCGA");
//                            imageInfo.setMultiple(20);
//                            imageInfo.setWsiType("HE");
//                            imageInfo.setCancerName(paths[2]);
//                            break;
//                        case "WSI_COREONE":
//                            imageInfo.setSource("COREONE");
////                            Integer multiple = Integer.parseInt(paths[2]);
////                            imageInfo.setMultiple(multiple);
//                            imageInfo.setPlace(paths[2]);
////                            imageInfo.setPathologyNumber(paths[4]);
//                            imageInfo.setWsiType("HE");
//                            break;
//                    }
//                }
//                String diskUrl = storage.getBase_path() + filename;
//                File diskFile = new File(diskUrl);
//                UploadedFile uploadedFile = new UploadedFile();
//                uploadedFile.setOriginal_filename(file.getName());
//                uploadedFile.setFilename(filename);
//                uploadedFile.setPath(storage.getBase_path());
//                uploadedFile.setSize(file.length());
//                uploadedFile.setExt(FileUtils.getExtensionFromFilename(file.getName()));
//                try {
//                    saveUploadInfo(idProject, storage, file.getAbsolutePath(), uploadedFile, imageInfo);
//                }catch (Exception e){
//                    e.printStackTrace();
//                }
//
//            }
//        }
    }

    public void getAllFile(File file, List<String> result) {
        if (file.isDirectory()) {
            File[] files = file.listFiles();
            for (File file1 : files) {
                if (file1.isDirectory()) {
                    getAllFile(file1, result);
                } else {
                    result.add(file1.getAbsolutePath());
                }
            }
        } else {
            result.add(file.getAbsolutePath());
        }
    }

    @Override
    public void initByFileName(String idStorage, String idProject, String fileName) throws DeploymentException, IOException {
        Storage storage = mongoTemplate.findById(idStorage, Storage.class);
        File listFile = new File(fileName);
        log.info("file:" + listFile.getAbsolutePath());
        log.info("Extension:" + FileUtils.getExtensionFromFilename(listFile.getName()));
        log.info("fileName:" + listFile.getName());
        String path = listFile.getName();
        log.info("isfile:{}", listFile.isFile());
        if (listFile.isFile() && FileUtils.getExtensionFromFilename(listFile.getName()).equals("svs")) {
            log.info("insert");
            String filename = File.separator + FileUtils.correctFileName(listFile.getName());
            String diskUrl = storage.getBase_path() + filename;
            File diskFile = new File(diskUrl);
            UploadedFile uploadedFile = new UploadedFile();
            uploadedFile.setOriginal_filename(listFile.getName());
            uploadedFile.setFilename(filename);
            uploadedFile.setPath(storage.getBase_path());
            uploadedFile.setSize(listFile.length());
            uploadedFile.setExt(FileUtils.getExtensionFromFilename(listFile.getName()));
            saveUploadInfo(idProject, storage, listFile.getAbsolutePath(), uploadedFile, null);
        }
    }

    @Override
    public void associated() throws IOException, InterruptedException {
        String fif = ServletUtils.getParameter("fif");
        String mimeType = ServletUtils.getParameter("mimeType");
        fif = URLDecoder.decode(fif, "UTF-8");
//        Integer maxSize = ServletUtils.getParameterToInt("maxSize", 512);

        SupportedImageFormat imageFormat = FormatIdentifier.getImageFormatByMimeType(fif, mimeType);
        BufferedImage bufferedImage = imageFormat.associated("");
        if (bufferedImage != null) {
            log.info("image" + bufferedImage.toString());
            bufferedImage = changeImageType(bufferedImage);
            responseBufferedImage(bufferedImage);
        } else {
            //return 404 image
        }
    }

    @Override
    public ImageInstance upload(String imageId, MultipartFile file, String idStorage) throws DeploymentException, IOException {
        Storage storage = mongoTemplate.findById(idStorage, Storage.class);
        long timestamp = new Date().getTime();
        String filename = File.separator + timestamp + File.separator + FileUtils.correctFileName(file.getOriginalFilename());
        String diskUrl = storage.getBase_path() + filename;
        File diskFile = new File(diskUrl);
        if (!diskFile.getParentFile().exists()) {
            diskFile.getParentFile().mkdirs();
        }
        try {
            file.transferTo(diskFile);
        } catch (IOException e) {
            e.printStackTrace();
            if (StringUtils.isNotNull(imageId)){
                mongoTemplate.findAndModify(Query.query(Criteria.where("_id").is(new ObjectId(imageId))),
                        Update.update("state",3),
                        ImageInstance.class);
            }
            throw new HTTPDataException(500, "上传文件异常");
        }

        UploadedFile uploadedFile = new UploadedFile();
        uploadedFile.setOriginal_filename(file.getOriginalFilename());
        uploadedFile.setFilename(filename);
        uploadedFile.setPath(storage.getBase_path());
        uploadedFile.setSize(file.getSize());
        uploadedFile.setExt(FileUtils.getExtensionFromFilename(file.getOriginalFilename()));
        ImageInstance imageInstance = saveUploadInfoFormInfo(imageId, storage, diskUrl, uploadedFile);
        return imageInstance;
    }

    private ImageInstance saveUploadInfoFormInfo(String imageId, Storage storage, String diskUrl, UploadedFile uploadedFile) throws DeploymentException, IOException {
        uploadedFile.setStorage_id(storage.getId());
//        uploadedFile.setProject_id(idProject);
//        QueryBuilder queryBuilder = new QueryBuilder();
//        queryBuilder.and("filename").is(uploadedFile.getFilename());
//        long count = mongoTemplate.count(new BasicQuery(queryBuilder.get().toString()), ImageInstance.class);
//        if (count > 0) {
//            return;
//        }

        File currentFile = new File(diskUrl);
        if (!currentFile.getName().equals(FileUtils.correctFileName(currentFile.getName()))) {
            String newPath = currentFile.toPath().getParent().toString();
            newPath += File.separator + FileUtils.correctFileName(currentFile.getName());
            Files.move(currentFile.toPath(), Paths.get(newPath));
            currentFile = new File(newPath);
        }

        log.info("isClassicFolder:" + diskUrl);
        ImageInstance imageInstance = new ImageInstance();
        if (FormatIdentifier.isClassicFolder(diskUrl)) {
            boolean errorFlag = false;
            String errorMsg = "";
            log.info("isClassicFolder:" + diskUrl);
            for (File it : currentFile.listFiles()) {
                if (!it.getName().equals("__MACOSX")) {
                    try {
                        log.info("ClassicFolder_listFiles:" + it.getAbsolutePath());
                        //a simple folder will not create an UploadedFile object
                        UploadedFile uploadedConvertFile = new UploadedFile();
                        uploadedConvertFile.setOriginal_filename(it.getName());
                        uploadedConvertFile.setFilename(it.getAbsolutePath().replace(storage.getBase_path(), ""));
                        uploadedConvertFile.setPath(storage.getBase_path());
                        uploadedConvertFile.setSize(it.length());
                        uploadedConvertFile.setExt(FileUtils.getExtensionFromFilename(it.getName()));
                        imageInstance = saveUploadInfoFormInfo(imageId, storage, it.getAbsolutePath(), uploadedConvertFile);
                    } catch (DeploymentException e) {
                        errorFlag = true;
                        errorMsg += e.getMessage() + "\n";
                    }
                }
            }
            if (errorFlag) {
                throw new DeploymentException(errorMsg);
            }
            return imageInstance;
        }


        Format format;
        try {
            format = FormatIdentifier.getImageFormat(diskUrl);
            log.info("图片格式分析成功:{}",format.getMimeType());
        } catch (FormatException | IOException | InterruptedException e) {
            log.info("图片格式分析异常", e);
            uploadedFile.setStatus(3);
            mongoTemplate.save(uploadedFile);
            throw new DeploymentException("格式异常");
        }
        if (format instanceof IConvertableImageFormat) {
            String[] files = new String[]{};
            try {
                files = ((IConvertableImageFormat) format).convert(); // try catch et status conversion ERROR
            } catch (Exception e) {
                e.printStackTrace();
            }
            for (String file : files) {
                log.info("convertFileUrl:" + file);
                File convertFile = new File(file);
                UploadedFile uploadedConvertFile = new UploadedFile();
                uploadedConvertFile.setOriginal_filename(convertFile.getName());
                uploadedConvertFile.setFilename(convertFile.getAbsolutePath().replace(storage.getBase_path(), ""));
                uploadedConvertFile.setPath(storage.getBase_path());
                uploadedConvertFile.setSize(convertFile.length());
                uploadedConvertFile.setExt(FileUtils.getExtensionFromFilename(convertFile.getName()));
                imageInstance = saveUploadInfoFormInfo(imageId, storage, file, uploadedConvertFile);
            }
        } else {
            if (format instanceof OpenSlideMultipleFileFormat) {
                File root = ((OpenSlideMultipleFileFormat) format).getRootFile(currentFile);
                uploadedFile.setOriginal_filename(root.getName());
                uploadedFile.setFilename(root.getAbsolutePath().replace(uploadedFile.getPath(), ""));
            }
            Map<String, Object> imageMap = ((SupportedImageFormat) format).properties();
            //uploadedFile.setContent_type(imageMap.get("mimeType").toString());
            log.info("mimeType:" + format.getMimeType());
            uploadedFile.setContent_type(format.getMimeType());
            uploadedFile.setStatus(2);
            imageInstance = saveImageInfoFromInfo(imageId,imageMap, uploadedFile);
        }
        return imageInstance;
    }

    public ImageInstance saveImageInfoFromInfo(String imageId,Map<String, Object> imageMap, UploadedFile uploadedFile) {
        log.info("图片属性" + JSONObject.toJSONString(imageMap));

        AbstractImage abstractImage = new AbstractImage();
        abstractImage.setResolution(Double.parseDouble(imageMap.get("cytomine.resolution").toString()));
        abstractImage.setBase_path(uploadedFile.getPath());
        abstractImage.setExtension(uploadedFile.getExt());
        abstractImage.setFilename(uploadedFile.getFilename());
        abstractImage.setPath(uploadedFile.getFilename());
        abstractImage.setHeight(Integer.parseInt(imageMap.get("cytomine.height").toString()));
        abstractImage.setWidth(Integer.parseInt(imageMap.get("cytomine.width").toString()));
        abstractImage.setOriginal_filename(uploadedFile.getOriginal_filename());

        List<Mime> mimes = mongoTemplate.find(Query.query(Criteria.where("mime_type").is(uploadedFile.getContent_type())), Mime.class);
        if (mimes.size() > 0) {
            abstractImage.setMime(mimes.get(0).getId());
            abstractImage.setMime_num(mimes.get(0).getId_num());
            abstractImage.setMimeType(mimes.get(0).getMime_type());
        }

        HttpServletRequest request = ServletUtils.getRequest();
        List<ImageServer> servers = mongoTemplate.findAll(ImageServer.class);
        abstractImage.setImageServerIds(servers.stream().map(ImageServer::getId).collect(Collectors.toList()));

        mongoTemplate.save(abstractImage);


        uploadedFile.setImage_id(abstractImage.getId());
        mongoTemplate.save(uploadedFile);

        ImageInstance imageInstance = new ImageInstance();
        if (StringUtils.isNotNull(imageId)&&!imageId.trim().equals("")){
            imageInstance.setId(imageId);
            ImageInstance instance = mongoTemplate.findById(imageId,ImageInstance.class);
            if (ObjectUtils.isNotNull(instance)&&ObjectUtils.isNotEmpty(instance.getCreateTime())){
                imageInstance.setCreateTime(instance.getCreateTime());
            }
        }
        imageInstance.setBaseImageId(abstractImage.getId());
        imageInstance.setProjectId(uploadedFile.getProject_id());

        imageInstance.setOriginalFilename(abstractImage.getOriginal_filename());
        imageInstance.setInstanceFilename(FileUtils.correctFileName(imageInstance.getOriginalFilename()));
        imageInstance.setResolution(abstractImage.getResolution());
        imageInstance.setBase_path(abstractImage.getBase_path());
        imageInstance.setExtension(abstractImage.getExtension());
        imageInstance.setFilename(abstractImage.getFilename());
        imageInstance.setPath(abstractImage.getFilename());
        imageInstance.setHeight(abstractImage.getHeight());
        imageInstance.setWidth(abstractImage.getWidth());
        imageInstance.setNumberOfAnnotations(0);
        imageInstance.setMime(abstractImage.getMime());
        imageInstance.setMime_num(abstractImage.getMime_num());
        imageInstance.setMimeType(abstractImage.getMimeType());
        imageInstance.setDataType(2);

        imageInstance.setImageServerIds(abstractImage.getImageServerIds());
        mongoTemplate.save(imageInstance);
        return imageInstance;
    }

    private BufferedImage changeImageType(BufferedImage bufferedImage){


        try {
            //如果是jpg或者是jpeg，需要重画一下，否则会变色
            if (bufferedImage.getType()==3) { //重画一下，要么会变色
                BufferedImage tag;
                tag = new BufferedImage(bufferedImage.getWidth(), bufferedImage.getHeight(), BufferedImage.TYPE_INT_BGR);
                Graphics g = tag.getGraphics();
                g.drawImage(bufferedImage, 0, 0, null); // 绘制缩小后的图
                g.dispose();
                bufferedImage = tag;
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return bufferedImage;
    }

    private ImageInstance saveUploadInfo(String idProject, Storage storage, String diskUrl, UploadedFile uploadedFile, ImageInfo imageInfo) throws DeploymentException, IOException {
        ImageInstance imageInstance = new ImageInstance();
        uploadedFile.setStorage_id(storage.getId());
        uploadedFile.setProject_id(idProject);
        QueryBuilder queryBuilder = new QueryBuilder();
        queryBuilder.and("filename").is(uploadedFile.getFilename());
        long count = mongoTemplate.count(new BasicQuery(queryBuilder.get().toString()), ImageInstance.class);
        if (count > 0) {
            return imageInstance;
        }

        File currentFile = new File(diskUrl);
        if (!currentFile.getName().equals(FileUtils.correctFileName(currentFile.getName()))) {
            String newPath = currentFile.toPath().getParent().toString();
            newPath += File.separator + FileUtils.correctFileName(currentFile.getName());
            Files.move(currentFile.toPath(), Paths.get(newPath));
            currentFile = new File(newPath);
        }

        log.info("isClassicFolder:" + diskUrl);
        if (FormatIdentifier.isClassicFolder(diskUrl)) {
            boolean errorFlag = false;
            String errorMsg = "";
            log.info("isClassicFolder:" + diskUrl);
            for (File it : currentFile.listFiles()) {
                if (!it.getName().equals("__MACOSX")) {
                    try {
                        log.info("ClassicFolder_listFiles:" + it.getAbsolutePath());
                        //a simple folder will not create an UploadedFile object
                        UploadedFile uploadedConvertFile = new UploadedFile();
                        uploadedConvertFile.setOriginal_filename(it.getName());
                        uploadedConvertFile.setFilename(it.getAbsolutePath().replace(storage.getBase_path(), ""));
                        uploadedConvertFile.setPath(storage.getBase_path());
                        uploadedConvertFile.setSize(it.length());
                        uploadedConvertFile.setExt(FileUtils.getExtensionFromFilename(it.getName()));
                        saveUploadInfo(idProject, storage, it.getAbsolutePath(), uploadedConvertFile, imageInfo);
                    } catch (DeploymentException e) {
                        errorFlag = true;
                        errorMsg += e.getMessage() + "\n";
                    }
                }
            }
            if (errorFlag) {
                throw new DeploymentException(errorMsg);
            }
            return imageInstance;
        }


        Format format;
        log.info("图片格式分析");
        log.info(diskUrl);
        try {
            format = FormatIdentifier.getImageFormat(diskUrl);
            log.info("图片格式分析成功");
        } catch (FormatException | IOException | InterruptedException e) {
            log.info("图片格式分析异常", e);
            uploadedFile.setStatus(3);
            mongoTemplate.save(uploadedFile);
            throw new DeploymentException("格式异常");
        }
        if (format instanceof IConvertableImageFormat) {
            String[] files = new String[]{};
            try {
                files = ((IConvertableImageFormat) format).convert(); // try catch et status conversion ERROR
            } catch (Exception e) {
                e.printStackTrace();
            }
            for (String file : files) {
                log.info("convertFileUrl:" + file);
                File convertFile = new File(file);
                UploadedFile uploadedConvertFile = new UploadedFile();
                uploadedConvertFile.setOriginal_filename(convertFile.getName());
                uploadedConvertFile.setFilename(convertFile.getAbsolutePath().replace(storage.getBase_path(), ""));
                uploadedConvertFile.setPath(storage.getBase_path());
                uploadedConvertFile.setSize(convertFile.length());
                uploadedConvertFile.setExt(FileUtils.getExtensionFromFilename(convertFile.getName()));
                saveUploadInfo(idProject, storage, file, uploadedConvertFile, imageInfo);
            }
        } else {
            if (format instanceof OpenSlideMultipleFileFormat) {
                File root = ((OpenSlideMultipleFileFormat) format).getRootFile(currentFile);
                uploadedFile.setOriginal_filename(root.getName());
                uploadedFile.setFilename(root.getAbsolutePath().replace(uploadedFile.getPath(), ""));
            }
            Map<String, Object> imageMap = ((SupportedImageFormat) format).properties();
            //uploadedFile.setContent_type(imageMap.get("mimeType").toString());
            log.info("mimeType:" + format.getMimeType());
            uploadedFile.setContent_type(format.getMimeType());
            uploadedFile.setStatus(2);
            imageInstance = saveImageInfo(imageMap, uploadedFile, imageInfo);

            //creation AbstractImage
//            try {
//                AbstractImage image = createAbstractImage(cytomine, uploadedFile, uploadedFileParent, format)
//                // fetch to get the last uploadedFile with the image
//                uploadedFile = cytomine.getUploadedFile(uploadedFile.id)
//                cytomine.editUploadedFile(uploadedFile.id, 2) // status DEPLOYED
//                return [images: [image],groups: []]
//            } catch (CytomineException e) {
//                cytomine.editUploadedFile(uploadedFile.id, 8) // status ERROR_DEPLOYMENT
//                throw new DeploymentException(e.getMsg())
//            }
        }

        return imageInstance;
    }

    public ImageInstance saveImageInfo(Map<String, Object> imageMap, UploadedFile uploadedFile, ImageInfo imageInfo) {
        log.info("图片属性" + JSONObject.toJSONString(imageMap));

        AbstractImage abstractImage = new AbstractImage();
        abstractImage.setResolution(Double.parseDouble(imageMap.get("cytomine.resolution").toString()));
        abstractImage.setMagnification(Double.parseDouble(imageMap.get("cytomine.magnification").toString()));
        abstractImage.setBase_path(uploadedFile.getPath());
        abstractImage.setExtension(uploadedFile.getExt());
        abstractImage.setFilename(uploadedFile.getFilename());
        abstractImage.setPath(uploadedFile.getFilename());
        abstractImage.setHeight(Integer.parseInt(imageMap.get("cytomine.height").toString()));
        abstractImage.setWidth(Integer.parseInt(imageMap.get("cytomine.width").toString()));
        abstractImage.setOriginal_filename(uploadedFile.getOriginal_filename());

        List<Mime> mimes = mongoTemplate.find(Query.query(Criteria.where("mime_type").is(uploadedFile.getContent_type())), Mime.class);
        if (mimes.size() > 0) {
            abstractImage.setMime(mimes.get(0).getId());
            abstractImage.setMime_num(mimes.get(0).getId_num());
            abstractImage.setMimeType(mimes.get(0).getMime_type());
        }

        HttpServletRequest request = ServletUtils.getRequest();
        List<ImageServer> servers = mongoTemplate.findAll(ImageServer.class);
        abstractImage.setImageServerIds(servers.stream().map(x -> x.getId()).collect(Collectors.toList()));

        mongoTemplate.save(abstractImage);


        uploadedFile.setImage_id(abstractImage.getId());
        mongoTemplate.save(uploadedFile);

        ImageInstance imageInstance = new ImageInstance();

        imageInstance.setBaseImageId(abstractImage.getId());
        imageInstance.setProjectId(uploadedFile.getProject_id());

        imageInstance.setOriginalFilename(abstractImage.getOriginal_filename());
        imageInstance.setInstanceFilename(FileUtils.correctFileName(imageInstance.getOriginalFilename()));
        imageInstance.setResolution(abstractImage.getResolution());
        imageInstance.setBase_path(abstractImage.getBase_path());
        imageInstance.setExtension(abstractImage.getExtension());
        imageInstance.setFilename(abstractImage.getFilename());
        imageInstance.setPath(abstractImage.getFilename());
        imageInstance.setHeight(abstractImage.getHeight());
        imageInstance.setWidth(abstractImage.getWidth());
        imageInstance.setNumberOfAnnotations(0);
        imageInstance.setMime(abstractImage.getMime());
        imageInstance.setMime_num(abstractImage.getMime_num());
        imageInstance.setMimeType(abstractImage.getMimeType());
        imageInstance.setMagnification(abstractImage.getMagnification());

//        if (ObjectUtils.isNotEmpty(imageInfo)) {
//            imageInstance.setSource(imageInfo.getSource());
//            imageInstance.setPathologyNumber(imageInfo.getPathologyNumber());
//            imageInstance.setCancerName(imageInfo.getCancerName());
//            imageInstance.setMultiple(imageInfo.getMultiple());
//            imageInstance.setWsiType(imageInfo.getWsiType());
//            imageInstance.setPlace(imageInfo.getPlace());
//        }

        imageInstance.setImageServerIds(abstractImage.getImageServerIds());
        log.info(JSONObject.toJSONString(imageInstance));
        mongoTemplate.save(imageInstance);
        return imageInstance;
    }

}
