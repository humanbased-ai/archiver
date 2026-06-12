<template>
  <el-form ref="form" :model="user" :rules="rules" label-width="100px">
    <el-form-item label="Nickname" prop="nickName">
      <el-input v-model="user.nickName" maxlength="30" />
    </el-form-item>
    <el-form-item label="Occupation" prop="userType">
      <el-radio-group v-model="user.userType">
        <el-radio :label="0">Medical student</el-radio>
        <el-radio :label="1">Doctor</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="Institution" prop="institution">
      <el-input v-model="user.institution" maxlength="50" placeholder="Affiliated School/Medical Institution" />
    </el-form-item>
    <el-form-item label="Skill level" prop="skillLevel">
      <el-radio-group v-model="user.skillLevel">
        <el-radio :label="0">Junior</el-radio>
        <el-radio :label="1">Senior</el-radio>
        <el-radio :label="2">Expert</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="Specialty" prop="subspecialtyList">
      <el-select v-model="user.subspecialtyIdList" placeholder="Specialty areas of expertise" multiple filterable :style="{ width: '100%' }">
        <el-option v-for="(item, index) in subspecialtyList" :key="index" :label="item.subspecialtyEnName" :value="item.id"
          :disabled="item.disabled" />
      </el-select>
    </el-form-item>
    <!-- <el-form-item label="性别">
      <el-radio-group v-model="user.sex">
        <el-radio label="0">男</el-radio>
        <el-radio label="1">女</el-radio>
      </el-radio-group>
    </el-form-item> -->
    <!-- <el-form-item>
      <el-button type="primary" size="mini" @click="submit">保存</el-button>
      <el-button type="danger" size="mini" @click="close">关闭</el-button>
    </el-form-item> -->
  </el-form>
</template>

<script>
import { getSubspecialtyList,updateUser } from "@/api/system/user";

export default {
  props: {
    user: {
      type: Object
    }
  },
  data() {
    return {
      // 表单校验
      rules: {
        nickName: [
          { required: true, message: "Nickname cannot be empty", trigger: "blur" }
        ],
        userType: [
          { required: true, message: "Occupation cannot be empty", trigger: "blur" },
        ],
        skillLevel: [
          { required: true, message: "Skill level cannot be empty", trigger: "blur" },
        ],
      },
      subspecialtyList: []
    };
  },
  created() {
    getSubspecialtyList().then(response => {
      this.subspecialtyList = response;
    });
  },
  methods: {
    submit() {
      this.$refs["form"].validate(valid => {
        if (valid) {
          // if(this.user.authStatus == 1&&this.user.originalSkillLevel!==this.user.skillLevel){
          //   this.$confirm('You have changed your skill level, your account will be re-authenticated, are you sure?', 'Prompt', {
          //     confirmButtonText: 'Confirm',
          //     cancelButtonText: 'Cancel',
          //     type: 'warning'
          //   }).then(() => {
          //     this.updateU();
          //   }).catch(() => {
          //   });
          // }else{
            this.updateU();
          // }
        }
      });
    },
    close() {
      this.$tab.closePage();
    },
    updateU(){
      updateUser(this.user).then(response => {
        this.$modal.msgSuccess("修改成功");
        this.$emit("refresh");
      });
    }
  }
};
</script>
