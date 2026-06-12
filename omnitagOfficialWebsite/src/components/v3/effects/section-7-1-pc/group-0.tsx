import { motion } from "framer-motion";
import { text10, text6, text8, text9 } from "./consts";

// 為容器定義動畫變體，以編排子項動畫。
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      // 每個子項動畫之間的延遲。調整此值可改變時間節奏。
      staggerChildren: 0.04,
    },
  },
};

// 為子元素定義動畫變體，實現淡入和向上滑動的效果。
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function Group() {
  return (
    <motion.g initial="hidden" animate="show" variants={containerVariants}>
      <motion.path variants={itemVariants} d={text8} fill="black" />
      <motion.path
        variants={itemVariants}
        d="M597.156 317.254L592.156 314.367L592.156 320.141L597.156 317.254ZM457.156 317.254L457.156 317.754L592.656 317.754L592.656 317.254L592.656 316.754L457.156 316.754L457.156 317.254Z"
        fill="black"
      />
      <motion.rect variants={itemVariants} x="0.24585" y="234.754" width="245" height="126" fill="#EDECE7" />
      <motion.rect
        variants={itemVariants}
        x="0.74585"
        y="235.254"
        width="244"
        height="125"
        stroke="black"
        stroke-opacity="0.2"
        stroke-dasharray="2 2"
      />
      <motion.path variants={itemVariants} d={text6} fill="black" />
      <motion.rect variants={itemVariants} x="257.246" y="234.754" width="200" height="126.154" fill="#EDECE7" />
      <motion.rect
        variants={itemVariants}
        x="257.746"
        y="235.254"
        width="199"
        height="125.154"
        stroke="black"
        stroke-opacity="0.2"
        stroke-dasharray="2 2"
      />
      <motion.rect width="46.1538" height="46.1538" transform="translate(272.63 250.137)" fill="black" />
      <motion.path
        variants={itemVariants}
        d="M288.212 279.211L292.809 272.029L292.846 272.343L288.6 265.734H291.923L294.545 269.943H294.969L297.554 265.734H300.785L296.52 272.38L296.465 272.085L301.209 279.211H297.868L294.803 274.448H294.36L291.443 279.211H288.212Z"
        fill="white"
      />
      <motion.rect width="46.1538" height="46.1538" transform="translate(334.169 250.137)" fill="white" />
      <motion.path
        variants={itemVariants}
        d="M355.51 274.097L351.578 265.734H354.679L357.504 271.992L356.969 271.826H358.519L357.947 271.992L360.495 265.734H363.43L359.812 274.097H355.51ZM356.175 279.211V273.672H359.147V279.211H356.175Z"
        fill="black"
      />
      <motion.rect variants={itemVariants} x="334.169" y="308.598" width="46.1538" height="12.3077" fill="black" />
      <motion.rect width="46.1538" height="46.1538" transform="translate(395.707 250.137)" fill="white" />
      <motion.path
        variants={itemVariants}
        d="M417.049 274.097L413.116 265.734H416.218L419.043 271.992L418.507 271.826H420.058L419.486 271.992L422.033 265.734H424.969L421.35 274.097H417.049ZM417.713 279.211V273.672H420.686V279.211H417.713Z"
        fill="black"
      />
      <motion.rect variants={itemVariants} x="395.707" y="308.598" width="46.1538" height="12.3077" fill="#FCA800" />
      <motion.rect variants={itemVariants} x="395.707" y="308.598" width="46.1538" height="12.3077" fill="#FCA800" />
      <motion.rect variants={itemVariants} x="395.707" y="333.215" width="46.1538" height="12.3077" fill="black" />
      <motion.path variants={itemVariants} d="M597.156 0.753906H957.156V360.754H597.156V0.753906Z" fill="#EDECE7" />
      <motion.path variants={itemVariants} d={text9} stroke="black" stroke-opacity="0.2" stroke-dasharray="2 2" />
      <motion.path variants={itemVariants} d="M670.959 117.754L717.156 197.754H624.762L670.959 117.754Z" fill="black" />
      <motion.path variants={itemVariants} d="M783.353 117.754L829.55 197.754H737.156L783.353 117.754Z" fill="black" />
      <motion.path variants={itemVariants} d="M849.55 117.754H929.55V197.754H849.55V117.754Z" fill="black" />
      <motion.path variants={itemVariants} d={text10} fill="black" />
    </motion.g>
  );
}
