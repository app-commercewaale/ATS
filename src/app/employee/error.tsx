"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCcw } from "lucide-react";

export default function EmployeeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full border-destructive/20 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle>Dashboard Error</CardTitle>
          <CardDescription>
            We couldn't load your personal dashboard records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-3 rounded text-xs font-mono break-all overflow-auto max-h-32">
            {error.message || "Unknown error"}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCcw className="w-4 h-4" />
            Try again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
