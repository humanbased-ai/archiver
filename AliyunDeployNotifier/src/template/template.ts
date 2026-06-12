function getSuccessTemplate(info: any, type: string) {
  return {
    config: {
      wide_screen_mode: true,
    },
    header: {
      template: type === "success" ? "turquoise" : "red",
      title: {
        tag: "plain_text",
        content: info.header_title,
      },
    },
    elements: [
      {
        tag: "markdown",
        content: `所属仓库 : ${info.repository}\n所属 Tag : ${info.repository_tag}\n提交人 : ${info.contributor}\n提交信息 : ${info.submit_info}\n部署环境 : ${info.env}\n任务状态 : ${info.status}\n执行时长 : ${info.duration}s\n制品版本 : ${info.produce_version}\n`,
      },
      {
        tag: "hr",
      },
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: {
              tag: "plain_text",
              content: "查看详情",
            },
            type: "primary",
            url: info.detail_url,
          },
        ],
      },
    ],
  };
}

export { getSuccessTemplate };
