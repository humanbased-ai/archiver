# src/api

Any mock data placed in src/api/mock.

Consider adding additional subdirectories to aid in organization.
- src/api/interceptor.tsx  // 拦截器
- src/api/base  // api基础封装，包括axios实例，模拟装饰器mockApi
- src/api/home

Example:
- src/api/base.ts
- src/api/interceptor.tsx 
- src/api/home.ts
- src/api/home.type.ts

# 1000-1999 公共错误

SYSTEM_ERROR = 1000 # 系统错误

REQUEST_PARAM_ILLEGAL = 1002 # 请求参数非法

USER_NOT_EXIST = 1003 # 用户不存在

TG_USER_NOT_EXIST = 1010 # 用户不存在

DATA_NOT_EXIST = 1004 # 数据不存在

DATA_DUPLICATE = 1005 # 数据重复

ACTIVE_FUNDS_POOL_NOT_FOUND = 1006 # 不存在有效的预算池 -- 严重错误

AVAILABLE_AMOUNT_NOT_ENOUGH = 1007 # 可用金额不足

DATA_PHASE_ERROR = 1008 # 数据阶段错误

INVITE_NOT_EXIST = 1009 # 需要用户填写邀请码

# 注
- 关于enum（枚举）的使用： 在 TypeScript 中，enum（枚举）并不是一种类型，它是一种特殊的对象类型。枚举提供了一种方便的方式来定义一组带名字的常量。尽管枚举本身不是类型，但它会生成一个联合类型，你可以在类型声明中使用它。
- 所有类型都带前缀T，除enum类型外
