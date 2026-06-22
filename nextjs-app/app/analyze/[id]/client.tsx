"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AnalysisLiveClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  useEffect(() => {
    // This will be replaced by useAnalysisSocket in Task 18
    const es = new EventSource(`/api/analyze/${sessionId}/events`);
    es.onmessage = () => router.refresh();
    return () => es.close();
  }, [sessionId, router]);

  return (
    <p className="text-amber-400 text-sm mt-4 animate-pulse">
      ● 实时分析进行中...
    </p>
  );
}
