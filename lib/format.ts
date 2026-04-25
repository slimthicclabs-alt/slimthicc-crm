import {
  ContactType,
  InteractionType,
  NoteCategory,
  Owner,
  PipelineStatus,
  TaskCategory,
  TaskPriority,
  TaskRecurring,
  TaskStatus
} from "@prisma/client";

export function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function money(value?: number | string | null) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number.isFinite(number) ? number : 0);
}

export const ownerLabels: Record<Owner, string> = {
  RYAN: "Ryan",
  PHIL: "Phil",
  BOTH: "Both"
};

export const contactTypeLabels: Record<ContactType, string> = {
  CUSTOMER: "Customer",
  WHOLESALE_LEAD: "Wholesale Lead",
  GYM_STORE_BUYER: "Gym/Store Buyer",
  INFLUENCER_CREATOR: "Influencer/Creator",
  SUPPLIER_MANUFACTURER: "Supplier/Manufacturer",
  VENDOR: "Vendor"
};

export const pipelineLabels: Record<PipelineStatus, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  SAMPLE_SENT: "Sample Sent",
  FOLLOW_UP_NEEDED: "Follow-Up Needed",
  NEGOTIATING: "Negotiating",
  WON: "Won",
  LOST: "Lost"
};

export const interactionLabels: Record<InteractionType, string> = {
  CALLED: "Called",
  EMAILED: "Emailed",
  DMD: "DM'd",
  SENT_SAMPLE: "Sent Sample",
  SENT_PRICING: "Sent Pricing",
  FOLLOWED_UP: "Followed Up",
  CLOSED_DEAL: "Closed Deal",
  CUSTOM_NOTE: "Custom Note"
};

export const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High"
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  DONE: "Done"
};

export const recurringLabels: Record<TaskRecurring, string> = {
  NONE: "None",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly"
};

export const taskCategoryLabels: Record<TaskCategory, string> = {
  SALES: "Sales",
  INVENTORY: "Inventory",
  AMAZON: "Amazon",
  SHOPIFY: "Shopify",
  WHOLESALE: "Wholesale",
  MARKETING: "Marketing",
  OPS: "Ops"
};

export const noteCategoryLabels: Record<NoteCategory, string> = {
  MARKETING: "Marketing",
  INVENTORY: "Inventory",
  PRODUCT_IDEAS: "Product Ideas",
  SUPPLIER: "Supplier",
  WHOLESALE: "Wholesale",
  AMAZON: "Amazon",
  SHOPIFY: "Shopify",
  RANDOM_IDEAS: "Random Ideas"
};

export function splitTags(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function enumOptions<T extends string>(labels: Record<T, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label: label as string }));
}
