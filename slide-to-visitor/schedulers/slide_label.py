import csv
import json

class SlideLabel:

    list = [["slide_id", "slide_name", "label", "diagnosis", 'roi_number']]

    def append(self, slide_id, slide_name, label, diagnosis, roi):
        self.list.append([slide_id, slide_name, label, diagnosis, len(roi['features'])])

    def save(self, save_path):
        # 写入 CSV 文件
        with open(save_path, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerows(self.list)


if __name__ == '__main__':
    slideLabel = SlideLabel()
    slideLabel.append("111", "test", "lable", "zhengduan", {"type": "FeatureCollection","features":[]})
    slideLabel.save("../qupath_data/PRAD.csv")
