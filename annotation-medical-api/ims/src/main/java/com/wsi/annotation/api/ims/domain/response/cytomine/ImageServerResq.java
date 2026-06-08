package com.wsi.annotation.api.ims.domain.response.cytomine;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ImageServerResq {
    List<String> imageServersURLs;
}
