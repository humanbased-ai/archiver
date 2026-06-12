<template>
  <div class="app-container">
    <el-row :gutter="20">
      <!-- <el-col :span="6" :xs="24">
        <el-card class="box-card">
          <div slot="header" class="clearfix">
            <span>个人信息</span>
          </div>
          <div>
            <div class="text-center">
              <userAvatar :user="user" />
            </div>
            <ul class="list-group list-group-striped">
              <li class="list-group-item">
                <svg-icon icon-class="user" />用户名称
                <div class="pull-right">{{ user.userName }}</div>
              </li>
              <li class="list-group-item">
                <svg-icon icon-class="phone" />手机号码
                <div class="pull-right">{{ user.phonenumber }}</div>
              </li>
              <li class="list-group-item">
                <svg-icon icon-class="email" />用户邮箱
                <div class="pull-right">{{ user.email }}</div>
              </li>
              <li class="list-group-item">
                <svg-icon icon-class="tree" />所属部门
                <div class="pull-right" v-if="user.dept">{{ user.dept.deptName }} / {{ postGroup }}</div>
              </li>
              <li class="list-group-item">
                <svg-icon icon-class="peoples" />所属角色
                <div class="pull-right">{{ roleGroup }}</div>
              </li>
              <li class="list-group-item">
                <svg-icon icon-class="date" />创建日期
                <div class="pull-right">{{ user.createTime }}</div>
              </li>
            </ul>
          </div>
        </el-card>
      </el-col> -->
      <el-col :span="24" :xs="24">
        <el-card>
          <el-descriptions class="margin-top" title="Personal Information" :column="2" border>
            <template slot="extra">
              <el-button type="primary" @click="toEdit" size="small">Edit</el-button>
            </template>
            <el-descriptions-item label-class-name="my-label" content-class-name="my-content">
              <template slot="label">
                email
              </template>
              {{ user.email }}
            </el-descriptions-item>
            <el-descriptions-item label-class-name="my-label" content-class-name="my-content">
              <template slot="label">
                Nickname
              </template>
              <template>
                {{ user.nickName }}
              </template>
            </el-descriptions-item>
            <el-descriptions-item label-class-name="my-label" content-class-name="my-content">
              <template slot="label">
                Occupation
              </template>
              {{ user.userType == 1 ? 'Doctor' : 'Medical student' }}
            </el-descriptions-item>
            <el-descriptions-item label-class-name="my-label" content-class-name="my-content">
              <template slot="label">
                Affiliated School/Medical Institution
              </template>
              {{ user.institution }}
            </el-descriptions-item>
            <el-descriptions-item label-class-name="my-label" content-class-name="my-content">
              <template slot="label">
                Skill Level
                <el-tooltip effect="dark"
                  content="Please contact the administrator for certification after modifying the skill level."
                  placement="top">
                  <i class="el-icon-question"></i>
                </el-tooltip>
              </template>
              <template v-if="user.skillLevel !== undefined">
                <el-tag size="small" :type="user.authStatus == 1 ? 'success' : 'danger'">
                  <el-tooltip effect="dark"
                  :content="user.authStatus == 1? 'Certified' : 'Not certified'"
                  placement="top">
                    <span>{{ skillLevelOptions[user.skillLevel] }}</span>
                  </el-tooltip>
                </el-tag>
              </template>
            </el-descriptions-item>
            <el-descriptions-item label-class-name="my-label" content-class-name="my-content">
              <template slot="label">
                Specialty areas of expertise
              </template>
              <el-tag size="small" style="margin-left: 5px;" v-for="item in user.subspecialtyList">
                {{ item.subspecialtyEnName }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
    <el-dialog title="Edit Personal Information" :visible.sync="dialogVisible" width="30%">
      <userInfo ref="userForm" @refresh="refresh" :user="formData" />
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="saveUser">Save</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import userAvatar from "./userAvatar";
import userInfo from "./userInfo";
import resetPwd from "./resetPwd";
import { getUserInfo } from "@/api/system/user";

export default {
  name: "Profile",
  components: { userAvatar, userInfo, resetPwd },
  data() {
    return {
      user: {},
      roleGroup: {},
      postGroup: {},
      activeTab: "resetPwd",
      dialogVisible: false,
      formData: {
        nickName: '',
        email: '',
        userType: 0,
        institution: '',
        skillLevel: '',
        subspecialtyIdList: [],
        authStatus: 0,
        originalSkillLevel: '',
      },
      skillLevelOptions: ["Junior", "Senior", "Expert"],
    };
  },
  created() {
    this.getUser();
  },
  methods: {
    getUser() {
      getUserInfo().then(response => {
        this.user = response;
        this.formData = {
          nickName: this.user.nickName,
          userType: this.user.userType,
          institution: this.user.institution,
          skillLevel: this.user.skillLevel,
          subspecialtyIdList: this.user.subspecialtyList?.map(item => item.id),
          id: this.user.id,
          authStatus: this.user.authStatus,
          originalSkillLevel: this.user.skillLevel,
        };
      });
    },
    toEdit() {
      console.log("Edit");
      this.dialogVisible = !this.dialogVisible;
    },
    saveUser() {
      this.$refs.userForm.submit();
    },
    refresh() {
      this.getUser();
      this.$store.dispatch('GetInfo')
      this.dialogVisible = false;
    },
  }
};
</script>
<style scoped lang="scss">
::v-deep {
  .my-label {
    width: 16%;
  }

  .my-content {
    width: 34%;
  }
}
</style>