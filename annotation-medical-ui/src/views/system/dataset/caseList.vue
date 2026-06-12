<template>
  <div class="app-container">
    <h2 class="title">{{$t('caseManage')}}</h2>
    <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" label-width="100px">
        <el-form-item :label="$t('caseName')" prop="caseName">
            <el-input v-model="queryParams.caseName" clearable style="width: 240px"
                @keyup.enter.native="handleQuery" />
        </el-form-item>
        <el-form-item>
            <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">{{ $t('search')
                }}</el-button>
            <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">{{ $t('reset') }}</el-button>
        </el-form-item>
    </el-form>
    <el-row :gutter="12">
        <!-- 放一个 <el-card shadow="hover" class="organ"> 里面就放一个加号，排在前面 让他高度和下面的一致-->
        <el-col :span="6">
            <el-card shadow="hover" class="organ">
                <i class="el-icon-plus" @click="handleAdd()" ></i>
            </el-card>
        </el-col>
        <el-col :span="6"  v-for="(item,index) in caseList" :key="index">
            <el-card shadow="hover" class="organ">
              <div class="info-container">
                <h3>{{ item.caseName }}</h3>
                <p class="count">{{$t('sliceCount')}}: {{ item.svsList?item.svsList.length:0 }}</p>
              </div>
                <div class="annotate-container">
                    <el-button class="annotate" @click="handleUpdate(item)"  size="mini">{{$t('update')}}</el-button>
                    <el-button class="annotate" @click="handleDelete(item)" size="mini">{{$t('delete')}}</el-button>
                    <el-button class="annotate" @click="resetTheCase(item)" size="mini">{{$t('reset')}}</el-button>

                </div>
            </el-card>
        </el-col>
    </el-row>
    <pagination v-show="total > 0" :total="total" :page.sync="queryParams.current" :limit.sync="queryParams.pageSize"
            @pagination="handleQuery" />

    <!-- 添加或修改数据集对话框 -->
    <el-dialog :title="title" :visible.sync="open" width="600px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="120px">
        <el-row>
          <el-col :span="12">
            <el-form-item :label="$t('dataset')" prop="setName">
              <span>{{ datasetInfo.setName }}</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="18">
            <el-form-item :label="$t('caseName')" prop="caseName">
              <input v-model="form.caseName" type="text" class="el-input__inner" placeholder="Please input Case Name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="18">
            <el-form-item :label="$t('caseRemark')" prop="caseRemark">
              <textarea v-model="form.caseRemark" style="width: 300px; height: 100px;" class="el-input__inner" placeholder="Please input Case Remark" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="form.id">
          <el-col :span="24">
              <div class="upload_container">
                  <p class="title">
                      Upload file（{{ form.caseName }}）
                  </p>
                  <p class="tips">Accept file type: {{ accept }} </p>
                  <el-upload class="upload-demo" :ref="'upload_' + form.id" action="#"
                      list-type="picture-card"
                      :accept="accept" multiple
                      :auto-upload="false" :http-request="(param) => { handleUploadForm(param, form.id) }"
                      :on-change="(file, fileList) => { handleChange(file, fileList, form.id) }"
                      :on-success="(response, file, fileList) => { onSuccess(response, file, fileList, form.id) }"
                      :on-error="(err, file, fileList) => { onError(err, file, fileList, form.id) }"
                      :on-remove="onRemove"
                      :file-list="form.svsList">
                      <!-- <i class="el-icon-upload icon">上传文件</i> -->
                      <i class="el-icon-plus"></i>
                  </el-upload>
              </div>
          </el-col>
        </el-row>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitForm">{{$t('submit')}}</el-button>
        <el-button @click="cancel">{{$t('cancel')}}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listCaseInfo, getCaseInfo, delCaseInfo, addCaseInfo, updateCaseInfo,delImageInstance,resetCase,pageCaseInfo } from "@/api/system/caseinfo";
import {  getDataset } from "@/api/system/dataset";
import { service_url,baseUrl_img,baseUrl,image_url } from "@/settings";
import { listOrgan } from "@/api/system/organ";
import axios from "axios";
import Treeselect from "@riophae/vue-treeselect";
import "@riophae/vue-treeselect/dist/vue-treeselect.css";
import IconSelect from "@/components/IconSelect";

export default {
  name: "CaseInfo",
  // dicts: ['sys_show_hide', 'sys_normal_disable'],
  components: { Treeselect, IconSelect },
  props: {
    datasetId: {
      type: String, // 或 Number，取决于你的参数类型
      required: true
    }
  },
  data() {
    return {
      // 遮罩层
      loading: true,
      // 显示搜索条件
      showSearch: true,
      // 器官列表
      organList: [],
      datasetInfo: {},
      // 技能等级
      skillLevel: [{id: 0, name: "Junior"}, {id: 1, name: "Senior"}, {id: 2, name: "Expert"}],
      // 菜单表格树数据
      caseList: [],
      // 菜单树选项
      menuOptions: [],
      
      activeIndex: 0,
      accept:
          ".dmetrix, .kfb, .ndp, .tmap, .zip, .rar, .mds, .tiff, .tif, .czi, .bmap, .vsi, .bif, .tron, .mdsx, .svs",
      actionURL: service_url,
      limit: 3,
      uploadingCount: 0,
      minPercent: {}, // 上传进度
      cnum: 0,
      uploadFiles: [],
      // 弹出层标题
      title: "",
      // 是否显示弹出层
      open: false,
      // 是否展开，默认全部折叠
      isExpandAll: false,
      // 重新渲染表格状态
      refreshTable: true,
      status: [
        { value: 0, text: "start-up" }, { value: 1, text: "shut down" },
      ],
      visible: [
        { value: 0, text: "显示" }, { value: 1, text: "隐藏" },
      ],
      isFrame: [
        { value: 0, text: "是" }, { value: 1, text: "否" },
      ],
      total: 0,
      // 查询参数
      queryParams: {
          dataSetId: '',
          caseName: '',
          caseStatus: undefined,
          statusSort: 0,
          isJoin: 0,
          current: 1,
          pageSize: 50
      },
      // 表单参数
      form: {
        id: undefined,
        caseName: "",
        dataSetId: "",
        fileList: []
      },
      // 表单校验
      rules: {
        organName: [
          { required: true, message: "Dataset name cannot be empty", trigger: "blur" }
        ]
      }
    };
  },
  created() {
    this.getDataSetInfo();
    this.getList();
  },
  methods: {
    handleQuery() {
          this.getList()
    },
    resetQuery() {
        this.resetForm("queryForm");
        this.getList();
    },
    // 选择图标
    selected(name) {
      this.form.icon = name;
    },
    /** 查询器官列表 */
    getDataSetInfo() {
      getDataset({id:this.datasetId}).then(response => {
        this.datasetInfo = response;
      });
    },
    /** 查询菜单列表 */
    getList() {
      this.loading = true;
      this.queryParams.dataSetId = this.datasetId;
      console.log(this.queryParams);
      // listCaseInfo(this.queryParams).then(response => {
      //   this.caseList = response;
      //   this.loading = false;
      // });

      pageCaseInfo(this.queryParams).then(response => {
          this.caseList = response.rows.map(item => {
              item.baseImageId = '';
              if (item.svsList && item.svsList.length > 0) {
                  item.baseImageId = item.svsList[0].baseImageId;
              }
              return item;
          })
          this.loading = false;
          this.total = response.records;
      })
    },
    /** 转换菜单数据结构 */
    normalizer(node) {
      if (node.children && !node.children.length) {
        delete node.children;
      }
      return {
        id: node.menuId,
        label: node.menuName,
        children: node.children
      };
    },
    // 取消按钮
    cancel() {
      this.open = false;
      this.reset();
    },
    // 表单重置
    reset() {
      this.form = {
        id: undefined,
        caseName: "",
        dataSetId: this.datasetId,
        fileList: []
      };
      this.resetForm("form");
    },
    /** 新增按钮操作 */
    handleAdd() {
      this.reset();
      this.open = true;
      this.title = "add case";
      console.log(this.form);
    },
    /** 修改按钮操作 */
    handleUpdate(row) {
      this.reset();
      getCaseInfo(row).then(response => {
        this.form = response;
        if (this.form.svsList == undefined) {
          this.form.svsList = [];
        }
        this.form.svsList.map(file => {
          file.url = image_url + `/imagecore/api/abstractimage/thumb.png?abstractImageId=${file.baseImageId}&maxSize=256`;
        });
        console.log(this.form);
        this.open = true;
        this.title = "Case Info Update";
      });
    },
    /** 提交按钮 */
    submitForm: function() {
      this.$refs["form"].validate(valid => {
        if (valid) {
          if (this.form.id != undefined) {
            updateCaseInfo(this.form).then(response => {
              this.$modal.msgSuccess("change success");
              this.open = false;
              this.getList();
            });
          } else {
            addCaseInfo(this.form).then(response => {
              this.$modal.msgSuccess("add success");
              this.open = false;
              this.getList();
            });
          }
        }
      });
    },
    /** 有名字先生成记录获取id */
    addCaseInfo() {
      if (this.form.id == undefined){
        addCaseInfo(this.form).then(response => {
          this.form = response;
        });
      }
    },

    resetTheCase(row) {
      resetCase(row).then(response => {
        this.$modal.msgSuccess("reset success");
      });
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      this.$modal.confirm('are you sure delete the item "' + row.caseName + '"？').then(function() {
        return delCaseInfo(row);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("delete success");
      }).catch(() => {});
    },
    /** 上传文件 */
    finishUpload() {
            if (this.uploadingCount > 0) {
                this.$message.error('please wait for the upload to complete');
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
                console.log('res', res)
                param.onSuccess(res)
            }).catch((err) => {
                console.log('err', err)
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
            var item = this.form;
            console.log('item', item)
            console.log('uploadFiles',this.$refs['upload_' + id])
            this.$refs['upload_' + id].uploadFiles[this.$refs['upload_' + id].uploadFiles.length - 1].url = image_url + `/imagecore/api/abstractimage/thumb.png?abstractImageId=${data.baseImageId}&maxSize=256`
            item.svsList = this.$refs['upload_' + id].uploadFiles
            
            console.log('item', item.svsList, item.svsList.length)
            // data.sliceType = this.$store.state.app.sliceType
            // data.caseNo = this.$store.state.app.globalPNo
            if (this.cnum === fileList.length) {
                this.progressPercent = 0
                this.progressFlag = false
            }
            this.uploadFiles = this.uploadFiles.filter(item => item.uid !== file.uid)
            this.$message.success("upload success!")
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
                message: 'upload failed',
                duration: '5000',
                type: 'error'
            })
            this.uploadFiles = this.uploadFiles.filter(item => item.uid !== file.uid)
        },
        onRemove(file) {
            console.log('被删除的文件:', file);
            delImageInstance(file).then(response => {
                this.$message.success("delete success!")
            });
        },
        uploadForm(data, id) {
            this.$message.success("upload success!")
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
<style lang="scss" scoped>
.title {
    padding-top: 0px;
    margin-top: 0px;
}
.organ {
    min-height: 215px;
    margin-top: 10px;
    padding-bottom: 15px;
    h3{
        margin-top: 10px;
        width:350px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .count {
        color: #606266;
    }
    .annotate{
        float: right;
        width: 100px;
    }
    i{
        font-size: 80px;
        color: #409EFF;
        margin-top: 50px;
        margin-left: 130px;
    }
}

.info-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start; /* 文字靠左对齐 */
    width: 200px;
    float: left;
  }

.annotate-container {
    display: flex;
    flex-direction: column;
    align-items: flex-end; /* 按钮靠右对齐 */
    padding-top: 50px;
    width: 100px;
    float: right;
}
.annotate-container .el-button {
    margin-bottom: 10px;
}

.upload_container {
    width: 570px;
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
::v-deep {
  .el-upload-list--picture-card .el-upload-list__item{
    height: 100px;
  }
  .el-upload--picture-card {
    height: 100px;
    line-height: 100px;
  }
}
</style>
