<template>
    <div class="app-container">
        <h2 class="title">{{ datasetName }}</h2>
        <el-form :model="queryParams" ref="queryForm" size="small" :inline="true" label-width="100px">
            <el-form-item :label="$t('caseName')" prop="caseName">
                <el-input v-model="queryParams.caseName" clearable style="width: 240px"
                    @keyup.enter.native="handleQuery" />
            </el-form-item>
            <el-form-item :label="$t('maskStatus')" prop="caseStatus" label-width="150px">
                <el-select v-model="queryParams.caseStatus" clearable style="width: 240px">
                    <el-option v-for="item in status" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
            </el-form-item>
            <el-form-item :label="$t('sort')" prop="statusSort" label-width="70px">
                <el-select v-model="queryParams.statusSort" style="width: 240px">
                    <el-option v-for="item in sortOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
            </el-form-item>
            <el-form-item :label="$t('involveStatus')" prop="isJoin" label-width="120px">
                <el-select v-model="queryParams.isJoin" style="width: 240px">
                    <el-option v-for="item in involvedOptions" :key="item.value" :label="item.label"
                        :value="item.value" />
                </el-select>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" icon="el-icon-search" size="mini" @click="handleQuery">{{ $t('search')
                    }}</el-button>
                <el-button icon="el-icon-refresh" size="mini" @click="resetQuery">{{ $t('reset') }}</el-button>
            </el-form-item>
        </el-form>
        <el-row :gutter="12">
            <el-col :span="8" v-for="(item, index) in list">
                <el-card shadow="hover" class="organ">
                    <el-row>
                        <el-col :span="14">
                            <el-tooltip class="item" effect="dark" :content="item.caseName" placement="top">
                                <h3 class='case-name'>{{ item.caseName }}</h3>
                            </el-tooltip>
                        </el-col>
                        <el-col :span="10" style="margin-top: 5px;">
                            <div class="status-container">
                                <el-tooltip class="item" effect="dark" content="involved" placement="top" v-if="item.isJoin">
                                    <div class="involved"></div>
                                </el-tooltip>
                                <div style="display: inline-block;">
                                    <el-tag v-if="item.caseStatus == 0" type="info">Unannotated</el-tag>
                                    <el-tag v-if="item.caseStatus == 1" type="warning">In Progress</el-tag>
                                    <el-tag v-if="item.caseStatus == 2" type="danger">Waiting for Validation</el-tag>
                                    <el-tag v-if="item.caseStatus == 3" type="success">Validated</el-tag>
                                </div>
                            </div>

                        </el-col>
                    </el-row>

                    <el-row>
                        <el-col :span="16">
                            <el-image @click="goUrl(item)" class="img2" fit="contain"
                                placeholder="/static/img/loading.gif"
                                :src="`${imgbaseUrl}${item.baseImageId}${baseUrlEnd}`">
                                <div slot="error" class="image-slot">
                                    No Slide
                                </div>
                            </el-image>
                        </el-col>
                        <el-col :span="8">
                            <el-button class="annotate" type="primary" size="mini"
                                :disabled="$options.filters.isDisabledAnnotate(user.skillLevel, datasetDetail.markLevel, user.authStatus, item.caseStatus,item.svsList)"
                                @click="handleOpen(item,0)">{{ $t('Annotate') }}
                            </el-button>
                            <el-button class="annotate" type="primary" size="mini"
                                :disabled="$options.filters.isDisabledValidate(user.skillLevel, item.auditLevel, user.authStatus, item.caseStatus, datasetDetail.markNum, item.markNum,item.isJoin)"
                                @click="handleOpen(item,1)">{{ $t('Validate') }}
                            </el-button>
                            <el-button class="annotate" type="primary" size="mini"
                                :disabled="$options.filters.isDisabledView(item.caseStatus)"
                                @click="handleOpen(item,2)">{{ $t('view') }}
                            </el-button>
                            <el-button class="annotate" @click="showDialog(item)" size="mini">{{ $t('Remark') }}</el-button>
                        </el-col>
                    </el-row>
                </el-card>
            </el-col>
        </el-row>
        <pagination v-show="total > 0" :total="total" :page.sync="queryParams.current" :limit.sync="queryParams.pageSize"
            @pagination="handleQuery" />
        <el-dialog :title="dialogInfo.title" :visible.sync="dialogVisible" width="30%">
            <div v-html="dialogInfo.content"></div>
            <span slot="footer" class="dialog-footer">
                <el-button type="primary" @click="dialogVisible = false">{{ $t('submit') }}</el-button>
            </span>
        </el-dialog>
        <el-dialog title="DATA ANNOTATOR AGREEMENT" class='agreement' :visible.sync="agreementDialogVisible" width="60%">
            <annotator-agreement></annotator-agreement>
            <span slot="footer" class="dialog-footer">
                <el-button @click="agreementDialogVisible = false">{{ $t('cancel') }}</el-button>
                <el-button type="primary" @click="agree">{{ $t('agree') }}</el-button>
            </span>
        </el-dialog>
    </div>
</template>
<script>
import { caseList,casePage, getDataSetDetail,getUserProtocol,confirmUserProtocol } from '@/api/annotate'
import { baseUrl, baseUrl_img,image_url } from "@/settings";
import AnnotatorAgreement from '@/components/Agreement/annotator.vue'
export default {
    name: 'Annotate',
    computed: {
        user() {
            return this.$store.state.user
        }
    },
    components: {
        AnnotatorAgreement
    },
    data() {
        return {
            list: [],
            datasetName: '',
            dialogVisible: false,
            dialogInfo: {
                title: '',
                content: ''
            },
            agreementDialogVisible: false,
            skillLevelOptions: ["Junior", "Senior", "Expert"],
            imgbaseUrl: image_url + "/imagecore/api/abstractimage/thumb.png?abstractImageId=",
            baseUrlEnd: "&maxSize=256",
            datasetDetail: {},
            queryParams: {
                dataSetId: '',
                caseName: '',
                caseStatus: undefined,
                statusSort: 0,
                isJoin: 0,
                current: 1,
                pageSize: 50
            },
            agreementStatue: false,
            total: 0,
            status: [{
                value: 0,
                label: 'unannotated'
            }, {
                value: 1,
                label: 'in progress'
            }, {
                value: 2,
                label: 'waiting for validation'
            }, {
                value: 3,
                label: 'validated'
            }],
            sortOptions: [{
                value: 0,
                label: 'Status ASC'
            }, {
                value: 1,
                label: 'Status DESC'
            }],
            involvedOptions: [{
                value: 0,
                label: 'All'
            }, {
                value: 1,
                label: 'Involved'
            }, {
                value: 2,
                label: 'Not Involved'
            }],
            openUrl:""
        }
    },
    created() {
        let query = this.$route.query;
        this.queryParams.dataSetId = query.datasetId;
        this.datasetName = query.datasetName;
        this.getCaseList()
        this.getDetail()
        this.getUserProtocol()
    },
    filters: {
        isDisabledAnnotate(skillLevel, value, authStatus, caseStatus, svsList) {
            if (!svsList || svsList.length == 0) {
                return true
            }
            if (caseStatus == 3 || caseStatus == 2) {
                return true
            }
            if (authStatus == 0) {
                return true
            }
            return skillLevel < value
        },
        isDisabledValidate(skillLevel, value, authStatus, caseStatus, annotatedNum,markNum, isJoin) {
            if (caseStatus == 3) {
                return true
            }
            if (annotatedNum > markNum) {
                return true
            }
            if (authStatus == 0) {
                return true
            }
            if (isJoin == 1) {
                return true
            }
            return skillLevel < value
        },
        isDisabledView(caseStatus) {
            return caseStatus < 3
        },
        disabledText(skillLevel, value, authStatus) {
            if (authStatus == 0) {
                return 'Not Certified'
            }
            return skillLevel < value ? 'Skill level is not enough' : ''
        }
    },
    methods: {
        getUserProtocol(){
            getUserProtocol().then(response => {
                this.agreementStatue = response.data;
            })
        },
        handleQuery() {
            this.getCaseList()
        },
        resetQuery() {
            this.resetForm("queryForm");
            this.handleQuery();
        },
        getCaseList() {
            casePage(this.queryParams).then(response => {
                this.list = response.rows.map(item => {
                    item.baseImageId = '';
                    if (item.svsList && item.svsList.length > 0) {
                        item.baseImageId = item.svsList[0].baseImageId;
                    }
                    return item;
                })
                this.total = response.records;
            })
        },
        getDetail() {
            getDataSetDetail({ id: this.queryParams.dataSetId }).then(response => {
                this.datasetDetail = response;
            })
        },
        showDialog(item) {
            this.dialogVisible = true;
            this.dialogInfo.title = 'Remark';
            this.dialogInfo.content = item.caseRemark;
        },
        handleOpen(item,type) {
            let action = "";
            if (type == 0) {
                action = "annotate";
            }else if (type == 1) {
                action = "validate";
            }else if (type == 2) {
                action = "view";
            }
            console.log(this.agreementStatue,action);
            
            if (!this.agreementStatue&&action!="view") {
                this.agreementDialogVisible = true;
                this.openUrl = baseUrl_img + "/#/project/" + item.id + "/image/" + item.svsList[0].id +"?action="+action;;
                return;
            }
            const url = baseUrl_img + "/#/project/" + item.id + "/image/" + item.svsList[0].id +"?action="+action;
            window.open(url, '_blank')
        },
        agree() {
            this.agreementDialogVisible = false;
            confirmUserProtocol().then(response => {
                this.agreementStatue = true;
                window.open(this.openUrl, '_blank')
            })
        },
    }
}
</script>

<style scoped lang="scss">
.title {
    padding-top: 0px;
    margin-top: 0px;
    text-align: left;
}
.case-name{
    overflow: hidden;           /* 隐藏超出部分 */
    white-space: nowrap;        /* 不换行 */
    text-overflow: ellipsis; 
}

.organ {

    margin-bottom: 10px;
    // padding-bottom: 15px;
    h3 {
        margin-top: 10px;
    }

    .count {
        color: #606266;
    }

    .annotate {
        float: right;
        margin-top: 10px;
        width: 100px;
    }
}

::v-deep .image-slot {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    color: #c0c4cc;
    vertical-align: middle;
    background: #f5f7fa;
    width: 100%;
    height: 100%;
    margin-top: 10px;
}
::v-deep .agreement {
    .el-dialog__body {
        height: 600px;
        overflow-x: scroll;
    }
}

.img2 {
    height: 150px;
    width: 100%;
}

.status-container {
    display: flex;
    // justify-content: space-between;
    align-items: center;
    justify-content: flex-end;
    // margin-top: 10px;
}

.involved {
    display: inline-block;
    background-color: #67C23A;
    width: 12px;
    height: 12px;
    margin-right: 20px;
}
</style>