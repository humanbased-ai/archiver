<template>
  <div class="app-container">
    <el-row>
      <!--用户数据-->
      <el-col :span="24" :xs="24">
        <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="68px">
          <el-form-item label="序号" prop="id_num">
            <el-input v-model="queryParams.id_num" clearable style="width: 240px" @keyup.enter.native="handleQuery" />
          </el-form-item>
          <el-form-item :label="$t('imageName')" prop="instanceFilename">
            <el-input v-model="queryParams.instanceFilename" clearable style="width: 240px"
              @keyup.enter.native="handleQuery" />
          </el-form-item>
          <el-form-item :label="$t('tags')" prop="tags">
            <el-select v-model="queryParams.tagIds" multiple placeholder="请选择" @keyup.enter.native="handleQuery">
              <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.id">
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('pathologyNumber')" prop="pathologyNumber" label-width="120px">
            <el-input v-model="queryParams.pathologyNumber" clearable style="width: 240px"
              @keyup.enter.native="handleQuery" />
          </el-form-item>
          <el-form-item :label="$t('source')" prop="source">
            <el-select v-model="queryParams.source" clearable style="width: 240px">
              <el-option v-for="item in sources" :key="item.value" :label="item.text" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('maskStatus')" prop="isMasked">
            <el-select v-model="queryParams.isMasked" clearable style="width: 240px">
              <el-option v-for="item in maskStatus" :key="item.value" :label="item.text" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="切片等级" prop="quality">
            <el-select v-model="queryParams.quality" clearable style="width: 240px">
              <el-option v-for="item in qualityOptions" :key="item.value" :label="item.text" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('diagnostic')" prop="description" label-width="90px">
            <el-input v-model="queryParams.description" clearable style="width: 240px"
              @keyup.enter.native="handleQuery" />
          </el-form-item>
          <el-form-item :label="$t('place')" prop="place" label-width="90px">
            <el-input v-model="queryParams.place" clearable style="width: 240px" @keyup.enter.native="handleQuery" />
          </el-form-item>
          <el-form-item label="癌种" prop="cancer" label-width="90px">
            <el-input v-model="queryParams.cancer" clearable style="width: 240px" @keyup.enter.native="handleQuery" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">{{ $t('search')
            }}</el-button>
            <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">{{ $t('reset') }}</el-button>
          </el-form-item>
        </el-form>

        <el-row :gutter="10" class="mb8">

        </el-row>

        <el-table v-loading="loading" :data="imageList" @selection-change="handleSelectionChange">
          <el-table-column :label="$t('index')" align="center" key="id_num" prop="id_num" width="80px">
            <template slot-scope="scope">
              {{ scope.row.id_num }}
              <i class="el-icon-star-on" @click="updateQualityFun(scope.row, 0)" v-if="scope.row.quality == 1"></i>
              <i class="el-icon-star-off" @click="updateQualityFun(scope.row, 1)" v-else></i>
            </template>
          </el-table-column>>
          <el-table-column :label="$t('imageName')" align="center" key="instanceFilename" prop="instanceFilename" />
          <el-table-column :label="$t('overview')" align="center" key="thumb">
            <template slot-scope="scope">
              <el-image style="width: 100px; height: 100px" :src="scope.row.thumb"></el-image>
            </template>
          </el-table-column>
          <el-table-column :label="$t('wsiType')" align="center" key="wsiType" prop="wsiType" />
          <el-table-column :label="$t('pathologyNumber')" align="center" key="pathologyNumber" prop="pathologyNumber" />
          <el-table-column :label="$t('annotationsCount')" align="center" key="numberOfAnnotations"
            prop="numberOfAnnotations" />
          <el-table-column label="癌种" align="center" key="cancerName" prop="cancerName" />
          <el-table-column :label="$t('tags')" align="center" prop="tags">
            <template slot-scope="scope">
              <el-tag :key="tag.id" v-for="tag in scope.row.tags" :disable-transitions="false">
                {{ tag.tagName }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('diagnostic')" align="center" prop="description" width="160">
            <template slot-scope="scope">
              <div v-html="scope.row.description"></div>
            </template>
          </el-table-column>
          <el-table-column :label="$t('place')" align="center" key="place" prop="place" />
          <el-table-column :label="$t('isMasked')" align="center" key="isMasked" prop="isMasked">
            <template slot-scope="scope">
              {{ scope.row.isMasked == 1 ? $t('yes') : "" }}
              {{ scope.row.isMasked == 0 ? $t('no') : "" }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('option')" align="center" width="260" class-name="small-padding fixed-width">
            <template slot-scope="scope" v-if="scope.row.userId !== 1">
              <el-button size="mini" type="text" icon="el-icon-open" @click="handleOpen(scope.row)">{{ $t('open')
              }}</el-button>
              <el-button size="mini" type="text" @click="openSomaticMutations(scope.row)">细胞突变</el-button>
              <!-- <el-button
                size="mini"
                type="text"
                icon="el-icon-search"
                @click="imageSearch(scope.row)"
              >{{$t('imageSearch')}}</el-button> -->
              <el-button size="mini" type="text" icon="el-icon-edit" @click="changeMaskStatus(scope.row)"
                v-if="scope.row.isMasked != 2" v-hasPermi="['image:edit']">{{ scope.row.isMasked ? $t('maskCancel') :
                  $t('maskComplete') }}</el-button>
              <!-- <el-button
                size="mini"
                type="text"
                icon="el-icon-delete"
                @click="handleDelete(scope.row)"
                v-hasPermi="['system:user:remove']"
              >删除</el-button>
              <el-button
                size="mini"
                type="text"
                icon="el-icon-delete"
                @click="handleResetPwd(scope.row)"
                v-hasPermi="['system:user:resetPwd']"
              >重置密码</el-button> -->
            </template>
          </el-table-column>
        </el-table>

        <pagination v-show="total > 0" :total="total" :page.sync="queryParams.current" :limit.sync="queryParams.pageSize"
          @pagination="getList" />
      </el-col>
    </el-row>

    <!-- 添加或修改用户配置对话框 -->
    <el-dialog :title="title" :visible.sync="open" width="1400px" :fullscreen="true" append-to-body>
      <el-table v-loading="searchLoading" :data="seearchResult">
        <!-- <el-table-column :label="$t('index')" align="center" key="id_num" prop="id_num" /> -->
        <el-table-column :label="$t('imageName')" align="center" key="instanceFilename" prop="instanceFilename" />
        <el-table-column :label="$t('overview')" align="center" key="thumb">
          <template slot-scope="scope">
            <el-image style="width: 100px; height: 100px" :src="scope.row.thumb"></el-image>
          </template>
        </el-table-column>
        <el-table-column :label="$t('annotationsCount')" align="center" key="numberOfAnnotations"
          prop="numberOfAnnotations" />
        <el-table-column :label="$t('matchPatch')" align="center" key="matchedPatch" prop="matchedPatch" />
        <el-table-column :label="$t('patchCount')" align="center" key="totalPatch" prop="totalPatch" />
        <el-table-column :label="$t('tags')" align="center" prop="tags">
          <template slot-scope="scope">
            <el-tag :key="tag.id" v-for="tag in scope.row.tags" :disable-transitions="false">
              {{ tag.tagName }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('diagnostic')" align="center" prop="description" width="160">
          <template slot-scope="scope">
            <div v-html="scope.row.description"></div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('option')" align="center" width="260" class-name="small-padding fixed-width">
          <template slot-scope="scope">
            <el-button size="mini" type="text" icon="el-icon-edit" @click="handleOpen(scope.row)">{{ $t('open')
            }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog title="细胞突变" :visible.sync="openSomaticMutationsDia" width="1400px" append-to-body @close="closeSomatic">
      <el-form :model="somaticMutationsSearchData" ref="somaticMutationsSearch" size="small" :inline="true" label-width="98px">
        <el-form-item label="DNA Change" prop="dnaChange">
            <el-input v-model="somaticMutationsSearchData.dnaChange" clearable style="width: 150px"  />
          </el-form-item>
          <el-form-item label="VEP" prop="vep">
            <el-select v-model="somaticMutationsSearchData.vep" clearable style="width: 150px">
              <el-option v-for="item in vepOptions" :key="item.value" :label="item.text" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="SIFT" prop="sift">
            <el-select v-model="somaticMutationsSearchData.sift" clearable style="width: 150px">
              <el-option v-for="item in siftOptions" :key="item.value" :label="item.text" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="PolyPhen" prop="polyphen">
            <el-select v-model="somaticMutationsSearchData.polyphen" clearable style="width: 150px">
              <el-option v-for="item in polyphenOptions" :key="item.value" :label="item.text" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="el-icon-search" size="mini" @click="openSomaticMutations">{{ $t('search')
            }}</el-button>
            <el-button icon="el-icon-refresh" size="mini" @click="resetQuerySomatic">{{ $t('reset') }}</el-button>
          </el-form-item>
      </el-form>
      <el-table v-loading="searchLoading" :data="somaticMutationsList">
        <el-table-column type="index" width="50" />
        <!-- <el-table-column :label="$t('index')" align="center" key="id_num" prop="id_num" /> -->
        <el-table-column label="DNA Change" align="center" key="genomic_dna_change" prop="genomic_dna_change" />
        <el-table-column label="Type" align="center" key="mutation_subtype" prop="mutation_subtype" />
        <el-table-column label="Consequences" align="center" key="numberOfAnnotations" prop="numberOfAnnotations">
          <template slot-scope="scope">
            {{ scope.row.consequence.transcript.consequence_type | consequence_type }}
            {{ scope.row.consequence.transcript.gene.symbol }}
            {{ scope.row.consequence.transcript.aa_change }}
          </template>
        </el-table-column>
        <el-table-column label="Impact" align="center">
          <template slot="header" slot-scope="scope">

            <el-tooltip class="item" effect="dark" placement="top-start">
              <div slot="content">lmpact for canonical transcript<br />
                VEP:<el-tag size="mini" color="red" style="color: #fff;">HI</el-tag>high
                <el-tag size="mini" color="green" style="color: #fff;">LO</el-tag>low
                <el-tag size="mini" color="rgb(99, 77, 12)" style="color: #fff;">MO</el-tag>moderate
                <el-tag size="mini" color="rgb(99, 77, 12)" style="color: #fff;">MR</el-tag>modifier<br />
                SIFT:<el-tag size="mini" color="red" style="color: #fff;">DH</el-tag>deleterious
                <el-tag size="mini" color="rgb(99, 77, 12)" style="color: #fff;">DL</el-tag>deleterious_low_confidence
                <el-tag size="mini" color="rgb(99, 77, 12)" style="color: #fff;">TO</el-tag>tolerated
                <el-tag size="mini" color="green" style="color: #fff;">TL</el-tag>tolerated_low_confidence<br />
                PolyPhen:<el-tag size="mini" color="green" style="color: #fff;">BE</el-tag>benign
                <el-tag size="mini" color="rgb(99, 77, 12)" style="color: #fff;">PO</el-tag>possibly_damaging
                <el-tag size="mini" color="red" style="color: #fff;">PR</el-tag>probably_damaging
                <el-tag size="mini" color="grey" style="color: #fff;">UN</el-tag>unknown
              </div>
              <el-button size="mini">Impact</el-button>
            </el-tooltip>
          </template>
          <template slot-scope="scope">
            <span v-html="$options.filters.vep_impact(scope.row.consequence.transcript.annotation.vep_impact)"></span>
            <span v-html="$options.filters.sift_impact(scope.row.consequence.transcript.annotation.sift_impact)"></span>
            <span
              v-html="$options.filters.polyphen_impact(scope.row.consequence.transcript.annotation.polyphen_impact)"></span>
          </template>
        </el-table-column>
      </el-table>
      <pagination v-show="somaticMutationsSearchData.total > 0" :total="somaticMutationsSearchData.total"
        :page.sync="somaticMutationsSearchData.current" :limit.sync="somaticMutationsSearchData.pageSize"
        @pagination="openSomaticMutations" />
    </el-dialog>

    <!-- 用户导入对话框 -->
    <el-dialog :title="upload.title" :visible.sync="upload.open" width="400px" append-to-body>
      <el-upload ref="upload" :limit="1" accept=".xlsx, .xls" :headers="upload.headers"
        :action="upload.url + '?updateSupport=' + upload.updateSupport" :disabled="upload.isUploading"
        :on-progress="handleFileUploadProgress" :on-success="handleFileSuccess" :auto-upload="false" drag>
        <i class="el-icon-upload"></i>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <div class="el-upload__tip text-center" slot="tip">
          <div class="el-upload__tip" slot="tip">
            <el-checkbox v-model="upload.updateSupport" /> 是否更新已经存在的用户数据
          </div>
          <span>仅允许导入xls、xlsx格式文件。</span>
          <el-link type="primary" :underline="false" style="font-size:12px;vertical-align: baseline;"
            @click="importTemplate">下载模板</el-link>
        </div>
      </el-upload>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="submitFileForm">确 定</el-button>
        <el-button @click="upload.open = false">取 消</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { imageList, tagsList, wsiSearch, changeMaskStatus, updateQuality, somaticMutationsList } from "@/api/image/image";
import { listRole } from "@/api/system/role";
import { getToken } from "@/utils/auth";
import Treeselect from "@riophae/vue-treeselect";
import "@riophae/vue-treeselect/dist/vue-treeselect.css";

export default {
  name: "User",
  // dicts: ['sys_normal_disable', 'sys_user_sex'],
  components: { Treeselect },
  data() {
    return {
      // 遮罩层
      loading: true,
      searchLoading: false,
      // 选中数组
      ids: [],
      // 非单个禁用
      single: true,
      // 非多个禁用
      multiple: true,
      // 显示搜索条件
      showSearch: true,
      // 总条数
      total: 0,
      // 用户表格数据
      imageList: null,
      // 弹出层标题
      title: "",
      // 部门树选项
      deptOptions: undefined,
      // 是否显示弹出层
      open: false,
      // 部门名称
      deptName: undefined,
      // 默认密码
      initPassword: undefined,
      // 日期范围
      dateRange: [],
      // 岗位选项
      postOptions: [],
      // 角色选项
      roleOptions: [],
      seearchResult: [],
      openSomaticMutationsDia: false,
      somaticMutationsList: [],
      somaticMutationsSearchData: {
        current: 1,
        pageSize: 50,
        caseId: undefined,
        total: 0,
        polyphen: undefined,
        sift: undefined,
        vep: undefined,
        dnaChange: undefined,
      },
      vepOptions: [
        { value: "HIGH", text: "HIGH" },
        { value: "LOW", text: "LOW" },
        { value: "MODERATE", text: "MODERATE" },
        { value: "MODIFIER", text: "MODIFIER" },
      ],
      siftOptions: [
        { value: "deleterious", text: "deleterious" },
        { value: "deleterious_low_confidence", text: "deleterious_low_confidence" },
        { value: "tolerated", text: "tolerated" },
        { value: "tolerated_low_confidence", text: "tolerated_low_confidence" },
      ],
      polyphenOptions: [
        { value: "benign", text: "benign" },
        { value: "possibly_damaging", text: "possibly_damaging" },
        { value: "probably_damaging", text: "probably_damaging" },
        { value: "unknown", text: "unknown" },
      ],
      tags: [],

      status: [
        { value: "0", text: "启动" }, { value: "1", text: "禁用" },
      ],
      sources: [
        { value: "TCGA", text: "TCGA" }, { value: "COREONE", text: "COREONE" },
      ],
      maskStatus: [
        { value: 1, text: "标注完成" }, { value: 0, text: "待标注" },
      ],
      qualityOptions: [
        { value: 1, text: "星级切片" }, { value: 0, text: "普通切片" },
      ],
      // 表单参数
      form: {},
      defaultProps: {
        children: "children",
        label: "label"
      },
      // 用户导入参数
      upload: {
        // 是否显示弹出层（用户导入）
        open: false,
        // 弹出层标题（用户导入）
        title: "",
        // 是否禁用上传
        isUploading: false,
        // 是否更新已经存在的用户数据
        updateSupport: 0,
        // 设置上传的请求头部
        headers: { Authorization: "Bearer " + getToken() },
        // 上传的地址
        url: process.env.VUE_APP_BASE_API + "/system/user/importData"
      },
      // 查询参数
      queryParams: {
        current: 1,
        pageSize: 50,
        instanceFilename: undefined,
        tagIds: [],
        description: undefined,
        isMasked: undefined,
        place: undefined,
        quality: undefined,
        source: undefined,
        id_num: undefined,
        cancer: undefined
      },
      // 列信息
      columns: [
        { key: 0, label: `用户编号`, visible: true },
        { key: 1, label: `用户名称`, visible: true },
        { key: 2, label: `用户昵称`, visible: true },
        { key: 3, label: `部门`, visible: true },
        { key: 4, label: `手机号码`, visible: true },
        { key: 5, label: `状态`, visible: true },
        { key: 6, label: `创建时间`, visible: true }
      ],
      // 表单校验
      rules: {
        userName: [
          { required: true, message: "用户名称不能为空", trigger: "blur" },
          { min: 2, max: 20, message: '用户名称长度必须介于 2 和 20 之间', trigger: 'blur' }
        ],
        nickName: [
          { required: true, message: "用户昵称不能为空", trigger: "blur" }
        ],
        password: [
          { required: true, message: "用户密码不能为空", trigger: "blur" },
          { min: 5, max: 20, message: '用户密码长度必须介于 5 和 20 之间', trigger: 'blur' }
        ],
        email: [
          {
            type: "email",
            message: "请输入正确的邮箱地址",
            trigger: ["blur", "change"]
          }
        ],
        phonenumber: [
          {
            pattern: /^1[3|4|5|6|7|8|9][0-9]\d{8}$/,
            message: "请输入正确的手机号码",
            trigger: "blur"
          }
        ]
      }
    };
  },
  filters: {
    consequence_type(value) {
      let result = "";
      switch (value) {
        case "missense_variant":
          result = "Missense"
          break;
        case "stop_lost":
          result = "Stop Lost"
          break;
        case "stop_gained":
          result = "Stop Gained"
          break
        case "synonymous_variant":
          result = "Synonymous"
          break
        case "inframe_deletion":
          result = "Inframe Deletion"
          break
        case "intron_variant":
          result = "Intron"
          break
        case "non_coding_transcript_exon_variant":
          result = "Non Coding Transcript Exon"
          break
        case "splice_acceptor_variant":
          result = "Splice Acceptor"
          break
        case "frameshift_variant":
          result = "Frameshift"
          break;
        case "splice_donor_variant":
          result = "Splice Donor"
          break;
        case "splice_region_variant":
          result = "	Splice Region"
          break
        default:
          break;
      }
      return result;
    },
    vep_impact(value) {
      let html;
      switch (value) {
        case "MODERATE":
          html = `<span class="el-tag el-tag--mini el-tag--light" style="background-color: rgb(99, 77, 12); color: rgb(255, 255, 255);">MO</span>`
          break;
        case "HIGH":
          html = `<span class="el-tag el-tag--mini el-tag--light" style="background-color: red; color: rgb(255, 255, 255);">HI</span>`
          break
        case "LOW":
          html = `<span class="el-tag el-tag--mini el-tag--light" style="background-color: green; color: rgb(255, 255, 255);">LO</span>`
          break
        case "MODIFIER":
          html = `<span class="el-tag el-tag--mini el-tag--light" style="background-color: rgb(99, 77, 12); color: rgb(255, 255, 255);">MO</span>`
          break
        default:
          html = " --- "
          break;
      }
      return html;
    },
    polyphen_impact(value) {
      let html;
      switch (value) {
        case "probably_damaging":
          html = `<span class="el-tag el-tag--mini el-tag--light" style="background-color: red; color: rgb(255, 255, 255);">PR</span>`
          break;
        case "benign":
          html = `<span class="el-tag el-tag--mini el-tag--light" style="background-color: green; color: rgb(255, 255, 255);">BE</span>`
          break;
        case "possibly_damaging":
          html = `<span class="el-tag el-tag--mini el-tag--light" style="background-color: rgb(99, 77, 12); color: rgb(255, 255, 255);">PO</span>`
          break;
        case "unknown":
          html = `<span class="el-tag el-tag--mini el-tag--light" style="background-color: grey; color: rgb(255, 255, 255);">UN</span>`
          break;
        default:
          html = " --- "
          break;
      }
      return html;
    },
    sift_impact(value) {
      let html;
      switch (value) {
        case "deleterious":
          html = `<span class="el-tag el-tag--mini el-tag--light" style="background-color: red; color: rgb(255, 255, 255);">DH</span>`
          break;
        case "tolerated":
          html = `<span class="el-tag el-tag--mini el-tag--light" style="background-color: rgb(99, 77, 12); color: rgb(255, 255, 255);">TO</span>`
          break;
        case "tolerated_low_confidence":
          html = `<span class="el-tag el-tag--mini el-tag--light" style="background-color: green; color: rgb(255, 255, 255);">TL</span>`
          break;
        case "deleterious_low_confidence":
          html = `<span class="el-tag el-tag--mini el-tag--light" style="background-color: rgb(99, 77, 12); color: rgb(255, 255, 255);">DL</span>`
          break;
        default:
          html = " --- "
          break;
      }
      return html;
    }
  },
  created() {
    let query = this.$route.query;
    query.pageSize = query.pageSize ? parseInt(query.pageSize) : 50;
    query.current = query.current ? parseInt(query.current) : 1;
    query.isMasked = query.isMasked ? parseInt(query.isMasked) : undefined;
    query.quality = query.quality ? parseInt(query.quality) : undefined;
    query.tagIds = [];
    this.queryParams = Object.assign(this.queryParams, query);
    console.log(query, "query", this.queryParams, "queryParams");
    this.getList();
    this.getTags();
    // this.getTreeselect();
    // this.getConfigKey("sys.user.initPassword").then(response => {
    // this.initPassword = "";
    // });
  },
  methods: {
    /** 查询用户列表 */
    getList() {
      this.loading = true;
      imageList(this.queryParams).then(response => {
        this.imageList = response.records;
        this.total = response.total;
        this.loading = false;
        this.$router.push({
          query: this.queryParams
        })
      }
      );
    },
    async getTags() {
      let data = await tagsList();
      this.tags = data.collection;
    },
    // 筛选节点
    filterNode(value, data) {
      if (!value) return true;
      return data.label.indexOf(value) !== -1;
    },
    async changeMaskStatus(row) {
      let isMasked = row.isMasked == 0 ? 1 : 0;
      const param = { id: row.id, status: isMasked }
      let result = await changeMaskStatus(param)
      row.isMasked = isMasked
    },
    // 节点单击事件
    handleNodeClick(data) {
      this.queryParams.deptId = data.id;
      this.handleQuery();
    },
    // 用户状态修改
    handleStatusChange(row) {
      let text = row.status === "0" ? "启用" : "停用";
      this.$modal.confirm('确认要"' + text + '""' + row.userName + '"用户吗？').then(function () {
        return changeUserStatus(row.id, row.status);
      }).then(() => {
        this.$modal.msgSuccess(text + "成功");
      }).catch(function () {
        row.status = row.status === "0" ? "1" : "0";
      });
    },
    imageSearch(row) {
      this.searchLoading = true;
      this.title = row.instanceFilename + "的搜索结果";
      this.open = true;
      let searchData = {
        id: row.id
      }
      wsiSearch(searchData).then(response => {
        this.searchLoading = false;
        // if(response.msg_code==500){
        //   this.$modal.msgError(response.msg);
        //   this.seearchResult = [];
        // }else{
        this.seearchResult = response;
        // }

      })
    },
    openSomaticMutations(row) {
      console.log(row)
      if (row.caseId) {
        this.openSomaticMutationsDia = true;
        this.somaticMutationsSearchData.caseId = row.caseId;
        this.somaticMutationsSearchData.current = 1;
      }else if(row.id){
        this.somaticMutationsSearchData.caseId = undefined;
        this.openSomaticMutationsDia = true;
        this.somaticMutationsSearchData.current = 1;
      }
      this.searchLoading = true;
      somaticMutationsList(this.somaticMutationsSearchData).then(response => {
        this.searchLoading = false;
        this.somaticMutationsList = response.records.map(item => {
          return {
            ...item,
            consequence: item.consequence.find(i => i.transcript.is_canonical)
          }
        });
        console.log(this.somaticMutationsList)
        this.somaticMutationsSearchData.total = response.total;
      })
    },
    closeSomatic() {
      this.openSomaticMutationsDia = false;
      this.somaticMutationsSearchData.dnaChange = undefined;
      this.somaticMutationsSearchData.polyphen = undefined;
      this.somaticMutationsSearchData.sift = undefined;
      this.somaticMutationsSearchData.vep = undefined;
    },
    // 取消按钮
    cancel() {
      this.open = false;
      this.reset();
    },
    resetQuerySomatic() {
      this.somaticMutationsSearchData = {
        current: 1,
        pageSize: 50,
        // caseId: undefined,
        total: 0,
        polyphen: undefined,
        sift: undefined,
        vep: undefined,
        dnaChange: undefined,
      }
      this.openSomaticMutations();
    },
    // 表单重置
    reset() {
      this.form = {
        userId: undefined,
        deptId: undefined,
        userName: undefined,
        nickName: undefined,
        password: undefined,
        phonenumber: undefined,
        email: undefined,
        sex: undefined,
        status: "0",
        remark: undefined,
        postIds: [],
        roleIds: []
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
      this.dateRange = [];
      this.resetForm("queryForm");
      this.handleQuery();
    },
    // 多选框选中数据
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.userId);
      this.single = selection.length != 1;
      this.multiple = !selection.length;
    },
    updateQualityFun(row, quality) {
      updateQuality({ id: row.id, quality }).then(res => {
        row.quality = quality;
      })
    },
    // 更多操作触发
    handleCommand(command, row) {
      switch (command) {
        case "handleResetPwd":
          this.handleResetPwd(row);
          break;
        case "handleAuthRole":
          this.handleAuthRole(row);
          break;
        default:
          break;
      }
    },
    /** 新增按钮操作 */
    handleAdd() {
      this.reset();
      // this.getTreeselect();
      listRole().then(response => {
        // this.postOptions = response.posts;
        console.log(response);
        this.roleOptions = response.rows;
        this.open = true;
        this.title = "添加用户";
        this.form.password = this.initPassword;
      });
    },
    /** 修改按钮操作 */
    handleOpen(row) {
      window.open(row.imageUrl, '_blank')

      // this.reset();
      // this.getTreeselect();
      // const userId = row.id;
      // getUser(userId).then(response => {
      //   this.form = response.data;
      //   this.roleOptions = response.roles;
      //   this.open = true;
      //   this.title = "修改用户";
      //   this.form.password = "";
      //   listRole().then(roles => {
      //     this.roleOptions = roles.rows;
      //   });
      // });
    },
    /** 重置密码按钮操作 */
    handleResetPwd(row) {
      this.$prompt('请输入"' + row.userName + '"的新密码', "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        closeOnClickModal: false,
        inputPattern: /^.{5,20}$/,
        inputErrorMessage: "用户密码长度必须介于 5 和 20 之间"
      }).then(({ value }) => {
        resetUserPwd(row.id, value).then(response => {
          this.$modal.msgSuccess("修改成功，新密码是：" + value);
        });
      }).catch(() => { });
    },
    /** 分配角色操作 */
    handleAuthRole: function (row) {
      const userId = row.userId;
      this.$router.push("/system/user-auth/role/" + userId);
    },
    /** 提交按钮 */
    submitForm: function () {
      this.$refs["form"].validate(valid => {
        if (valid) {
          if (this.form.userId != undefined) {
            updateUser(this.form).then(response => {
              this.$modal.msgSuccess("修改成功");
              this.open = false;
              this.getList();
            });
          } else {
            addUser(this.form).then(response => {
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
      const userIds = row.id;
      this.$modal.confirm('是否确认删除用户编号为"' + userIds + '"的数据项？').then(function () {
        return delUser(userIds);
      }).then(() => {
        this.getList();
        this.$modal.msgSuccess("删除成功");
      }).catch(() => { });
    },
    /** 导出按钮操作 */
    handleExport() {
      this.download('system/user/export', {
        ...this.queryParams
      }, `user_${new Date().getTime()}.xlsx`)
    },
    /** 导入按钮操作 */
    handleImport() {
      this.upload.title = "用户导入";
      this.upload.open = true;
    },
    /** 下载模板操作 */
    importTemplate() {
      this.download('system/user/importTemplate', {
      }, `user_template_${new Date().getTime()}.xlsx`)
    },
    // 文件上传中处理
    handleFileUploadProgress(event, file, fileList) {
      this.upload.isUploading = true;
    },
    // 文件上传成功处理
    handleFileSuccess(response, file, fileList) {
      this.upload.open = false;
      this.upload.isUploading = false;
      this.$refs.upload.clearFiles();
      this.$alert("<div style='overflow: auto;overflow-x: hidden;max-height: 70vh;padding: 10px 20px 0;'>" + response.msg + "</div>", "导入结果", { dangerouslyUseHTMLString: true });
      this.getList();
    },
    // 提交上传文件
    submitFileForm() {
      this.$refs.upload.submit();
    }
  }
};
</script>