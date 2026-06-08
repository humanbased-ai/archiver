import config.mongodb as mongodb
import asyncio
import uuid
import re
import json
from bson.objectid import ObjectId
import os
import oss2
import config.oss_config as oss_config
import schedulers.slide_label as slide_label
import time
import shutil
from shapely.geometry import Polygon,MultiPolygon
import traceback

class SlideToQupath:

    def __init__(self, annotation=None, height=0):
        self.annotation = annotation
        self.height = height
        self.color_map = {
            "Gleason Pattern 3+3": [210, 0, 0],
            "Gleason Pattern 3+4": [140, 0, 0],
            "Gleason Pattern 3+5": [70, 0, 0],
            "Gleason Pattern 4+3": [0, 210, 0],
            "Gleason Pattern 4+4": [0, 140, 0],
            "Gleason Pattern 4+5": [0, 70, 0],
            "Gleason Pattern 5+3": [0, 0, 210],
            "Gleason Pattern 5+4": [0, 0, 140],
            "Gleason Pattern 5+5": [0, 0, 70],
            "Pattern 3 Glands": [210, 210, 0],
            "Pattern 4 Glands": [140, 140, 0],
            "Pattern 5": [70, 70, 0],
            "benign": [0, 210, 210],
            'PDC': [210, 0, 0],
            "TB": [0, 210, 0],
            "TB/PDC Hotspot": [0, 0, 210],
            "Invasive Front": [0, 0, 0]
        }

    def generate_qupath_geojson(self, save_path):
        # 生成qupath的geojson文件
        # 1. 读取annotation
        # 2. 生成geojson
        # 3. 保存geojson
        genjson = {
            "type": "FeatureCollection",
            "features": []
        }
        for annotation in self.annotation:
            coordinates = self.get_coordinates(annotation)
            if coordinates is None or len(coordinates) < 3:
                continue

            data = {
                "type": "Feature",
                "id": str(uuid.uuid4()),
                "properties": {},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coordinates]
                }
            }

            if "tag" in annotation:
                tag = annotation['tag']['name']
                color = self.color_map[tag]
                data['properties'] = {
                    "objectType": "annotation",
                    "classification": {
                        "name": tag,
                        "color": color
                    }
                }

            genjson['features'].append(data)
        with open(save_path, 'w') as f:
            json.dump(genjson, f, indent=4)

        return genjson

    def get_coordinates(self, annotation):
        if annotation['location']['type'] == 'Polygon':
            return self.get_points(annotation['simplify_location'])
        if annotation['location']['type'] == 'LineString':
            return self.line_to_polygon(annotation['simplify_location'])

    def line_to_polygon(self, line):
        pattern = r"[\d\.]+ [\d\.]+"
        coordinates = re.findall(pattern, line)
        coordinates_list = []
        for coord_str in coordinates:
            coord = coord_str.split()
            x = round(float(coord[0]))
            y = round(self.height-float(coord[1]))
            coordinates_list.append([x, y])
        coordinates_list.append(coordinates_list[-1])
        reuslt = self.remove_intersecting_edges(coordinates_list)
        # print(reuslt)
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
            x = round(float(coord[0]))
            y = round(self.height-float(coord[1]))
            coordinates_list.append([x, y])
        return coordinates_list

    def get_file_name_and_content(self, save_path):
        # 获取文件名
        file_name = os.path.basename(save_path)

        # 获取文件内容
        with open(save_path, 'rb') as file:
            file_data = file.read()

        return file_name, file_data

    def upload_to_oss(self,directory , save_path):
        file_name, file_data = self.get_file_name_and_content(save_path)
        url = oss_config.get_private_endpoint() + f"{file_name}"
        try:
            auth = oss2.AuthV4(oss_config.get_id(), oss_config.get_secret())
            region = oss_config.get_region()
            print(f"region {region}")
            bucket = oss2.Bucket(auth, oss_config.get_private_endpoint(),
                                 oss_config.get_bucket_name(), region=region, is_cname=True)
            # 上传文件到OSS
            result = bucket.put_object("qupath_data/"+directory+"/"+file_name, file_data)
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

async def test():
    db = await mongodb.getDB()
    # await schedule(db, '66daa279bf2e073839b974d5')
    annotation =  db.user_annotation.find({"image_id" : "6721b1241fd7cb0ac380bd06", "delFlag" : 0})
    slide_to_qupath = SlideToQupath(annotation, 40995)
    roi = slide_to_qupath.generate_qupath_geojson('../qupath_data/test.geojson')
    print(roi)

async def schedule(db,datasetId):
    try:
        query = {
            "selected": 1,
            "delFlag": 0
        }
        marks = db['image_mark'].find(query)
        slideLabel = slide_label.SlideLabel()
        csvname = "slide_label"
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

            caseInfo = db['case_Info'].find_one({"_id": ObjectId(caseId),"delFlag" : 0})
            if caseInfo is not None and 'dataSetId' in caseInfo and str(caseInfo['dataSetId']) == datasetId:
                imageInstance = db['image_instance'].find_one({"projectId": ObjectId(caseId), "delFlag" : 0})
                if imageInstance is not None:
                    input_str = str(imageInstance['filename'])

                    # 使用 split 方法分割字符串
                    parts = input_str.split('/')

                    # 过滤掉空字符串
                    parts = [part for part in parts if part]
                    # 提取需要的部分
                    csvname = parts[0]
                    slide_id = parts[1]
                    slide_name = parts[2]

                    annotation = db.user_annotation.find({"image_id": str(imageInstance['_id']),"user_id":mark['userId'], "delFlag": 0})
                    slide_to_qupath = SlideToQupath(annotation, imageInstance['height'])
                    instanceFilename = imageInstance['instanceFilename'].replace('.svs', '.geojson')
                    save_path = os.path.join('qupath_data', instanceFilename)
                    roi = slide_to_qupath.generate_qupath_geojson(save_path)
                    slide_to_qupath.upload_to_oss(csvname,save_path)
                    slideLabel.append(slide_id, slide_name, markTagName, markContent, roi)

        csv_path = os.path.join('qupath_data', csvname+".csv")
        slideLabel.save(csv_path)
        slide_to_qupath = SlideToQupath(None)
        slide_to_qupath.upload_to_oss(csvname,csv_path)
        slide_to_qupath.delete_files_in_directory('qupath_data')
    except Exception as e:
        traceback.print_exc()
        print(f"发生错误: {e}")

if __name__ == '__main__':
    asyncio.run(test())

