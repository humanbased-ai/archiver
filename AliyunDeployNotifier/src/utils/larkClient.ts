import { Client } from "@larksuiteoapi/node-sdk";

const client = new Client({
  appId: process.env.LARK_APP_ID as string,
  appSecret: process.env.LARK_APP_SECRET as string,
  disableTokenCache: false,
});

const getGroupList = async () => {
  console.log("update group list");
  const listRes = await client.im.chat.list();
  return listRes.data?.items;
};
export default client;
export { getGroupList };

// export default {
//   client,
//   getGroupList,
// };
