package com.wsi.annotation.api.common.utils.http;

import com.wsi.annotation.api.common.constant.Constants;
import com.wsi.annotation.api.common.utils.ServletUtils;
import org.apache.commons.io.IOUtils;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicNameValuePair;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.imageio.ImageIO;
import javax.net.ssl.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.awt.image.RenderedImage;
import java.io.*;
import java.net.*;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 通用http发送方法
 *
 * @author early
 */
public class HttpUtils {
    private static final Logger log = LoggerFactory.getLogger(HttpUtils.class);

    /**
     * 向指定 URL 发送GET方法的请求
     *
     * @param url   发送请求的 URL
     * @param param 请求参数，请求参数应该是 name1=value1&name2=value2 的形式。
     * @return 所代表远程资源的响应结果
     */
    public static String sendGet(String url, String param) {
        return sendGet(url, param, Constants.UTF8);
    }

    /**
     * 向指定 URL 发送GET方法的请求
     *
     * @param url         发送请求的 URL
     * @param param       请求参数，请求参数应该是 name1=value1&name2=value2 的形式。
     * @param contentType 编码类型
     * @return 所代表远程资源的响应结果
     */
    public static String sendGet(String url, String param, String contentType) {
        StringBuilder result = new StringBuilder();
        BufferedReader in = null;
        try {
            String urlNameString = url + "?" + param;
            log.info("sendGet - {}", urlNameString);
            URL realUrl = new URL(urlNameString);
            URLConnection connection = realUrl.openConnection();
            connection.setRequestProperty("accept", "*/*");
            connection.setRequestProperty("connection", "Keep-Alive");
            connection.setRequestProperty("user-agent", "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1;SV1)");
            connection.connect();
            in = new BufferedReader(new InputStreamReader(connection.getInputStream(), contentType));
            String line;
            while ((line = in.readLine()) != null) {
                result.append(line);
            }
            log.info("recv - {}", result);
        } catch (ConnectException e) {
            log.error("调用HttpUtils.sendGet ConnectException, url=" + url + ",param=" + param, e);
        } catch (SocketTimeoutException e) {
            log.error("调用HttpUtils.sendGet SocketTimeoutException, url=" + url + ",param=" + param, e);
        } catch (IOException e) {
            log.error("调用HttpUtils.sendGet IOException, url=" + url + ",param=" + param, e);
        } catch (Exception e) {
            log.error("调用HttpsUtil.sendGet Exception, url=" + url + ",param=" + param, e);
        } finally {
            try {
                if (in != null) {
                    in.close();
                }
            } catch (Exception ex) {
                log.error("调用in.close Exception, url=" + url + ",param=" + param, ex);
            }
        }
        return result.toString();
    }

    /**
     * 向指定 URL 发送POST方法的请求
     *
     * @param url   发送请求的 URL
     * @param param 请求参数，请求参数应该是 name1=value1&name2=value2 的形式。
     * @return 所代表远程资源的响应结果
     */
    public static String sendPost(String url, String param, Map<String, String> header) throws Exception {
        PrintWriter out = null;
        BufferedReader in = null;
        StringBuilder result = new StringBuilder();
        try {
            String urlNameString = url;
            log.info("sendPost - {}", urlNameString);
            URL realUrl = new URL(urlNameString);
            URLConnection conn = realUrl.openConnection();
            conn.setRequestProperty("accept", "*/*");
            conn.setRequestProperty("connection", "Keep-Alive");
            conn.setRequestProperty("user-agent", "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1;SV1)");
            conn.setRequestProperty("Accept-Charset", "utf-8");
            conn.setRequestProperty("contentType", "utf-8");
            if (null != header) {
                for (String key : header.keySet()) {
                    conn.setRequestProperty(key, header.get(key));
                }
            }
            conn.setDoOutput(true);
            conn.setDoInput(true);
            out = new PrintWriter(conn.getOutputStream());
            out.print(param);
            out.flush();
            in = new BufferedReader(new InputStreamReader(conn.getInputStream(), "utf-8"));
            String line;
            while ((line = in.readLine()) != null) {
                result.append(line);
            }
            log.info("recv - {}", result);
        } finally {
            try {
                if (out != null) {
                    out.close();
                }
                if (in != null) {
                    in.close();
                }
            } catch (IOException ex) {
                log.error("调用in.close Exception, url=" + url + ",param=" + param, ex);
            }
        }
        return result.toString();
    }

    public static String sendSSLPost(String url, String param) {
        StringBuilder result = new StringBuilder();
        String urlNameString = url + "?" + param;
        try {
            log.info("sendSSLPost - {}", urlNameString);
            SSLContext sc = SSLContext.getInstance("SSL");
            sc.init(null, new TrustManager[]{new TrustAnyTrustManager()}, new java.security.SecureRandom());
            URL console = new URL(urlNameString);
            HttpsURLConnection conn = (HttpsURLConnection) console.openConnection();
            conn.setRequestProperty("accept", "*/*");
            conn.setRequestProperty("connection", "Keep-Alive");
            conn.setRequestProperty("user-agent", "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1;SV1)");
            conn.setRequestProperty("Accept-Charset", "utf-8");
            conn.setRequestProperty("contentType", "utf-8");
            conn.setDoOutput(true);
            conn.setDoInput(true);

            conn.setSSLSocketFactory(sc.getSocketFactory());
            conn.setHostnameVerifier(new TrustAnyHostnameVerifier());
            conn.connect();
            InputStream is = conn.getInputStream();
            BufferedReader br = new BufferedReader(new InputStreamReader(is));
            String ret = "";
            while ((ret = br.readLine()) != null) {
                if (ret != null && !"".equals(ret.trim())) {
                    result.append(new String(ret.getBytes("ISO-8859-1"), "utf-8"));
                }
            }
            log.info("recv - {}", result);
            conn.disconnect();
            br.close();
        } catch (ConnectException e) {
            log.error("调用HttpUtils.sendSSLPost ConnectException, url=" + url + ",param=" + param, e);
        } catch (SocketTimeoutException e) {
            log.error("调用HttpUtils.sendSSLPost SocketTimeoutException, url=" + url + ",param=" + param, e);
        } catch (IOException e) {
            log.error("调用HttpUtils.sendSSLPost IOException, url=" + url + ",param=" + param, e);
        } catch (Exception e) {
            log.error("调用HttpsUtil.sendSSLPost Exception, url=" + url + ",param=" + param, e);
        }
        return result.toString();
    }

    private static class TrustAnyTrustManager implements X509TrustManager {
        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType) {
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType) {
        }

        @Override
        public X509Certificate[] getAcceptedIssuers() {
            return new X509Certificate[]{};
        }
    }

    private static class TrustAnyHostnameVerifier implements HostnameVerifier {
        @Override
        public boolean verify(String hostname, SSLSession session) {
            return true;
        }
    }

    /**
     * @param resp
     * @param inputStream
     * @description: 将输入流输出到页面
     */
    public static void writeFile(HttpServletResponse resp, InputStream inputStream) {
        OutputStream out = null;
        try {
            out = resp.getOutputStream();
            int len = 0;
            byte[] b = new byte[1024];
            while ((len = inputStream.read(b)) != -1) {
                out.write(b, 0, len);
            }
            out.flush();
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            try {
                if (out != null) {
                    out.close();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    /**
     * @param resp
     * @param bytes
     * @description: 将输入流输出到页面
     */
    public static void writeFile(HttpServletResponse resp, byte[] bytes) {
        OutputStream out = null;
        try {
            out = resp.getOutputStream();
            out.write(bytes, 0, bytes.length);
            out.flush();
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            try {
                if (out != null) {
                    out.close();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public static void downloadImage(HttpServletResponse response, String url) {
        try {
            URL source = new URL(url);
            URLConnection connection = source.openConnection();
            response.setContentType("image/jpeg");
            // Set the content length
            response.setHeader("Content-Length", String.valueOf(connection.getContentLength()));
            // Get the input stream from the connection
            InputStream is = connection.getInputStream();
            HttpUtils.writeFile(response, is);
            is.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Response an image as a HTTP response
     *
     * @param bufferedImage Image
     */
    public static void responseBufferedImage(RenderedImage bufferedImage) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        HttpServletRequest request = ServletUtils.getRequest();
        HttpServletResponse response = ServletUtils.getResponse();
        try {
            StringBuffer url = request.getRequestURL();
            String formatName = ServletUtils.getParameter("format");
            if (url.lastIndexOf(".png") == url.length() - 4) {
                formatName = "png";
            } else if (url.lastIndexOf(".jpg") == url.length() - 4 || url.lastIndexOf(".jpeg") == url.length() - 5) {
                formatName = "jpeg";
            }
            ImageIO.write(bufferedImage, formatName, baos);
            byte[] bytesOut = baos.toByteArray();
            response.setContentLength(baos.size());
            response.setHeader("Connection", "Keep-Alive");
            response.setHeader("Accept-Ranges", "bytes");
            response.setHeader("Content-Type", "image/" + formatName);
            //log.info(baos.toString());
            HttpUtils.writeFile(response, bytesOut);
            response.getOutputStream().flush();
        } catch (Exception e) {
            log.info("image", e);
            e.printStackTrace();
        }
    }

    public static void responseWriteImageByte(HttpServletResponse response, byte[] bytes, String format) throws IOException {
        response.setContentLength(bytes.length);
        response.setHeader("Connection", "Keep-Alive");
        response.setHeader("Accept-Ranges", "bytes");
        response.setHeader("Content-Type", "image/" + format);
        HttpUtils.writeFile(response, bytes);
        response.getOutputStream().flush();
    }

    public static String getQueryStringByMap(Map<String, Object> map) {
        String query = "";
        query = String.join("&", map.entrySet().stream().map(x -> {
            String s = "";
            try {
                s = x.getKey() + "=" + URLEncoder.encode(x.getValue().toString(), "UTF-8");
            } catch (UnsupportedEncodingException e) {
                e.printStackTrace();
            }
            return s;
        }).collect(Collectors.toList()));
        return query;
    }


    public static void responseUrl(String urlPath, String format, HttpServletResponse response) throws IOException {
        URL url = new URL(urlPath);
        String[] queries = url.getQuery().split("&");
        List<BasicNameValuePair> parameters = new ArrayList<>(queries.length);
        for (String parameter : queries) {
            String[] tmp = parameter.split("=");
            parameters.add(new BasicNameValuePair(tmp[0], URLDecoder.decode(tmp[1], "utf-8")));
        }

        HttpClient httpclient = HttpClients.createDefault();
        HttpPost httppost = new HttpPost(url.getProtocol() + "://" + url.getHost() + url.getPath());

        httppost.setEntity(new UrlEncodedFormEntity(parameters, "UTF-8"));

        HttpResponse httpResponse = httpclient.execute(httppost);
        InputStream instream = httpResponse.getEntity().getContent();
        byte[] bytesOut = IOUtils.toByteArray(instream);
        HttpUtils.responseWriteImageByte(response, bytesOut, format);
    }
}