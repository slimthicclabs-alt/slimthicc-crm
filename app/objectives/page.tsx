import Link from "next/link";
import { Owner, TaskCategory, TaskPriority, TaskStatus } from "@prisma/client";
import { CheckCircle2, Circle, Clock3, PlayCircle } from "lucide-react";
import { createObjectiveAction, updateObjectiveStatusAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";
import { endOfToday, formatDate, isOverdue, startOfToday } from "@/lib/date";
import {
  enumOptions,
  ownerLabels,
  priorityLabels,
  recurringLabels,
  taskCategoryLabels,
  taskStatusLabels
} from "@/lib/format";

type ObjectivesSearchParams = Promise<{
  owner?: string;
  category?: string;
}>;

export default async function ObjectivesPage({ searchParams }: { searchParams: ObjectivesSearchParams }) {
  const params = await searchParams;
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const owner = Object.values(Owner).includes(params.owner as Owner) ? (params.owner as Owner) : undefined;
  const category = Object.values(TaskCategory).includes(params.category as TaskCategory)
    ? (params.category as TaskCategory)
    : undefined;

  const where = {
    ...(owner ? { owner } : {}),
    ...(category ? { category } : {})
  };

  const [allTasks, contacts] = await Promise.all([
    prisma.objective.findMany({
      where,
      include: { contact: true },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { priority: "desc" }]
    }),
    prisma.contact.findMany({
      select: { id: true, name: true, company: true },
      orderBy: { name: "asc" }
    })
  ]);

  const openTasks = allTasks.filter((task) => task.status !== TaskStatus.DONE);
  const todaysTasks = openTasks.filter((task) => task.dueDate && task.dueDate <= todayEnd);
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < todayStart);
  const inProgressTasks = openTasks.filter((task) => task.status === TaskStatus.IN_PROGRESS);
  const completedTasks = allTasks.filter((task) => task.status === TaskStatus.DONE);

  return (
    <div>
      <PageHeader
        eyebrow="Daily Objectives"
        title="Ryan + Phil Checklist"
        description="Shared manual checklist for what has to happen today. Missed tasks stay visible in today’s work until someone marks them done."
        actions={
          <Link href="#new-task" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <CheckCircle2 className="h-4 w-4" />
            New task
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today" value={todaysTasks.length} detail="Due today or rolled over" icon={<Clock3 className="h-4 w-4" />} />
        <StatCard label="Overdue" value={overdueTasks.length} detail="Still open from prior days" />
        <StatCard label="In Progress" value={inProgressTasks.length} detail="Actively being handled" icon={<PlayCircle className="h-4 w-4" />} />
        <StatCard label="Completed" value={completedTasks.length} detail="Moved out of open work" icon={<CheckCircle2 className="h-4 w-4" />} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" action="/objectives">
                <Select name="owner" defaultValue={params.owner || ""}>
                  <option value="">All owners</option>
                  {Object.entries(ownerLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Select name="category" defaultValue={params.category || ""}>
                  <option value="">All categories</option>
                  {enumOptions(taskCategoryLabels).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Button type="submit">Filter</Button>
              </form>
            </CardContent>
          </Card>

          <TaskSection title="Today / Rolled Over" tasks={todaysTasks} tone="today" />
          <TaskSection title="Upcoming Open Work" tasks={openTasks.filter((task) => !task.dueDate || task.dueDate > todayEnd)} tone="open" />
          <TaskSection title="Completed" tasks={completedTasks} tone="done" />
        </div>

        <Card id="new-task">
          <CardHeader>
            <CardTitle>Add Objective</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createObjectiveAction} className="grid gap-4">
              <Label>
                Title
                <Input name="title" required placeholder="Call buyer, count inventory, prep content..." />
              </Label>
              <Label>
                Description
                <Textarea name="description" placeholder="Details, context, or the exact win condition" />
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Label>
                  Owner
                  <Select name="owner" defaultValue="BOTH">
                    {Object.entries(ownerLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  Priority
                  <Select name="priority" defaultValue="MEDIUM">
                    {enumOptions(priorityLabels).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Label>
                  Status
                  <Select name="status" defaultValue="NOT_STARTED">
                    {enumOptions(taskStatusLabels).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  Due Date
                  <Input name="dueDate" type="date" />
                </Label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Label>
                  Recurring
                  <Select name="recurring" defaultValue="NONE">
                    {enumOptions(recurringLabels).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  Category
                  <Select name="category" defaultValue="OPS">
                    {enumOptions(taskCategoryLabels).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Label>
              </div>
              <Label>
                Link Contact
                <Select name="contactId" defaultValue="">
                  <option value="">No linked contact</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                      {contact.company ? ` · ${contact.company}` : ""}
                    </option>
                  ))}
                </Select>
              </Label>
              <Button type="submit">Create objective</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

type ObjectiveWithContact = {
  id: string;
  title: string;
  description: string | null;
  owner: Owner;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date | null;
  category: TaskCategory;
  contact?: { id: string; name: string; company: string | null } | null;
};

function TaskSection({
  title,
  tasks,
  tone
}: {
  title: string;
  tasks: ObjectiveWithContact[];
  tone: "today" | "open" | "done";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length ? (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-md border p-4 ${
                tone === "today" && isOverdue(task.dueDate)
                  ? "border-rose-500/30 bg-rose-500/5"
                  : "border-border bg-secondary/30"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {task.status === TaskStatus.DONE ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <p className="font-semibold">{task.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {taskCategoryLabels[task.category]} · {ownerLabels[task.owner]} · {formatDate(task.dueDate)}
                  </p>
                  {task.contact ? (
                    <Link href={`/crm/${task.contact.id}`} className="mt-1 block text-sm font-semibold text-primary">
                      Linked to {task.contact.name}
                    </Link>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={task.priority === "HIGH" ? "danger" : task.priority === "MEDIUM" ? "warning" : "secondary"}>
                    {priorityLabels[task.priority]}
                  </Badge>
                  <Badge variant={task.status === "DONE" ? "success" : isOverdue(task.dueDate) ? "danger" : "outline"}>
                    {taskStatusLabels[task.status]}
                  </Badge>
                </div>
              </div>
              {task.description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{task.description}</p> : null}
              {task.status !== TaskStatus.DONE ? (
                <form action={updateObjectiveStatusAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={task.id} />
                  <Button type="submit" name="status" value="NOT_STARTED" variant="outline" size="sm">
                    Not started
                  </Button>
                  <Button type="submit" name="status" value="IN_PROGRESS" variant="outline" size="sm">
                    In progress
                  </Button>
                  <Button type="submit" name="status" value="DONE" size="sm">
                    Done
                  </Button>
                </form>
              ) : null}
            </div>
          ))
        ) : (
          <EmptyState title={`No ${title.toLowerCase()}`} body="Nothing to show here yet." />
        )}
      </CardContent>
    </Card>
  );
}
