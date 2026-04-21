export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/15 text-foreground",
  accepted: "bg-primary-soft text-primary",
  rejected: "bg-destructive/10 text-destructive",
  completed: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground",
};
