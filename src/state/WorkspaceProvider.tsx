import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Workspace } from "../domain/types";
import { api } from "../account/api";
interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member";
}
interface Studio {
  id: string;
  name: string;
  role: "owner" | "member";
  revision: number;
}
interface Activity {
  id: string;
  actor: string;
  description: string;
  createdAt: string;
}
interface Snapshot {
  data: Workspace;
  revision: number;
  workspace: Studio;
  workspaces: Studio[];
  members: Member[];
  activity: Activity[];
}
interface Context extends Snapshot {
  update: (next: Workspace, message: string) => Promise<boolean>;
  toast: string;
  notice: string;
  busy: boolean;
  dismiss: () => void;
  refresh: (workspaceId?: string) => Promise<void>;
  request: <T>(path: string, method: string, body: unknown) => Promise<T>;
}
const WorkspaceContext = createContext<Context | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [toast, setToast] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const active = useRef("");
  async function request<T>(path: string, method: string, body: unknown) {
    return api<T>(
      path,
      method,
      body,
      active.current ? { "X-Workspace-Id": active.current } : {},
    );
  }
  async function refresh(workspaceId?: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const previous = active.current;
    if (workspaceId) active.current = workspaceId;
    try {
      const next = await request<Snapshot>("/api/state", "GET", undefined);
      active.current = next.workspace.id;
      setSnapshot(next);
      setNotice("");
    } catch (e) {
      active.current = previous;
      setNotice((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  async function update(data: Workspace, message: string) {
    if (!snapshot || lock.current) {
      setNotice("Please wait for the current save to finish.");
      return false;
    }
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      const next = await request<Snapshot>("/api/state", "PUT", {
        data,
        revision: snapshot.revision,
      });
      setSnapshot(next);
      setToast(message);
      return true;
    } catch (e) {
      setNotice(`Change not saved. ${(e as Error).message}`);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!snapshot)
    return (
      <main className="account-loading">
        <p role="status">{notice || "Loading your studio…"}</p>
        <button
          className="button"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Try again
        </button>
      </main>
    );
  return (
    <WorkspaceContext.Provider
      value={{
        ...snapshot,
        update,
        toast,
        notice,
        busy,
        dismiss: () => setNotice(""),
        refresh,
        request,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace context missing");
  return value;
}
