import { Octokit } from "@octokit/rest";

// Single client, single repo. Configured entirely via env vars - fail fast if missing.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function client() {
  return new Octokit({ auth: requireEnv("GITHUB_TOKEN") });
}

function repoInfo() {
  const repo = requireEnv("GITHUB_REPO"); // format: "owner/name"
  const [owner, name] = repo.split("/");
  if (!owner || !name) throw new Error(`GITHUB_REPO must be "owner/name", got: ${repo}`);
  return { owner, repo: name, branch: process.env.GITHUB_BRANCH || "main" };
}

export type TreeEntry = { path: string; type: "blob" | "tree"; sha: string };

// Returns the full recursive file tree for the configured repo/branch.
export async function getTree(): Promise<TreeEntry[]> {
  const { owner, repo, branch } = repoInfo();
  const octokit = client();
  const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: ref.object.sha,
    recursive: "true",
  });
  return tree.tree
    .filter((entry) => entry.type === "blob" || entry.type === "tree")
    .map((entry) => ({
      path: entry.path as string,
      type: entry.type as "blob" | "tree",
      sha: entry.sha as string,
    }));
}

// Returns decoded file content and the sha needed to update it later.
export async function getFile(path: string): Promise<{ content: string; sha: string }> {
  const { owner, repo, branch } = repoInfo();
  const octokit = client();
  const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });
  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(`Path is not a file: ${path}`);
  }
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content, sha: data.sha };
}

// Commits new content to a file. Caller must pass the sha from the last getFile() call
// so GitHub can detect and reject conflicting concurrent edits.
export async function putFile(path: string, content: string, sha: string, message: string): Promise<void> {
  const { owner, repo, branch } = repoInfo();
  const octokit = client();
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    branch,
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    sha,
  });
}
