import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface PageLoaderProps {
  pageName: string;
  children: React.ReactNode;
}

const PageLoader = ({ pageName, children }: PageLoaderProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">
          O sistema está entrando na página <span className="font-semibold text-foreground">{pageName}</span>
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default PageLoader;
