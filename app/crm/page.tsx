import Link from "next/link";
import { ContactType, PipelineStatus, TaskStatus } from "@prisma/client";
import { Plus, Search, UserRoundPlus } from "lucide-react";
import { createContactAction } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";
import { endOfToday, formatDate, startOfToday } from "@/lib/date";
import {
  contactTypeLabels,
  enumOptions,
  money,
  ownerLabels,
  pipelineLabels
} from "@/lib/format";

type CrmSearchParams = Promise<{
  q?: string;
  status?: string;
  type?: string;
}>;

export default async function CrmPage({ searchParams }: { searchParams: CrmSearchParams }) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const status = params.status as PipelineStatus | undefined;
  const type = params.type as ContactType | undefined;
  const todayStart = startOfToday();

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { company: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
            { socialHandle: { contains: q, mode: "insensitive" as const } },
            { location: { contains: q, mode: "insensitive" as const } },
            { notes: { contains: q, mode: "insensitive" as const } }
          ]
        }
      : {}),
    ...(status && Object.values(PipelineStatus).includes(status) ? { status } : {}),
    ...(type && Object.values(ContactType).includes(type) ? { type } : {})
  };

  const [contacts, statusCounts, followUpsToday, overdueFollowUps, openDeals] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        deal: true,
        interactions: { orderBy: { occurredAt: "desc" }, take: 1 },
        tasks: { where: { status: { not: TaskStatus.DONE } }, orderBy: { dueDate: "asc" }, take: 3 }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.contact.groupBy({
      by: ["status"],
      _count: { status: true }
    }),
    prisma.contact.count({
      where: {
        nextFollowUpAt: { gte: todayStart, lte: endOfToday() },
        status: { notIn: [PipelineStatus.WON, PipelineStatus.LOST] }
      }
    }),
    prisma.contact.count({
      where: {
        nextFollowUpAt: { lt: todayStart },
        status: { notIn: [PipelineStatus.WON, PipelineStatus.LOST] }
      }
    }),
    prisma.deal.count({
      where: {
        contact: { status: { notIn: [PipelineStatus.WON, PipelineStatus.LOST] } }
      }
    })
  ]);

  const statusCountMap = Object.fromEntries(statusCounts.map((item) => [item.status, item._count.status]));

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Relationships Pipeline"
        description="Track customers, wholesale leads, gym/store buyers, creators, suppliers, manufacturers, and vendors with clear owners and next steps."
        actions={
          <Link href="#new-contact" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New contact
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Contacts" value={contacts.length} detail="Matching current view" icon={<UserRoundPlus className="h-4 w-4" />} />
        <StatCard label="Follow-ups today" value={followUpsToday} detail="Needs a touch today" />
        <StatCard label="Overdue follow-ups" value={overdueFollowUps} detail="Bring these back to life" />
        <StatCard label="Open deals" value={openDeals} detail="Wholesale deal records" />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <form className="grid gap-3 md:grid-cols-[1fr_200px_220px_auto]" action="/crm">
                <Label className="normal-case tracking-normal">
                  <span className="sr-only">Search</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input name="q" defaultValue={q} placeholder="Search name, company, handle, location, notes" className="pl-9" />
                  </div>
                </Label>
                <Select name="status" defaultValue={status || ""}>
                  <option value="">All statuses</option>
                  {enumOptions(pipelineLabels).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select name="type" defaultValue={type || ""}>
                  <option value="">All contact types</option>
                  {enumOptions(contactTypeLabels).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Button type="submit">Filter</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline Board</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {enumOptions(pipelineLabels).map((statusOption) => (
                  <Link
                    href={`/crm?status=${statusOption.value}`}
                    key={statusOption.value}
                    className="rounded-md border border-border bg-secondary/40 p-3 hover:bg-secondary"
                  >
                    <p className="text-sm font-semibold">{statusOption.label}</p>
                    <p className="mt-2 text-2xl font-black">{statusCountMap[statusOption.value] || 0}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {contacts.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Next Follow-Up</TableHead>
                      <TableHead>Deal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <Link href={`/crm/${contact.id}`} className="font-semibold text-foreground hover:text-primary">
                            {contact.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">{contact.company || contact.location || "No company"}</p>
                          {contact.tags.length ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {contact.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>{contactTypeLabels[contact.type]}</TableCell>
                        <TableCell>{ownerLabels[contact.owner]}</TableCell>
                        <TableCell>
                          <Badge variant={contact.status === PipelineStatus.WON ? "success" : contact.status === PipelineStatus.LOST ? "danger" : "default"}>
                            {pipelineLabels[contact.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={contact.nextFollowUpAt && contact.nextFollowUpAt < todayStart ? "text-rose-300" : ""}>
                            {formatDate(contact.nextFollowUpAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {contact.deal ? (
                            <span>
                              {money(contact.deal.expectedRevenue?.toString())}
                              <span className="block text-xs text-muted-foreground">{contact.deal.probability}% probability</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No deal</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title="No contacts match" body="Clear the filters or add a new SlimThicc relationship." />
              )}
            </CardContent>
          </Card>
        </div>

        <Card id="new-contact">
          <CardHeader>
            <CardTitle>Add Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createContactAction} className="grid gap-4">
              <Label>
                Name
                <Input name="name" required placeholder="Buyer, creator, supplier, customer" />
              </Label>
              <Label>
                Company
                <Input name="company" placeholder="Store, gym, manufacturer, brand" />
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Label>
                  Email
                  <Input name="email" type="email" />
                </Label>
                <Label>
                  Phone
                  <Input name="phone" />
                </Label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Label>
                  Instagram/TikTok
                  <Input name="socialHandle" placeholder="@handle" />
                </Label>
                <Label>
                  Location
                  <Input name="location" placeholder="City, State" />
                </Label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Label>
                  Contact Type
                  <Select name="type" defaultValue={ContactType.WHOLESALE_LEAD}>
                    {enumOptions(contactTypeLabels).map((option) => (
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
              </div>
              <Label>
                Status
                <Select name="status" defaultValue={PipelineStatus.NEW_LEAD}>
                  {enumOptions(pipelineLabels).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                Tags
                <Input name="tags" placeholder="wholesale, hot, gym, nyc" />
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Label>
                  Last Contacted
                  <Input name="lastContactedAt" type="date" />
                </Label>
                <Label>
                  Next Follow-Up
                  <Input name="nextFollowUpAt" type="date" />
                </Label>
              </div>
              <Label>
                Notes
                <Textarea name="notes" placeholder="Context, objections, samples, next move" />
              </Label>

              <div className="rounded-md border border-border bg-secondary/40 p-4">
                <p className="text-sm font-semibold">Wholesale Deal Tracking</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Label>
                    Monthly Order Size
                    <Input name="potentialMonthlyOrderSize" type="number" min="0" placeholder="Units" />
                  </Label>
                  <Label>
                    Case Quantity
                    <Input name="caseQuantity" type="number" min="0" />
                  </Label>
                  <Label>
                    Expected Revenue
                    <Input name="expectedRevenue" type="number" min="0" step="0.01" />
                  </Label>
                  <Label>
                    Probability
                    <Input name="probability" type="number" min="0" max="100" placeholder="25" />
                  </Label>
                  <Label className="sm:col-span-2">
                    Estimated Close Date
                    <Input name="estimatedCloseDate" type="date" />
                  </Label>
                </div>
              </div>

              <Button type="submit">Create contact</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
