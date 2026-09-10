import { create } from "zustand";
export type Locale = "en" | "zh-CN";
export const languageKey = "apprentice.language";
export function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(languageKey);
    if (saved === "en" || saved === "zh-CN") return saved;
  } catch {
    /* Storage may be unavailable. */
  }
  return typeof navigator !== "undefined" &&
    navigator.language.toLowerCase().startsWith("zh")
    ? "zh-CN"
    : "en";
}
export const zh: Record<string, string> = {
  "Enter an API key for encrypted system storage, or choose an environment variable. No other application's configuration is read or changed.":
    "可直接填写 API Key 并加密保存，或使用环境变量；不会读取、修改其他应用配置。",
  Authentication: "认证方式",
  "API key (secure storage)": "直接填写 API Key（安全存储）",
  "Environment variable name": "环境变量名",
  "API key": "API Key",
  "Leave blank to keep saved key": "留空保留已保存密钥",
  "Paste your API key": "粘贴 API Key 本身",
  "Encrypted using system secure storage. Never written to other applications or shell configuration.":
    "使用系统安全存储加密，不写入其他应用或终端配置。",
  "System secure storage unavailable. Use environment variable mode; plaintext saving is disabled.":
    "系统安全存储不可用，请使用环境变量方式；不会明文保存。",
  "Enter a variable name, not the API key. Start with A-Z; use A-Z, 0-9 or underscore.":
    "请输入变量名而非密钥：以大写字母开头，仅含大写字母、数字或下划线。",
  "Enter a name such as OPENAI_API_KEY, not its secret value. Set it before launching the app; no global configuration is changed.":
    "填写 OPENAI_API_KEY 等变量名，而非密钥本身。需在启动应用前设置；应用不会修改全局配置。",
  "Connect remote teacher": "连接远端老师",
  "Edit connection": "编辑连接",
  "Remove saved key": "删除已保存密钥",
  "Securely saved": "已安全保存",
  "Saved key unavailable": "已保存密钥不可用",
  "Keys are encrypted in this application's data directory. No credential scanning.":
    "密钥加密保存在本应用数据目录中，不扫描其他应用凭据。",

  "Close dialog": "关闭对话框",
  "PERSONAL AGENT LEARNING": "个人 Agent 学习工作台",
  "Personal workspace": "个人工作区",
  LOCAL: "本地",
  "Knowledge stays yours": "知识始终属于你",
  "No telemetry. No account required.": "无遥测，无需注册账号。",
  "v0.1.0 · Research preview": "v0.1.0 · 研究预览版",
  "Personal workspace /": "个人工作区 /",
  "Coordinator ready": "协调器已就绪",
  "Refresh environment": "刷新环境",
  "FROM EXPERIENCE TO INDEPENDENCE": "从经验到独立",
  "YOUR LEARNING WORKSPACE": "你的学习工作区",
  "A little guidance. A lasting capability.": "一点指导，积累持久能力。",
  "Let your agent learn from a teacher — then see what it can do on its own.":
    "让你的 Agent 向老师学习，再看它能独立完成什么。",
  "Bring your own models. Keep the student the same when comparing results.":
    "接入你自己的模型。比较结果时，请使用相同的学生。",
  "Explicit expertise, materials and permissions. No hidden access to your files.":
    "明确教学专长、材料和权限，不会暗中访问你的文件。",
  "Portable methods with provenance. A passed exercise is not a universal guarantee.":
    "可携带、可溯源的方法。通过练习不等于具备通用能力。",
  "Measure learning against simpler alternatives, not against a hand-picked demo.":
    "与更简单的方法对照，衡量学习效果，而非只展示精选演示。",
  Learn: "学习",
  "My agents": "我的 Agent",
  Teachers: "老师档案",
  Capabilities: "能力档案",
  Experiments: "实验比较",
  "Add agent": "添加 Agent",
  "Add teacher": "添加老师",
  "Import package": "导入能力包",
  "Independent retest of {id}. Review student, execution and consent below. No teacher will be called.":
    "独立复验：{id}。请确认下方学生、执行方式与授权。不会调用老师。",
  "New lesson instead": "改为新建课程",
  "Dismiss error": "关闭错误提示",
  "Evidence before claims.": "先验证，再下结论。",
  "Offline demo uses fixed simulated fixtures. Real learning requires configured providers and Docker; no automatic credential discovery.":
    "离线演示使用固定模拟数据。真实学习需要配置模型接口和 Docker，不会自动查找凭据。",
  "Experiment setup": "实验设置",
  "Set up a lesson": "设置课程",
  STUDENT: "学生",
  Student: "学生",
  "learns from ↓": "向老师学习 ↓",
  TEACHER: "老师",
  Teacher: "老师",
  "Maintainer foundations": "维护者基础课程",
  "TypeScript · Input validation · Error semantics":
    "TypeScript · 输入校验 · 错误语义",
  EXECUTION: "执行方式",
  Execution: "执行方式",
  "Offline simulation — no code execution": "离线模拟 — 不执行代码",
  "Real model + isolated Docker execution": "真实模型 + Docker 隔离执行",
  "TOKEN RESERVATION": "Token 预留预算",
  "Token budget": "Token 预算",
  "PRACTICE ROUNDS": "练习轮数",
  "Practice rounds": "练习轮数",
  "Docker available. The course image must already be pulled.":
    "Docker 可用。请先拉取课程镜像。",
  "Docker unavailable. Real runs fail closed; there is no host fallback.":
    "Docker 不可用。真实任务将拒绝执行，不会改为在宿主机运行。",
  "I authorize sending the selected teacher material, public course task, generated attempts and practice feedback to the configured model/teacher endpoints. No private files are selected.":
    "我授权将所选教学材料、公开课程任务、生成的解答及练习反馈发送到配置的模型或老师接口。未选择任何私人文件。",
  "Run four-arm comparison": "运行四组对照实验",
  "Start simulated lesson": "开始模拟教学",
  "Start learning": "开始学习",
  "12 calls maximum · 3-minute deadline per arm · Cancel anytime":
    "最多 12 次调用 · 每组限时 3 分钟 · 随时可取消",
  "Learning room": "学习室",
  "SIMULATED · ": "模拟 · ",
  READY: "就绪",
  Graduate: "毕业",
  "Your agent’s next skill starts here": "你的 Agent 从这里学习新技能",
  "Choose a student and teacher. Practice together.":
    "选择学生和老师，一起练习。",
  "Graduate independently, with evidence.": "凭验证结果，独立毕业。",
  "TEACH → PRACTICE → VERIFY": "教学 → 练习 → 验证",
  Cancel: "取消",
  Calls: "调用次数",
  "Reported tokens": "接口报告的 Token",
  Unknown: "未知",
  "Demo cost": "演示费用",
  "Estimated cost": "预估费用",
  Exam: "考试",
  "A fairer question": "更公平地比较",
  "Did teaching help more than simply sharing a skill?":
    "针对性教学，是否比直接分享技能更有效？",
  "Same student, course seed and per-task budget. Teaching overhead is included. Changes in model or environment require a new comparison. Simulation results are fixtures, not measurements.":
    "使用相同学生、课程种子和单任务预算，并计入教学开销。模型或环境变化后需重新比较。模拟结果是固定数据，并非实测。",
  "Recent sessions": "最近的学习",
  "Experiment results": "实验结果",
  runs: "次运行",
  "No sessions yet. Start a lesson above.": "暂无学习记录，请在上方开始课程。",
  Session: "会话",
  Condition: "实验条件",
  Status: "状态",
  Cost: "费用",
  Elapsed: "耗时",
  SIMULATION: "模拟",
  SIMULATED: "模拟",
  "Not required": "无需验证",
  "Not configured": "未配置",
  "Offline fixture": "离线模拟数据",
  Endpoint: "接口地址",
  "Disabled until isolated execution is verified.":
    "隔离执行验证完成前不可用。",
  "Credentials are never displayed, exported or read from existing login files.":
    "不会展示、导出凭据，也不会读取现有登录文件。",
  "Provide only the environment variable name holding your key. The coordinator must be launched with that variable set. Saving an agent does not make a paid request.":
    "只需提供存放密钥的环境变量名称。启动协调器时必须设置该变量。保存 Agent 不会发起付费请求。",
  "TEACHING SCOPE": "教学范围",
  "Review materials sent during teaching": "查看教学时发送的材料",
  "Learn with this teacher": "向这位老师学习",
  "A library of things your agent can do": "记录你的 Agent 已掌握的方法",
  "Complete a lesson to create your first capability record.":
    "完成一次课程，创建你的第一份能力档案。",
  "Start a lesson": "开始课程",
  "VERIFIED IN CONTEXT": "已在指定条件下验证",
  UNVERIFIED: "未验证",
  Course: "课程",
  Enabled: "已启用",
  Disabled: "已停用",
  Inspect: "查看详情",
  Disable: "停用",
  Enable: "启用",
  "Independent retest": "独立复验",
  Delete: "删除",
  Export: "导出",
  "Checksums detect accidental changes, not author identity. Imported packages are unverified and disabled until you review and explicitly enable them.":
    "校验和用于检测意外修改，不能证明作者身份。导入的能力包默认未验证且停用，需审核后手动启用。",
  "Local-first · No telemetry": "本地优先 · 无遥测",
  "Agent Apprentice / Open-source learning workspace":
    "Agent Apprentice / 开源学习工作台",
  "Connect an agent": "接入 Agent",
  "Only explicit model endpoints and environment variable names. No credential scanning.":
    "仅使用明确配置的模型接口与环境变量名称，不扫描凭据。",
  "Create a teacher": "创建老师",
  "Only share materials you have permission to use.":
    "仅分享你有权使用的材料。",
  "Capability evidence": "能力验证证据",
  "Validation is conditional on the recorded environment, not a universal certificate.":
    "验证仅适用于所记录的环境，不代表通用能力认证。",
  "Export package": "导出能力包",
  "Delete capability?": "删除能力档案？",
  "This removes the local capability record. Session evidence remains. Export a copy first if needed.":
    "这将删除本地能力档案，但保留会话证据。如有需要，请先导出备份。",
  "Keep capability": "保留档案",
  "Delete capability": "删除档案",
  "DISPLAY NAME": "显示名称",
  "My local agent": "我的本地 Agent",
  PROTOCOL: "接口协议",
  "Remote teacher protocol": "远端老师协议",
  "Offline simulation": "离线模拟",
  MODEL: "模型",
  "Model identifier from your provider": "模型服务商提供的模型标识",
  "BASE URL": "接口基础地址",
  "KEY ENVIRONMENT VARIABLE": "密钥环境变量",
  "INPUT $ / 1M TOKENS": "输入费用（美元 / 百万 Token）",
  "OUTPUT $ / 1M TOKENS": "输出费用（美元 / 百万 Token）",
  "Save agent": "保存 Agent",
  NAME: "名称",
  AGENT: "Agent",
  DESCRIPTION: "描述",
  "MATERIAL LICENSE": "材料许可",
  "e.g. Apache-2.0 or your explicit authorization":
    "例如 Apache-2.0 或你的明确授权",
  "AUTHORIZED TEACHING MATERIAL": "已授权的教学材料",
  "Create teacher": "创建老师",
  "No materials": "无材料",
  "The baseline student": "基线学生",
  Documentation: "文档",
  "Public teacher materials": "公开教学材料",
  "Static skill": "静态技能",
  "One-shot reusable guidance": "一次性提供可复用指导",
  "Targeted teaching": "针对性教学",
  "Feedback on actual attempts": "针对实际解答提供反馈",
  none: "无材料",
  docs: "文档",
  static: "静态技能",
  teaching: "教学",
  diagnosis: "诊断",
  practice: "练习",
  exam: "考试",
  completed: "已完成",
  running: "运行中",
  queued: "排队中",
  failed: "失败",
  cancelled: "已取消",
  interrupted: "已中断",
  "normalize and deduplicate": "规范化并去重",
  "remove blanks": "移除空白值",
  "reject mixed array": "拒绝混合类型数组",
  "reject non-array": "拒绝非数组输入",
  "preserve order": "保留顺序",
  "empty array": "空数组",
  Diagnosis: "诊断",
  Teaching: "教学",
  Practice: "练习",
  "diagnosis.result": "诊断结果",
  lesson: "教学指导",
  feedback: "练习反馈",
  "SIMULATION: fixed fixtures, not measured model improvement.":
    "模拟：使用固定数据，不代表实测的模型能力提升。",
  "Independent diagnostic task; no teacher consultation.":
    "独立诊断任务，不向老师求助。",
  "Teacher receives public material and practice information only.":
    "老师仅接收公开材料与练习信息。",
  "Reusable guidance received": "已收到可复用的指导方法",
  "Practice check results": "练习检查结果",
  "Teacher disconnected. Fresh task inputs; expected answers remain in the evaluator.":
    "老师已断开。使用新的任务输入，标准答案仅保留在评估器中。",
  "{passed}/{total} diagnostic checks passed":
    "诊断检查通过 {passed}/{total} 项",
  "Practice round {round}/{total}": "第 {round}/{total} 轮练习",
  "{passed}/{total} exam checks passed. SIMULATED; no capability efficacy claim.":
    "考试检查通过 {passed}/{total} 项。模拟结果，不代表真实能力收益。",
  "{passed}/{total} exam checks passed. Result applies only to this task family and recorded environment.":
    "考试检查通过 {passed}/{total} 项。结果仅适用于此类任务和记录的环境。",
  Settings: "设置",
  Language: "界面语言",
  "Choose your display language. Changes apply immediately and are remembered on this device.":
    "选择界面语言，立即生效并在此设备上记住。",
  Environment: "运行环境",
  Available: "可用",
  Unavailable: "不可用",
  "Checking…": "正在检查…",
  Done: "完成",
  "Language could not be saved. This change lasts until the app closes.":
    "无法保存语言偏好，本次切换仅在应用关闭前有效。",
  "{count} in progress": "{count} 项进行中",
  "Capability exceeds 200 KB": "能力包超过 200 KB",
};
export function translate(
  locale: Locale,
  key: string,
  values: Record<string, string | number> = {},
): string {
  let text = locale === "zh-CN" ? (zh[key] ?? key) : key;
  for (const [name, value] of Object.entries(values))
    text = text.replaceAll(`{${name}}`, String(value));
  return text;
}
export const useLanguage = create<{
  locale: Locale;
  persistenceError: boolean;
  setLocale: (locale: Locale) => void;
}>((set) => ({
  locale: initialLocale(),
  persistenceError: false,
  setLocale: (locale) => {
    let persistenceError = false;
    try {
      localStorage.setItem(languageKey, locale);
    } catch {
      persistenceError = true;
    }
    set({ locale, persistenceError });
  },
}));
// Only translate known coordinator messages. Model output and arbitrary errors remain verbatim.
export function eventMessage(
  locale: Locale,
  kind: string,
  message: string,
): string {
  if (locale === "en") return message;
  const diagnostic =
    kind === "diagnosis.result" &&
    message.match(/^(\d+)\/(\d+) diagnostic checks passed$/);
  if (diagnostic)
    return translate(locale, "{passed}/{total} diagnostic checks passed", {
      passed: diagnostic[1],
      total: diagnostic[2],
    });
  const practice =
    kind === "practice" && message.match(/^Practice round (\d+)\/(\d+)$/);
  if (practice)
    return translate(locale, "Practice round {round}/{total}", {
      round: practice[1],
      total: practice[2],
    });
  const completed =
    kind === "completed" &&
    message.match(
      /^(\d+)\/(\d+) exam checks passed\. (SIMULATED; no capability efficacy claim\.|Result applies only to this task family and recorded environment\.)$/,
    );
  if (completed)
    return translate(
      locale,
      "{passed}/{total} exam checks passed. " + completed[3],
      { passed: completed[1], total: completed[2] },
    );
  return ["diagnosis", "teaching", "lesson", "feedback", "exam"].includes(kind)
    ? translate(locale, message)
    : message;
}
export function useTranslation() {
  const locale = useLanguage((s) => s.locale);
  return (key: string, values?: Record<string, string | number>) =>
    translate(locale, key, values);
}
