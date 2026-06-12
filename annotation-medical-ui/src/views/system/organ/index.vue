<template>
  <div class="app-container">
    <h2 class="title">{{$t('organManage')}}</h2>
    <el-row :gutter="12">
        <!-- 放一个 <el-card shadow="hover" class="organ"> 里面就放一个加号，排在前面 让他高度和下面的一致-->
        <el-col :span="6">
            <el-card shadow="hover" class="organ">
                <i class="el-icon-plus" @click="handleAdd()" ></i>
            </el-card>
        </el-col>
        <el-col :span="6" v-for="(item,index) in organList" :key="index">
            <el-card shadow="hover" class="organ">
                <h3 :title="item.organName">{{ item.organName }}</h3>
                <p class="count">{{$t('datasetCount')}}: {{ item.datasetNum }}</p>
                <div class="annotate-container">
                    <el-button class="annotate" @click="handleUpdate(item)"  size="mini">{{$t('update')}}</el-button>
                    <el-button class="annotate" @click="handleDelete(item)" size="mini">{{$t('delete')}}</el-button>
                </div>
            </el-card>
        </el-col>
    </el-row>
    

    

    <!-- 添加或修改器官对话框 -->
    <el-dialog :title="title" :visible.sync="open" width="600px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="140px">
        <el-row>
          <el-col :span="12">
            <el-form-item :label="$t('organName')" prop="organName">
              <input v-model="form.organName" type="text" class="el-input__inner" placeholder="please enter organ name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="form.id">
          <el-col :span="24">
            <el-form-item :label="$t('diagnosticLabel')">
              <div class="tag-container">
                <el-input v-model="newTag" placeholder="please enter tag" @keyup.enter="addTag"></el-input>
                <el-button size="small" type="primary" @click="addTag">{{$t('add')}}</el-button>
              </div>
              <div class="tags">
                <el-tag 
                  v-for="(tag, index) in tags" 
                  :key="index" 
                  closable 
                  @close="removeTag(index)"
                >
                  {{ tag.name }}
                </el-tag>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item :label="$t('areaLabel')">
              <div class="tag-container">
                <el-input v-model="newAreaTag" placeholder="please enter area tag" @keyup.enter="addAreaTag"></el-input>
                <el-button size="small" type="primary" @click="addAreaTag">{{$t('add')}}</el-button>
              </div>
              <div class="tags">
                <el-tag 
                  v-for="(tag, index) in areaTags" 
                  :key="index" 
                  closable 
                  @close="removeAreaTag(index)"
                >
                  {{ tag.name }}
                </el-tag>
              </div>
            </el-form-item>
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
import { listOrgan, getOrgan, delOrgan, addOrgan, updateOrgan,addTag,deleteTag,tagList,addAreaTag,deleteAreaTag,areaTagList } from "@/api/system/organ";
import Treeselect from "@riophae/vue-treeselect";
import "@riophae/vue-treeselect/dist/vue-treeselect.css";
import IconSelect from "@/components/IconSelect";

export default {
  name: "Organ",
  // dicts: ['sys_show_hide', 'sys_normal_disable'],
  components: { Treeselect, IconSelect },
  data() {
    return {
      // 遮罩层
      loading: true,
      // 显示搜索条件
      showSearch: true,
      // 菜单表格树数据
      organList: [],
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
        { value: 0, text: "start-up" }, { value: 1, text: "Disable" },
      ],
      visible: [
        { value: 0, text: "show" }, { value: 1, text: "hidden" },
      ],
      isFrame: [
        { value: 0, text: "yes" }, { value: 1, text: "no" },
      ],
      // 查询参数
      queryParams: {
        menuName: undefined,
        visible: undefined
      },
      // 表单参数
      form: {},
      newTag: '',
      newAreaTag: '',
      tags: [],
      areaTags: [],
      tagForm: {
      },
      areaTagForm: {
      },
      // 表单校验
      rules: {
        organName: [
          { required: true, message: "Organ name cannot be empty", trigger: "blur" }
        ]
      }
    };
  },
  created() {
    this.getList();
  },
  methods: {
    // 选择图标
    selected(name) {
      this.form.icon = name;
    },
    /** 查询菜单列表 */
    getList() {
      this.loading = true;
      listOrgan(this.queryParams).then(response => {
        this.organList = response;
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
        organName: "",
      };
      this.newTag = '';
      this.tagForm = {};
      this.tags = [];
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
      this.title = "add organ";
      console.log(this.form);
    },
    /** 修改按钮操作 */
    handleUpdate(row) {
      this.reset();
      getOrgan(row).then(response => {
        this.form = response;
        this.open = true;
        this.title = "Organ Info Update";
        this.tagList();
        this.areaTagList();
        console.log(this.form);
      });
    },
    /** 提交按钮 */
    submitForm: function() {
      this.$refs["form"].validate(valid => {
        if (valid) {
          if (this.form.id != undefined) {
            updateOrgan(this.form).then(response => {
              this.$modal.msgSuccess("change success");
              this.open = false;
              this.getList();
            });
          } else {
            addOrgan(this.form).then(response => {
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
      this.$modal.confirm('Are you sure delete the item "' + row.organName + '"？').then(function() {
        return delOrgan(row);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("delete success");
      }).catch(() => {});
    },
    addTag() {
      const trimmedTag = this.newTag.trim();
      if (trimmedTag) {
        this.tagForm = {
          name: trimmedTag,
          organId: this.form.id
        };

        addTag(this.tagForm).then(() => {
        this.tagList();
        this.$modal.msgSuccess("add tag success");
      }); // 添加标签

        this.newTag = ''; // 清空输入框
      } else {
        this.$message.warning('The label cannot be empty'); // 提示消息
      }
    },
    removeTag(index) {
      this.tagForm = {
          id: this.tags[index].id,
      };
      deleteTag(this.tagForm).then(() => {
        this.tagList();
        this.$modal.msgSuccess("delete tag success");
      }); // 删除标签
    },
    tagList() {

      tagList({organId:this.form.id}).then(response => {
        this.tags = response;
      });
    },
    addAreaTag() {
      const trimmedTag = this.newAreaTag.trim();
      if (trimmedTag) {
        this.areaTagForm = {
          name: trimmedTag,
          organId: this.form.id
        };

        addAreaTag(this.areaTagForm).then(() => {
        this.areaTagList();
        this.$modal.msgSuccess("add tag success");
      }); // 添加标签

        this.newAreaTag = ''; // 清空输入框
      } else {
        this.$message.warning('The label cannot be empty'); // 提示消息
      }
    },
    removeAreaTag(index) {
      this.areaTagForm = {
          id: this.areaTags[index].id,
      };
      deleteAreaTag(this.areaTagForm).then(() => {
        this.areaTagList();
        this.$modal.msgSuccess("delete tag success");
      }); // 删除标签
    },
    areaTagList() {

      areaTagList({organId:this.form.id}).then(response => {
        this.areaTags = response;
      });
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

.annotate-container {
    display: flex;
    flex-direction: column;
    align-items: flex-end; /* 按钮靠右对齐 */
}
.annotate-container .el-button {
    margin-bottom: 10px;
}

.tag-container {
  display: flex;
  align-items: center;
}

.tags {
  margin-top: 10px;
}
</style>
