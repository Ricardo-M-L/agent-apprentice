# Agent Apprentice · Agent 拜师工作台

**让你的个人 Agent 跟老师学习，之后独立完成任务，把能力留在自己手里。**

[English](README.md) · [架构](docs/ARCHITECTURE.md) · [安全](SECURITY.md) · [实验说明](docs/EVALUATION.md)

全 TypeScript：Electron 桌面应用 + React 界面 + CLI + SQLite。不是多人聊天窗口，也不把共享提示词直接叫作“学会”。

## 首发体验

- 我的 Agent：配置学生和老师，明确模型、接口与密钥环境变量名。
- 老师档案：教学范围、授权材料、许可。
- 学习室：诊断 → 教学 → 练习与反馈 → 老师断开 → 独立考试。
- 能力档案：来源、验证条件、导入导出、停用删除、独立复验。
- 实验比较：无材料、文档、静态技能、针对性教学四组。

**这是研究预览版。离线演示使用固定模拟数据，明确标记 SIMULATED，不证明真实学习收益。** 软件不更新模型权重。真实模型接口已经实现，但教学收益要用用户明确提供的模型和预算实测，不能以演示结果代替。

## 启动

开发环境：Node 22.13+、pnpm 11.7。目前实际面向 macOS Apple Silicon 验证。

```sh
pnpm install --frozen-lockfile
pnpm rebuild:electron
pnpm build
pnpm start
```

点击 **Start simulated lesson**，无需 Key 或 Docker 就能体验模拟教学闭环。桌面安装包包含运行时，普通用户不需要安装 Node；现阶段打包产物未签名、未公证，不建议关闭系统安全机制。

CLI：

```sh
node dist/cli.cjs demo
node dist/cli.cjs compare
node dist/cli.cjs status
node dist/cli.cjs doctor
```

## 真实教学

1. 在启动应用的终端显式设置模型 Key 环境变量；应用不读取现存 Codex、Claude 或 Metis 登录文件。
2. 在 My agents 中配置学生和老师，选择 Chat Completions 或 Responses，输入模型、Base URL 和密钥的**环境变量名**。
3. 创建老师档案，只使用有权共享的材料。
4. 启动 Docker，执行 `docker pull node:24-alpine`。
5. 在学习页选择真实 Docker 执行，确认会发送的教学材料后开始。

真实代码仅在受限容器运行：非 root、默认无网络、资源和时间限制、无 HOME/密钥/Docker socket 挂载。Docker 不可用时直接失败，绝不静默改为宿主机执行。使用 Colima 时应显式传入对应 `DOCKER_HOST`，不修改全局 Docker context。

源码和测试输入通过标准输入传入容器，TypeScript 在容器内部处理；不挂载任何宿主机目录，不依赖 Docker VM 的目录共享设置。

## 远端老师权限

服务使用两枚不同的凭据：`APPRENTICE_API_TOKEN` 只给本机管理员；`APPRENTICE_TEACHER_TOKEN` 只给学生调用 `/v1/teach`，不能读取档案、事件或修改模型配置。启用教学时，缺少独立教师凭据或复用管理员凭据会拒绝启动。

```sh
# 分别在本机生成两份强随机凭据，不要粘贴到日志
export APPRENTICE_API_TOKEN="$(openssl rand -hex 32)"
export APPRENTICE_TEACHER_TOKEN="$(openssl rand -hex 32)"
node dist/cli.cjs serve --teacher-provider your-provider-id
```

教师服务最多 100 次上游尝试/生命周期、2 个并发、30 秒/调用、600 个请求输出 token，并有输入字节及累计预留预算限制；失败也计入预算。通过 `--teacher-max-requests` 等参数只能降低限制。远端代理只应公开 `/v1/teach`，不公开管理接口。完整权限与限制见 [协议](docs/PROTOCOL.md)。

## 数据和能力归属

CLI 默认数据目录是 `~/.agent-apprentice`；桌面默认使用 Electron 应用数据目录。`APPRENTICE_DATA` 可以覆盖。每个目录只允许一个协调器，防止桌面与 CLI 重复调度；需要同时使用时通过已认证的本地 API 连接。

能力包包含方法、来源、许可、模型和环境条件以及校验和，不包含密钥或默认原始会话。导入后默认停用、未验证；校验和不是作者身份认证。复验前要检查学生和环境选择。

## 限制

- 自带课程仅验证 TypeScript 输入处理任务，不等于通用编程能力。
- 四组总成本包含教学开销；缺少价格或 token 用量显示 Unknown。
- 当前字节级 token 预留是保守预算，不是精确分词计费或金额硬上限。
- Metis CLI 接口保留为禁用状态，尚未验证安全隔离路径；不冒充已经支持。
- 暂无公共老师市场、支付、自动微调或模型升级。
- 没有遥测、隐式凭据读取、自动公开发布能力或自动更新服务。

## 检查与打包

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm rebuild:electron
pnpm test:e2e
APPRENTICE_TEST_DOCKER=1 pnpm test
pnpm pack:dir
pnpm smoke:packaged
```

未启用 Docker 测试时会明确标记跳过。Node CLI 和 Electron 的 SQLite 使用不同原生 ABI，必须使用项目提供的 scoped rebuild 脚本，不要执行会覆盖两个版本的全局重建。

本项目原创代码与课程采用 Apache-2.0；参考 Agent Teams AI 的架构思路，没有复制其 AGPL 代码或素材。第三方依赖、教学材料和模型各自保留许可条件。
