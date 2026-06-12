<template>
  <div id="app">
    <!-- <p>{{ $t('test')}}</p>
    <p>{{$t('tabel.label')}}</p>
 -->
    <router-view />
  </div>
</template>

<script>
// import { messages } from '@/lang'
// import Cookies from 'js-cookie'
export default {
  name: 'App',
  metaInfo() {
    return {
      title: this.$store.state.settings.dynamicTitle && this.$store.state.settings.title,
      titleTemplate: title => {
        return title ? `${title} - ${process.env.VUE_APP_TITLE}` : process.env.VUE_APP_TITLE
      }
    }
  },
  // data() {
  //   return {
  //     messages: messages,
  //     language: '',
  //     test: this.$t('test')
  //   }
  // },
  // created() {
  //   this.setLanguage()
  // },
  // methods: {
  //   setLanguage() {
  //     const lang = Cookies.get('language') || 'en'
  //     this.language = this.messages[lang].language
  //   },
  //   choose(lang) {
  //     this.$i18n.locale = lang
  //     Cookies.set('language', lang)
  //     this.setLanguage()
  //   }
  // }
}
</script>
