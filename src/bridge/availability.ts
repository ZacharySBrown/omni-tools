import { execFileSync } from "child_process";

export function checkOmniGraffleAvailable(): boolean {
  try {
    execFileSync("osascript", ["-l", "JavaScript", "-e", 'Application("OmniGraffle").name()'], {
      timeout: 10000,
      encoding: "utf8",
    });
    return true;
  } catch {
    return false;
  }
}
