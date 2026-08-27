import { useCallback, useEffect, useState } from "react";

export type AppPath =
  | "/login"
  | "/register"
  | "/tenants"
  | "/onboarding"
  | "/workspace"
  | "/roles"
  | "/settings"
  | "/audit";

const VALID_PATHS = new Set<AppPath>([
  "/login",
  "/register",
  "/tenants",
  "/onboarding",
  "/workspace",
  "/roles",
  "/settings",
  "/audit",
]);

function readPath(): AppPath {
  const path = window.location.pathname as AppPath;
  return VALID_PATHS.has(path) ? path : "/login";
}

export function useRouter() {
  const [path, setPath] = useState<AppPath>(readPath);

  useEffect(() => {
    const onPopState = () => setPath(readPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((nextPath: AppPath, replace = false) => {
    if (replace) {
      window.history.replaceState(null, "", nextPath);
    } else {
      window.history.pushState(null, "", nextPath);
    }
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return { path, navigate };
}
