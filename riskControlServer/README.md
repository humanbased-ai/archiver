

### risk-control-server


#### 表设计
```
use test;
db.getCollection("user-opt").findOne({})
{
  _id: ObjectId('662512f2689112925ca5d4cf'),
  auth_uuid: '123',
  user_id: '1234',
  operation: 1,
  opt_status: 1,
  device_info: { device_ip: '127.0.0.1', device_id: '' },
  create_at: ISODate('2024-04-21T13:21:54.968Z')
}


db.getCollection("user-opt").createIndex(
  { "CreateAt": -1}, // "expiresAt" 是你选择的时间字段，这里按升序排列
  { expireAfterDays: 365 } // 设置文档的过期时间，0 表示立即过期，仅用于测试
);
db.getCollection("user-opt").createIndex(
  { "UserID": 1 }, // "expiresAt" 是你选择的时间字段，这里按升序排列
   // 设置文档的过期时间，0 表示立即过期，仅用于测试
);
mongo 联合索引，比分别设置两个key作为索引，查询速度差别在哪


db.getCollection("user-opt").createIndex(
  { "CreateAt": -1, "UserID": 1 }, // 这里 "field1" 是升序，"field2" 是降序
);

```