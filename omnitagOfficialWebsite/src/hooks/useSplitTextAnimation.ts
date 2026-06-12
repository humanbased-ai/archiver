import { animate, stagger, useInView } from "motion/react";
import { splitText } from "motion-plus";
import { useRef, useEffect, useMemo, useCallback, useState } from "react";

// 定义动画选项的接口
interface AnimationOptions {
  // 动画属性
  properties?: Record<string, [number, number]> | Record<string, unknown>; // 如 { opacity: [0, 1], y: [10, 0] }

  // 动画配置
  type?: "spring" | "keyframes" | "tween";
  duration?: number;
  bounce?: number;
  delay?: number | ReturnType<typeof stagger>;
  easing?: string | undefined;
  repeat?: number | "infinite";

  // 视口触发选项
  triggerOnView?: boolean;
  inViewOptions?: {
    amount?: number | "some" | "all";
    margin?: string;
    root?: Element | Document | null;
    // 移除 once 选项，我们将在代码中手动控制重复播放
  };

  // 允许其他选项
  [key: string]: unknown;
}

// 动画结果接口
interface AnimationResult<T> {
  ref: React.RefObject<T>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  cancel: () => void;
  isAnimating: boolean;
}

/**
 * 使用 motion 库的 animate 函数为拆分文本创建动画的钩子
 */
export function useSplitTextAnimation<T extends HTMLElement = HTMLElement>(
  selectors: string | string[],
  options: AnimationOptions = {},
): AnimationResult<T> {
  // 创建容器引用
  const containerRef = useRef<T | null>(null);
  // 跟踪动画控制器
  const animationRef = useRef<ReturnType<typeof animate> | null>(null);
  // 跟踪是否正在动画中
  const isAnimatingRef = useRef<boolean>(false);
  // 添加一个状态来跟踪进入视图的次数，用于触发重新动画
  const [viewEntryCount, setViewEntryCount] = useState(0);

  // 默认动画选项
  const defaultOptions: AnimationOptions = {
    properties: {
      opacity: [0, 1],
      y: [15, 0],
    },
    type: "spring",
    duration: 2,
    bounce: 0,
    delay: stagger(0.03),
    repeat: 0,
    triggerOnView: false,
    inViewOptions: {
      amount: "all",
      margin: "0px",
      // 移除了 once: true，以便每次都能触发
    },
  };

  // 合并选项
  const animationOptions: AnimationOptions = {
    ...defaultOptions,
    ...options,
    inViewOptions: {
      ...defaultOptions.inViewOptions,
      ...options.inViewOptions,
      // 强制确保 once 不会被设置为 true
    },
  };

  // 处理 repeat 选项
  const repeatValue =
    animationOptions.repeat === "infinite"
      ? Infinity
      : typeof animationOptions.repeat === "number"
        ? animationOptions.repeat
        : 0;

  // 创建动画函数
  const createAnimation = useCallback(() => {
    if (!containerRef.current) return;

    // 取消当前正在播放的动画（如果有）
    if (animationRef.current) {
      animationRef.current.cancel();
    }

    // 确保字体已加载
    document.fonts.ready.then(() => {
      if (!containerRef.current) return;

      // 处理选择器（可以是字符串或字符串数组）
      const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

      // 收集所有拆分元素
      let allElements: HTMLElement[] = [];

      // 处理每个选择器
      selectorArray.forEach((selector) => {
        const isClassSelector = selector.startsWith(".");

        if (isClassSelector) {
          // 获取所有匹配该类的元素
          const elements = containerRef.current?.querySelectorAll(selector);

          if (elements && elements.length > 0) {
            elements.forEach((element) => {
              // 对当前元素应用 splitText
              const split = splitText(element);

              // 将拆分的元素（字符、词或行）添加到收集中
              if (split.chars) allElements = [...allElements, ...split.chars];
              else if (split.words) allElements = [...allElements, ...split.words];
              else if (split.lines) allElements = [...allElements, ...split.lines];
            });
          }
        } else {
          // 处理非类选择器
          const elements = containerRef.current?.querySelectorAll(selector);

          if (elements && elements.length > 0) {
            elements.forEach((element) => {
              const split = splitText(element);

              if (split.chars) allElements = [...allElements, ...split.chars];
              else if (split.words) allElements = [...allElements, ...split.words];
              else if (split.lines) allElements = [...allElements, ...split.lines];
            });
          }
        }
      });

      // 如果找到了元素，应用动画
      if (allElements.length > 0) {
        // 重置元素的初始状态
        if (typeof animationOptions.properties === "object") {
          // 获取每个属性的初始值
          const initialStates: Record<string, any> = {};

          for (const [key, value] of Object.entries(animationOptions.properties)) {
            if (Array.isArray(value) && value.length > 0) {
              initialStates[key] = value[0];
            }
          }

          // 应用初始状态到所有元素
          if (Object.keys(initialStates).length > 0) {
            allElements.forEach((el) => {
              Object.entries(initialStates).forEach(([prop, val]) => {
                // @ts-ignore
                el.style[prop] = typeof val === "number" ? `${val}px` : val;
              });
            });
          }
        }

        // 设置动画状态
        isAnimatingRef.current = true;

        // 创建动画配置
        const animationConfig: any = {
          type: animationOptions.type,
          duration: animationOptions.duration,
          bounce: animationOptions.bounce,
          delay: animationOptions.delay,
          repeat: repeatValue,
          onComplete: () => {
            isAnimatingRef.current = false;
          },
        };

        // 只有当easing存在时才添加到配置中
        if (animationOptions.easing !== undefined) {
          animationConfig.easing = animationOptions.easing;
        }

        // 创建动画
        animationRef.current = animate(allElements, animationOptions.properties!, animationConfig);
      }
    });
  }, [selectors, animationOptions, repeatValue]);

  // 创建一个引用来存储root元素
  const rootElementRef = useRef<Element | null>(null);

  // 在组件挂载时设置rootElementRef
  useEffect(() => {
    if (animationOptions.inViewOptions?.root) {
      // 如果是Element类型，则设置到ref中
      if (animationOptions.inViewOptions.root instanceof Element) {
        rootElementRef.current = animationOptions.inViewOptions.root;
      }
      // Document类型不能直接设置到rootElementRef中
    }
  }, [animationOptions.inViewOptions?.root]);

  // 使用useMemo来确保不会不必要地重新创建
  const memoizedInViewOptions = useMemo(() => {
    // Ignoring type mismatch for margin and root properties
    return {
      amount: animationOptions.inViewOptions?.amount,
      once: false, // 始终设置为 false，确保每次进入视图都会触发
      margin: animationOptions.inViewOptions?.margin,
      // 使用rootElementRef而不是直接传递DOM元素
      root: animationOptions.inViewOptions?.root instanceof Element ? rootElementRef : undefined,
    };
  }, [
    animationOptions.inViewOptions?.amount,
    animationOptions.inViewOptions?.margin,
    animationOptions.inViewOptions?.root,
    rootElementRef,
  ]);

  // 使用useInView钩子
  // @ts-expect-error
  const isInView = useInView(containerRef, memoizedInViewOptions);

  // 前一个 isInView 状态的引用
  const prevIsInViewRef = useRef(false);

  // 处理初始化和视口触发
  useEffect(() => {
    // 如果不需要在视口中触发，直接创建动画
    if (!animationOptions.triggerOnView) {
      createAnimation();
      return;
    }

    // 当元素进入视口时创建动画
    // 只有当从不可见变为可见时才触发动画
    if (animationOptions.triggerOnView && isInView && !prevIsInViewRef.current) {
      setViewEntryCount((prev) => prev + 1); // 增加计数器触发重渲染
      createAnimation();
    }

    // 更新前一个状态
    prevIsInViewRef.current = isInView;
  }, [isInView, animationOptions.triggerOnView, createAnimation, viewEntryCount]);

  // 返回一个控制对象
  return {
    ref: containerRef,
    play: () => {
      if (animationRef.current) {
        animationRef.current.play();
        isAnimatingRef.current = true;
      } else {
        createAnimation();
      }
    },
    pause: () => {
      if (animationRef.current) {
        animationRef.current.pause();
        isAnimatingRef.current = false;
      }
    },
    stop: () => {
      if (animationRef.current) {
        animationRef.current.cancel();
        isAnimatingRef.current = false;
      }
    },
    cancel: () => {
      if (animationRef.current) {
        animationRef.current.cancel();
        isAnimatingRef.current = false;
      }
    },
    get isAnimating() {
      return isAnimatingRef.current;
    },
  };
}
