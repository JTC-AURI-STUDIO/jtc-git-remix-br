import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Copy, Check, BookOpen } from "lucide-react";

const TokenGuide = () => {
  const [open, setOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const tokenUrl = "https://github.com/settings/tokens/new";

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(tokenUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-background/40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-muted/20 transition-colors"
      >
        <span className="flex items-center gap-2 text-[11px] text-primary/80 font-mono">
          <BookOpen className="w-3.5 h-3.5" />
          Como criar o token?
        </span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-border/30 pt-3">
          {/* Steps */}
          <div className="space-y-2.5">
            <Step number={1} title="Acesse a página de tokens">
              <div className="flex items-center gap-2">
                <a
                  href={tokenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 text-[10px] flex items-center gap-1 hover:text-primary/80 transition-colors"
                >
                  github.com/settings/tokens/new
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <button onClick={handleCopyUrl} className="text-muted-foreground hover:text-primary transition-colors">
                  {copiedUrl ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </Step>

            <Step number={2} title="Escolha o tipo de token">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Clique em{" "}
                <span className="text-foreground font-semibold bg-muted/30 px-1 py-0.5 rounded">
                  Generate new token (classic)
                </span>
              </p>
            </Step>

            <Step number={3} title="Dê um nome ao token">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                No campo <span className="text-foreground font-semibold">Note</span>, coloque algo como{" "}
                <span className="font-mono text-primary/80 bg-primary/5 px-1 py-0.5 rounded">jtc-gitremix</span>
              </p>
            </Step>

            <Step number={4} title="Marque a permissão 'repo'" important>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Na lista de scopes, marque{" "}
                <span className="text-foreground font-bold">☑ repo</span>{" "}
                (Full control of private repositories)
              </p>
              <div className="mt-1.5 bg-primary/5 border border-primary/10 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded border-2 border-primary bg-primary/20 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary" />
                  </div>
                  <span className="text-[10px] font-mono text-foreground font-bold">repo</span>
                  <span className="text-[9px] text-muted-foreground">— Full control of private repositories</span>
                </div>
              </div>
            </Step>

            <Step number={5} title="Gere e copie o token">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Clique em{" "}
                <span className="text-foreground font-semibold bg-primary/10 px-1.5 py-0.5 rounded text-primary">
                  Generate token
                </span>{" "}
                e copie o token{" "}
                <span className="font-mono text-primary/80">ghp_...</span>
              </p>
            </Step>
          </div>

          {/* Warning */}
          <div className="bg-destructive/5 border border-destructive/15 rounded-lg p-2.5">
            <p className="text-[10px] text-destructive/80 leading-relaxed">
              ⚠️ <strong>Importante:</strong> O token só aparece uma vez! Copie e guarde em local seguro.
            </p>
          </div>

          {/* Quick link */}
          <a
            href={tokenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-xl py-2.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] text-primary font-bold font-mono">Criar token agora</span>
          </a>
        </div>
      )}
    </div>
  );
};

const Step = ({
  number,
  title,
  important,
  children,
}: {
  number: number;
  title: string;
  important?: boolean;
  children: React.ReactNode;
}) => (
  <div className="flex gap-2.5">
    <div
      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 ${
        important
          ? "bg-primary text-primary-foreground shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
          : "bg-muted/40 text-muted-foreground border border-border/50"
      }`}
    >
      {number}
    </div>
    <div className="space-y-1 min-w-0">
      <p className={`text-[11px] font-semibold ${important ? "text-primary" : "text-foreground/90"}`}>
        {title}
      </p>
      {children}
    </div>
  </div>
);

export default TokenGuide;
