<template>
  <div class="app-container">
    <h2 class="title">{{$t('datasetManage')}}</h2>
    <el-row :gutter="12">
        <!-- 放一个 <el-card shadow="hover" class="organ"> 里面就放一个加号，排在前面 让他高度和下面的一致-->
        <el-col :span="6">
            <el-card shadow="hover" class="organ">
                <i class="el-icon-plus" @click="handleAdd()" ></i>
            </el-card>
        </el-col>
        <el-col :span="6"  v-for="(item,index) in datasetList" :key="index">
            <el-card shadow="hover" class="organ">
                <div class="info-container">
                  <h3>
                    {{ item.setName }}
                  </h3>
                  <h4 style="margin-top: 0px;margin-bottom: 0px;">{{ item.organName }}</h4>
                  <h4 class="count">{{$t('caseCount')}}: {{ item.sliceNum }}</h4>
                </div>
                

                <div class="annotate-container">
                    <el-button class="annotate" @click="goToCaseList(item.id)" size="mini">{{$t('view')}}</el-button>
                    <el-button class="annotate" @click="handleUpdate(item)"  size="mini">{{$t('update')}}</el-button>
                    <el-button class="annotate" @click="handleDelete(item)" size="mini">{{$t('delete')}}</el-button>
                </div>
            </el-card>
        </el-col>
    </el-row>
    

    

    <!-- 添加或修改数据集对话框 -->
    <el-dialog :title="title" :visible.sync="open" width="750px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="150px">
        <!-- 下拉框选择关联的器官，字段oragnId -->
        <el-row>
          <el-col :span="18">
            <el-form-item :label="$t('associatedOrgan')" prop="organId">
              <el-select v-model="form.organId" filterable placeholder="please select associated Organ">
                <el-option v-for="item in organList" :key="item.id" :label="item.organName" :value="item.id"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item :label="$t('datasetName')" prop="setName">
              <input v-model="form.setName" type="text" class="el-input__inner" placeholder="please enter dataset name" />
            </el-form-item>
          </el-col>
        </el-row>
        <!-- 选择所有者 -->
        <el-row>
          <el-col :span="24">
            <el-form-item :label="$t('owner')" prop="managerId">
              <el-select v-model="form.managerId" filterable placeholder="please select owner">
                <el-option v-for="item in selectManager" :key="item.id" :label="item.username" :value="item.id"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <!-- 选标注等级、审核等级，填标注人数（数字） -->
        <el-row>
          <el-col :span="12">
            <el-form-item :label="$t('markLevel')" prop="markLevel">
              <el-select v-model="form.markLevel" placeholder="please select mark level">
                <el-option v-for="item in skillLevel" :key="item.id" :label="item.name" :value="item.id"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('auditLevel')" prop="auditLevel">
              <el-select v-model="form.auditLevel" placeholder="please select audit level">
                <el-option v-for="item in skillLevel" :key="item.id" :label="item.name" :value="item.id"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item :label="$t('markNubmer')" prop="markNum">
              <!-- 限制只能填数字 -->
              <input v-model="form.markNum" type="number" class="el-input__inner" placeholder="please enter mark number" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item :label="$t('markRequire')" prop="markRequire">
              <!-- 文本域 -->
              <textarea v-model="form.markRequire" style="width: 550px; height: 100px;" class="el-textarea el-input__inner" placeholder="please enter annotation Require"></textarea>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item :label="$t('markTutorial')" prop="markCourse">
              <!-- 文本域 -->
              <editor v-model="form.markCourse" :min-height="192" style="width: 550px;" />
              <!-- <textarea v-model="form.markCourse" style="width: 400px; height: 100px;" class="el-textarea el-input__inner" placeholder="请输入标注教程"></textarea> -->
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitForm">{{$t('submit')}}</el-button>
        <el-button @click="cancel">{{ $t('cancel') }}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { listDataset, getDataset, delDataset, addDataset, updateDataset,listSelectManager } from "@/api/system/dataset";
import { listOrgan } from "@/api/system/organ";
import Treeselect from "@riophae/vue-treeselect";
import "@riophae/vue-treeselect/dist/vue-treeselect.css";
import IconSelect from "@/components/IconSelect";

export default {
  name: "Dataset",
  // dicts: ['sys_show_hide', 'sys_normal_disable'],
  components: { Treeselect, IconSelect },
  data() {
    return {
      // 遮罩层
      loading: true,
      // 显示搜索条件
      showSearch: true,
      // 器官列表
      organList: [],
      // 技能等级
      skillLevel: [{id: 0, name: "Junior"}, {id: 1, name: "Senior"}, {id: 2, name: "Expert"}],
      // 菜单表格树数据
      datasetList: [],
      selectManager: [],
      // 菜单树选项
      menuOptions: [],
      // 弹出层标题
      title: "",
      // 是否显示弹出层
      open: false,
      // 是否展开，默认全部折叠
      isExpandAll: false,
      // 重新渲染表格状态
      refreshTable: true,
      status: [
        { value: 0, text: "启动" }, { value: 1, text: "禁用" },
      ],
      visible: [
        { value: 0, text: "显示" }, { value: 1, text: "隐藏" },
      ],
      isFrame: [
        { value: 0, text: "是" }, { value: 1, text: "否" },
      ],
      // 查询参数
      queryParams: {
        menuName: undefined,
        visible: undefined
      },
      // 表单参数
      form: {},
      // 表单校验
      rules: {
        organName: [
          { required: true, message: "Dataset name cannot be empty", trigger: "blur" }
        ]
      }
    };
  },
  created() {
    this.getOrganList();
    this.getSelectManager();
    this.getList();
  },
  methods: {
    // 选择图标
    selected(name) {
      this.form.icon = name;
    },
    /** 查询器官列表 */
    getOrganList() {
      listOrgan().then(response => {
        this.organList = response;
      });
    },
    getSelectManager() {
      listSelectManager().then(response => {
        this.selectManager = response;
      });
    },
    /** 查询菜单列表 */
    getList() {
      this.loading = true;
      listDataset(this.queryParams).then(response => {
        this.datasetList = response;
        this.loading = false;
      });
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
        setName: "",
        markCourse: "",
        markRequire: "",
        organId: "",
        markLevel: 0,
        auditLevel: 1,
        markNum: 3
      };
      this.resetForm("form");
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.getList();
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.resetForm("queryForm");
      this.handleQuery();
    },
    /** 新增按钮操作 */
    handleAdd() {
      this.reset();
      this.open = true;
      this.title = "add dataset";
      console.log(this.form);
    },
    goToCaseList(id) {
      this.$router.push({ path: '/system/dataset/caseList/'+id });
    },
    /** 修改按钮操作 */
    handleUpdate(row) {
      this.reset();
      getDataset(row).then(response => {
        this.form = response;
        this.open = true;
        this.title = "change  dataset";
      });
    },
    /** 提交按钮 */
    submitForm: function() {
      this.$refs["form"].validate(valid => {
        if (valid) {
          if (this.form.id != undefined) {
            updateDataset(this.form).then(response => {
              this.$modal.msgSuccess("change success");
              this.open = false;
              this.getList();
            });
          } else {
            addDataset(this.form).then(response => {
              this.$modal.msgSuccess("add success");
              this.open = false;
              this.getList();
            });
          }
        }
      });
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      this.$modal.confirm('are you sure delete the item "' + row.setName + '"？').then(function() {
        return delDataset(row);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("delete success");
      }).catch(() => {});
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
</style>
