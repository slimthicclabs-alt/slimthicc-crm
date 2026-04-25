import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Flame,
  MessageSquarePlus,
  Plus,
  StickyNote,
  Users
} from "lucide-react";
import { PipelineStatus, TaskStatus } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { prisma } from "@/lib/prisma";
import { endOfToday, formatDate, formatDateTime, startOfToday } from "@/lib/date";
import {
  contactTypeLabels,
  interactionLabels,
  money,
  ownerLabels,
  pipelineLabels,
  taskCategoryLabels,
  taskStatusLabels
} from "@/lib/format";

export default async function DashboardPage() {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const [
    followUpsToday,
    overdueFollowUps,
    hotLeads,
    recentInteractions,
    openDeals,
    todaysObjectives,
    overdueObjectives,
    pinnedNotes,
    totalContacts,
    openObjectiveCount
  ] = await Promise.all([
    prisma.contact.findMany({
      where: {
        nextFollowUpAt: { gte: todayStart, lte: todayEnd },
        status: { notIn: [PipelineStatus.WON, PipelineStatus.LOST] }
      },
      orderBy: { nextFollowUpAt: "asc" },
      take: 8
    }),
    prisma.contact.findMany({
      where: {
        nextFollowUpAt: { lt: todayStart },
        status: { notIn: [PipelineStatus.WON, PipelineStatus.LOST] }
      },
      orderBy: { nextFollowUpAt: "asc" },
      take: 8
    }),
    prisma.contact.findMany({
      where: {
        status: {
          in: [
            PipelineStatus.INTERESTED,
            PipelineStatus.SAMPLE_SENT,
            PipelineStatus.FOLLOW_UP_NEEDED,
            PipelineStatus.NEGOTIATING
          ]
        }
      },
      include: { deal: true },
      orderBy: { updatedAt: "desc" },
      take: 8
    }),
    prisma.interaction.findMany({
      include: { contact: true },
      orderBy: { occurredAt: "desc" },
      take: 7
    }),
    prisma.deal.findMany({
      where: {
        contact: { status: { notIn: [PipelineStatus.WON, PipelineStatus.LOST] } }
      },
      include: { contact: true },
      orderBy: { updatedAt: "desc" },
      take: 7
    }),
    prisma.objective.findMany({
      where: {
        status: { not: TaskStatus.DONE },
        dueDate: { lte: todayEnd }
      },
      include: { contact: true },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 8
    }),
    prisma.objective.findMany({
      where: {
        status: { not: TaskStatus.DONE },
        dueDate: { lt: todayStart }
      },
      include: { contact: true },
      orderBy: { dueDate: "asc" },
      take: 8
    }),
    prisma.note.findMany({
      where: { pinned: true },
      orderBy: { updatedAt: "desc" },
      take: 6
    }),
    prisma.contact.count(),
    prisma.objective.count({ where: { status: { not: TaskStatus.DONE } } })
  ]);

  const expectedOpenRevenue = openDeals.reduce((total, deal) => total + Number(deal.expectedRevenue || 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Internal Ops"
        title="SlimThicc Command Center"
        description="A manual operating cockpit for Ryan and Phil to keep every lead, task, supplier, creator, and idea moving."
        actions={
          <>
            <Link href="/crm#new-contact" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              New contact
            </Link>
            <Link href="/objectives#new-task" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-accent">
              <CheckCircle2 className="h-4 w-4" />
              New task
            </Link>
            <Link href="/notes#new-note" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-accent">
              <StickyNote className="h-4 w-4" />
              New note
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Follow-ups today" value={followUpsToday.length} detail="Contacts due for a touch today" icon={<Clock3 className="h-4 w-4" />} />
        <StatCard label="Overdue follow-ups" value={overdueFollowUps.length} detail="Needs attention before it gets cold" icon={<Flame className="h-4 w-4" />} />
        <StatCard label="Open deals" value={openDeals.length} detail={money(expectedOpenRevenue)} icon={<CircleDollarSign className="h-4 w-4" />} />
        <StatCard label="Active tasks" value={openObjectiveCount} detail={`${totalContacts} contacts in the system`} icon={<Users className="h-4 w-4" />} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Follow-Up Radar</CardTitle>
            <Link href="/crm" className="text-sm font-semibold text-primary">
              CRM <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...overdueFollowUps, ...followUpsToday].length ? (
              [...overdueFollowUps, ...followUpsToday].map((contact) => (
                <Link
                  href={`/crm/${contact.id}`}
                  key={contact.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-border bg-secondary/50 p-3 hover:bg-secondary"
                >
                  <div>
                    <p className="font-semibold">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {contact.company || contactTypeLabels[contact.type]} · {ownerLabels[contact.owner]}
                    </p>
                  </div>
                  <Badge variant={contact.nextFollowUpAt && contact.nextFollowUpAt < todayStart ? "danger" : "warning"}>
                    {formatDate(contact.nextFollowUpAt)}
                  </Badge>
                </Link>
              ))
            ) : (
              <EmptyState title="No follow-ups due" body="Clean board. Add next follow-up dates to keep the system honest." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today’s Objectives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysObjectives.length ? (
              todaysObjectives.map((task) => (
                <div key={task.id} className="rounded-md border border-border bg-secondary/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{task.title}</p>
                    <Badge variant={task.dueDate && task.dueDate < todayStart ? "danger" : "secondary"}>
                      {taskStatusLabels[task.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {taskCategoryLabels[task.category]} · {ownerLabels[task.owner]} · {formatDate(task.dueDate)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState title="No objectives queued" body="Add today’s objectives so Ryan and Phil know what matters." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Hot Leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hotLeads.length ? (
              hotLeads.map((lead) => (
                <Link key={lead.id} href={`/crm/${lead.id}`} className="block rounded-md border border-border p-3 hover:bg-secondary">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{lead.name}</p>
                    <Badge>{pipelineLabels[lead.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lead.company || contactTypeLabels[lead.type]}
                    {lead.deal?.expectedRevenue ? ` · ${money(lead.deal.expectedRevenue.toString())}` : ""}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyState title="No hot leads yet" body="Interested, sample-sent, follow-up, and negotiating contacts show here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Interactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentInteractions.length ? (
              recentInteractions.map((interaction) => (
                <div key={interaction.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <MessageSquarePlus className="h-4 w-4 text-primary" />
                    <p className="font-semibold">{interactionLabels[interaction.type]}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{interaction.summary}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {interaction.contact?.name || "Unlinked"} · {formatDateTime(interaction.occurredAt)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState title="No interactions logged" body="Calls, DMs, samples, pricing, and notes will show here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pinned Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pinnedNotes.length ? (
              pinnedNotes.map((note) => (
                <Link key={note.id} href="/notes" className="block rounded-md border border-border p-3 hover:bg-secondary">
                  <p className="font-semibold">{note.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{note.body}</p>
                </Link>
              ))
            ) : (
              <EmptyState title="No pinned notes" body="Pin important ideas, supplier details, or launch notes." />
            )}
          </CardContent>
        </Card>
      </section>

      {overdueObjectives.length ? (
        <Card className="mt-6 border-rose-500/30">
          <CardHeader>
            <CardTitle>Overdue Objectives</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {overdueObjectives.map((task) => (
              <div key={task.id} className="rounded-md border border-rose-500/20 bg-rose-500/5 p-3">
                <p className="font-semibold">{task.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rolled into today · due {formatDate(task.dueDate)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
