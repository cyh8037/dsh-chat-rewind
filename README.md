# dsh-chat-rewind

DeepSeek Harness 插件：**双击你自己发出的消息进入编辑态，修改后从该处重新开始对话**，不回退文件。

## 功能

- 双击用户消息（或悬停后点铅笔图标）进入内联编辑，预填原文；
- `Enter` 发送、`Shift+Enter` 换行、`Esc` 取消，与底部 composer 的键位一致；
- 点编辑卡外部自动收起编辑态；同一时刻只允许一个编辑态；
- 原消息带图片时，图片会随新消息一起发送，可逐张删除，也可直接**粘贴/拖拽**新增；
- 底部「归档原会话」开关（默认开）：消息发送成功后归档源会话；
- 带文件附件的消息不允许编辑（避免静默丢失附件）；
- 子代理会话中的消息不允许编辑，只保留官方渲染；
- 不可编辑的消息不渲染编辑按钮，双击也不会有任何反馈（整行保持官方形态）。

## 行为说明

Harness 的会话日志是 append-only，没有“原地截断”的公开接口。因此本插件在目标消息**之前**切一个会话分支，并在新分支里重新发送修改后的内容；原会话保留（可选择性归档）。工作目录里的文件不会被回退。

## 安装

npm 包名：`dsh-chat-rewind`。

本仓库是一个本地 bundle（无需构建），把目录放到任意位置后：

```bash
# 在 DSH 中执行：
#   plugin_manager  install_bundle  target=<本目录绝对路径>
```

或在当前 profile 的 `cordis.patch.yml` 中加入：

```yaml
- insert:
    - id: chat-rewind
      name: 'dsh-chat-rewind'
```

安装后在 Web UI 刷新页面即可生效（客户端插件在页面启动时加载）。

## 兼容性

插件覆盖 `conversation.chat.node` 的 `user` 渲染器，并复用官方的
`conversation.chat.user.content` Factory 与 `conversation.chat.user.before` chain。
注册前校验 `sessions.fork`，渲染前校验槽位提供的标准 props
（`renderFactorySlot`、`renderSlotChain`、`useSession`、`useProjection`、`sessionId`、`node.data`）；
任一契约不满足时会撤销自己的注册并恢复官方渲染器，同时在控制台输出一条 warning，不会把用户消息渲染坏。

## 已知限制

- 只处理用户消息；
- 带文件附件的消息不可编辑（图片可以带入）；
- 子代理会话中的消息不可编辑；
- 已被上下文压缩卸载（offloaded）的图片不会带入新消息；
- 发送失败时，刚创建的空分支会被自动归档，避免侧栏堆积重复分支；
- 分支不再自动追加 “(1)” 标题后缀（该 rename 在子会话创建之后执行，失败会留下孤儿分支）；
- 归档默认 `stopActivity: true`，若源会话正在运行，回退会中止它；
- 底部发送关闭编辑态依赖本地 pending submission 计数，发送被宿主拒绝时可能提前关闭编辑态。

## 开发

纯 JavaScript 客户端 bundle，无构建步骤：

- `client.js` — 客户端实现（槽位注册、编辑态、图片处理、分支与发送）
- `index.js` — Host 半边（空实现，仅用于挂载 bundle）
- `locale/` — 中英文文案与插件元信息
- `icon.svg` — 插件图标

## License

MIT，见 [LICENSE](LICENSE)。
