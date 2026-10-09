// File references belong to the run's host and working directory, never to the
// extension's URL or the browser process's working directory.
export function absoluteFilePath(path, cwd) {
  if (typeof path !== "string" || !path) return null;
  if (path.startsWith("file://")) {
    try {
      const url = new URL(path);
      path = decodeURIComponent(url.pathname);
      if (url.hostname) path = `//${url.hostname}${path}`;
      else if (/^\/[a-z]:\//iu.test(path)) path = path.slice(1);
    } catch { return null; }
  } else if (/^[a-z][a-z\d+.-]*:/iu.test(path) && !/^[a-z]:[\\/]/iu.test(path)) {
    return null;
  }
  const windows = /^[a-z]:[\\/]/iu.test(path) || /^[\\/]{2}/u.test(path)
    || (typeof cwd === "string" && (/^[a-z]:[\\/]/iu.test(cwd) || /^[\\/]{2}/u.test(cwd)));
  const absolute = (value) => windows
    ? /^[a-z]:[\\/]/iu.test(value) || /^[\\/]{2}/u.test(value)
    : value.startsWith("/");
  if (!absolute(path)) {
    if (typeof cwd !== "string" || !absolute(cwd)) return null;
    // A root-relative Windows path inherits only the known host's drive.
    if (windows && /^[\\/]/u.test(path)) {
      if (!/^[a-z]:/iu.test(cwd)) return null;
      path = `${cwd.slice(0, 2)}${path}`;
    } else path = `${cwd}/${path}`;
  }
  const canonical = windows ? path.replaceAll("\\", "/") : path;
  const drive = /^[a-z]:/iu.exec(canonical)?.[0];
  const unc = canonical.startsWith("//");
  const prefix = drive ? `${drive}/` : unc ? "//" : "/";
  const parts = canonical.slice(prefix.length).split("/");
  const result = [];
  const floor = unc ? 2 : 0; // Never traverse above the UNC server/share.
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") { if (result.length > floor) result.pop(); }
    else result.push(part);
  }
  const resolved = prefix + result.join("/");
  return windows ? resolved.replaceAll("/", "\\") : resolved;
}
