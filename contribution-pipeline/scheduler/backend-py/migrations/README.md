# Migrations

Python 版复用 `../backend/migrations/` 下的全部 SQL 文件，目录内容相同。

运行方式：

```bash
python -m scheduler.migrate up
```

或直接软链：

```bash
ln -s ../../backend/migrations/* .
```
