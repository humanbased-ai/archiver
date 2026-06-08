package com.wsi.annotation.api.ims.formats;

/***
* For format identified by the tiffinfo command
**/
public interface ITIFFFormat {
    boolean detect(String tiffinfo);
}
