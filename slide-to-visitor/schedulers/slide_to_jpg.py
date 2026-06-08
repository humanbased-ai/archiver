import schedulers.WSI as WSI
import os
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import config.mongodb as mongodb
import re
import html2text
import oss2
from bson.objectid import ObjectId
import requests
import config.oss_config as oss_config
import time
import shutil
from shapely.geometry import Polygon,MultiPolygon
import re
import json

font_style = ImageFont.truetype("font/SimHei.ttf", 40, encoding="utf-8")


class SlideToJpg:

    def __init__(self, slide_path, annotation=None, lable=None, description=None):
        self.DOWNSAMPLE_FACTOR = 16
        self.slide_path = slide_path
        self.wsi = WSI.WSI(slide_path, self.DOWNSAMPLE_FACTOR)
        self.thumbnail = self.wsi.thumbnail
        self.annotation = annotation
        self.height,self.width = np.shape(self.thumbnail)[:2]
        self.lable = lable
        self.description = description

    def draw_annotation(self, annotation, pil_image):
        draw = ImageDraw.Draw(pil_image)
        polygon_points = []
        if annotation['location']['type'] == 'Polygon':
            polygon_points = self.get_points(annotation['simplify_location'])
        if annotation['location']['type'] == 'LineString':
            polygon_points = self.line_to_polygon(annotation['simplify_location'])

        if polygon_points is None or len(polygon_points) < 3:
            return
        draw.polygon(polygon_points, outline="blue", fill=None, width=5)
        text_position = self.get_good_position_to_text(polygon_points)
        if 'tag' in annotation:
            draw.text(text_position, annotation['tag']['name'], font=font_style, fill=(0, 0, 0, 255))
        if 'description' in annotation:
            description_text = html2text.html2text(annotation['description'])
            draw.text((text_position[0],text_position[1]+80), description_text, font=font_style, fill=(0, 0, 0, 255))

    def get_good_position_to_text(self, polygon_points):
        x = 0
        y = 0
        for point in polygon_points:
            x += point[0]
            y += point[1]
        x = x // len(polygon_points)
        y = y // len(polygon_points)
        return x, y


    def line_to_polygon(self, line):
        pattern = r"[\d\.]+ [\d\.]+"
        coordinates = re.findall(pattern, line)
        coordinates_list = []
        for coord_str in coordinates:
            coord = coord_str.split()
            x = float(coord[0]) / self.DOWNSAMPLE_FACTOR
            y = self.height-float(coord[1]) / self.DOWNSAMPLE_FACTOR
            coordinates_list.append((x, y))
        coordinates_list.append(coordinates_list[-1])
        reuslt = self.remove_intersecting_edges(coordinates_list)
        return reuslt

    def remove_intersecting_edges(self, polygon_coords):
        polygon = Polygon(polygon_coords)
        # print(polygon)
        if not polygon.is_valid:
            # print(polygon)
            # Attempt to fix the polygon by merging intersecting edges
            fixed_polygon = polygon.buffer(0)
            if isinstance(fixed_polygon, MultiPolygon):
                # 如果修复后是 MultiPolygon，提取每个 Polygon 的外边界
                return [list(polygon.exterior.coords) for polygon in fixed_polygon.geoms]
            else:
                # 如果修复后仍然是 Polygon，直接返回其外边界
                return list(fixed_polygon.exterior.coords)
        else:
            # 如果多边形已经有效，直接返回其外边界
            return list(polygon.exterior.coords)


    def get_points(self, simplify_location):
        # 使用正则表达式提取坐标
        pattern = r"[\d\.]+ [\d\.]+"  # 匹配形如 "58927.634496574756 27328" 的坐标
        coordinates = re.findall(pattern, simplify_location)
        coordinates_list = []
        # 将提取的坐标转换为浮点数元组
        for coord_str in coordinates:
            coord = coord_str.split()
            x = float(coord[0]) / self.DOWNSAMPLE_FACTOR
            y = self.height-float(coord[1]) / self.DOWNSAMPLE_FACTOR
            coordinates_list.append((x, y))
        return coordinates_list

    def slide_to_jpg(self, save_path):
        thumb = np.asarray(self.thumbnail)
        pil_image = Image.fromarray(thumb)
        # tmp_save_path = save_path.replace('.png', '_tmp.jpg')
        # pil_image.save(tmp_save_path, "JPEG")
        # image = Image.open(tmp_save_path).convert("RGBA")
        for a in self.annotation:
            self.draw_annotation(a, pil_image)
        self.draw_lable_description(pil_image)
        pil_image.save(save_path,"JPEG")
        return save_path

    def draw_lable_description(self, pil_image):
        draw = ImageDraw.Draw(pil_image)
        if self.lable is not None:
            draw.text((50, 50), self.lable, font=font_style, fill=(0, 0, 0, 255))
        if self.description is not None:
            description_text = html2text.html2text(self.description)
            draw.text((50, 120), description_text, font=font_style, fill=(0, 0, 0, 255))
        return pil_image

    def get_file_name_and_content(self, save_path):
        # 获取文件名
        file_name = os.path.basename(save_path)

        # 获取文件内容
        with open(save_path, 'rb') as file:
            file_data = file.read()

        return file_name, file_data

    def upload_to_oss(self, save_path):
        file_name, file_data = self.get_file_name_and_content(save_path)
        url = oss_config.get_private_endpoint() + f"{file_name}"
        try:
            auth = oss2.AuthV4(oss_config.get_id(), oss_config.get_secret())
            region = oss_config.get_region()
            bucket = oss2.Bucket(auth, oss_config.get_private_endpoint(),
                                 oss_config.get_bucket_name(), region=region, is_cname=True)
            # 上传文件到OSS
            result = bucket.put_object(file_name, file_data)
            # 检查上传结果
            if result.status == 200:
                print(f"文件 {file_name} 上传成功！")
            else:
                print(f"文件 {file_name} 上传失败，状态码: {result.status}")
        except Exception as e:
            print(f"上传文件 {file_name} 时发生错误: {e}")
        return url

    def delete_files_in_directory(self,directory_path, delay_seconds=30):
        # 等待指定的秒数
        time.sleep(delay_seconds)

        # 检查目录是否存在
        if os.path.exists(directory_path):
            # 遍历目录并删除文件和子目录
            for filename in os.listdir(directory_path):
                file_path = os.path.join(directory_path, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                except Exception as e:
                    print(f"无法删除 {file_path}. 原因: {e}")
        else:
            print(f"目录 {directory_path} 不存在")

async def schedule(db):
    try:
        print("start")
        query = {
            "selected": 1,
            "$or": [
                {"upload_status": {"$ne": 1}},
                {"upload_status": {"$exists": False}}
            ]
        }
        marks = db['image_mark'].find(query)
        with open('output.json', 'a') as json_file:
            for mark in marks:
                caseId = mark['caseId']
                if 'markTag' not in mark or mark['markTag'] == '':
                    markTagName = None
                else:
                    markTagName = mark['markTag']['name']

                if 'markContent' not in mark or mark['markContent'] == '':
                    markContent = None
                else:
                    markContent = mark['markContent']

                caseInfo = db['case_Info'].find_one({"_id": ObjectId(caseId)})
                if caseInfo is not None:
                    datasetInfo = db['data_set'].find_one({"_id": ObjectId(caseInfo['dataSetId'])})
                    if datasetInfo is not None:
                        organInfo = db['sys_organ'].find_one({"_id": ObjectId(datasetInfo['organId'])})
                        imageInstance = db['image_instance'].find_one({"projectId": ObjectId(caseId)})
                        if imageInstance is not None:
                            allannotations = db['user_annotation'].find({"image_id": str(imageInstance['_id']), "delFlag": 0})
                            annotate_emails = []
                            for annotation in allannotations:
                                print(annotation['user_id'])
                                annotate = db['basic_user'].find_one({"_id": ObjectId(annotation['user_id'])})
                                if annotate['email'] not in annotate_emails:
                                    annotate_emails.append(annotate['email'])
                            annotations = db['user_annotation'].find({"image_id": str(imageInstance['_id']),"user_id":mark['userId'], "delFlag": 0})
                            roiNum = db['user_annotation'].count_documents({"image_id": imageInstance['_id'], "delFlag": 0})
                            basepath = os.getenv("basepath","/root/image-data")
                            # basepath = os.getenv("basepath", "/mnt/nas")
                            # slide_filename = imageInstance['filename'].replace("/PRAD/","/TCGA/PRAD/").replace("/TBPDC/","/TCGA/COAD/").replace("/PKG-CPTAC_COAD/COAD/","")
                            slide_path = basepath + imageInstance['filename']
                            # slide_path = basepath + slide_filename
                            save_path = os.path.join('tmp', os.path.basename(slide_path).split('.')[0] + '.jpg')
                            slide_to_jpg = SlideToJpg(slide_path, annotations, markTagName, markContent)
                            slide_to_jpg.slide_to_jpg(save_path)
                            url = save_path
                            # url = slide_to_jpg.upload_to_oss(save_path)
                            print(url)
                            # 定义 API 接口 URL
                            api_url = os.getenv("api.url","https://app.codatta.io/api/medical/upload")

                            validate = db['basic_user'].find_one({"_id": ObjectId(caseInfo['auditUserId'])})
                            # 正则表达式模式，用于匹配路径中的文件夹名称
                            slide_id = str(imageInstance['_id'])
                            pattern = r"^.*/([^/]+)/" + re.escape(str(imageInstance["originalFilename"])) + r"$"
                            path = str(imageInstance["path"])
                            match = re.search(pattern, path)
                            if match:
                                slide_id = match.group(1)
                            # 定义要发送的 JSON 参数
                            payload = {
                                "case_name": caseInfo['caseName'],
                                "dataset_name": datasetInfo['setName'],
                                "organ_name": organInfo['organName'],
                                "image_url": url,
                                "roi_number": roiNum,
                                "mark_tag": markTagName,
                                "mark_content": markContent,
                                "annotate_emails":annotate_emails,
                                "validate_emails":[validate['email']],
                                "slide_id":slide_id
                            }
                            print(payload)
                            json_file.write(json.dumps(payload) + '\n')
                            # 发送 POST 请求
                            response = requests.post(api_url, json=payload)
                            # 检查响应
                            if response.status_code == 200:
                                # 更新文档
                                db['image_mark'].update_one({'_id': mark['_id']}, {'$set': {'upload_status': 1}})
                            else:
                                db['image_mark'].update_one({'_id': mark['_id']}, {'$set': {'upload_status': 0}})
        slide_to_jpg = SlideToJpg("")
        slide_to_jpg.delete_files_in_directory('tmp')
    except Exception as e:
        print(f"发生错误: {e}")
