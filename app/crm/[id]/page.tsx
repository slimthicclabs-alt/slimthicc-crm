import Link from "next/link";
import { notFound } from "next/navigation";
import { InteractionType } from "@prisma/client";
import { ArrowLeft, CalendarClock, MessageSquarePlus, Save } from "lucide-react";
import {
  createInteractionAction,
  createLinkedObjectiveAction,
  updateContactAction,
  updateObjectiveStatusAction
} from "@/app/actions";
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
import { formatDate, formatDateTime, isOverdue, toDateInput } from "@/lib/date";
import {
  contactTypeLabels,
  enumOptions,
  interactionLabels,
  money,
  ownerLabels,
  pipelineLabels,
  priorityLabels,
  recurringLabels,
  taskCategoryLabels,
  taskStatusLabels
} from "@/lib/format";

type ContactDetailParams = Promise<{ id: string }>;

export default async function ContactDetailPage({ params }: { params: ContactDetailParams }) {
  const { id } = await params;
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      deal: true,
      interactions: { orderBy: { occurredAt: "desc" } },
      tasks: { orderBy: [{ status: "asc" }, { dueDate: "asc" }] }
    }
  });

  if (!contact) notFound();

  const updateContact = updateContactAction.bind(null, contact.id);
  const createInteraction = createInteractionAction.bind(null, contact.id);
  const linkedTaskAction = createLinkedObjectiveAction.bind(null, contact.id);

  const openTasks = contact.tasks.filter((task) => task.status !== "DONE");
  const completedTasks = contact.tasks.filter((task) => task.status === "DONE");

  return (
    <div>
      <PageHeader
        eyebrow="Contact Record"
        title={contact.name}
        description={`${contact.company || contactTypeLabels[contact.type]} · ${ownerLabels[contact.owner]} · ${pipelineLabels[contact.status]}`}
        actions={
          <Link href="/crm" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
            Back to CRM
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pipeline Status" value={pipelineLabels[contact.status]} detail={contactTypeLabels[contact.type]} />
        <StatCard label="Next Follow-Up" value={formatDate(contact.nextFollowUpAt)} detail={isOverdue(contact.nextFollowUpAt) ? "Overdue" : "Scheduled"} icon={<CalendarClock className="h-4 w-4" />} />
        <StatCard label="Interactions" value={contact.interactions.length} detail="Logged timeline events" icon={<MessageSquarePlus className="h-4 w-4" />} />
        <StatCard label="Open Tasks" value={openTasks.length} detail={`${completedTasks.length} completed`} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Edit Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateContact} className="grid gap-4">
                <Label>
                  Name
                  <Input name="name" defaultValue={contact.name} required />
                </Label>
                <Label>
                  Company
                  <Input name="company" defaultValue={contact.company || ""} />
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Label>
                    Email
                    <Input name="email" type="email" defaultValue={contact.email || ""} />
                  </Label>
                  <Label>
                    Phone
                    <Input name="phone" defaultValue={contact.phone || ""} />
                  </Label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Label>
                    Instagram/TikTok
                    <Input name="socialHandle" defaultValue={contact.socialHandle || ""} />
                  </Label>
                  <Label>
                    Location
                    <Input name="location" defaultValue={contact.location || ""} />
                  </Label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Label>
                    Type
                    <Select name="type" defaultValue={contact.type}>
                      {enumOptions(contactTypeLabels).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Label>
                  <Label>
                    Owner
                    <Select name="owner" defaultValue={contact.owner}>
                      {Object.entries(ownerLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Label>
                </div>
                <Label>
                  Status
                  <Select name="status" defaultValue={contact.status}>
                    {enumOptions(pipelineLabels).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Label>
                  Tags
                  <Input name="tags" defaultValue={contact.tags.join(", ")} />
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Label>
                    Last Contacted
                    <Input name="lastContactedAt" type="date" defaultValue={toDateInput(contact.lastContactedAt)} />
                  </Label>
                  <Label>
                    Next Follow-Up
                    <Input name="nextFollowUpAt" type="date" defaultValue={toDateInput(contact.nextFollowUpAt)} />
                  </Label>
                </div>
                <Label>
                  Notes
                  <Textarea name="notes" defaultValue={contact.notes || ""} />
                </Label>

                <div className="rounded-md border border-border bg-secondary/40 p-4">
                  <p className="text-sm font-semibold">Wholesale Deal</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Label>
                      Monthly Order Size
                      <Input name="potentialMonthlyOrderSize" type="number" defaultValue={contact.deal?.potentialMonthlyOrderSize || ""} />
                    </Label>
                    <Label>
                      Case Quantity
                      <Input name="caseQuantity" type="number" defaultValue={contact.deal?.caseQuantity || ""} />
                    </Label>
                    <Label>
                      Expected Revenue
                      <Input name="expectedRevenue" type="number" step="0.01" defaultValue={contact.deal?.expectedRevenue?.toString() || ""} />
                    </Label>
                    <Label>
                      Probability
                      <Input name="probability" type="number" min="0" max="100" defaultValue={contact.deal?.probability || ""} />
                    </Label>
                    <Label className="sm:col-span-2">
                      Estimated Close Date
                      <Input name="estimatedCloseDate" type="date" defaultValue={toDateInput(contact.deal?.estimatedCloseDate)} />
                    </Label>
                  </div>
                  {contact.deal ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Current expected revenue: {money(contact.deal.expectedRevenue?.toString())}
                    </p>
                  ) : null}
                </div>

                <Button type="submit">
                  <Save className="h-4 w-4" />
                  Save contact
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interaction Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createInteraction} className="mb-5 grid gap-3 rounded-md border border-border bg-secondary/40 p-4 md:grid-cols-2">
                <Label>
                  Type
                  <Select name="type" defaultValue={InteractionType.CUSTOM_NOTE}>
                    {enumOptions(interactionLabels).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Label>
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
                  Date
                  <Input name="occurredAt" type="date" />
                </Label>
                <Label className="md:col-span-2">
                  Summary
                  <Textarea name="summary" required placeholder="What happened? What is the next move?" />
                </Label>
                <Button type="submit" className="md:col-span-2">Add interaction</Button>
              </form>

              <div className="space-y-3">
                {contact.interactions.length ? (
                  contact.interactions.map((interaction) => (
                    <div key={interaction.id} className="rounded-md border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Badge>{interactionLabels[interaction.type]}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {ownerLabels[interaction.owner]} · {formatDateTime(interaction.occurredAt)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-foreground">{interaction.summary}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No interactions yet" body="Log calls, emails, DMs, samples, pricing, follow-ups, and custom notes here." />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Linked Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={linkedTaskAction} className="mb-5 grid gap-3 rounded-md border border-border bg-secondary/40 p-4 md:grid-cols-2">
                <Label className="md:col-span-2">
                  Title
                  <Input name="title" required placeholder={`Next step for ${contact.name}`} />
                </Label>
                <Label className="md:col-span-2">
                  Description
                  <Textarea name="description" />
                </Label>
                <Label>
                  Owner
                  <Select name="owner" defaultValue={contact.owner}>
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
                <input type="hidden" name="status" value="NOT_STARTED" />
                <Label>
                  Due Date
                  <Input name="dueDate" type="date" />
                </Label>
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
                <Label className="md:col-span-2">
                  Category
                  <Select name="category" defaultValue="SALES">
                    {enumOptions(taskCategoryLabels).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Label>
                <Button type="submit" className="md:col-span-2">Add linked task</Button>
              </form>

              <div className="space-y-3">
                {openTasks.length ? (
                  openTasks.map((task) => (
                    <div key={task.id} className="rounded-md border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{task.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {taskCategoryLabels[task.category]} · {formatDate(task.dueDate)}
                          </p>
                        </div>
                        <Badge variant={isOverdue(task.dueDate) ? "danger" : "secondary"}>
                          {taskStatusLabels[task.status]}
                        </Badge>
                      </div>
                      {task.description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{task.description}</p> : null}
                      <form action={updateObjectiveStatusAction} className="mt-3 flex gap-2">
                        <input type="hidden" name="id" value={task.id} />
                        <Button type="submit" name="status" value="IN_PROGRESS" variant="outline" size="sm">
                          In progress
                        </Button>
                        <Button type="submit" name="status" value="DONE" size="sm">
                          Done
                        </Button>
                      </form>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No open tasks" body="Add a task so the relationship has a clear next action." />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
