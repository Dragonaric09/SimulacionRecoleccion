import { BookOpen, Cpu, Smile, Users, type LucideIcon } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tone } from "../shared/analyticsTypes";

const ICONS: Record<string, LucideIcon> = { hard: Cpu, soft: Users, satisfaccion: Smile, malla: BookOpen };

export type CompetenceGroupTab = { key: string; label: string; count?: number; disabled?: boolean };

/**
 * Selector de grupo de competencias (hard skills, soft skills…) de las dos pantallas de brechas. Va dentro de
 * un {@link Tabs}; el color activo es el de la sección.
 */
export function CompetenceGroupTabs({ tabs, tone }: { tabs: CompetenceGroupTab[]; tone: Tone }) {
  return (
    <TabsList
      variant="segmented"
      aria-label="Grupo de competencias"
      className={tone === "empleadores" ? "[--tabs-accent:var(--empleadores)]" : "[--tabs-accent:var(--titulados)]"}
    >
      {tabs.map((tab) => {
        const Icon = ICONS[tab.key];
        return (
          <TabsTrigger key={tab.key} value={tab.key} disabled={tab.disabled} className="group/tab">
            {Icon && <Icon aria-hidden="true" />}
            {tab.label}
            {tab.count !== undefined && (
              <span className="rounded-full bg-surface-container-low px-1.5 text-[11px] leading-5 font-semibold text-ink-600 tabular-nums group-data-active/tab:bg-white/20 group-data-active/tab:text-white">
                {tab.count}
              </span>
            )}
            {tab.disabled && <span className="text-[10px] tracking-wide uppercase">Próximamente</span>}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}
