const TerminalHeader = () => {
  return (
    <div className="flex items-center gap-2 mb-8">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-destructive" />
        <div className="w-3 h-3 rounded-full bg-accent" />
        <div className="w-3 h-3 rounded-full bg-primary" />
      </div>
      <span className="text-muted-foreground text-sm ml-2">github-remixer v1.0</span>
    </div>
  );
};

export default TerminalHeader;
