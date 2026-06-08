import os

from utils.ip_region.xdb_searcher import XdbSearcher


class IpUtils(object):
    _searcher: XdbSearcher

    def __init__(self):
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        vi = XdbSearcher.loadVectorIndexFromFile(dbfile=f"{root_dir}/static/ip_region/ip2region.xdb")
        searcher = XdbSearcher(dbfile=f"{root_dir}/static/ip_region/ip2region.xdb", vectorIndex=vi)
        self._searcher = searcher

    def search(self, ip: str) -> str:
        region_str = None
        try:
            region_str = self._searcher.search(ip)
            if region_str and "|0" in region_str:
                region_str = region_str.replace("|0", "")
        except Exception as e:
            region_str = ''
            print('search ip error ', e)
        return region_str

    def close(self):
        self._searcher.close()


ip_utils = IpUtils()
