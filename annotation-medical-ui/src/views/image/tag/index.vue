<template>
  <div class="app-container">
    <el-row>
      <!--用户数据-->
      <el-col :span="24" :xs="24">
        <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="68px">
          <el-form-item :label="$t('tagName')" prop="name" label-width="90px">
            <el-input
              v-model="queryParams.name"
              clearable
              style="width: 240px"
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <el-form-item :label="$t('tagPosition')" prop="position" label-width="90px">
            <el-input
              v-model="queryParams.position"
              clearable
              style="width: 240px"
              @keyup.enter.native="handleQuery"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">{{$t('search')}}</el-button>
            <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">{{$t('reset')}}</el-button>
          </el-form-item>
        </el-form>

        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5">
            <el-button
              type="primary"
              plain
              icon="el-icon-plus"
              size="mini"
              @click="handleAdd"
            >{{$t('add')}}</el-button>
          </el-col>
        </el-row>

        <el-table v-loading="loading" :data="list">
          <el-table-column :label="$t('tagName')" align="center" key="name" prop="name" />
          <el-table-column :label="$t('tagPosition')" align="center" key="position" prop="position"/>
          <el-table-column :label="$t('tagColor')" align="center" key="color" prop="color">
            <template slot-scope="scope">
              <div v-if="scope.row.color">
                <el-tag :color="scope.row.color"
                disable-transitions="true"
                  effect="dark">
                  {{ scope.row.color }}
                </el-tag>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('createTime')" align="center" key="createTime" prop="createTime">
            <template slot-scope="scope">
              <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('option')"
            align="center"
            width="260"
            class-name="small-padding fixed-width"
          >
            <template slot-scope="scope">
              <el-button
                size="mini"
                type="text"
                @click="handleUpdate(scope.row)"
              >{{$t('update')}}</el-button>
              <el-button
                size="mini"
                type="text"
                @click="handleDelete(scope.row)"
              >{{$t('delete')}}</el-button>
            </template>
          </el-table-column>
        </el-table>

        <pagination
          v-show="total>0"
          :total="total"
          :page.sync="queryParams.current"
          :limit.sync="queryParams.pageSize"
          @pagination="getList"
        />
      </el-col>
    </el-row>

    <!-- 添加标签对话框 -->
    <el-dialog :title="title" :visible.sync="open" width="600px" append-to-body>
      <el-form ref="form" :model="form" :rules="rules" label-width="80px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="标签名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入标签名称" maxlength="30" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="标签位置" prop="position">
              <el-input v-model="form.position" type="textarea" placeholder="请输入标签位置"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="标签颜色">
              <el-color-picker v-model="color"></el-color-picker>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="cancel">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { tagList, deleteTag, addTag, updateTag } from "@/api/image/tag";
import Treeselect from "@riophae/vue-treeselect";
import "@riophae/vue-treeselect/dist/vue-treeselect.css";

export default {
  name: "Tag",
  components: { Treeselect },
  data() {
    return {
      // 遮罩层
      loading: true,
      // 显示搜索条件
      showSearch: true,
      // 总条数
      total: 0,
      // 用户表格数据
      list: null,
      // 弹出层标题
      title: "",
      // 是否显示弹出层
      open: false,

      tags:[],

      // 表单参数
      form: {},
   
      // 查询参数
      queryParams: {
        current: 1,
        pageSize: 10,
        name: undefined,
        position: undefined,
      },
      // 表单校验
      rules: {
        name: [
          { required: true, message: "标签名称不能为空", trigger: "blur" },
        ],
        position: [
          { required: true, message: "标签位置不能为空", trigger: "blur" }
        ],
      },
      color: '#409EFF',
    };
  },
  created() {
    this.getList();
  },
  methods: {
    getList() {
      this.loading = true;
      tagList(this.queryParams).then(response => {
          this.list = response.records;
          this.total = response.total;
          this.loading = false;
        }
      );
    },
    // 取消按钮
    cancel() {
      this.open = false;
      this.reset();
    },
    // 表单重置
    reset() {
      this.form = {
        name: undefined,
        position: undefined,
      };
      this.resetForm("form");
    },
    /** 搜索按钮操作 */
    handleQuery() {
      this.queryParams.current = 1;
      this.getList();
    },
    /** 重置按钮操作 */
    resetQuery() {
      this.resetForm("queryForm");
      this.handleQuery();
    },
    /** 新增按钮操作 */
    handleAdd() {
      this.open = true;
      this.title = "添加标签";
    },
    handleUpdate(row) {
      this.open = true;
      this.title = "修改标签";
      this.form = {
        id: row.id,
        name: row.name,
        position: row.position,
      };
      this.color = row.color;
    },
    /** 提交按钮 */
    submitForm: function() {
      this.$refs["form"].validate(valid => {
        if (valid) {
          if(!this.color) {
            this.$modal.msgError("标签颜色不能为空");
            return
          }
          this.form.color = this.color;
          if (this.form.id != undefined) {
            updateTag(this.form).then(response => {
              this.$modal.msgSuccess("修改成功");
              this.open = false;
              this.getList();
            });
          } else {
            addTag(this.form).then(response => {
              this.$modal.msgSuccess("新增成功");
              this.open = false;
              this.getList();
            });
          }
        }
      });
    },
    /** 删除按钮操作 */
    handleDelete(row) {
      this.$modal.confirm('是否确认删除用标签').then(function() {
        return deleteTag(row.id);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("删除成功");
      }).catch(() => {});
    },
  }
};
</script>