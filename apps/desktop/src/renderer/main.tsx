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
declare global {
  interface Window {
    apprentice: {
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
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="dialog">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          <Dialog.Close className="close" aria-label="Close dialog">
            <X size={18} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function App() {
  const { page, setPage, snapshot, setSnapshot, selected, select } = useApp();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [env, setEnv] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [add, setAdd] = useState(false);
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
        setError("Capability exceeds 200 KB");
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
            apprentice<small>PERSONAL AGENT LEARNING</small>
          </div>
        </div>
        <div className="workspace">
          <span className="dot" /> Personal workspace <Badge>LOCAL</Badge>
        </div>
        <nav>
          {pages.map((p) => (
            <button
              key={p.name}
              className={page === p.name ? "nav active" : "nav"}
              onClick={() => setPage(p.name)}
            >
              <p.icon size={19} />
              {p.name}
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
              Knowledge stays yours
              <small>No telemetry. No account required.</small>
            </div>
          </div>
          <p>v0.1.0 · Research preview</p>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span className="breadcrumb">Personal workspace / </span>
            {page}
          </div>
          <div className="top-actions">
            <span className="dot" />
            {running ? `${running} in progress` : "Coordinator ready"}
            <button
              className="icon-button"
              aria-label="Refresh environment"
              onClick={() => {
                void action({ type: "environment" }).then(setEnv);
              }}
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
                  ? "FROM EXPERIENCE TO INDEPENDENCE"
                  : "YOUR LEARNING WORKSPACE"}
              </p>
              <h1>
                {page === "Learn"
                  ? "A little guidance. A lasting capability."
                  : page}
              </h1>
              <p className="subtitle">
                {page === "Learn"
                  ? "Let your agent learn from a teacher — then see what it can do on its own."
                  : page === "My agents"
                    ? "Bring your own models. Keep the student the same when comparing results."
                    : page === "Teachers"
                      ? "Explicit expertise, materials and permissions. No hidden access to your files."
                      : page === "Capabilities"
                        ? "Portable methods with provenance. A passed exercise is not a universal guarantee."
                        : "Measure learning against simpler alternatives, not against a hand-picked demo."}
              </p>
            </div>
            {page === "My agents" && (
              <button className="primary" onClick={() => setAdd(true)}>
                <Plus size={17} /> Add agent
              </button>
            )}
            {page === "Teachers" && (
              <button className="primary" onClick={() => setTeacherAdd(true)}>
                <Plus size={17} /> Add teacher
              </button>
            )}
            {page === "Capabilities" && (
              <label className="button secondary">
                <Upload size={17} /> Import package
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
                Independent retest of {retest.slice(0, 8)}. Review student,
                execution and consent below. No teacher will be called.
              </span>
              <button onClick={() => setRetest("")}>New lesson instead</button>
            </div>
          )}
          {error && (
            <div role="alert" className="notice danger">
              <AlertTriangle size={18} />
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}
          {(page === "Learn" || page === "Experiments") && (
            <>
              <div className="notice">
                <FlaskConical size={18} />
                <span>
                  <strong>Evidence before claims.</strong> Offline demo uses
                  fixed simulated fixtures. Real learning requires configured
                  providers and Docker; no automatic credential discovery.
                </span>
              </div>
              <div className="learning-grid">
                <div className="panel setup">
                  <div className="panel-title">
                    <h2>
                      {page === "Experiments"
                        ? "Experiment setup"
                        : "Set up a lesson"}
                    </h2>
                    <Badge>01</Badge>
                  </div>
                  <label>
                    STUDENT
                    <select
                      aria-label="Student"
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
                  <div className="connector">learns from ↓</div>
                  <label>
                    TEACHER
                    <select
                      aria-label="Teacher"
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
                      <strong>Maintainer foundations</strong>
                      <p>TypeScript · Input validation · Error semantics</p>
                    </div>
                  </div>
                  <label>
                    EXECUTION
                    <select
                      aria-label="Execution"
                      value={execution}
                      onChange={(e) => setExecution(e.target.value as any)}
                    >
                      <option value="demo">
                        Offline simulation — no code execution
                      </option>
                      <option value="docker">
                        Real model + isolated Docker execution
                      </option>
                    </select>
                  </label>
                  <div className="field-row">
                    <label>
                      TOKEN RESERVATION
                      <input
                        aria-label="Token budget"
                        type="number"
                        value={tokens}
                        min={100}
                        max={100000}
                        onChange={(e) => setTokens(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      PRACTICE ROUNDS
                      <input
                        aria-label="Practice rounds"
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
                          ? "Docker available. The course image must already be pulled."
                          : "Docker unavailable. Real runs fail closed; there is no host fallback."}
                      </p>
                      <label className="consent">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                        />{" "}
                        I authorize sending the selected teacher material,
                        public course task, generated attempts and practice
                        feedback to the configured model/teacher endpoints. No
                        private files are selected.
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
                      ? "Run four-arm comparison"
                      : execution === "demo"
                        ? "Start simulated lesson"
                        : "Start learning"}
                  </button>
                  <p className="hint">
                    12 calls maximum · 3-minute deadline per arm · Cancel
                    anytime
                  </p>
                </div>
                {page === "Learn" ? (
                  <div className="panel room">
                    <div className="panel-title">
                      <h2>Learning room</h2>
                      {active ? (
                        <Badge
                          tone={active.status === "completed" ? "green" : ""}
                        >
                          {active.simulated ? "SIMULATED · " : ""}
                          {active.status}
                        </Badge>
                      ) : (
                        <Badge>READY</Badge>
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
                            ? "Graduate"
                            : s[0].toUpperCase() + s.slice(1)}
                        </div>
                      ))}
                    </div>
                    {!active ? (
                      <div className="empty-room">
                        <div className="orbit">
                          <GraduationCap size={42} />
                        </div>
                        <h3>Your agent’s next skill starts here</h3>
                        <p>
                          Choose a student and teacher. Practice together.
                          <br />
                          Graduate independently, with evidence.
                        </p>
                        <Badge>TEACH → PRACTICE → VERIFY</Badge>
                      </div>
                    ) : (
                      <>
                        <div className="session-meta">
                          <span>
                            {active.id.slice(0, 8)} · {active.options.arm}
                          </span>
                          {(active.status === "running" ||
                            active.status === "queued") && (
                            <button
                              className="secondary"
                              onClick={() =>
                                void action({ type: "cancel", id: active.id })
                              }
                            >
                              <Square size={13} /> Cancel
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
                                    {e.kind.replaceAll(".", " / ")}
                                  </strong>
                                  <time>
                                    {new Date(e.at).toLocaleTimeString()}
                                  </time>
                                </div>
                                <p>{e.message}</p>
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
                                        {r.passed ? "✓" : "×"} {r.name}
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
                            <small>Calls</small>
                            <strong>{active.usage.calls}</strong>
                          </div>
                          <div>
                            <small>Reported tokens</small>
                            <strong>
                              {active.usage.input === null ||
                              active.usage.output === null
                                ? "Unknown"
                                : active.usage.input + active.usage.output}
                            </strong>
                          </div>
                          <div>
                            <small>
                              {active.simulated
                                ? "Demo cost"
                                : "Estimated cost"}
                            </small>
                            <strong>
                              {active.usage.cost === null
                                ? "Unknown"
                                : "$" + active.usage.cost.toFixed(4)}
                            </strong>
                          </div>
                          <div>
                            <small>Exam</small>
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
                      <h2>A fairer question</h2>
                      <FlaskConical size={20} />
                    </div>
                    <h3 className="large-copy">
                      Did teaching help more than simply sharing a skill?
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
                          <Badge>{id}</Badge>
                          <strong>{title}</strong>
                          <p>{desc}</p>
                        </div>
                      ))}
                    </div>
                    <p className="hint">
                      Same student, course seed and per-task budget. Teaching
                      overhead is included. Changes in model or environment
                      require a new comparison. Simulation results are fixtures,
                      not measurements.
                    </p>
                  </div>
                )}
              </div>
              <div className="panel history">
                <div className="panel-title">
                  <h2>
                    {page === "Learn"
                      ? "Recent sessions"
                      : "Experiment results"}
                  </h2>
                  <span className="muted">{snapshot.sessions.length} runs</span>
                </div>
                {!snapshot.sessions.length ? (
                  <p className="muted">
                    No sessions yet. Start a lesson above.
                  </p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Session</th>
                        <th>Condition</th>
                        <th>Status</th>
                        <th>Exam</th>
                        <th>Calls</th>
                        <th>Cost</th>
                        <th>Elapsed</th>
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
                              <small className="sim">SIMULATION</small>
                            )}
                          </td>
                          <td>{s.options.arm}</td>
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
                              {s.status}
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
                              ? "Unknown"
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
                      {p.kind === "demo" ? "SIMULATED" : p.kind}
                    </Badge>
                    <h2>{p.name}</h2>
                    <p className="mono">{p.model}</p>
                    <div className="card-detail">
                      <span>Authentication</span>
                      <strong>
                        {p.kind === "demo"
                          ? "Not required"
                          : (p.keyEnv ?? "Not configured")}
                      </strong>
                    </div>
                    <div className="card-detail">
                      <span>Endpoint</span>
                      <strong>{p.baseUrl ?? "Offline fixture"}</strong>
                    </div>
                    <p className="hint">
                      {p.kind === "metis"
                        ? "Disabled until isolated execution is verified."
                        : "Credentials are never displayed, exported or read from existing login files."}
                    </p>
                  </div>
                ))}
              </div>
              <div className="notice">
                <Shield size={18} />
                <span>
                  Provide only the environment variable name holding your key.
                  The coordinator must be launched with that variable set.
                  Saving an agent does not make a paid request.
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
                    <small>TEACHING SCOPE</small>
                    <p>{t.scope}</p>
                  </div>
                  <details>
                    <summary>Review materials sent during teaching</summary>
                    <pre>{t.material}</pre>
                  </details>
                  <button
                    className="secondary wide"
                    onClick={() => {
                      setTeacher(t.id);
                      setPage("Learn");
                    }}
                  >
                    Learn with this teacher <ArrowUpRight size={16} />
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
                  <h3>A library of things your agent can do</h3>
                  <p>
                    Complete a lesson to create your first capability record.
                  </p>
                  <button className="primary" onClick={() => setPage("Learn")}>
                    Start a lesson
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
                            ? "SIMULATED"
                            : c.verified
                              ? "VERIFIED IN CONTEXT"
                              : "UNVERIFIED"}
                        </Badge>
                      </div>
                      <h2>{c.title}</h2>
                      <p>
                        {c.method.slice(0, 150)}
                        {c.method.length > 150 ? "…" : ""}
                      </p>
                      <div className="card-detail">
                        <span>Student</span>
                        <strong>{c.conditions.model}</strong>
                      </div>
                      <div className="card-detail">
                        <span>Course</span>
                        <strong>{c.conditions.course}</strong>
                      </div>
                      <div className="card-detail">
                        <span>Status</span>
                        <strong>{c.enabled ? "Enabled" : "Disabled"}</strong>
                      </div>
                      <div className="button-row">
                        <button
                          className="secondary"
                          onClick={() => setView(c)}
                        >
                          Inspect
                        </button>
                        <button
                          className="icon-button"
                          aria-label={"Export " + c.id}
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
                          {c.enabled ? "Disable" : "Enable"}
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
                          Independent retest
                        </button>
                        <button
                          className="text-button destructive"
                          onClick={() => setDeleteId(c.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="hint">
                Checksums detect accidental changes, not author identity.
                Imported packages are unverified and disabled until you review
                and explicitly enable them.
              </p>
            </>
          )}
        </section>
        <footer>
          <Shield size={13} /> Local-first · No telemetry{" "}
          <span>Agent Apprentice / Open-source learning workspace</span>
        </footer>
      </main>
      <Modal
        open={add}
        onOpenChange={setAdd}
        title="Connect an agent"
        description="Only explicit model endpoints and environment variable names. No credential scanning."
      >
        {error && (
          <p role="alert" className="notice danger">
            {error}
          </p>
        )}
        <ProviderForm
          onSave={async (value) => {
            if (await action({ type: "provider.save", value })) setAdd(false);
          }}
        />
      </Modal>
      <Modal
        open={teacherAdd}
        onOpenChange={setTeacherAdd}
        title="Create a teacher"
        description="Only share materials you have permission to use."
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
        title="Capability evidence"
        description="Validation is conditional on the recorded environment, not a universal certificate."
      >
        {view && (
          <>
            <pre className="package-preview">
              {JSON.stringify(view, null, 2)}
            </pre>
            <button className="primary" onClick={() => void download(view)}>
              Export package
            </button>
          </>
        )}
      </Modal>
      <Modal
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId("");
        }}
        title="Delete capability?"
        description="This removes the local capability record. Session evidence remains. Export a copy first if needed."
      >
        <div className="button-row">
          <button className="secondary" onClick={() => setDeleteId("")}>
            Keep capability
          </button>
          <button
            className="primary danger-button"
            onClick={async () => {
              await action({ type: "capability.delete", id: deleteId });
              setDeleteId("");
            }}
          >
            Delete capability
          </button>
        </div>
      </Modal>
    </div>
  );
}
function ProviderForm({ onSave }: { onSave: (p: Provider) => void }) {
  const [kind, setKind] = useState<Provider["kind"]>("responses");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        onSave({
          id: String(d.get("id")),
          name: String(d.get("name")),
          kind,
          model: String(d.get("model")),
          ...(kind !== "demo"
            ? { baseUrl: String(d.get("url")), keyEnv: String(d.get("key")) }
            : {}),
          ...(d.get("input") ? { priceInput: Number(d.get("input")) } : {}),
          ...(d.get("output") ? { priceOutput: Number(d.get("output")) } : {}),
        });
      }}
    >
      <div className="field-row">
        <label>
          ID
          <input
            name="id"
            required
            pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}"
            placeholder="my-student"
          />
        </label>
        <label>
          DISPLAY NAME
          <input name="name" required placeholder="My local agent" />
        </label>
      </div>
      <label>
        PROTOCOL
        <select value={kind} onChange={(e) => setKind(e.target.value as any)}>
          <option value="responses">OpenAI Responses</option>
          <option value="chat">OpenAI Chat Completions</option>
          <option value="remote-teacher">Remote teacher protocol</option>
          <option value="demo">Offline simulation</option>
        </select>
      </label>
      <label>
        MODEL
        <input
          required
          name="model"
          placeholder="Model identifier from your provider"
        />
      </label>
      {kind !== "demo" && (
        <>
          <label>
            BASE URL
            <input
              required
              name="url"
              type="url"
              placeholder="https://api.openai.com/v1"
            />
          </label>
          <label>
            KEY ENVIRONMENT VARIABLE
            <input
              required
              name="key"
              pattern="[A-Z][A-Z0-9_]{0,79}"
              placeholder="APPRENTICE_MODEL_KEY"
            />
          </label>
        </>
      )}
      <div className="field-row">
        <label>
          INPUT $ / 1M TOKENS
          <input
            name="input"
            type="number"
            min="0"
            step="any"
            placeholder="Unknown"
          />
        </label>
        <label>
          OUTPUT $ / 1M TOKENS
          <input
            name="output"
            type="number"
            min="0"
            step="any"
            placeholder="Unknown"
          />
        </label>
      </div>
      <button className="primary wide" type="submit">
        Save agent
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
          ID
          <input required name="id" pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}" />
        </label>
        <label>
          NAME
          <input required name="name" />
        </label>
      </div>
      <label>
        AGENT
        <select name="provider">
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        DESCRIPTION
        <input name="description" required />
      </label>
      <label>
        TEACHING SCOPE
        <input name="scope" required />
      </label>
      <label>
        MATERIAL LICENSE
        <input
          name="license"
          required
          placeholder="e.g. Apache-2.0 or your explicit authorization"
        />
      </label>
      <label>
        AUTHORIZED TEACHING MATERIAL
        <textarea name="material" rows={6} maxLength={20000} required />
      </label>
      <button className="primary wide" type="submit">
        Create teacher
      </button>
    </form>
  );
}
const mount = document.getElementById("root");
if (mount) createRoot(mount).render(<App />);
