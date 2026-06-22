"use client";
import { useState, useEffect } from "react";

interface Workflow {
  name: string;
  description: string;
}

interface WorkflowSelectorProps {
  selected: string;
  onSelect: (name: string) => void;
}

export function WorkflowSelector({ selected, onSelect }: WorkflowSelectorProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  useEffect(() => {
    fetch("/api/workflows")
      .then((r) => r.json())
      .then(setWorkflows);
  }, []);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-400">分析工作流</label>
      <div className="grid grid-cols-1 gap-2">
        {workflows.map((wf) => (
          <button
            key={wf.name}
            onClick={() => onSelect(wf.name)}
            className={`text-left p-3 rounded-lg border transition-colors ${
              selected === wf.name
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            <div className="font-medium text-zinc-100">{wf.name}</div>
            <div className="text-xs mt-1">{wf.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
