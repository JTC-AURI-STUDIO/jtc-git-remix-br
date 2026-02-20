import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GitHubFile {
  path: string;
  type: string;
  sha: string;
  url: string;
}

async function githubApi(url: string, token: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }
  return res.json();
}

async function getTree(owner: string, repo: string, token: string): Promise<any[]> {
  const data = await githubApi(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    token
  );
  return data.tree || [];
}

async function getBlob(owner: string, repo: string, sha: string, token: string): Promise<string> {
  const data = await githubApi(
    `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`,
    token
  );
  return data.content; // base64
}

async function getDefaultBranch(owner: string, repo: string, token: string): Promise<string> {
  const data = await githubApi(`https://api.github.com/repos/${owner}/${repo}`, token);
  return data.default_branch;
}

async function getRef(owner: string, repo: string, branch: string, token: string): Promise<string> {
  const data = await githubApi(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    token
  );
  return data.object.sha;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceOwner, sourceRepo, targetOwner, targetRepo, token } = await req.json();

    if (!sourceOwner || !sourceRepo || !targetOwner || !targetRepo || !token) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros faltando" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const steps: { message: string; success: boolean }[] = [];

    // 1. Get source tree
    steps.push({ message: "Lendo árvore do repositório fonte...", success: true });
    const sourceTree = await getTree(sourceOwner, sourceRepo, token);
    const blobs = sourceTree.filter((item: any) => item.type === "blob");
    steps.push({ message: `${blobs.length} arquivos encontrados no fonte`, success: true });

    // 2. Get target default branch
    const targetBranch = await getDefaultBranch(targetOwner, targetRepo, token);
    const targetHeadSha = await getRef(targetOwner, targetRepo, targetBranch, token);
    steps.push({ message: `Branch destino: ${targetBranch} (${targetHeadSha.slice(0, 7)})`, success: true });

    // 3. Get all blobs from source
    steps.push({ message: "Baixando conteúdo dos arquivos...", success: true });
    const newTreeItems: any[] = [];

    for (const blob of blobs) {
      const content = await getBlob(sourceOwner, sourceRepo, blob.sha, token);
      // Create blob in target
      const newBlob = await githubApi(
        `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/blobs`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ content, encoding: "base64" }),
        }
      );
      newTreeItems.push({
        path: blob.path,
        mode: blob.mode,
        type: "blob",
        sha: newBlob.sha,
      });
    }

    steps.push({ message: `${newTreeItems.length} blobs criados no destino`, success: true });

    // 4. Create new tree in target (without base_tree to replace everything)
    steps.push({ message: "Criando nova árvore no destino...", success: true });
    const newTree = await githubApi(
      `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/trees`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ tree: newTreeItems }),
      }
    );

    // 5. Create commit
    steps.push({ message: "Criando commit...", success: true });
    const newCommit = await githubApi(
      `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/commits`,
      token,
      {
        method: "POST",
        body: JSON.stringify({
          message: `remix: conteúdo clonado de ${sourceOwner}/${sourceRepo}`,
          tree: newTree.sha,
          parents: [targetHeadSha],
        }),
      }
    );

    // 6. Update ref
    steps.push({ message: "Atualizando referência...", success: true });
    await githubApi(
      `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/refs/heads/${targetBranch}`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({ sha: newCommit.sha, force: true }),
      }
    );

    steps.push({ message: "Remix completo!", success: true });

    return new Response(JSON.stringify({ success: true, steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message, steps: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
