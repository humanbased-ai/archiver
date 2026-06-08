package com.wsi.annotation.api.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;

/**
 * 读取项目相关配置
 *
 * @author early
 */
@Component
@ConfigurationProperties(prefix = "project")
public class ProjectConfig {
    /**
     * 项目名称
     */
    private String name;

    /**
     * 版本
     */
    private String version;

    /**
     * 版权年份
     */
    private String copyrightYear;

    private static String checkLoginUrl;

    /**
     * 实例演示开关
     */
    private boolean demoEnabled;

    /**
     * 上传路径
     */
    private static String profile;

    /**
     * 获取地址开关
     */
    private static boolean addressEnabled;

    private static String iipsrvUrl;

    private static String serverUrl;

    private static String uiUrl;

    private static int maxCropSize;

    private static String tiffinfo;


    private static String identify;


    private static String imageConversionAlgorithm;
    private static String vips;

    private static boolean jpeg2000Enabled;

    public static String getCheckLoginUrl() {
        return checkLoginUrl;
    }

    public void setCheckLoginUrl(String checkLoginUrl) {
        this.checkLoginUrl = checkLoginUrl;
    }

    @Value("${bioformat.application.enabled}")
    private static boolean bioformatEnabled;



    @Value("${bioformat.application.location}")
    private static String bioformatLocation;

    @Value("${bioformat.application.port}")
    private static String bioformatPort;

    public static String getVips() {
        return vips;
    }

    public void setVips(String vips) {
        this.vips = vips;
    }

    public static String getTiffinfo() {
        return tiffinfo;
    }

    public void setTiffinfo(String tiffinfo) {
        this.tiffinfo = tiffinfo;
    }

    public static int getMaxCropSize() {
        return maxCropSize;
    }

    public void setMaxCropSize(int maxCropSize) {
        this.maxCropSize = maxCropSize;
    }

    public static String getServerUrl() {
        return serverUrl;
    }

    public void setServerUrl(String serverUrl) {
        this.serverUrl = serverUrl;
    }

    public static String getIipsrvUrl() {
        return iipsrvUrl;
    }

    public static String getUiUrl() {
        return uiUrl;
    }

    public void setUiUrl(String uiUrl) {
        this.uiUrl = uiUrl;
    }

    public void setIipsrvUrl(String iipsrvUrl) {
        this.iipsrvUrl = iipsrvUrl;
    }

    public static boolean isJpeg2000Enabled() {
        return jpeg2000Enabled;
    }

    public void setJpeg2000Enabled(boolean jpeg2000Enabled) {
        this.jpeg2000Enabled = jpeg2000Enabled;
    }

    public static String getIdentify() {
        return identify;
    }

    public void setIdentify(String identify) {
        this.identify = identify;
    }

    public static String getImageConversionAlgorithm() {
        return imageConversionAlgorithm;
    }

    public void setImageConversionAlgorithm(String imageConversionAlgorithm) {
        this.imageConversionAlgorithm = imageConversionAlgorithm;
    }

    public static boolean isBioformatEnabled() {
        return bioformatEnabled;
    }

    public  void setBioformatEnabled(boolean bioformatEnabled) {
        this.bioformatEnabled = bioformatEnabled;
    }

    public static String getBioformatLocation() {
        return bioformatLocation;
    }

    public  void setBioformatLocation(String bioformatLocation) {
        this.bioformatLocation = bioformatLocation;
    }

    public static String getBioformatPort() {
        return bioformatPort;
    }

    public  void setBioformatPort(String bioformatPort) {
        this.bioformatPort = bioformatPort;
    }


    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getCopyrightYear() {
        return copyrightYear;
    }

    public void setCopyrightYear(String copyrightYear) {
        this.copyrightYear = copyrightYear;
    }

    public boolean isDemoEnabled() {
        return demoEnabled;
    }

    public void setDemoEnabled(boolean demoEnabled) {
        this.demoEnabled = demoEnabled;
    }

    public static String getProfile() {
        return profile;
    }

    public void setProfile(String profile) {
        ProjectConfig.profile = profile;
    }

    public static boolean isAddressEnabled() {
        return addressEnabled;
    }

    public void setAddressEnabled(boolean addressEnabled) {
        ProjectConfig.addressEnabled = addressEnabled;
    }

    /**
     * 获取头像上传路径
     */
    public static String getAvatarPath() {
        return getProfile() + "/avatar";
    }

    /**
     * 获取下载路径
     */
    public static String getDownloadPath() {
        return getProfile() + "/download/";
    }

    /**
     * 获取上传路径
     */
    public static String getUploadPath() {
        return getProfile() + "/upload";
    }

    public static List<String> getIipServers() {
        return Arrays.asList(iipsrvUrl.split(","));
    }

    public static String getIipServer() {
        return getIipServers().get(new Random().nextInt(getIipServers().size()));
    }
}
