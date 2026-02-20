import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    let parsed: any = {};
    try { parsed = JSON.parse(body); } catch {}
    
    const msg = parsed.message || body;
    
    if (res.status === 401) {
      throw new Error(`Token inválido ou expirado. Verifique suas credenciais.`);
    }
    if (res.status === 403) {
      const isFinegrained = url.includes("/blobs") || url.includes("/trees") || url.includes("/commits") || url.includes("/refs");
      throw new Error(
        `Sem permissão no repositório. SOLUÇÃO: ` +
        `1) Use um token CLÁSSICO (ghp_...) com scope "repo" — é mais fácil. ` +
        `Crie em: github.com/settings/tokens → "Generate new token (classic)" → marque "repo". ` +
        `2) Se usar fine-grained (github_pat_...), selecione o repo específico e ative "Contents: Read and Write".`
      );
    }
    if (res.status === 404) {
      throw new Error(`Repositório não encontrado. Verifique se a URL está correta e se o token tem acesso.`);
    }
    throw new Error(`GitHub API ${res.status}: ${msg}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const steps: { message: string; success: boolean }[] = [];

  try {
    const { sourceOwner, sourceRepo, targetOwner, targetRepo, sourceToken, targetToken } = await req.json();

    if (!sourceOwner || !sourceRepo || !targetOwner || !targetRepo || !sourceToken || !targetToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros faltando", steps: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // 1. Validate source token
    steps.push({ message: "Verificando token da conta mãe...", success: true });
    const sourceRepoData = await githubApi(`https://api.github.com/repos/${sourceOwner}/${sourceRepo}`, sourceToken);
    steps.push({ message: `Mãe OK: ${sourceRepoData.full_name}`, success: true });

    // 2. Validate target token
    steps.push({ message: "Verificando token da conta filha...", success: true });
    const targetRepoData = await githubApi(`https://api.github.com/repos/${targetOwner}/${targetRepo}`, targetToken);
    steps.push({ message: `Filha OK: ${targetRepoData.full_name}`, success: true });

    // 3. Check target permissions
    if (targetRepoData.permissions && !targetRepoData.permissions.push) {
      throw new Error("Token da filha não tem permissão de escrita (push) neste repositório.");
    }

    // 4. Read source tree
    steps.push({ message: "Lendo arquivos da mãe...", success: true });
    const treeData = await githubApi(
      `https://api.github.com/repos/${sourceOwner}/${sourceRepo}/git/trees/${sourceRepoData.default_branch}?recursive=1`,
      sourceToken
    );
    const blobs = (treeData.tree || []).filter((item: any) => item.type === "blob");
    steps.push({ message: `${blobs.length} arquivos encontrados`, success: true });

    // 5. Get target branch info
    const targetBranch = targetRepoData.default_branch;
    const refData = await githubApi(
      `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/ref/heads/${targetBranch}`,
      targetToken
    );
    const targetHeadSha = refData.object.sha;
    steps.push({ message: `Branch filha: ${targetBranch} (${targetHeadSha.slice(0, 7)})`, success: true });

    // 6. Transfer blobs
    steps.push({ message: "Transferindo arquivos...", success: true });
    const newTreeItems: any[] = [];

    for (const blob of blobs) {
      const blobData = await githubApi(
        `https://api.github.com/repos/${sourceOwner}/${sourceRepo}/git/blobs/${blob.sha}`,
        sourceToken
      );
      const newBlob = await githubApi(
        `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/blobs`,
        targetToken,
        { method: "POST", body: JSON.stringify({ content: blobData.content, encoding: "base64" }) }
      );
      newTreeItems.push({ path: blob.path, mode: blob.mode, type: "blob", sha: newBlob.sha });
    }
    steps.push({ message: `${newTreeItems.length} arquivos transferidos`, success: true });

    // 7. Create new tree (replaces everything)
    steps.push({ message: "Substituindo conteúdo da filha...", success: true });
    const newTree = await githubApi(
      `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/trees`,
      targetToken,
      { method: "POST", body: JSON.stringify({ tree: newTreeItems }) }
    );

    // 8. Create commit
    steps.push({ message: "Criando commit...", success: true });
    const newCommit = await githubApi(
      `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/commits`,
      targetToken,
      {
        method: "POST",
        body: JSON.stringify({
          message: `remix: conteúdo clonado de ${sourceOwner}/${sourceRepo}`,
          tree: newTree.sha,
          parents: [targetHeadSha],
        }),
      }
    );

    // 9. Force update ref
    steps.push({ message: "Atualizando branch...", success: true });
    await githubApi(
      `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/refs/heads/${targetBranch}`,
      targetToken,
      { method: "PATCH", body: JSON.stringify({ sha: newCommit.sha, force: true }) }
    );

    steps.push({ message: "Remix completo!", success: true });

    return new Response(JSON.stringify({ success: true, steps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    steps.push({ message: err.message, success: false });
    return new Response(
      JSON.stringify({ success: false, error: err.message, steps }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
