import { Clock3 } from "lucide-react";
import { formatDateTime } from "@/lib/dashboard/format";

export function PageHeader({
  title,
  description,
  updatedAt,
  actions
}: {
  title: string;
  description: string;
  updatedAt?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="header-actions">
        {updatedAt ? <span className="updated"><Clock3 size={14} />更新于 {formatDateTime(updatedAt)}</span> : null}
        {actions}
      </div>
    </header>
  );
}

