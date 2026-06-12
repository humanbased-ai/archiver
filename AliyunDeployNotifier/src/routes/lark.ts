import express, { Router, Request, Response, NextFunction } from "express";
import client, { getGroupList } from "../utils/larkClient";
import { getSuccessTemplate } from "../template/template";
import { CustomError } from "../utils/CustomError";

const router: Router = express.Router();
const timeout = 5 * 60 * 1000;
let lastSendTime = 0;
let groupList: Array<any> | null = null;

const info = {
  header_title: "Aliyun编译成功通知111",
  repository_tag: "refs/heads/feat/lcy/category-delet",
  repository: "codattaAdminWebsite",
  contributor: "chanyu",
  submit_info: "deploy:base upload",
  env: "BASE",
  status: "SUCCESS",
  duration: "13",
  produce_version: "1928F32B0DF1111",
  detail_url: "https://flow.aliyun.com/pipelines/3578270/current",
};

const isExpired = async () => {
  const time = Date.now();
  if (groupList === null) {
    // @ts-ignore
    groupList = await getGroupList();
  } else if (time - lastSendTime > timeout) {
    // 请求后置，先请求，再更新grouplist，减少接口请求，降低响应时间
    getGroupList();
  } else {
    lastSendTime = time;
  }
  return groupList;
};

const sendLarkMessage = (group: any) => {
  return client.im.message.create({
    params: {
      receive_id_type: "chat_id",
    },
    data: {
      receive_id: group.chat_id,
      msg_type: "interactive",
      content: JSON.stringify(getSuccessTemplate(info, "success")),
    },
  });
};

const sendMessage = async (req: Request, res: Response) => {
  const groups = await isExpired();
  const { task, sources, globalParams } = req.body;
  console.log(task, sources, globalParams);
  // TODO 设置信息
  // const status = task.status === "SUCCESS" ? "成功" : task.status === "FAIL" ? "失败" : "";
  // const data = {
  //   header_title: `Aliyun${task.stageName}${status}通知`,
  //   repository_tag: "refs/heads/feat/lcy/category-delet",
  //   repository: sources[0].repo,
  //   contributor: "chanyu",
  //   submit_info: "deploy:base upload",
  //   env: "BASE",
  //   status: "SUCCESS",
  //   duration: task.buildNumber,
  //   produce_version: "1928F32B0DF1111",
  //   detail_url: "https://flow.aliyun.com/pipelines/3578270/current",
  // };
  groups!.forEach((group) => {
    sendLarkMessage(group)
      .then((data) => {
        console.log(data);
        const json =
          data.code === 0
            ? { code: 0, msg: "Send success" }
            : { code: 1, msg: data.msg };
        res.json(json);
      })
      .catch((error) => {
        console.log(error);
        res.json({
          code: 1,
          msg: "success",
          err: error.message,
        });
        throw new CustomError(error.message, 400, error.chat_id);
      });
  });
};

router.post(
  "/sendMessage",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // 实现你的 Lark 相关逻辑
      console.log(req.body);
      sendMessage(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
export { sendLarkMessage };
