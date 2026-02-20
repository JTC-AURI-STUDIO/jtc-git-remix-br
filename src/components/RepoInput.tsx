import { Input } from "@/components/ui/input";
import { GitBranch } from "lucide-react";

interface RepoInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  prefix: string;
}

const RepoInput = ({ label, placeholder, value, onChange, prefix }: RepoInputProps) => {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground flex items-center gap-1.5 leading-tight">
        <GitBranch className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-primary font-semibold shrink-0">{prefix}</span>
        <span className="truncate">{label}</span>
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 glow-border font-mono text-xs h-10"
      />
    </div>
  );
};

export default RepoInput;
