import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CircleHelp,
  LayoutDashboard,
  FolderClosed,
  Users,
  ReceiptText,
  Settings2,
  Menu,
  X,
  ListTodo,
} from "lucide-react";
import { NavLink, Route, Routes, Link, useLocation } from "react-router-dom";
import { WorkspaceProvider, useWorkspace } from "./state/WorkspaceProvider";
import { Overview } from "./features/Overview";
import { Projects, ProjectDetail, Tasks } from "./features/Projects";
import { Clients, ClientDetail } from "./features/Clients";
import { Invoices, InvoiceDetail } from "./features/Invoices";
import { Settings } from "./features/Settings";
import { Empty } from "./components/ui";
import { AccountGate, useAccount } from "./account/Account";
const navigation = [
  { to: "/", name: "Overview", icon: LayoutDashboard },
  { to: "/projects", name: "Projects", icon: FolderClosed },
  { to: "/tasks", name: "Tasks", icon: ListTodo },
  { to: "/clients", name: "Clients", icon: Users },
  { to: "/invoices", name: "Invoices", icon: ReceiptText },
];
function Shell() {
  const { toast, notice, dismiss, data, workspace, workspaces, busy, refresh } =
    useWorkspace();
  const { user, logout } = useAccount();
  const [accountError, setAccountError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const section =
    navigation.find((n) => n.to !== "/" && location.pathname.startsWith(n.to))
      ?.name ?? (location.pathname === "/settings" ? "Settings" : "Overview");
  useEffect(() => {
    setMobileOpen(false);
    document.title = `${section} · DESK`;
    window.scrollTo(0, 0);
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [location.pathname, section]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="wordmark" to="/" aria-label="DESK overview">
          DESK<span>✳</span>
        </Link>
        <p className="brand-subtitle">The independent studio.</p>
        <div className="studio-switch">
          <div className="studio-avatar">s.</div>
          <div>
            <strong>{workspace.name}</strong>
            <span>
              {user.name} / {workspace.role}
            </span>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navigation.map((n) => (
            <NavLink to={n.to} end={n.to === "/"} key={n.to}>
              <n.icon size={18} />
              {n.name}
              {n.name === "Projects" && (
                <span className="nav-count">
                  {data.projects.filter((p) => !p.archived).length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-indicator">
            <span />
            Saved to your workspace
          </div>
          <NavLink to="/settings">
            <Settings2 size={18} />
            Settings
          </NavLink>
          <Link className="concept-link" to="/settings">
            <CircleHelp size={14} />
            Independent portfolio concept
            <ArrowUpRight size={12} />
          </Link>
          <div className="studio-stamp">
            <span>DESK / CONNECTED</span>
            <p>
              Your studio, together
              <br />A home for your work.
            </p>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
            >
              <Menu size={21} />
            </button>
            <span className="topbar-studio">Workspace</span>
            <span className="breadcrumb-separator">/</span>
            <span>{section}</span>
          </div>
          <div className="topbar-right">
            <span className="demo-chip" role="status">
              {busy ? "SAVING…" : "CONNECTED"}
            </span>
            <span>
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </header>
        {mobileOpen && (
          <div className="mobile-navigation">
            <button
              className="icon-button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X size={20} />
            </button>
            <nav aria-label="Mobile navigation">
              {[
                ...navigation,
                { to: "/settings", name: "Settings", icon: Settings2 },
              ].map((n) => (
                <NavLink
                  to={n.to}
                  end={n.to === "/"}
                  key={n.to}
                  onClick={() => setMobileOpen(false)}
                >
                  <n.icon size={18} />
                  {n.name}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
        <main id="main" tabIndex={-1}>
          <div className="account-bar">
            <div>
              <label htmlFor="studio-select">Studio</label>
              <select
                id="studio-select"
                value={workspace.id}
                disabled={busy}
                onChange={(e) => void refresh(e.target.value)}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <span role="status">
                {busy ? "Saving changes…" : "All changes saved"}
              </span>
            </div>
            <div>
              <button disabled={busy} onClick={() => void refresh()}>
                Refresh records
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void logout().catch((e) =>
                    setAccountError((e as Error).message),
                  )
                }
              >
                Sign out
              </button>
            </div>
          </div>
          {accountError && (
            <p className="server-message" role="alert">
              {accountError}
            </p>
          )}
          {notice && (
            <div className="notice" role="alert">
              <span>{notice}</span>
              <button
                className="icon-button"
                aria-label="Dismiss storage notice"
                onClick={dismiss}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="*"
              element={
                <Empty
                  title="This page isn’t on your desk"
                  description="Let’s get you back to the workspace."
                  action={
                    <Link to="/" className="button primary">
                      Open overview
                    </Link>
                  }
                />
              }
            />
          </Routes>
          <footer className="workspace-footer">
            <span>{workspace.name} · Shared studio workspace.</span>
            <span>DESK / STUDIO LEDGER</span>
          </footer>
        </main>
      </div>
      <div
        className={`toast ${toast ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    </div>
  );
}
export default function App() {
  return (
    <AccountGate
      title="DESK"
      description="A little structure. More room for the work."
    >
      <WorkspaceProvider>
        <Shell />
      </WorkspaceProvider>
    </AccountGate>
  );
}
