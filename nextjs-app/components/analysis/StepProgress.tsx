interface StepState {
  stepId: string;
  type: string;
  status: "pending" | "running" | "complete";
}

export function StepProgress({ steps }: { steps: StepState[] }) {
  return (
    <div className="flex gap-2 py-4">
      {steps.map((step, i) => (
        <div key={step.stepId} className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              step.status === "complete"
                ? "bg-emerald-500"
                : step.status === "running"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-zinc-700"
            }`}
          />
          <span className="text-xs text-zinc-500">{step.type}</span>
          {i < steps.length - 1 && <div className="w-8 h-px bg-zinc-700" />}
        </div>
      ))}
    </div>
  );
}
