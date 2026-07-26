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

// Commits new content to an existing file. Caller must pass the sha from the last
// getFile() call so GitHub can detect and reject conflicting concurrent edits.
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

// Creates a brand new file. Fails if the path already exists - use putFile to update instead.
export async function createFile(path: string, content: string, message: string): Promise<void> {
  const { owner, repo, branch } = repoInfo();
  const octokit = client();
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    branch,
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
  });
}

const TEMPLATE_PREFIX = "Templates/project/";
const PROJECT_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Copies every file under Templates/project/ into Projects/<name>/, preserving
// relative paths. Fails fast if the name is invalid or the project already exists.
export async function createProjectFromTemplate(name: string): Promise<void> {
  if (!PROJECT_NAME_PATTERN.test(name)) {
    throw new Error("Project name must be lowercase letters, numbers, and hyphens only");
  }
  const tree = await getTree();
  const templateFiles = tree.filter((e) => e.type === "blob" && e.path.startsWith(TEMPLATE_PREFIX));
  if (templateFiles.length === 0) throw new Error("Templates/project/ has no files to copy");

  const destPrefix = `Projects/${name}/`;
  const alreadyExists = tree.some((e) => e.path.startsWith(destPrefix));
  if (alreadyExists) throw new Error(`Projects/${name}/ already exists`);

  for (const file of templateFiles) {
    const relativePath = file.path.slice(TEMPLATE_PREFIX.length);
    const { content } = await getFile(file.path);
    await createFile(`${destPrefix}${relativePath}`, content, `Create project: ${name}`);
  }
}
