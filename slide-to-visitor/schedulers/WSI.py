from cucim import CuImage
class WSI:
    def __init__(self, slide_path, DOWNSAMPLE_FACTOR):
        self.path = slide_path
        self.slide = CuImage(slide_path)
        self.resolutions = self.slide.resolutions  # contains : level_count, level_dimensions, level_downsamples, level_tile_sizes
        self.mpp = float(self.slide.metadata['aperio']['MPP'])
        self.level_count = self.resolutions['level_count']
        self.level_downsamples = self.resolutions['level_downsamples']
        self.DOWNSAMPLE_FACTOR = DOWNSAMPLE_FACTOR
        self.downsample_load = 1
        self.downsample_thumb = 4
        self.level_load = 0
        self.downsample_thumb, self.level_thumb, self.downsample_load, self.level_load = self.get_thumbnail()
        self.thumbnail = self.slide.read_region(level=self.level_thumb, num_workers=4)

    def check_level_downsample(self):
        for downsample in self.level_downsamples:
            if self.DOWNSAMPLE_FACTOR == int(downsample):
                return True
        return False

    def find_level(self, target_downsample):
        for index in range(len(self.level_downsamples)):
            if target_downsample == int(self.level_downsamples[index]):
                return index
        else:
            print("Error, can not find according level")
            raise ValueError("Error, can not find according level")


    def get_thumbnail(self):
        check_res = self.check_level_downsample()  # check if this wsi has thumb_downsample 8, if not return False
        if not check_res:
            # TODO 目前的逻辑是thumb默认是DOWNSAMPLE_FACTOR的结果，DOWNSAMPLE_FACTOR的值设为4，后续根据情况修改，2024/Jan/9
            # TODO 目前图像读取送入模型的部分，图像都是从wsi,level=0读取的
            # TODO 注意这个是给穿刺测试用的，大的wsi用level=1可能会报错，后续根据具体使用场景可以修改，2023/Dec/21
            downsample_load = 1
            downsample_thumb = 4
        else:
            downsample_load = 1
            downsample_thumb = self.DOWNSAMPLE_FACTOR

        # find according slide level
        level_thumb = self.find_level(downsample_thumb)
        level_load = self.find_level(downsample_load)

        return downsample_thumb, level_thumb, downsample_load, level_load
