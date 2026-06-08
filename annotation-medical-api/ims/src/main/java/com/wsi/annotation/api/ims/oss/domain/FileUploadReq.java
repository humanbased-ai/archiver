package com.wsi.annotation.api.ims.oss.domain;

public class FileUploadReq {

    private int fileType;
    private String fileSuffix;
    private String dataStream;

    public int getFileType() {
        return fileType;
    }

    public void setFileType(int fileType) {
        this.fileType = fileType;
    }

    public String getFileSuffix() {
        return fileSuffix;
    }

    public void setFileSuffix(String fileSuffix) {
        this.fileSuffix = fileSuffix;
    }

    public String getDataStream() {
        return dataStream;
    }

    public void setDataStream(String dataStream) {
        this.dataStream = dataStream;
    }
}
