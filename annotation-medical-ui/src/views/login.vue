<template>
  <div class="login">
    <div class="loginContainer">
      <div class="containerLeft">
      </div>
      <div class="containerRight">
        <el-form ref="loginForm" :model="loginForm" :rules="loginRules" class="login-form">
          <h3 class="title"><el-image style="width: 170px; height: 70px" :src="require('@/assets/images/codatta.svg')"></el-image>
          </br>Medical Image Annotation Platform</h3>
          <el-form-item prop="email">
            <el-input v-model="loginForm.email" type="email" auto-complete="off" placeholder="Email">
              <svg-icon slot="prefix" icon-class="email" class="el-input__icon input-icon" />
              <el-button slot="append" @click="sendCode" :loading="codeLoading"
                :class="{ 'enable-color': !codeLoading }" :disabled="isButtonDisabled">{{ buttonText }}</el-button>
            </el-input>
          </el-form-item>
          <el-form-item prop="image_code">

            <div class="image_code">
              <el-input v-model="loginForm.image_code" auto-complete="off" placeholder="image code"
                @keyup.enter.native="handleLogin">
                <svg-icon slot="prefix" icon-class="validCode" class="el-input__icon input-icon" />
              </el-input>
            </div>
            <div class="login-code">
              <img :src="codeUrl" @click="getCode" class="login-code-img" />
            </div>
          </el-form-item>
          <el-form-item prop="code" v-if="captchaEnabled">
            <el-input v-model="loginForm.code" auto-complete="off" placeholder="Verification code"
              @keyup.enter.native="handleLogin">
              <svg-icon slot="prefix" icon-class="validCode" class="el-input__icon input-icon" />
            </el-input>
          </el-form-item>
          <el-checkbox v-model="loginForm.rememberMe" style="margin:0px 0px 25px 0px; color: #000;">Stay logged in for 7
            days.</el-checkbox>
          <el-form-item style="width:100%;">
            <el-button :loading="loading" size="medium" style="width:100%;background-color: #000;color: #fff;"
              @click.native.prevent="handleLogin">
              <span v-if="!loading">Login</span>
              <span v-else>Logging in...</span>
            </el-button>
            <div style="float: right;" v-if="register">
              <router-link class="link-type" :to="'/register'">Sign up</router-link>
            </div>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!--  底部  -->
    <div class="el-login-footer">
      <span>Copyright © 2024 codatta All Rights Reserved.</span>
    </div>
  </div>
</template>

<script>
import { getCodeImg, getEmailCode } from "@/api/login";
import Cookies from "js-cookie";
import { encrypt, decrypt } from '@/utils/jsencrypt'

export default {
  name: "Login",
  data() {
    const validateEmail = (rule, value, callback) => {
      var re = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
      const result = re.test(value);
      if (!result) {
        callback(new Error("Please enter a valid email address."));
      } else {
        callback();
      }
    };
    return {
      codeUrl: "",
      loginForm: {
        email: "",
        image_code: "",
        password: "",
        rememberMe: true,
        code: "",
        uuid: ""
      },
      loginRules: {
        email: [
          { required: true, trigger: "blur", message: "Please enter your email" },
          { required: true, validator: validateEmail, trigger: "blur" }
        ],
        password: [
          { required: true, trigger: "blur", message: "Please enter your password." }
        ],
        code: [{ required: true, trigger: "change", message: "Please enter the verification code." }]
      },
      loading: false,
      // 验证码开关
      captchaEnabled: true,
      // 注册开关
      register: false,
      redirect: undefined,
      buttonText: 'send a code',
      isButtonDisabled: false,
      codeLoading: false,
    };
  },
  watch: {
    $route: {
      handler: function (route) {
        this.redirect = route.query && route.query.redirect;
      },
      immediate: true
    }
  },
  created() {
    this.getCode();
    // this.getCookie();
  },
  methods: {
    getCode() {
      getCodeImg().then(res => {
        this.captchaEnabled = res.captchaEnabled === undefined ? true : res.captchaEnabled;
        if (this.captchaEnabled) {
          this.codeUrl = res.data.data;
          // this.loginForm.uuid = res.uuid;
        }
      });
    },
    sendCode() {
      this.codeLoading = true;
      const result = this.validateEmail(this.loginForm.email)
      if (!result) {
        this.$message({
          message: 'Please enter a valid email address.',
          type: 'error'
        });
        this.codeLoading = false;
      }
      if (!this.loginForm.image_code) {
        this.$message({
          message: 'Please enter the image code.',
          type: 'error'
        });
        this.codeLoading = false;
      }
      if (result && this.loginForm.image_code) {
        this.isButtonDisabled = true;
        getEmailCode({ email: this.loginForm.email, image_code: this.loginForm.image_code, account_type:"email" }).then(res => {
          if (!res.data.data) {
            this.$message({
              message: res.data.errorMessage,
              type: 'error'
            });
            this.isButtonDisabled = false;
            this.codeLoading = false;
          } else {
            this.startCountdown();
            this.$message({
              message: 'The verification code has been sent to your email, please check it.',
              type: 'success'
            });
            this.codeLoading = false;
          }
        })
      } else {
        this.codeLoading = false;
      }
    },
    startCountdown() {
      // 清除现有的倒计时
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
      }

      this.countdown = 60; // 设置倒计时秒数
      this.isButtonDisabled = true;
      this.buttonText = 'Resend(60s)';

      this.countdownInterval = setInterval(() => {
        if (this.countdown <= 0) {
          clearInterval(this.countdownInterval);
          this.isButtonDisabled = false;
          this.buttonText = 'send a code';
        } else {
          this.countdown--;
          this.buttonText = `Resend(${this.countdown}s)`;
        }
      }, 1000);
    },
    getCookie() {
      const username = Cookies.get("username");
      const password = Cookies.get("password");
      // const rememberMe = Cookies.get('rememberMe')
      this.loginForm = {
        username: username === undefined ? this.loginForm.username : username,
        password: password === undefined ? this.loginForm.password : decrypt(password),
        // rememberMe: rememberMe === undefined ? false : Boolean(rememberMe)
      };
    },
    handleLogin() {
      this.$refs.loginForm.validate(valid => {
        if (valid) {
          this.loading = true;
          // if (this.loginForm.rememberMe) {
          //   Cookies.set("username", this.loginForm.username, { expires: 30 });
          //   Cookies.set("password", encrypt(this.loginForm.password), { expires: 30 });
          //   Cookies.set('rememberMe', this.loginForm.rememberMe, { expires: 30 });
          // } else {
          //   Cookies.remove("username");
          //   Cookies.remove("password");
          //   Cookies.remove('rememberMe');
          // }
          this.$store.dispatch("Login", this.loginForm).then(() => {
            this.$router.push({ path: this.redirect || "/" }).catch(() => { });
          }).catch(() => {
            this.loading = false;
            // if (this.captchaEnabled) {
            //   this.getCode();
            // }
          });
        }
      });
    },
    validateEmail(email) {
      // 正则表达式用于匹配电子邮件地址
      // 这个正则表达式可以匹配大多数常见的电子邮件格式，但并不是绝对完美的
      var re = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;

      // 使用正则表达式的test方法来验证电子邮件地址
      return re.test(email);
    }
  }
};
</script>

<style rel="stylesheet/scss" lang="scss">
.login {
  height: 100%;
  width: 100%;
}

.loginContainer {
  display: flex;
  height: 100vh;
  // flex-direction: row;  /* 主轴方向：行 */
  // justify-content: center;  /* 主轴对齐方式：居中 */
  // align-items: center;  /* 交叉轴对齐方式：居中 */
}

.containerLeft {
  flex: 0 0 68%;  /* 固定宽度为 60% */
  background: url("../assets/images/mask_group.png");
  background-size: cover;
  background-position: center; /* 背景图居中 */
  height: 100%; /* 设置高度 */
}

.containerRight {
  flex: 0 0 32%;  /* 固定宽度为 40% */
  padding-top: 13%;
}

.title {
  margin: 0px auto 20px auto;
  text-align: center;
  color: #000;
}

.login-form {
  border-radius: 6px;
  background: #ffffff;
  width: 400px;
  padding: 25px 25px 5px 25px;
  margin: auto;

  .el-input {
    height: 38px;

    input {
      height: 38px;
    }
  }

  .input-icon {
    height: 39px;
    width: 14px;
    margin-left: 2px;
  }
}

.login-tip {
  font-size: 13px;
  text-align: center;
  color: #bfbfbf;
}

.login-code {
  width: 91px;
  height: 38px;
  float: right;

  img {
    cursor: pointer;
    vertical-align: middle;
  }
}

.image_code {
  width: 60%;
  height: 38px;
  float: left;
}

.el-login-footer {
  height: 40px;
  line-height: 40px;
  position: fixed;
  bottom: 0;
  width: 100%;
  text-align: center;
  color: #000;
  font-family: Arial;
  font-size: 12px;
  letter-spacing: 1px;
}

.login-code-img {
  height: 38px;
}

.enable-color {
  color: #606266 !important;
}

.el-checkbox__input.is-checked + .el-checkbox__label {
  color: #000;
}

.el-checkbox__input.is-checked .el-checkbox__inner {
  border-color: #000;
  background-color: #000;
}
</style>
