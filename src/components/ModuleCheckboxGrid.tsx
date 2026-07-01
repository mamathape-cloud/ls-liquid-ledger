"use client";

import { ALL_MODULE_KEYS, APP_MODULES, type AppModuleKey } from "@/lib/modules";
import { Checkbox } from "@/components/ui/Checkbox";

interface ModuleCheckboxGridProps {
  selected: string[];
  onChange: (modules: string[]) => void;
}

export function ModuleCheckboxGrid({ selected, onChange }: ModuleCheckboxGridProps) {
  const toggle = (key: AppModuleKey) => {
    if (selected.includes(key)) {
      onChange(selected.filter((m) => m !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ALL_MODULE_KEYS.map((key) => (
        <Checkbox
          key={key}
          label={APP_MODULES[key].label}
          checked={selected.includes(key)}
          onChange={() => toggle(key)}
        />
      ))}
    </div>
  );
}
