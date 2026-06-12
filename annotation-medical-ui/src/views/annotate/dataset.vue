<template>
    <div class="app-container">
        <h2 class="title">{{ organName }}</h2>
        <el-row :gutter="12">
            <el-col :span="6" v-for="(item, index) in list">
                <el-card shadow="hover" class="organ">
                    <h3>{{ item.setName }}</h3>
                    <el-row>
                        <el-col :span="12">
                            <p class="count">{{$t('caseCount')}}: {{ item.sliceNum }}</p>
                            <p class="count">{{ $t('annotated') }}: {{ item.annotatedNum }}</p>
                            <p class="count">{{ $t('validated') }}: {{ item.validatedNum }}</p>
                        </el-col>
                        <el-col :span="12">
                            <el-button class="annotate" type="primary" size="mini"
                                @click="go(item.id,item.setName)"
                                :disabled="$options.filters.isDisabled(user.skillLevel, item.markLevel, user.authStatus)">{{ $t('getIn') }}
                                <el-tooltip style="padding-left: 5px;" effect="dark"
                                    v-if="$options.filters.isDisabled(user.skillLevel, item.markLevel, user.authStatus)"
                                    :content="$options.filters.disabledText(user.skillLevel, item.markLevel, user.authStatus)"
                                    placement="top-start">
                                    <i class="el-icon-question"></i>
                                </el-tooltip>
                            </el-button>
                            <el-button class="annotate" @click="showDialog(1, item)"
                                size="mini">{{ $t('Requirements') }}</el-button>
                            <el-button class="annotate" @click="showDialog(2, item)" size="mini">{{ $t('Tutorial') }}</el-button>
                        </el-col>
                    </el-row>
                </el-card>
            </el-col>
        </el-row>
        <el-dialog :title="dialogInfo.title" :visible.sync="dialogVisible" width="30%">
            <div v-html="dialogInfo.content"></div>
            <span slot="footer" class="dialog-footer">
                <el-button type="primary" @click="dialogVisible = false">{{ $t('submit') }}</el-button>
            </span>
        </el-dialog>
    </div>
</template>
<script>
import { dataSetList } from '@/api/annotate'
import go from 'highlight.js/lib/languages/go';
export default {
    name: 'Annotate',
    computed: {
        user() {
            return this.$store.state.user
        }
    },
    data() {
        return {
            list: [],
            organId: '',
            organName: '',
            dialogVisible: false,
            dialogInfo: {
                title: '',
                content: ''
            },
            skillLevelOptions: ["Junior", "Senior", "Expert"]
        }
    },
    created() {
        // this.getOrganList()
        let query = this.$route.query;
        this.organId = query.organId;
        this.organName = query.organName;
        this.getDatasetList()
        console.log(this.user)
    },
    filters: {
        isDisabled(skillLevel, value, authStatus) {
            console.log(skillLevel, value, authStatus)
            if (authStatus == 0) {
                return true
            }
            return skillLevel < value
        },
        disabledText(skillLevel, value, authStatus) {
            if (authStatus == 0) {
                return 'Not Certified'
            }
            return skillLevel < value ? 'Skill level is not enough' : ''
        }
    },
    methods: {
        getDatasetList() {
            dataSetList({ organId: this.organId }).then(response => {
                this.list = response
            })
        },
        showDialog(type, item) {
            this.dialogVisible = true;
            if (type === 1) {
                this.dialogInfo.title = 'Requirements';
                const content = `
                    <p>${item.markRequire}</p>
                    <p>Annotation Skill Level:<span style="padding-left:10px">${this.skillLevelOptions[item.markLevel]}</span></p>
                    <p>Validation Skill Level:<span style="padding-left:10px">${this.skillLevelOptions[item.auditLevel]}</span></p>
                    
                `
                this.dialogInfo.content = content;
            } else if (type === 2) {
                this.dialogInfo.title = 'Tutorial';
                this.dialogInfo.content = item.markCourse;
            }
        },
        go(id,setName) {
            this.$router.push(
                `/annotation/caseList?datasetId=${id}&datasetName=${setName}`
            );
        }
    }
}
</script>

<style scoped lang="scss">
.title {
    padding-top: 0px;
    margin-top: 0px;
    text-align: left;
}

.organ {

    // margin-top: 10px;
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
</style>