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
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-primary" />
        <span className="text-primary">{prefix}</span> {label}
      </label>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 glow-border font-mono text-sm h-12"
        />
      </div>
    </div>
  );
};

export default RepoInput;
