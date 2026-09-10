import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { create } from "zustand";
import * as Dialog from "@radix-ui/react-dialog";
import {
  GraduationCap,
  Users,
  BookOpen,
  FlaskConical,
  Library,
  Plus,
  ArrowUpRight,
  Play,
  Square,
  Check,
  AlertTriangle,
  Download,
  Upload,
  Settings,
  Shield,
  Terminal,
  X,
} from "lucide-react";
import type {
  Command,
  Snapshot,
  Event,
  Provider,
  Teacher,
  Capability,
} from "../../../../packages/protocol/index";
import "./style.css";
import { useTranslation, useLanguage, eventMessage, type Locale } from "./i18n";
declare global {
  interface Window {
    apprentice: {
      credentials: (
        value:
          | { type: "status" }
          | { type: "save"; provider: Provider; key?: string }
          | { type: "remove"; id: string },
      ) => Promise<any>;
      command: (value: Command) => Promise<any>;
      onEvent: (callback: (e: Event) => void) => () => void;
    };
  }
}
const empty: Snapshot = {
  providers: [],
  teachers: [],
  sessions: [],
  capabilities: [],
};
const useApp = create<{
  page: string;
  setPage: (s: string) => void;
  snapshot: Snapshot;
  setSnapshot: (s: Snapshot) => void;
  selected: string;
  select: (s: string) => void;
}>((set) => ({
  page: "Learn",
  setPage: (page) => set({ page }),
  snapshot: empty,
  setSnapshot: (snapshot) => set({ snapshot }),
  selected: "",
  select: (selected) => set({ selected }),
}));
const pages = [
  { name: "Learn", icon: GraduationCap },
  { name: "My agents", icon: Users },
  { name: "Teachers", icon: BookOpen },
  { name: "Capabilities", icon: Library },
  { name: "Experiments", icon: FlaskConical },
];
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
function Modal({
  title,
  description,
  children,
  open,
  onOpenChange,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const tr = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="dialog">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          <Dialog.Close className="close" aria-label={tr("Close dialog")}>
            <X size={18} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function App() {
  const tr = useTranslation();
  const { locale, setLocale, persistenceError } = useLanguage();
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title =
      locale === "zh-CN"
        ? "Agent Apprentice · Agent 拜师工作台"
        : "Agent Apprentice";
  }, [locale]);
  const { page, setPage, snapshot, setSnapshot, selected, select } = useApp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [env, setEnv] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [add, setAdd] = useState(false);
  const [editing, setEditing] = useState<Provider | undefined>();
  const [remote, setRemote] = useState(false);
  const [credentialStatus, setCredentialStatus] = useState<{
    path: string;
    available: boolean;
    saved: string[];
  }>();
  const [teacherAdd, setTeacherAdd] = useState(false);
  const [view, setView] = useState<Capability | null>(null);
  const [deleteId, setDeleteId] = useState("");
  const [retest, setRetest] = useState("");
  const [student, setStudent] = useState("demo-student"),
    [teacher, setTeacher] = useState("maintainer"),
    [execution, setExecution] = useState<"demo" | "docker">("demo"),
    [consent, setConsent] = useState(false),
    [tokens, setTokens] = useState(16000),
    [rounds, setRounds] = useState(2);
  const active =
    snapshot.sessions.find((s) => s.id === selected) ?? snapshot.sessions[0];
  async function refresh() {
    const next = await window.apprentice.command({ type: "snapshot" });
    setSnapshot(next);
    if (window.apprentice.credentials)
      setCredentialStatus(
        await window.apprentice.credentials({ type: "status" }),
      );
  }
  async function action(c: Command) {
    setError("");
    setBusy(true);
    try {
      const result = await window.apprentice.command(c);
      await refresh();
      return result;
    } catch (e) {
      setError((e as Error).message);
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
    void window.apprentice
      .command({ type: "environment" })
      .then(setEnv)
      .catch((e) => setError(e.message));
    return window.apprentice.onEvent(() => {
      void refresh().catch((e) => setError(e.message));
    });
  }, []);
  useEffect(() => {
    if (active)
      void window.apprentice
        .command({ type: "events", id: active.id })
        .then(setEvents)
        .catch((e) => setError(e.message));
  }, [active?.id, active?.phase, active?.status]);
  function options(capabilityId?: string) {
    return {
      studentId: student,
      teacherId: teacher,
      execution,
      consent,
      maxTokens: tokens,
      maxCalls: 12,
      timeoutSeconds: 180,
      rounds,
      seed: 42,
      arm: "teaching" as const,
      ...(capabilityId ? { capabilityId } : {}),
    };
  }
  async function start(compare = false, capabilityId?: string) {
    const result = await action({
      type: compare ? "compare" : "learn",
      value: options(
        compare ? undefined : (capabilityId ?? (retest || undefined)),
      ),
    });
    if (result) {
      select(compare ? result[0].id : result.id);
      if (!compare) setPage("Learn");
    }
  }
  async function download(cap: Capability) {
    const text = await action({ type: "capability.export", id: cap.id });
    if (!text) return;
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = cap.id + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 200000) {
        setError(tr("Capability exceeds 200 KB"));
        return;
      }
      await action({ type: "capability.import", json: await f.text() });
    }
    e.target.value = "";
  }
  const running = snapshot.sessions.filter(
    (s) => s.status === "running" || s.status === "queued",
  ).length;
  return (
    <div className="layout">
      <aside>
        <div className="brand">
          <div className="brandmark">
            <GraduationCap size={25} />
          </div>
          <div>
            {"apprentice"}
            <small>{tr("PERSONAL AGENT LEARNING")}</small>
          </div>
        </div>
        <div className="workspace">
          <span className="dot" /> {tr("Personal workspace")}
          <Badge>{tr("LOCAL")}</Badge>
        </div>
        <nav>
          {pages.map((p) => (
            <button
              key={p.name}
              aria-label={tr(p.name)}
              className={page === p.name ? "nav active" : "nav"}
              onClick={() => setPage(p.name)}
            >
              <p.icon size={19} />
              {tr(p.name)}
              {p.name === "Capabilities" && (
                <span className="count">{snapshot.capabilities.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="safety">
            <Shield size={18} />
            <div>
              {tr("Knowledge stays yours")}
              <small>{tr("No telemetry. No account required.")}</small>
            </div>
          </div>
          <p>{tr("v0.1.0 · Research preview")}</p>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span className="breadcrumb">{tr("Personal workspace /")} </span>
            {tr(page)}
          </div>
          <div className="top-actions">
            <span className="dot" />
            {running
              ? tr("{count} in progress", { count: running })
              : tr("Coordinator ready")}
            <button
              className="icon-button"
              aria-label={tr("Settings")}
              title={tr("Settings")}
              onClick={() => setSettings(true)}
            >
              <Settings size={18} />
            </button>
          </div>
        </header>
        <section className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {page === "Learn"
                  ? tr("FROM EXPERIENCE TO INDEPENDENCE")
                  : tr("YOUR LEARNING WORKSPACE")}
              </p>
              <h1>
                {page === "Learn"
                  ? tr("A little guidance. A lasting capability.")
                  : tr(page)}
              </h1>
              <p className="subtitle">
                {page === "Learn"
                  ? tr(
                      "Let your agent learn from a teacher — then see what it can do on its own.",
                    )
                  : page === "My agents"
                    ? tr(
                        "Bring your own models. Keep the student the same when comparing results.",
                      )
                    : page === "Teachers"
                      ? tr(
                          "Explicit expertise, materials and permissions. No hidden access to your files.",
                        )
                      : page === "Capabilities"
                        ? tr(
                            "Portable methods with provenance. A passed exercise is not a universal guarantee.",
                          )
                        : tr(
                            "Measure learning against simpler alternatives, not against a hand-picked demo.",
                          )}
              </p>
            </div>
            {page === "My agents" && (
              <div className="button-row">
                <button
                  className="secondary"
                  onClick={() => {
                    setEditing(undefined);
                    setRemote(true);
                    setAdd(true);
                  }}
                >
                  {tr("Connect remote teacher")}
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    setEditing(undefined);
                    setRemote(false);
                    setAdd(true);
                  }}
                >
                  <Plus size={17} /> {tr("Add agent")}
                </button>
              </div>
            )}
            {page === "Teachers" && (
              <button className="primary" onClick={() => setTeacherAdd(true)}>
                <Plus size={17} /> {tr("Add teacher")}
              </button>
            )}
            {page === "Capabilities" && (
              <label className="button secondary">
                <Upload size={17} /> {tr("Import package")}
                <input
                  hidden
                  type="file"
                  accept=".json"
                  onChange={importFile}
                />
              </label>
            )}
          </div>
          {retest && page === "Learn" && (
            <div className="notice">
              <Library size={18} />
              <span>
                {tr(
                  "Independent retest of {id}. Review student, execution and consent below. No teacher will be called.",
                  { id: retest.slice(0, 8) },
                )}
              </span>
              <button onClick={() => setRetest("")}>
                {tr("New lesson instead")}
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="notice danger">
              <AlertTriangle size={18} />
              <span>{error}</span>
              <button
                onClick={() => setError("")}
                aria-label={tr("Dismiss error")}
              >
                ×
              </button>
            </div>
          )}
          {(page === "Learn" || page === "Experiments") && (
            <>
              <div className="notice">
                <FlaskConical size={18} />
                <span>
                  <strong>{tr("Evidence before claims.")}</strong>{" "}
                  {tr(
                    "Offline demo uses fixed simulated fixtures. Real learning requires configured providers and Docker; no automatic credential discovery.",
                  )}
                </span>
              </div>
              <div className="learning-grid">
                <div className="panel setup">
                  <div className="panel-title">
                    <h2>
                      {page === "Experiments"
                        ? tr("Experiment setup")
                        : tr("Set up a lesson")}
                    </h2>
                    <Badge>01</Badge>
                  </div>
                  <label>
                    {tr("STUDENT")}
                    <select
                      aria-label={tr("Student")}
                      value={student}
                      onChange={(e) => setStudent(e.target.value)}
                    >
                      {snapshot.providers
                        .filter(
                          (p) =>
                            p.kind !== "remote-teacher" && p.kind !== "metis",
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="connector">{tr("learns from ↓")}</div>
                  <label>
                    {tr("TEACHER")}
                    <select
                      aria-label={tr("Teacher")}
                      value={teacher}
                      onChange={(e) => setTeacher(e.target.value)}
                    >
                      {snapshot.teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="course">
                    <BookOpen size={19} />
                    <div>
                      <strong>{tr("Maintainer foundations")}</strong>
                      <p>
                        {tr("TypeScript · Input validation · Error semantics")}
                      </p>
                    </div>
                  </div>
                  <label>
                    {tr("EXECUTION")}
                    <select
                      aria-label={tr("Execution")}
                      value={execution}
                      onChange={(e) => setExecution(e.target.value as any)}
                    >
                      <option value="demo">
                        {tr("Offline simulation — no code execution")}
                      </option>
                      <option value="docker">
                        {tr("Real model + isolated Docker execution")}
                      </option>
                    </select>
                  </label>
                  <div className="field-row">
                    <label>
                      {tr("TOKEN RESERVATION")}
                      <input
                        aria-label={tr("Token budget")}
                        type="number"
                        value={tokens}
                        min={100}
                        max={100000}
                        onChange={(e) => setTokens(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      {tr("PRACTICE ROUNDS")}
                      <input
                        aria-label={tr("Practice rounds")}
                        type="number"
                        value={rounds}
                        min={1}
                        max={4}
                        onChange={(e) => setRounds(Number(e.target.value))}
                      />
                    </label>
                  </div>
                  {execution === "docker" && (
                    <>
                      <p className="hint">
                        {env?.docker
                          ? tr(
                              "Docker available. The course image must already be pulled.",
                            )
                          : tr(
                              "Docker unavailable. Real runs fail closed; there is no host fallback.",
                            )}
                      </p>
                      <label className="consent">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                        />{" "}
                        {tr(
                          "I authorize sending the selected teacher material, public course task, generated attempts and practice feedback to the configured model/teacher endpoints. No private files are selected.",
                        )}
                      </label>
                    </>
                  )}
                  <button
                    className="primary wide"
                    disabled={busy}
                    onClick={() => void start(page === "Experiments")}
                  >
                    <Play size={16} />
                    {page === "Experiments"
                      ? tr("Run four-arm comparison")
                      : execution === "demo"
                        ? tr("Start simulated lesson")
                        : tr("Start learning")}
                  </button>
                  <p className="hint">
                    {tr(
                      "12 calls maximum · 3-minute deadline per arm · Cancel anytime",
                    )}
                  </p>
                </div>
                {page === "Learn" ? (
                  <div className="panel room">
                    <div className="panel-title">
                      <h2>{tr("Learning room")}</h2>
                      {active ? (
                        <Badge
                          tone={active.status === "completed" ? "green" : ""}
                        >
                          {active.simulated ? tr("SIMULATED · ") : ""}
                          {tr(active.status)}
                        </Badge>
                      ) : (
                        <Badge>{tr("READY")}</Badge>
                      )}
                    </div>
                    <div className="steps">
                      {[
                        "diagnosis",
                        "teaching",
                        "practice",
                        "exam",
                        "completed",
                      ].map((s, i) => (
                        <div
                          key={s}
                          className={
                            active?.phase === s ? "step current" : "step"
                          }
                        >
                          <span>{i + 1}</span>
                          {s === "completed"
                            ? tr("Graduate")
                            : tr(s[0].toUpperCase() + s.slice(1))}
                        </div>
                      ))}
                    </div>
                    {!active ? (
                      <div className="empty-room">
                        <div className="orbit">
                          <GraduationCap size={42} />
                        </div>
                        <h3>{tr("Your agent’s next skill starts here")}</h3>
                        <p>
                          {tr(
                            "Choose a student and teacher. Practice together.",
                          )}
                          <br />
                          {tr("Graduate independently, with evidence.")}
                        </p>
                        <Badge>{tr("TEACH → PRACTICE → VERIFY")}</Badge>
                      </div>
                    ) : (
                      <>
                        <div className="session-meta">
                          <span>
                            {active.id.slice(0, 8)} · {tr(active.options.arm)}
                          </span>
                          {(active.status === "running" ||
                            active.status === "queued") && (
                            <button
                              className="secondary"
                              onClick={() =>
                                void action({ type: "cancel", id: active.id })
                              }
                            >
                              <Square size={13} /> {tr("Cancel")}
                            </button>
                          )}
                        </div>
                        <div className="timeline">
                          {events.map((e) => (
                            <div className="timeline-event" key={e.id}>
                              <span className="timeline-dot" />
                              <div>
                                <div className="event-head">
                                  <strong>
                                    {locale === "en"
                                      ? e.kind.replaceAll(".", " / ")
                                      : tr(e.kind)}
                                  </strong>
                                  <time>
                                    {new Date(e.at).toLocaleTimeString(locale)}
                                  </time>
                                </div>
                                <p>{eventMessage(locale, e.kind, e.message)}</p>
                                {e.kind === "lesson" && (
                                  <pre>{(e.data as any)?.guidance}</pre>
                                )}
                                {Array.isArray(e.data) && (
                                  <div className="checks">
                                    {(e.data as any[]).map((r, i) => (
                                      <span
                                        key={i}
                                        className={r.passed ? "pass" : "fail"}
                                      >
                                        {r.passed ? "✓" : "×"} {tr(r.name)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="metrics">
                          <div>
                            <small>{tr("Calls")}</small>
                            <strong>{active.usage.calls}</strong>
                          </div>
                          <div>
                            <small>{tr("Reported tokens")}</small>
                            <strong>
                              {active.usage.input === null ||
                              active.usage.output === null
                                ? tr("Unknown")
                                : active.usage.input + active.usage.output}
                            </strong>
                          </div>
                          <div>
                            <small>
                              {active.simulated
                                ? tr("Demo cost")
                                : tr("Estimated cost")}
                            </small>
                            <strong>
                              {active.usage.cost === null
                                ? tr("Unknown")
                                : "$" + active.usage.cost.toFixed(4)}
                            </strong>
                          </div>
                          <div>
                            <small>{tr("Exam")}</small>
                            <strong>
                              {active.results.length
                                ? `${active.results.filter((r) => r.passed).length}/${active.results.length}`
                                : "—"}
                            </strong>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="panel">
                    <div className="panel-title">
                      <h2>{tr("A fairer question")}</h2>
                      <FlaskConical size={20} />
                    </div>
                    <h3 className="large-copy">
                      {tr(
                        "Did teaching help more than simply sharing a skill?",
                      )}
                    </h3>
                    <div className="arms">
                      {[
                        ["none", "No materials", "The baseline student"],
                        ["docs", "Documentation", "Public teacher materials"],
                        [
                          "static",
                          "Static skill",
                          "One-shot reusable guidance",
                        ],
                        [
                          "teaching",
                          "Targeted teaching",
                          "Feedback on actual attempts",
                        ],
                      ].map(([id, title, desc]) => (
                        <div key={id}>
                          <Badge>{tr(id)}</Badge>
                          <strong>{tr(title)}</strong>
                          <p>{tr(desc)}</p>
                        </div>
                      ))}
                    </div>
                    <p className="hint">
                      {tr(
                        "Same student, course seed and per-task budget. Teaching overhead is included. Changes in model or environment require a new comparison. Simulation results are fixtures, not measurements.",
                      )}
                    </p>
                  </div>
                )}
              </div>
              <div className="panel history">
                <div className="panel-title">
                  <h2>
                    {page === "Learn"
                      ? tr("Recent sessions")
                      : tr("Experiment results")}
                  </h2>
                  <span className="muted">
                    {snapshot.sessions.length} {tr("runs")}
                  </span>
                </div>
                {!snapshot.sessions.length ? (
                  <p className="muted">
                    {tr("No sessions yet. Start a lesson above.")}
                  </p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>{tr("Session")}</th>
                        <th>{tr("Condition")}</th>
                        <th>{tr("Status")}</th>
                        <th>{tr("Exam")}</th>
                        <th>{tr("Calls")}</th>
                        <th>{tr("Cost")}</th>
                        <th>{tr("Elapsed")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.sessions.map((s) => (
                        <tr
                          key={s.id}
                          onClick={() => {
                            select(s.id);
                            setPage("Learn");
                          }}
                        >
                          <td>
                            <span className="mono">{s.id.slice(0, 8)}</span>
                            {s.simulated && (
                              <small className="sim">{tr("SIMULATION")}</small>
                            )}
                          </td>
                          <td>{tr(s.options.arm)}</td>
                          <td>
                            <Badge
                              tone={
                                s.status === "completed"
                                  ? "green"
                                  : s.status === "failed"
                                    ? "red"
                                    : ""
                              }
                            >
                              {tr(s.status)}
                            </Badge>
                          </td>
                          <td>
                            {s.results.length
                              ? `${s.results.filter((r) => r.passed).length}/${s.results.length}`
                              : "—"}
                          </td>
                          <td>{s.usage.calls}</td>
                          <td>
                            {s.usage.cost === null
                              ? tr("Unknown")
                              : "$" + s.usage.cost.toFixed(4)}
                          </td>
                          <td>
                            {s.durationMs
                              ? `${(s.durationMs / 1000).toFixed(1)}s`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
          {page === "My agents" && (
            <>
              <div className="card-grid">
                {snapshot.providers.map((p) => (
                  <div className="panel agent-card" key={p.id}>
                    <div className="agent-avatar">
                      <Terminal size={25} />
                    </div>
                    <Badge tone={p.kind === "demo" ? "amber" : "green"}>
                      {p.kind === "demo" ? tr("SIMULATED") : p.kind}
                    </Badge>
                    <h2>{p.name}</h2>
                    <p className="mono">{p.model}</p>
                    <div className="card-detail">
                      <span>{tr("Authentication")}</span>
                      <strong>
                        {p.kind === "demo"
                          ? tr("Not required")
                          : p.credentialRef
                            ? tr(
                                credentialStatus?.saved.includes(p.id)
                                  ? "Securely saved"
                                  : "Saved key unavailable",
                              )
                            : (p.keyEnv ?? tr("Not configured"))}
                      </strong>
                    </div>
                    <div className="card-detail">
                      <span>{tr("Endpoint")}</span>
                      <strong>{p.baseUrl ?? tr("Offline fixture")}</strong>
                    </div>
                    {p.kind !== "metis" && (
                      <button
                        className="secondary"
                        onClick={() => {
                          setEditing(p);
                          setRemote(p.kind === "remote-teacher");
                          setAdd(true);
                        }}
                      >
                        {tr("Edit connection")}
                      </button>
                    )}
                    {p.credentialRef && (
                      <button
                        className="secondary"
                        onClick={async () => {
                          try {
                            await window.apprentice.credentials({
                              type: "remove",
                              id: p.id,
                            });
                            await refresh();
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        {tr("Remove saved key")}
                      </button>
                    )}
                    <p className="hint">
                      {p.kind === "metis"
                        ? tr("Disabled until isolated execution is verified.")
                        : tr(
                            "Credentials are never displayed, exported or read from existing login files.",
                          )}
                    </p>
                  </div>
                ))}
              </div>
              <div className="notice">
                <Shield size={18} />
                <span>
                  {tr(
                    "Enter an API key for encrypted system storage, or choose an environment variable. No other application's configuration is read or changed.",
                  )}
                </span>
              </div>
            </>
          )}
          {page === "Teachers" && (
            <div className="card-grid">
              {snapshot.teachers.map((t) => (
                <div className="panel teacher-card" key={t.id}>
                  <div className="teacher-top">
                    <div className="agent-avatar purple">
                      <BookOpen size={25} />
                    </div>
                    <Badge>{t.license}</Badge>
                  </div>
                  <h2>{t.name}</h2>
                  <p>{t.description}</p>
                  <div className="scope">
                    <small>{tr("TEACHING SCOPE")}</small>
                    <p>{t.scope}</p>
                  </div>
                  <details>
                    <summary>
                      {tr("Review materials sent during teaching")}
                    </summary>
                    <pre>{t.material}</pre>
                  </details>
                  <button
                    className="secondary wide"
                    onClick={() => {
                      setTeacher(t.id);
                      setPage("Learn");
                    }}
                  >
                    {tr("Learn with this teacher")}
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {page === "Capabilities" && (
            <>
              {!snapshot.capabilities.length ? (
                <div className="panel empty-room">
                  <Library size={38} />
                  <h3>{tr("A library of things your agent can do")}</h3>
                  <p>
                    {tr(
                      "Complete a lesson to create your first capability record.",
                    )}
                  </p>
                  <button className="primary" onClick={() => setPage("Learn")}>
                    {tr("Start a lesson")}
                  </button>
                </div>
              ) : (
                <div className="card-grid">
                  {snapshot.capabilities.map((c) => (
                    <div className="panel capability" key={c.id}>
                      <div className="teacher-top">
                        <div className="agent-avatar">
                          <Check size={23} />
                        </div>
                        <Badge
                          tone={
                            c.simulated ? "amber" : c.verified ? "green" : ""
                          }
                        >
                          {c.simulated
                            ? tr("SIMULATED")
                            : c.verified
                              ? tr("VERIFIED IN CONTEXT")
                              : tr("UNVERIFIED")}
                        </Badge>
                      </div>
                      <h2>{c.title}</h2>
                      <p>
                        {c.method.slice(0, 150)}
                        {c.method.length > 150 ? "…" : ""}
                      </p>
                      <div className="card-detail">
                        <span>{tr("Student")}</span>
                        <strong>{c.conditions.model}</strong>
                      </div>
                      <div className="card-detail">
                        <span>{tr("Course")}</span>
                        <strong>{c.conditions.course}</strong>
                      </div>
                      <div className="card-detail">
                        <span>{tr("Status")}</span>
                        <strong>
                          {c.enabled ? tr("Enabled") : tr("Disabled")}
                        </strong>
                      </div>
                      <div className="button-row">
                        <button
                          className="secondary"
                          onClick={() => setView(c)}
                        >
                          {tr("Inspect")}
                        </button>
                        <button
                          className="icon-button"
                          aria-label={tr("Export") + " " + c.id}
                          onClick={() => void download(c)}
                        >
                          <Download size={17} />
                        </button>
                        <button
                          className="secondary"
                          onClick={() =>
                            void action({
                              type: "capability.toggle",
                              id: c.id,
                              enabled: !c.enabled,
                            })
                          }
                        >
                          {c.enabled ? tr("Disable") : tr("Enable")}
                        </button>
                      </div>
                      <div className="button-row">
                        <button
                          className="text-button"
                          disabled={!c.enabled}
                          onClick={() => {
                            setStudent(
                              snapshot.providers.find(
                                (p) => p.model === c.conditions.model,
                              )?.id ?? student,
                            );
                            setTeacher(
                              snapshot.teachers.find(
                                (t) => t.name === c.source.teacher,
                              )?.id ?? teacher,
                            );
                            setExecution(c.conditions.execution);
                            setConsent(false);
                            setRetest(c.id);
                            setPage("Learn");
                          }}
                        >
                          {tr("Independent retest")}
                        </button>
                        <button
                          className="text-button destructive"
                          onClick={() => setDeleteId(c.id)}
                        >
                          {tr("Delete")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="hint">
                {tr(
                  "Checksums detect accidental changes, not author identity. Imported packages are unverified and disabled until you review and explicitly enable them.",
                )}
              </p>
            </>
          )}
        </section>
        <footer>
          <Shield size={13} /> {tr("Local-first · No telemetry")}{" "}
          <span>{tr("Agent Apprentice / Open-source learning workspace")}</span>
        </footer>
      </main>
      <Modal
        open={settings}
        onOpenChange={setSettings}
        title={tr("Settings")}
        description={tr(
          "Choose your display language. Changes apply immediately and are remembered on this device.",
        )}
      >
        <label>
          {tr("Language")}
          <select
            aria-label={tr("Language")}
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
        </label>
        {error && (
          <p role="alert" className="notice danger">
            {error}
          </p>
        )}
        {persistenceError && (
          <p role="alert">
            {tr(
              "Language could not be saved. This change lasts until the app closes.",
            )}
          </p>
        )}
        <h3>{tr("Environment")}</h3>
        <p>
          Docker:{" "}
          {tr(
            env === null
              ? "Checking…"
              : env?.docker
                ? "Available"
                : "Unavailable",
          )}
        </p>
        <div className="button-row">
          <button
            className="secondary"
            disabled={busy}
            onClick={() => {
              void action({ type: "environment" }).then((result) => {
                if (result) setEnv(result);
              });
            }}
          >
            {tr("Refresh environment")}
          </button>
          <button className="primary" onClick={() => setSettings(false)}>
            {tr("Done")}
          </button>
        </div>
      </Modal>
      <Modal
        open={add}
        onOpenChange={setAdd}
        title={tr("Connect an agent")}
        description={tr(
          "Keys are encrypted in this application's data directory. No credential scanning.",
        )}
      >
        {error && (
          <p role="alert" className="notice danger">
            {error}
          </p>
        )}
        <p className="hint">{credentialStatus?.path}</p>
        <ProviderForm
          key={editing?.id ?? String(remote)}
          initial={editing}
          remote={remote}
          available={credentialStatus?.available ?? false}
          onSave={async (provider, key) => {
            try {
              await window.apprentice.credentials({
                type: "save",
                provider,
                ...(key ? { key } : {}),
              });
              await refresh();
              setAdd(false);
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </Modal>
      <Modal
        open={teacherAdd}
        onOpenChange={setTeacherAdd}
        title={tr("Create a teacher")}
        description={tr("Only share materials you have permission to use.")}
      >
        {error && (
          <p role="alert" className="notice danger">
            {error}
          </p>
        )}
        <TeacherForm
          providers={snapshot.providers}
          onSave={async (value) => {
            if (await action({ type: "teacher.save", value }))
              setTeacherAdd(false);
          }}
        />
      </Modal>
      <Modal
        open={!!view}
        onOpenChange={(v) => {
          if (!v) setView(null);
        }}
        title={tr("Capability evidence")}
        description={tr(
          "Validation is conditional on the recorded environment, not a universal certificate.",
        )}
      >
        {view && (
          <>
            <pre className="package-preview">
              {JSON.stringify(view, null, 2)}
            </pre>
            <button className="primary" onClick={() => void download(view)}>
              {tr("Export package")}
            </button>
          </>
        )}
      </Modal>
      <Modal
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId("");
        }}
        title={tr("Delete capability?")}
        description={tr(
          "This removes the local capability record. Session evidence remains. Export a copy first if needed.",
        )}
      >
        <div className="button-row">
          <button className="secondary" onClick={() => setDeleteId("")}>
            {tr("Keep capability")}
          </button>
          <button
            className="primary danger-button"
            onClick={async () => {
              await action({ type: "capability.delete", id: deleteId });
              setDeleteId("");
            }}
          >
            {tr("Delete capability")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
function ProviderForm({
  onSave,
  initial,
  remote,
  available,
}: {
  onSave: (p: Provider, key?: string) => void;
  initial?: Provider;
  remote: boolean;
  available: boolean;
}) {
  const tr = useTranslation();
  const [kind, setKind] = useState<Provider["kind"]>(
    initial?.kind ?? (remote ? "remote-teacher" : "responses"),
  );
  const [auth, setAuth] = useState(initial?.keyEnv ? "env" : "key");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        onSave(
          {
            id: String(d.get("id")),
            name: String(d.get("name")),
            kind,
            model: String(d.get("model")),
            ...(kind !== "demo"
              ? {
                  baseUrl: String(d.get("url")),
                  ...(auth === "env"
                    ? { keyEnv: String(d.get("key")) }
                    : initial?.credentialRef && !d.get("secret")
                      ? { credentialRef: initial.credentialRef }
                      : {}),
                }
              : {}),
            ...(d.get("input") ? { priceInput: Number(d.get("input")) } : {}),
            ...(d.get("output")
              ? { priceOutput: Number(d.get("output")) }
              : {}),
          },
          kind !== "demo" && auth === "key"
            ? String(d.get("secret") || "") || undefined
            : undefined,
        );
      }}
    >
      <div className="field-row">
        <label>
          {tr("ID")}
          <input
            name="id"
            required
            pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}"
            placeholder="my-student"
            defaultValue={initial?.id}
            readOnly={!!initial}
          />
        </label>
        <label>
          {tr("DISPLAY NAME")}
          <input
            name="name"
            required
            defaultValue={initial?.name}
            placeholder={tr("My local agent")}
          />
        </label>
      </div>
      <label>
        {tr("PROTOCOL")}
        {remote ? (
          <p>{tr("Remote teacher protocol")} — /v1/teach</p>
        ) : (
          <select value={kind} onChange={(e) => setKind(e.target.value as any)}>
            <option value="responses">{tr("OpenAI Responses")}</option>
            <option value="chat">{tr("OpenAI Chat Completions")}</option>
            <option value="anthropic">Anthropic Messages</option>
            <option value="demo">{tr("Offline simulation")}</option>
          </select>
        )}
      </label>
      <label>
        {tr("MODEL")}
        <input
          required
          name="model"
          defaultValue={initial?.model ?? (remote ? "remote-teacher" : "")}
          placeholder={tr("Model identifier from your provider")}
        />
      </label>
      {kind !== "demo" && (
        <>
          <label>
            {tr("BASE URL")}
            <input
              required
              name="url"
              type="url"
              defaultValue={initial?.baseUrl}
              placeholder={
                kind === "anthropic"
                  ? "https://api.anthropic.com"
                  : remote
                    ? "https://teacher.example.com"
                    : "https://api.openai.com/v1"
              }
            />
          </label>
          <label>
            {tr("Authentication")}
            <select value={auth} onChange={(e) => setAuth(e.target.value)}>
              <option value="key">{tr("API key (secure storage)")}</option>
              <option value="env">{tr("Environment variable name")}</option>
            </select>
          </label>
          {auth === "key" ? (
            <>
              <label>
                {tr("API key")}
                <input
                  name="secret"
                  type="password"
                  autoComplete="new-password"
                  maxLength={16384}
                  required={!initial?.credentialRef}
                  placeholder={tr(
                    initial?.credentialRef
                      ? "Leave blank to keep saved key"
                      : "Paste your API key",
                  )}
                />
              </label>
              <p className="hint">
                {tr(
                  available
                    ? "Encrypted using system secure storage. Never written to other applications or shell configuration."
                    : "System secure storage unavailable. Use environment variable mode; plaintext saving is disabled.",
                )}
              </p>
            </>
          ) : (
            <>
              <label>
                {tr("KEY ENVIRONMENT VARIABLE")}
                <input
                  required
                  name="key"
                  pattern="[A-Z][A-Z0-9_]{0,79}"
                  defaultValue={initial?.keyEnv}
                  placeholder="OPENAI_API_KEY"
                  title={tr(
                    "Enter a variable name, not the API key. Start with A-Z; use A-Z, 0-9 or underscore.",
                  )}
                />
              </label>
              <p className="hint">
                {tr(
                  "Enter a name such as OPENAI_API_KEY, not its secret value. Set it before launching the app; no global configuration is changed.",
                )}
              </p>
            </>
          )}
        </>
      )}
      <div className="field-row">
        <label>
          {tr("INPUT $ / 1M TOKENS")}
          <input
            name="input"
            defaultValue={initial?.priceInput}
            type="number"
            min="0"
            step="any"
            placeholder={tr("Unknown")}
          />
        </label>
        <label>
          {tr("OUTPUT $ / 1M TOKENS")}
          <input
            name="output"
            defaultValue={initial?.priceOutput}
            type="number"
            min="0"
            step="any"
            placeholder={tr("Unknown")}
          />
        </label>
      </div>
      <button className="primary wide" type="submit">
        {tr("Save agent")}
      </button>
    </form>
  );
}
function TeacherForm({
  providers,
  onSave,
}: {
  providers: Provider[];
  onSave: (t: Teacher) => void;
}) {
  const tr = useTranslation();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        onSave({
          id: String(d.get("id")),
          name: String(d.get("name")),
          providerId: String(d.get("provider")),
          description: String(d.get("description")),
          scope: String(d.get("scope")),
          license: String(d.get("license")),
          material: String(d.get("material")),
        });
      }}
    >
      <div className="field-row">
        <label>
          {tr("ID")}
          <input required name="id" pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}" />
        </label>
        <label>
          {tr("NAME")}
          <input required name="name" />
        </label>
      </div>
      <label>
        {tr("AGENT")}
        <select name="provider">
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {tr("DESCRIPTION")}
        <input name="description" required />
      </label>
      <label>
        {tr("TEACHING SCOPE")}
        <input name="scope" required />
      </label>
      <label>
        {tr("MATERIAL LICENSE")}
        <input
          name="license"
          required
          placeholder={tr("e.g. Apache-2.0 or your explicit authorization")}
        />
      </label>
      <label>
        {tr("AUTHORIZED TEACHING MATERIAL")}
        <textarea name="material" rows={6} maxLength={20000} required />
      </label>
      <button className="primary wide" type="submit">
        {tr("Create teacher")}
      </button>
    </form>
  );
}
const mount = document.getElementById("root");
if (mount) createRoot(mount).render(<App />);
