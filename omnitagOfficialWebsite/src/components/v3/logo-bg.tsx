import { motion } from "framer-motion"; // Correct import for framer-motion
import { cn } from "@udecode/cn";

import { useWindowResize } from "@/hooks/useWindowResize";

const LOGO_ENTRY_EASE = [0.42, 0, 0.58, 1]; // A standard easeInOut
const ATMOSPHERIC_EASE = "easeInOut"; // For smooth, continuous loops

export default function LogoBg({ className }: { className?: string }) {
  const { width } = useWindowResize();

  return width < 1024 ? (
    <BgMobileImg className={cn("absolute bottom-0 left-0 w-full", className)} />
  ) : (
    <BgPcImg className={cn("absolute bottom-0 left-0 w-full", className)} />
  );
}

function BgPcImg({ className }: { className?: string }) {
  const entryDuration = 2.0;
  const entryTransitionConfig = { duration: entryDuration, ease: LOGO_ENTRY_EASE, delay: 0.2 };
  const shadowLoopTransitionConfig = {
    duration: 10,
    repeat: Infinity,
    ease: ATMOSPHERIC_EASE,
    delay: entryDuration + 0.5,
  };
  const pathDriftBaseDuration = 22;
  const blurredPathOpacityLoopTransitionConfig = {
    duration: 14,
    repeat: Infinity,
    ease: ATMOSPHERIC_EASE,
    delay: entryDuration + 0.6,
  };

  return (
    <motion.svg
      width="1920"
      height="670" // Updated to match new SVG
      viewBox="0 0 1920 670" // Updated to match new SVG
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Codatta Logo Background"
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: [
          "drop-shadow(0px 0px 10px rgba(0, 0, 0, 0.0))",
          "drop-shadow(0px 0px 25px rgba(0, 0, 0, 0.20))",
          "drop-shadow(0px 0px 45px rgba(0, 0, 0, 0.35))",
          "drop-shadow(0px 0px 25px rgba(0, 0, 0, 0.20))",
        ],
      }}
      transition={{
        opacity: entryTransitionConfig,
        y: entryTransitionConfig,
        scale: entryTransitionConfig,
        filter: shadowLoopTransitionConfig,
      }}
    >
      {/* New PC SVG content with original animations preserved */}
      <g filter="url(#filter0_f_35285_2853)">
        {" "}
        {/* ID Updated */}
        <motion.path
          d="M846.352 884V759.946H956.623C984.19 759.946 1009.06 755.892 1031.22 747.784C1053.38 739.135 1072.3 727.243 1087.97 712.108C1103.65 696.432 1115.54 677.784 1123.65 656.162C1131.76 634 1135.81 609.676 1135.81 583.189C1135.81 555.622 1131.76 531.027 1123.65 509.405C1115.54 487.784 1103.65 469.405 1087.97 454.27C1072.3 439.135 1053.38 427.784 1031.22 420.216C1009.06 412.108 984.19 408.054 956.623 408.054H846.352V284H949.325C1002.84 284 1049.6 291.838 1089.6 307.514C1129.6 323.189 1163.11 344.541 1190.14 371.568C1217.16 398.595 1237.16 429.676 1250.14 464.811C1263.65 499.405 1270.41 535.892 1270.41 574.27V592.108C1270.41 627.784 1263.65 663.189 1250.14 698.324C1237.16 732.919 1217.16 764.27 1190.14 792.378C1163.11 819.946 1129.6 842.108 1089.6 858.865C1049.6 875.622 1002.84 884 949.325 884H846.352ZM729.596 884V284H862.569V884H729.596Z" // d Updated
          fill="url(#paint0_linear_35285_2853)" // ID Updated
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ ...blurredPathOpacityLoopTransitionConfig, delay: entryDuration + 0.7 }}
        />
      </g>
      <motion.path
        d="M846.352 884V759.946H956.623C984.19 759.946 1009.06 755.892 1031.22 747.784C1053.38 739.135 1072.3 727.243 1087.97 712.108C1103.65 696.432 1115.54 677.784 1123.65 656.162C1131.76 634 1135.81 609.676 1135.81 583.189C1135.81 555.622 1131.76 531.027 1123.65 509.405C1115.54 487.784 1103.65 469.405 1087.97 454.27C1072.3 439.135 1053.38 427.784 1031.22 420.216C1009.06 412.108 984.19 408.054 956.623 408.054H846.352V284H949.325C1002.84 284 1049.6 291.838 1089.6 307.514C1129.6 323.189 1163.11 344.541 1190.14 371.568C1217.16 398.595 1237.16 429.676 1250.14 464.811C1263.65 499.405 1270.41 535.892 1270.41 574.27V592.108C1270.41 627.784 1263.65 663.189 1250.14 698.324C1237.16 732.919 1217.16 764.27 1190.14 792.378C1163.11 819.946 1129.6 842.108 1089.6 858.865C1049.6 875.622 1002.84 884 949.325 884H846.352ZM729.596 884V284H862.569V884H729.596Z" // d Updated
        fill="url(#paint1_linear_35285_2853)" // ID Updated
        animate={{
          x: [0, -3, 2.5, -3.5, 0, -1, 3, -1.5, 0],
          y: [0, 2.5, -3, 3.5, 0, 1, -2, 2.5, 0],
          rotate: [0, 0.15, -0.1, 0.2, 0, 0.1, -0.15, 0.05, 0],
        }}
        transition={{
          duration: pathDriftBaseDuration,
          repeat: Infinity,
          ease: "linear",
          times: [0, 0.1, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1],
        }}
      />
      <g filter="url(#filter1_f_35285_2853)">
        {" "}
        {/* ID Updated */}
        <motion.path
          d="M552.724 600C501.362 600 456.485 591.18 418.093 573.541C380.22 555.383 348.833 531.777 323.93 502.724C299.027 473.152 280.35 441.245 267.899 407.004C255.966 372.763 250 339.818 250 308.171V291.051C250 255.772 256.226 221.012 268.677 186.77C281.647 152.01 300.843 120.623 326.265 92.607C351.686 64.5914 383.333 42.2827 421.206 25.6809C459.079 8.56031 502.918 0 552.724 0C602.529 0 646.368 8.56031 684.241 25.6809C722.114 42.2827 753.761 64.5914 779.183 92.607C804.604 120.623 823.8 152.01 836.77 186.77C849.741 221.012 856.226 255.772 856.226 291.051V308.171C856.226 339.818 850 372.763 837.549 407.004C825.097 441.245 806.42 473.152 781.518 502.724C756.615 531.777 724.968 555.383 686.576 573.541C648.703 591.18 604.086 600 552.724 600ZM552.724 480.934C579.702 480.934 603.826 476.265 625.097 466.926C646.887 457.588 665.305 444.617 680.35 428.016C695.914 411.414 707.588 392.218 715.37 370.428C723.152 348.638 727.043 325.292 727.043 300.389C727.043 273.93 722.892 249.805 714.591 228.016C706.809 205.707 695.136 186.511 679.572 170.428C664.527 153.826 646.368 141.115 625.097 132.296C603.826 123.476 579.702 119.066 552.724 119.066C525.746 119.066 501.621 123.476 480.35 132.296C459.079 141.115 440.661 153.826 425.097 170.428C410.052 186.511 398.638 205.707 390.856 228.016C383.074 249.805 379.183 273.93 379.183 300.389C379.183 325.292 383.074 348.638 390.856 370.428C398.638 392.218 410.052 411.414 425.097 428.016C440.661 444.617 459.079 457.588 480.35 466.926C501.621 476.265 525.746 480.934 552.724 480.934Z" // d Updated
          fill="url(#paint2_linear_35285_2853)" // ID Updated
          initial={{ opacity: 0.35 }}
          animate={{ opacity: [0.35, 0.85, 0.35] }}
          transition={{ ...blurredPathOpacityLoopTransitionConfig, delay: entryDuration + 0.8 }}
        />
        <motion.path
          d="M291.051 730C239.689 730 195.59 721.18 158.755 703.541C121.92 685.383 91.8288 661.777 68.4825 632.724C45.1362 603.152 27.7562 571.505 16.3424 537.782C5.44747 503.541 0 470.337 0 438.171V421.051C0 385.772 5.70688 351.012 17.1206 316.77C28.5344 282.01 45.9144 250.623 69.2607 222.607C93.1258 194.591 122.957 172.283 158.755 155.681C195.071 138.56 237.873 130 287.16 130C338.521 130 383.917 139.598 423.346 158.794C462.776 177.99 494.163 204.708 517.51 238.949C541.375 272.672 555.383 312.361 559.533 358.016H431.128C427.497 335.188 419.196 315.733 406.226 299.65C393.255 283.567 376.394 271.115 355.642 262.296C335.409 253.476 312.581 249.066 287.16 249.066C261.738 249.066 239.17 253.476 219.455 262.296C199.741 271.115 183.139 283.567 169.65 299.65C156.68 315.733 146.563 334.929 139.3 357.237C132.555 379.027 129.183 403.411 129.183 430.389C129.183 456.848 132.555 481.232 139.3 503.541C146.563 525.331 156.939 544.527 170.428 561.128C184.436 577.211 201.556 589.663 221.79 598.482C242.023 606.783 265.11 610.934 291.051 610.934C330.48 610.934 363.684 601.336 390.661 582.14C418.158 562.944 434.76 536.485 440.467 502.763H568.093C563.424 544.267 549.416 582.399 526.07 617.16C503.242 651.401 471.855 678.898 431.907 699.65C392.477 719.883 345.525 730 291.051 730Z" // d Updated
          fill="url(#paint3_linear_35285_2853)" // ID Updated
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ ...blurredPathOpacityLoopTransitionConfig, delay: entryDuration + 0.9 }}
        />
      </g>
      <motion.path
        d="M552.724 600C501.362 600 456.485 591.18 418.093 573.541C380.22 555.383 348.833 531.777 323.93 502.724C299.027 473.152 280.35 441.245 267.899 407.004C255.966 372.763 250 339.818 250 308.171V291.051C250 255.772 256.226 221.012 268.677 186.77C281.647 152.01 300.843 120.623 326.265 92.607C351.686 64.5914 383.333 42.2827 421.206 25.6809C459.079 8.56031 502.918 0 552.724 0C602.529 0 646.368 8.56031 684.241 25.6809C722.114 42.2827 753.761 64.5914 779.183 92.607C804.604 120.623 823.8 152.01 836.77 186.77C849.741 221.012 856.226 255.772 856.226 291.051V308.171C856.226 339.818 850 372.763 837.549 407.004C825.097 441.245 806.42 473.152 781.518 502.724C756.615 531.777 724.968 555.383 686.576 573.541C648.703 591.18 604.086 600 552.724 600ZM552.724 480.934C579.702 480.934 603.826 476.265 625.097 466.926C646.887 457.588 665.305 444.617 680.35 428.016C695.914 411.414 707.588 392.218 715.37 370.428C723.152 348.638 727.043 325.292 727.043 300.389C727.043 273.93 722.892 249.805 714.591 228.016C706.809 205.707 695.136 186.511 679.572 170.428C664.527 153.826 646.368 141.115 625.097 132.296C603.826 123.476 579.702 119.066 552.724 119.066C525.746 119.066 501.621 123.476 480.35 132.296C459.079 141.115 440.661 153.826 425.097 170.428C410.052 186.511 398.638 205.707 390.856 228.016C383.074 249.805 379.183 273.93 379.183 300.389C379.183 325.292 383.074 348.638 390.856 370.428C398.638 392.218 410.052 411.414 425.097 428.016C440.661 444.617 459.079 457.588 480.35 466.926C501.621 476.265 525.746 480.934 552.724 480.934Z" // d Updated
        fill="url(#paint4_linear_35285_2853)" // ID Updated
        animate={{
          x: [0, 3.5, -2, 1, 2.5, -1, 3, -2.5, 0],
          y: [0, -2.5, 3, -3.5, 0, 2, -1, 2.5, 0],
          rotate: [0, -0.2, 0.15, -0.1, 0, -0.15, 0.1, -0.05, 0],
        }}
        transition={{
          duration: pathDriftBaseDuration + 3.8,
          repeat: Infinity,
          ease: "linear",
          times: [0, 0.12, 0.28, 0.4, 0.5, 0.65, 0.78, 0.9, 1],
        }}
      />
      <motion.path
        d="M291.051 730C239.689 730 195.59 721.18 158.755 703.541C121.92 685.383 91.8288 661.777 68.4825 632.724C45.1362 603.152 27.7562 571.505 16.3424 537.782C5.44747 503.541 0 470.337 0 438.171V421.051C0 385.772 5.70688 351.012 17.1206 316.77C28.5344 282.01 45.9144 250.623 69.2607 222.607C93.1258 194.591 122.957 172.283 158.755 155.681C195.071 138.56 237.873 130 287.16 130C338.521 130 383.917 139.598 423.346 158.794C462.776 177.99 494.163 204.708 517.51 238.949C541.375 272.672 555.383 312.361 559.533 358.016H431.128C427.497 335.188 419.196 315.733 406.226 299.65C393.255 283.567 376.394 271.115 355.642 262.296C335.409 253.476 312.581 249.066 287.16 249.066C261.738 249.066 239.17 253.476 219.455 262.296C199.741 271.115 183.139 283.567 169.65 299.65C156.68 315.733 146.563 334.929 139.3 357.237C132.555 379.027 129.183 403.411 129.183 430.389C129.183 456.848 132.555 481.232 139.3 503.541C146.563 525.331 156.939 544.527 170.428 561.128C184.436 577.211 201.556 589.663 221.79 598.482C242.023 606.783 265.11 610.934 291.051 610.934C330.48 610.934 363.684 601.336 390.661 582.14C418.158 562.944 434.76 536.485 440.467 502.763H568.093C563.424 544.267 549.416 582.399 526.07 617.16C503.242 651.401 471.855 678.898 431.907 699.65C392.477 719.883 345.525 730 291.051 730Z" // d Updated
        fill="url(#paint5_linear_35285_2853)" // ID Updated
        animate={{
          x: [0, -2.5, 3.5, -3, 0, -1.5, 3, -1, 0],
          y: [0, 3, -1, -2, 0, 2.5, -3, 1.5, 0],
          rotate: [0, 0.25, -0.15, 0.1, 0, 0.15, -0.2, 0.1, 0],
        }}
        transition={{
          duration: pathDriftBaseDuration + 1.5,
          repeat: Infinity,
          ease: "linear",
          times: [0, 0.1, 0.24, 0.38, 0.5, 0.63, 0.77, 0.91, 1],
        }}
      />
      <g filter="url(#filter2_f_35285_2853)">
        {" "}
        {/* ID Updated */}
        <motion.path
          d="M1095.08 860L1293.16 260H1510.97L1716.45 860H1576.72L1410.69 352.877L1453.43 370.137H1347.41L1391.79 352.877L1229.87 860H1095.08ZM1245.49 711.233L1286.58 599.452H1521.65L1563.57 711.233H1245.49Z" // d Updated
          fill="url(#paint6_linear_35285_2853)" // ID Updated
          initial={{ opacity: 0.45 }}
          animate={{ opacity: [0.45, 0.95, 0.45] }}
          transition={{ ...blurredPathOpacityLoopTransitionConfig, delay: entryDuration + 1.0 }}
        />
      </g>
      <motion.path
        d="M1095.08 860L1293.16 260H1510.97L1716.45 860H1576.72L1410.69 352.877L1453.43 370.137H1347.41L1391.79 352.877L1229.87 860H1095.08ZM1245.49 711.233L1286.58 599.452H1521.65L1563.57 711.233H1245.49Z" // d Updated
        fill="url(#paint7_linear_35285_2853)" // ID Updated
        animate={{
          x: [0, 2, -2.5, 3.5, 0, 2.5, -3, 1, 0],
          y: [0, -3, 2, -2.5, 0, -1.5, 3, -1, 0],
          rotate: [0, -0.15, 0.2, -0.25, 0, -0.1, 0.15, -0.05, 0],
        }}
        transition={{
          duration: pathDriftBaseDuration + 5.2,
          repeat: Infinity,
          ease: "linear",
          times: [0, 0.11, 0.27, 0.4, 0.5, 0.66, 0.79, 0.92, 1],
        }}
      />
      <g filter="url(#filter3_f_35285_2853)">
        {" "}
        {/* ID Updated */}
        <motion.path
          d="M1615.89 680V181.096H1750.68V680H1615.89ZM1447.4 197.534V80H1920V197.534H1447.4Z" // d Updated
          fill="url(#paint8_linear_35285_2853)" // ID Updated
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1.0, 0.5] }}
          transition={{ ...blurredPathOpacityLoopTransitionConfig, delay: entryDuration + 1.1 }}
        />
      </g>
      <motion.path
        d="M1615.89 680V181.096H1750.68V680H1615.89ZM1447.4 197.534V80H1920V197.534H1447.4Z" // d Updated
        fill="url(#paint9_linear_35285_2853)" // ID Updated
        animate={{
          x: [0, -2, 3, -3.5, 0, -2.5, 2, -1, 0],
          y: [0, 2.5, -3.5, 2, 0, 3, -2.5, 1, 0],
          rotate: [0, 0.2, -0.25, 0.15, 0, 0.1, -0.15, 0.05, 0],
        }}
        transition={{
          duration: pathDriftBaseDuration + 2.5,
          repeat: Infinity,
          ease: "linear",
          times: [0, 0.13, 0.26, 0.42, 0.5, 0.63, 0.8, 0.93, 1],
        }}
      />
      <defs>
        {" "}
        {/* New Defs for PC */}
        <filter
          id="filter0_f_35285_2853"
          x="649.596"
          y="204"
          width="700.811"
          height="760"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB" // camelCase: colorInterpolationFilters
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" /> {/* camelCase: floodOpacity */}
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="40" result="effect1_foregroundBlur_35285_2853" />
        </filter>
        <filter
          id="filter1_f_35285_2853"
          x="-80" // Corrected from x="-80" to x="-80" (no change from input but good to note)
          y="-80"
          width="1016.23"
          height="890"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="40" result="effect1_foregroundBlur_35285_2853" />
        </filter>
        <filter
          id="filter2_f_35285_2853"
          x="1015.08"
          y="180"
          width="781.37"
          height="760"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="40" result="effect1_foregroundBlur_35285_2853" />
        </filter>
        <filter
          id="filter3_f_35285_2853"
          x="1367.4"
          y="0"
          width="632.603" // No .0 on original, but doesn't matter
          height="760"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="40" result="effect1_foregroundBlur_35285_2853" />
        </filter>
        <linearGradient
          id="paint0_linear_35285_2853"
          x1="1000"
          y1="284"
          x2="1000"
          y2="884"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDECE7" /> {/* camelCase: stopColor */}
          <stop offset="1" stopColor="#B4B3AF" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_35285_2853"
          x1="1000"
          y1="284"
          x2="1000"
          y2="884"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDECE7" />
          <stop offset="1" stopColor="#E5E3DA" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_35285_2853"
          x1="553.113"
          y1="0"
          x2="553.113"
          y2="600"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDECE7" />
          <stop offset="1" stopColor="#B4B3AF" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_35285_2853"
          x1="284.047"
          y1="130"
          x2="284.047"
          y2="730"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDECE7" />
          <stop offset="1" stopColor="#B4B3AF" />
        </linearGradient>
        <linearGradient
          id="paint4_linear_35285_2853"
          x1="553.113"
          y1="0"
          x2="553.113"
          y2="600"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDECE7" />
          <stop offset="1" stopColor="#E5E3DA" />
        </linearGradient>
        <linearGradient
          id="paint5_linear_35285_2853"
          x1="284.047"
          y1="130"
          x2="284.047"
          y2="730"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDECE7" />
          <stop offset="1" stopColor="#E5E3DA" />
        </linearGradient>
        <linearGradient
          id="paint6_linear_35285_2853"
          x1="1405.76"
          y1="260"
          x2="1405.76"
          y2="860"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDECE7" />
          <stop offset="1" stopColor="#B4B3AF" />
        </linearGradient>
        <linearGradient
          id="paint7_linear_35285_2853"
          x1="1405.76"
          y1="260"
          x2="1405.76"
          y2="860"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDECE7" />
          <stop offset="1" stopColor="#E5E3DA" />
        </linearGradient>
        <linearGradient
          id="paint8_linear_35285_2853"
          x1="1683.7"
          y1="80"
          x2="1683.7"
          y2="680"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDECE7" />
          <stop offset="1" stopColor="#B4B3AF" />
        </linearGradient>
        <linearGradient
          id="paint9_linear_35285_2853"
          x1="1683.7"
          y1="80"
          x2="1683.7"
          y2="680"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDECE7" />
          <stop offset="1" stopColor="#E5E3DA" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

function BgMobileImg({ className }: { className?: string }) {
  const entryDuration = 1.8;
  const entryTransitionConfig = { duration: entryDuration, ease: LOGO_ENTRY_EASE, delay: 0.2 };
  const loopInitialDelay = entryDuration + 0.3;

  const svgLoopTransitionConfig = {
    filter: { duration: 10, repeat: Infinity, ease: ATMOSPHERIC_EASE, delay: loopInitialDelay },
    x: { duration: 28, repeat: Infinity, ease: "linear", delay: loopInitialDelay + 0.2 },
  };

  const innerGroupOpacityLoopTransitionConfig = {
    duration: 10,
    repeat: Infinity,
    ease: ATMOSPHERIC_EASE,
    delay: loopInitialDelay + 0.5,
  };
  const pathDriftBaseDuration = 16;

  return (
    <motion.svg
      width="391"
      height="330" // Updated to match new SVG
      viewBox="0 0 391 330" // Updated to match new SVG
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: [
          "drop-shadow(0px 0px 5px rgba(0, 0, 0, 0.0))",
          "drop-shadow(0px 0px 18px rgba(0, 0, 0, 0.15))",
          "drop-shadow(0px 0px 30px rgba(0, 0, 0, 0.22))",
          "drop-shadow(0px 0px 18px rgba(0, 0, 0, 0.15))",
        ],
        x: [0, 2.5, -2.5, 3.5, -1.5, 0],
      }}
      transition={{
        opacity: entryTransitionConfig,
        y: entryTransitionConfig,
        scale: entryTransitionConfig,
        filter: svgLoopTransitionConfig.filter,
        x: svgLoopTransitionConfig.x,
      }}
    >
      {/* New Mobile SVG content with original animations preserved/adapted */}
      <g clipPath="url(#clip0_35159_33442)">
        {" "}
        {/* ID is the same as old one */}
        <motion.g
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.85, 0.4] }}
          transition={innerGroupOpacityLoopTransitionConfig}
          // The new SVG applies filter here, and opacity. Framer Motion handles opacity.
          // The static opacity="0.5" from SVG is overridden by animation.
          // The filter from the old individual paths is now applied to this group.
          filter="url(#filter0_f_35159_33442)" // Filter moved to the group
        >
          <motion.path
            d="M252.059 273.292C228.664 273.292 208.223 269.275 190.736 261.241C173.486 252.97 159.189 242.218 147.846 228.984C136.503 215.515 127.996 200.982 122.325 185.385C116.889 169.789 114.172 154.783 114.172 140.368V132.57C114.172 116.501 117.008 100.668 122.679 85.0716C128.587 69.2388 137.33 54.942 148.909 42.1813C160.489 29.4206 174.904 19.2593 192.154 11.6973C209.405 3.89911 229.373 0 252.059 0C274.744 0 294.713 3.89911 311.963 11.6973C329.214 19.2593 343.629 29.4206 355.208 42.1813C366.787 54.942 375.531 69.2388 381.438 85.0716C387.346 100.668 390.3 116.501 390.3 132.57V140.368C390.3 154.783 387.464 169.789 381.793 185.385C376.121 200.982 367.614 215.515 356.271 228.984C344.929 242.218 330.514 252.97 313.027 261.241C295.776 269.275 275.453 273.292 252.059 273.292ZM252.059 219.059C264.347 219.059 275.335 216.932 285.024 212.679C294.949 208.425 303.338 202.518 310.191 194.956C317.28 187.394 322.597 178.65 326.142 168.725C329.687 158.8 331.459 148.166 331.459 136.823C331.459 124.772 329.568 113.783 325.787 103.858C322.243 93.6969 316.926 84.9534 309.837 77.6278C302.984 70.0659 294.713 64.2763 285.024 60.259C275.335 56.2418 264.347 54.2331 252.059 54.2331C239.771 54.2331 228.782 56.2418 219.093 60.259C209.405 64.2763 201.016 70.0659 193.926 77.6278C187.073 84.9534 181.875 93.6969 178.33 103.858C174.785 113.783 173.013 124.772 173.013 136.823C173.013 148.166 174.785 158.8 178.33 168.725C181.875 178.65 187.073 187.394 193.926 194.956C201.016 202.518 209.405 208.425 219.093 212.679C228.782 216.932 239.771 219.059 252.059 219.059Z" // d Updated
            fill="url(#paint0_linear_35159_33442)" // ID is same as old one
            // filter prop removed from here
            animate={{
              y: [0, -1.5, 1, -1, 0.5, 0],
              x: [0, 1.5, -1, 1.2, -0.5, 0],
            }}
            transition={{
              duration: pathDriftBaseDuration + 2,
              repeat: Infinity,
              ease: "linear",
              times: [0, 0.2, 0.4, 0.6, 0.8, 1],
            }}
          />
          <motion.path
            d="M132.87 332.507C109.475 332.507 89.3886 328.49 72.6106 320.455C55.8326 312.185 42.1267 301.432 31.4927 288.199C20.8588 274.729 12.9424 260.315 7.74357 244.954C2.78106 229.358 0.299805 214.234 0.299805 199.583V191.785C0.299805 175.716 2.89922 159.883 8.09803 144.286C13.2969 128.454 21.2132 114.157 31.8472 101.396C42.7174 88.6354 56.3053 78.4741 72.6106 70.9122C89.1523 63.114 108.648 59.2148 131.097 59.2148C154.492 59.2148 175.169 63.5866 193.129 72.33C211.088 81.0735 225.385 93.2435 236.019 108.84C246.889 124.2 253.27 142.278 255.16 163.073H196.673C195.019 152.675 191.238 143.814 185.33 136.488C179.423 129.163 171.743 123.491 162.29 119.474C153.074 115.457 142.677 113.448 131.097 113.448C119.518 113.448 109.239 115.457 100.259 119.474C91.2791 123.491 83.7172 129.163 77.5732 136.488C71.6654 143.814 67.0574 152.557 63.749 162.719C60.677 172.644 59.141 183.75 59.141 196.038C59.141 208.09 60.677 219.197 63.749 229.358C67.0574 239.283 71.7836 248.026 77.9276 255.588C84.308 262.914 92.1062 268.585 101.322 272.603C110.538 276.384 121.054 278.274 132.87 278.274C150.829 278.274 165.953 273.902 178.241 265.159C190.766 256.415 198.328 244.364 200.927 229.004H259.059C256.932 247.908 250.552 265.277 239.918 281.11C229.52 296.706 215.224 309.231 197.028 318.683C179.068 327.899 157.682 332.507 132.87 332.507Z" // d Updated
            fill="url(#paint1_linear_35159_33442)" // ID is same as old one
            // filter prop removed from here
            animate={{
              y: [0, 1.2, -1.2, 0.8, -0.3, 0],
              x: [0, -1.8, 0.8, -1.2, 0.6, 0],
            }}
            transition={{
              duration: pathDriftBaseDuration + 3.5,
              repeat: Infinity,
              ease: "linear",
              times: [0, 0.28, 0.48, 0.7, 0.88, 1],
            }}
          />
        </motion.g>
        <motion.path
          d="M252.059 293.292C228.664 293.292 208.223 289.275 190.736 281.241C173.486 272.97 159.189 262.218 147.846 248.984C136.503 235.515 127.996 220.982 122.325 205.385C116.889 189.789 114.172 174.783 114.172 160.368V152.57C114.172 136.501 117.008 120.668 122.679 105.072C128.587 89.2388 137.33 74.942 148.909 62.1813C160.489 49.4206 174.904 39.2593 192.154 31.6973C209.405 23.8991 229.373 20 252.059 20C274.744 20 294.713 23.8991 311.963 31.6973C329.214 39.2593 343.629 49.4206 355.208 62.1813C366.787 74.942 375.531 89.2388 381.438 105.072C387.346 120.668 390.3 136.501 390.3 152.57V160.368C390.3 174.783 387.464 189.789 381.793 205.385C376.121 220.982 367.614 235.515 356.271 248.984C344.929 262.218 330.514 272.97 313.027 281.241C295.776 289.275 275.453 293.292 252.059 293.292ZM252.059 239.059C264.347 239.059 275.335 236.932 285.024 232.679C294.949 228.425 303.338 222.518 310.191 214.956C317.28 207.394 322.597 198.65 326.142 188.725C329.687 178.8 331.459 168.166 331.459 156.823C331.459 144.772 329.568 133.783 325.787 123.858C322.243 113.697 316.926 104.953 309.837 97.6278C302.984 90.0659 294.713 84.2763 285.024 80.259C275.335 76.2418 264.347 74.2331 252.059 74.2331C239.771 74.2331 228.782 76.2418 219.093 80.259C209.405 84.2763 201.016 90.0659 193.926 97.6278C187.073 104.953 181.875 113.697 178.33 123.858C174.785 133.783 173.013 144.772 173.013 156.823C173.013 168.166 174.785 178.8 178.33 188.725C181.875 198.65 187.073 207.394 193.926 214.956C201.016 222.518 209.405 228.425 219.093 232.679C228.782 236.932 239.771 239.059 252.059 239.059Z" // d Updated
          fill="url(#paint2_linear_35159_33442)" // ID is same as old one
          animate={{
            y: [0, -3, 2, -1.5, 0.5, 0],
            x: [0, 2, -1.5, 2.5, -0.8, 0],
            rotate: [0, 0.1, -0.05, 0.15, -0.1, 0],
          }}
          transition={{
            duration: pathDriftBaseDuration - 2.5,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.22, 0.45, 0.65, 0.85, 1],
          }}
        />
        <motion.path
          d="M132.87 352.507C109.475 352.507 89.3886 348.49 72.6106 340.455C55.8326 332.185 42.1267 321.432 31.4927 308.199C20.8588 294.729 12.9424 280.315 7.74357 264.954C2.78106 249.358 0.299805 234.234 0.299805 219.583V211.785C0.299805 195.716 2.89922 179.883 8.09803 164.286C13.2969 148.454 21.2132 134.157 31.8472 121.396C42.7174 108.635 56.3053 98.4741 72.6106 90.9122C89.1523 83.114 108.648 79.2148 131.097 79.2148C154.492 79.2148 175.169 83.5866 193.129 92.33C211.088 101.074 225.385 113.243 236.019 128.84C246.889 144.2 253.27 162.278 255.16 183.073H196.673C195.019 172.675 191.238 163.814 185.33 156.488C179.423 149.163 171.743 143.491 162.29 139.474C153.074 135.457 142.677 133.448 131.097 133.448C119.518 133.448 109.239 135.457 100.259 139.474C91.2791 143.491 83.7172 149.163 77.5732 156.488C71.6654 163.814 67.0574 172.557 63.749 182.719C60.677 192.644 59.141 203.75 59.141 216.038C59.141 228.09 60.677 239.197 63.749 249.358C67.0574 259.283 71.7836 268.026 77.9276 275.588C84.308 282.914 92.1062 288.585 101.322 292.603C110.538 296.384 121.054 298.274 132.87 298.274C150.829 298.274 165.953 293.902 178.241 285.159C190.766 276.415 198.328 264.364 200.927 249.004H259.059C256.932 267.908 250.552 285.277 239.918 301.11C229.52 316.706 215.224 329.231 197.028 338.683C179.068 347.899 157.682 352.507 132.87 352.507Z" // d Updated
          fill="url(#paint3_linear_35159_33442)" // ID is same as old one
          animate={{
            y: [0, 2.5, -1.5, 2, -0.5, 0],
            x: [0, -2, 1.2, -2.2, 0.9, 0],
            rotate: [0, -0.12, 0.08, -0.18, 0.12, 0],
          }}
          transition={{
            duration: pathDriftBaseDuration - 0.5,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.18, 0.4, 0.6, 0.82, 1],
          }}
        />
      </g>
      <defs>
        {" "}
        {/* New Defs for Mobile */}
        <filter
          id="filter0_f_35159_33442" // ID same as old, definition updated
          x="-35.7002"
          y="-36"
          width="462" // Attributes from new SVG
          height="404.508"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="18" result="effect1_foregroundBlur_35159_33442" /> {/* stdDeviation updated */}
        </filter>
        <linearGradient
          id="paint0_linear_35159_33442" // ID same as old, definition (colors) updated
          x1="252.236"
          y1="0"
          x2="252.236"
          y2="273.292"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDECE7" />
          <stop offset="1" stopColor="#B4B3AF" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_35159_33442" // ID same, definition updated
          x1="129.679"
          y1="59.2148"
          x2="129.679"
          y2="332.507"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDECE7" />
          <stop offset="1" stopColor="#B4B3AF" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_35159_33442" // ID same, definition updated
          x1="252.236"
          y1="20"
          x2="252.236"
          y2="293.292"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDECE7" />
          <stop offset="1" stopColor="#E5E3DA" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_35159_33442" // ID same, definition updated
          x1="129.679"
          y1="79.2148"
          x2="129.679"
          y2="352.507"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#EDECE7" />
          <stop offset="1" stopColor="#E5E3DA" />
        </linearGradient>
        <clipPath id="clip0_35159_33442">
          {" "}
          {/* ID same, definition updated */}
          <rect width="390" height="330" fill="white" transform="translate(0.300049)" /> {/* height updated */}
        </clipPath>
      </defs>
    </motion.svg>
  );
}
