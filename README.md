# 八字 & 六爻 API 服务

这是一个基于 Deno 和 TypeScript 构建的 API 服务，用于获取八字和六爻的排盘数据。数据源为 `paipan.china95.net`。

## 技术栈

-   **Runtime**: [Deno](https://deno.land/)
-   **语言**: [TypeScript](https://www.typescriptlang.org/)
-   **HTML 解析**: [deno-dom](https://github.com/b-fuze/deno-dom)
-   **字符编码**: [iconv-lite](https://github.com/ashtuchkin/iconv-lite)

## 如何运行

1.  **安装 Deno**: 如果您尚未安装 Deno，请参照 [Deno 官方文档](https://deno.land/manual/getting_started/installation)进行安装。

2.  **启动服务**: 在项目根目录下，运行以下命令来启动 API 服务。服务将启动在 `http://localhost:8000`。

    ```bash
    deno run --allow-net main.ts
    ```

## API 文档

### 1. 八字排盘 API

-   **Endpoint**: `/api/bazi`
-   **Method**: `GET`
-   **描述**: 根据提供的出生年月日时和地点信息，获取详细的八字排盘数据。

#### 请求参数

| 参数名    | 类型     | 是否必需 | 描述                               | 示例值        |
| :-------- | :------- | :------- | :--------------------------------- | :------------ |
| `year`    | `number` | 是       | 出生年份 (公历)                    | `1990`        |
| `month`   | `number` | 是       | 出生月份 (公历)                    | `1`           |
| `day`     | `number` | 是       | 出生日期 (公历)                    | `20`          |
| `hour`    | `number` | 是       | 出生小时 (24小时制)                | `15`          |
| `minute`  | `number` | 否       | 出生分钟 (默认为 `0`)              | `30`          |
| `gender`  | `number` | 否       | 性别 ( `1` 为男, `0` 为女, 默认为 `1` ) | `1`           |
| `province`| `string` | 是       | 出生省份 (中文)                    | `江苏`        |
| `city`    | `string` | 是       | 出生城市 (中文)                    | `无锡`        |

#### 调用示例

```bash
curl "http://localhost:8000/api/bazi?year=1990&month=1&day=20&hour=15&province=江苏&city=无锡"
```

### 2. 六爻排盘 API

-   **Endpoint**: `/api/liuyao`
-   **Method**: `GET`
-   **描述**: 根据提供的占卦时间，获取详细的六爻排盘数据。求测人信息（姓名、性别、生年）在后端使用默认值。

#### 请求参数

| 参数名   | 类型     | 是否必需 | 描述                  | 示例值 |
| :------- | :------- | :------- | :-------------------- | :----- |
| `year`   | `number` | 是       | 占卦年份 (公历)       | `2008` |
| `month`  | `number` | 是       | 占卦月份 (公历)       | `12`   |
| `day`    | `number` | 是       | 占卦日期 (公历)       | `23`   |
| `hour`   | `number` | 是       | 占卦小时 (24小时制)   | `8`    |
| `minute` | `number` | 否       | 占卦分钟 (默认为 `0`) | `37`   |

#### 调用示例

```bash
curl "http://localhost:8000/api/liuyao?year=2008&month=12&day=23&hour=8&minute=37"