<template>
    <div class="app-container">
        <h2 class="title">{{ $t('organ') }}</h2>
        <el-row :gutter="12">
            <el-col :span="6" v-for="(item,index) in organList">
                <el-card shadow="hover" class="organ">
                    <h3>{{ item.organName }}</h3>
                    <p class="count">{{ $t('datasetCount') }}: {{ item.datasetNum }}</p>
                    <div>
                        <el-button class="annotate" type="primary" @click="go(item.id,item.organName)"  size="mini">{{ $t('getIn') }}</el-button>
                    </div>
                </el-card>
            </el-col>
        </el-row>
    </div>
</template>
<script>
import { organList } from '@/api/annotate'
import go from 'highlight.js/lib/languages/go'
export default {
    name: 'Annotate',
    data() {
        return {
            organList: []
        }
    },
    created() {
        this.getOrganList()
    },
    methods: {
        getOrganList() {
            organList().then(response => {
                this.organList = response
            })
        },
        go(id,organName){
            this.$router.push(
                 `/annotation/dataset?organId=${id}&organName=${organName}`
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
    }
}
</style>