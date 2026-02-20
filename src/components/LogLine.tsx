import { CheckCircle, Loader2, XCircle, Clock } from "lucide-react";

export type LogStatus = "pending" | "running" | "success" | "error";

interface LogLineProps {
  message: string;
  status: LogStatus;
}

const statusIcons: Record<LogStatus, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-muted-foreground" />,
  running: <Loader2 className="w-4 h-4 text-primary animate-spin" />,
  success: <CheckCircle className="w-4 h-4 text-primary" />,
  error: <XCircle className="w-4 h-4 text-destructive" />,
};

const statusColors: Record<LogStatus, string> = {
  pending: "text-muted-foreground",
  running: "text-foreground",
  success: "text-primary",
  error: "text-destructive",
};

const LogLine = ({ message, status }: LogLineProps) => {
  return (
    <div className={`flex items-center gap-2 text-sm font-mono ${statusColors[status]}`}>
      {statusIcons[status]}
      <span className="text-terminal-dim">$</span>
      <span>{message}</span>
    </div>
  );
};

export default LogLine;
