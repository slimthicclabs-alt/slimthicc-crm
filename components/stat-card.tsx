import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  detail,
  icon
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-black">{value}</p>
          </div>
          {icon ? <div className="rounded-md border border-border bg-secondary p-2 text-primary">{icon}</div> : null}
        </div>
        {detail ? <p className="mt-3 text-sm text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
