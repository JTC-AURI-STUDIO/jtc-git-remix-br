import { CheckCircle, Loader2, XCircle, Clock } from "lucide-react";

export type LogStatus = "pending" | "running" | "success" | "error";

interface LogLineProps {
  message: string;
  status: LogStatus;
}

const statusIcons: Record<LogStatus, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />,
  running: <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />,
  success: <CheckCircle className="w-3.5 h-3.5 text-primary" />,
  error: <XCircle className="w-3.5 h-3.5 text-destructive" />,
};

const statusColors: Record<LogStatus, string> = {
  pending: "text-muted-foreground/60",
  running: "text-foreground/80",
  success: "text-primary/90",
  error: "text-destructive/90",
};

const LogLine = ({ message, status }: LogLineProps) => {
  return (
    <div className={`flex items-center gap-2 font-mono text-[11px] sm:text-xs leading-relaxed ${statusColors[status]}`}>
      {statusIcons[status]}
      <span className="text-terminal-dim/40">$</span>
      <span className="break-all">{message}</span>
    </div>
  );
};

export default LogLine;
