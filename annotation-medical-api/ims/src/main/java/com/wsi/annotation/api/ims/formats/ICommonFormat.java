package com.wsi.annotation.api.ims.formats;

/***
* For format identified by the imagemagik command
**/
public interface ICommonFormat {
    boolean detect(String imageMagikInfo);

}
