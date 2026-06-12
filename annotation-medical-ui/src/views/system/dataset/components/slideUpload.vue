<!-- Table -->
<template>
    <div>
        <el-dialog :append-to-body='true' title="上传切片" :visible.sync="dialogTableVisible" @close='onclose'
            width="1000px" :close-on-click-modal="false" :close-on-press-escape="false">
            <div style="margin: 25px 85px 0 45px;">
                <div class="upload_container" :key="caseInfo.id">
                    <p class="title">
                        上传文件（{{ caseInfo.caseName }}，{{ caseInfo.caseOrganName }}，{{ caseInfo.customerSex == 0 ? "男" : "女" }}{{+
                        caseInfo.customerAge
                            ? "，" + caseInfo.customerAge + '岁' : '' }}）
                    </p>
                    <p class="tips">上传文件格式仅只能上传 {{ accept }} 文件</p>
                    <el-upload class="upload-demo" :ref="'upload_' + caseInfo.id" action="#" :accept="accept" multiple
                        :auto-upload="false" :http-request="(param) => { handleUploadForm(param, caseInfo.id) }"
                        :on-change="(file, fileList) => { handleChange(file, fileList, caseInfo.id) }"
                        :on-success="(response, file, fileList) => { onSuccess(response, file, fileList, caseInfo.id) }"
                        :on-error="(err, file, fileList) => { onError(err, file, fileList, caseInfo.id) }"
                        :file-list="caseInfo.fileList">
                        <i class="el-icon-upload icon">上传文件</i>
                    </el-upload>
                </div>
            </div>
            
            <div slot="footer" class="dialog-footer" style="text-align: center;">
                <el-button type="primary" @click="onclose">关闭</el-button>
            </div>
        </el-dialog>
    </div>
</template>

<script>
import axios from "axios";
import { service_url } from "@/settings";
export default {
    props: {
        caseInfo: {
            type: Object,
            default: () => { }
        }
    },
    data() {
        return {
            dataList: [],
            dialogTableVisible: false,
            organList: [],
            activeIndex: 0,
            accept:
                ".dmetrix, .kfb, .ndp, .tmap, .zip, .rar, .mds, .tiff, .tif, .czi, .bmap, .vsi, .bif, .tron, .mdsx, .svs",
            actionURL: service_url,
            limit: 3,
            uploadingCount: 0,
            minPercent: {}, // 上传进度
            cnum: 0,
            uploadFiles: [],
        };
    },
    methods: {
        openDia() {
            this.dialogTableVisible = true
            console.log('caseInfo', this.caseInfo)
        },
        onclose() {
            this.dialogTableVisible = false
            this.$emit('getCaseInfo',this.caseInfo.id)
        },
        
        finishUpload() {
            if (this.uploadingCount > 0) {
                this.$message.error('请等待上传完成')
                return
            }
            this.activeIndex = 2
        },
        handleChange(file, fileList, id) {
            console.log('file', file)
            if (file.status == "ready") {
                this.onAddImageInstance(file, id)
            }
            else if (file.status == "success" || file.status == "fail") {
                if (this.uploadFiles.length > 0) {
                    setTimeout(() => {
                        this.$refs['upload_' + this.uploadFiles[0].id].submit();
                    }, 200);
                }

            }
        },
        handleUploadForm(param, id) {
            console.log('param', param)
            if (this.uploadingCount >= this.limit) {
                return
            }
            this.uploadingCount++;
            this.progressPercent = 1;
            this.progressFlag = true
            // let index = this.uids.findIndex(item => item === param.file.uid) 
            // 进度条
            const config = {
                onUploadProgress: (progressEvent) => {
                    let num = progressEvent.loaded / progressEvent.total * 100 | 0;
                    // if (num === 10 && index > -1) {
                    //     this.$store.state.app.globalNo = this.$store.state.app.globalNo + 1
                    // }
                    // console.log('num',num,param.file.name,progressEvent.loaded,progressEvent.total)
                    let min = this.minPercent[param.file.uid]
                    if (min) {
                        if (num < min) {
                            num = min
                            // console.log("min",num,param.file.name)
                        }
                    }
                    this.minPercent[param.file.uid] = num
                    param.onProgress({ percent: num })     //进度条 
                }
            };

            let formData = new FormData();
            formData.append("file", param.file);
            formData.append("idStorage", "62fddb62d63f0000c7001b16"); // 额外参数
            formData.append("idProject", id)
            // formData.append("imageId", this.ids[index]); // 额外参数
            // if (index > -1) {
            axios.post(this.actionURL, formData, config
            ).then((res) => {
                param.onSuccess(res)
            }).catch((err) => {
                param.onError(err)
            });
            // }
        },
        onSuccess(response, file, fileList, id) {
            console.log('response', response, id)
            this.uploadingCount--;
            if (response.data.code === 200) {
                this.cnum++
            }
            const data = eval("(" + response.data.data + ")")
            var item = this.caseInfo;
            console.log('file',this.$refs['upload_' + id])
            item.fileList = this.$refs['upload_' + id].uploadFiles
            console.log('item', item.fileList, item.fileList.length)
            // data.sliceType = this.$store.state.app.sliceType
            // data.caseNo = this.$store.state.app.globalPNo
            if (this.cnum === fileList.length) {
                this.progressPercent = 0
                this.progressFlag = false
            }
            this.uploadFiles = this.uploadFiles.filter(item => item.uid !== file.uid)
            this.$message.success("切片上传成功!")
            // this.uploadForm(data, id)
            // this.$emit("uploadForm", data);
        },
        onError(err, file, fileList, id) {
            console.log('err', err, id)
            var uploadRef = this.$refs['upload_' + id]
            this.uploadingCount--;
            if (this.cnum === uploadRef.uploadFiles.length || uploadRef.uploadFiles.length === 0) {
                this.progressPercent = 0
                this.progressFlag = false
            }
            this.$message({
                showClose: true,
                message: '无法识别该切片，上传失败!',
                duration: '5000',
                type: 'error'
            })
            this.uploadFiles = this.uploadFiles.filter(item => item.uid !== file.uid)
        },
        uploadForm(data, id) {
            this.$message.success("切片上传成功!")
            // var uploadRef = this.$refs['upload_'+id][0];

            // uploadRef.uploadFiles.forEach((element, index) => {
            //     console.log(element.status)
            //     if (element.status === 'success') {
            //         uploadRef.uploadFiles.splice(index, 1)
            //     }
            // });
        },
        onAddImageInstance(file, id) {
            this.uploadFiles.push({ id: id, uid: file.uid })
            setTimeout(() => { this.$refs['upload_' + id].submit(); }, 200);
        }
    }
};
</script>
<style scoped>
.newLine {
    margin: 10px 85px 30px 85px;
    text-align: center;
    color: #409EFF;
    cursor: pointer;
    border: 1px solid #409EFF;
    width: 850px;
    height: 30px;
    line-height: 30px;
}

.upload_container {
    width: 910px;
    /* height: 150px; */
    border: 1px solid #409EFF;
    border-left: 12px solid rgb(86, 119, 252);
    text-align: left;
    /* color: #409EFF; */
    cursor: pointer;
    font-size: 20px;
    background-color: rgb(240, 242, 245);
    border-radius: 2px;
    padding-left: 20px;
    padding-bottom: 20px;
    margin-bottom: 10px;

    .title {
        padding: 20px 20px 0 0;
        font-size: 16px;
        font-weight: bold;
    }

    .tips {
        font-size: 12px;
        color: #909399;
        padding: 10px 20px 10px 0;
    }

    .icon {
        font-size: 16px;
        color: #409EFF;
    }
}
</style>