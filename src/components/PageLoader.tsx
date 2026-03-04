import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface PageLoaderProps {
  pageName: string;
  children: React.ReactNode;
}

const PageLoader = ({ pageName, children }: PageLoaderProps) => {
  return <>{children}</>;
};

export default PageLoader;
