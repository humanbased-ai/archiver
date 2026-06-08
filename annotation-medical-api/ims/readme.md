##安装流程
    1.执行docker build -t ims-kangwang:v1 Docker/build/Dockerfile生成docker镜像
    2.docker create --name ims-kangwan-remote -v /home/gzbioinfo/service/coreone/remote-consultation/imagesvr:/home/cytomine/ims -v /mnt/data/kangwan/remote:/data/images -p 9093:9093 --restart=unless-stopped ims_kangwan:v1
    3.docker start ims-kangwan-remote
    

    