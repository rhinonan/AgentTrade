"use client";
import { Input } from "@/components/ui/input";

interface StockSearchInputProps {
  value: string;
  onChange: (code: string) => void;
}

export function StockSearchInput({ value, onChange }: StockSearchInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-400">股票代码</label>
      <Input
        placeholder="输入股票代码，如 600519"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-900 border-zinc-700 text-zinc-100 text-lg h-12"
      />
    </div>
  );
}
