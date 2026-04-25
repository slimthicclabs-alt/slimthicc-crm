import { NoteCategory } from "@prisma/client";
import { Pin, Search, StickyNote } from "lucide-react";
import { createNoteAction, toggleNotePinnedAction } from "@/app/actions";
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
import { formatDateTime } from "@/lib/date";
import { enumOptions, noteCategoryLabels, ownerLabels } from "@/lib/format";

type NotesSearchParams = Promise<{
  q?: string;
  view?: string;
}>;

const boardViews = [
  { label: "All Notes", value: "all" },
  { label: "Pinned", value: "pinned" },
  { label: "Marketing", value: NoteCategory.MARKETING },
  { label: "Inventory", value: NoteCategory.INVENTORY },
  { label: "Product Ideas", value: NoteCategory.PRODUCT_IDEAS },
  { label: "Supplier", value: NoteCategory.SUPPLIER },
  { label: "Wholesale", value: NoteCategory.WHOLESALE },
  { label: "Random Ideas", value: NoteCategory.RANDOM_IDEAS }
];

export default async function NotesPage({ searchParams }: { searchParams: NotesSearchParams }) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const view = params.view || "all";

  const notes = await prisma.note.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { body: { contains: q, mode: "insensitive" as const } },
              { tags: { has: q } }
            ]
          }
        : {}),
      ...(view === "pinned" ? { pinned: true } : {}),
      ...(Object.values(NoteCategory).includes(view as NoteCategory) ? { category: view as NoteCategory } : {})
    },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }]
  });

  const pinnedCount = await prisma.note.count({ where: { pinned: true } });

  return (
    <div>
      <PageHeader
        eyebrow="Notes Board"
        title="Shared Brain"
        description="Clean cards for marketing thoughts, inventory notes, supplier details, wholesale ideas, product concepts, and random sparks."
        actions={
          <a href="#new-note" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <StickyNote className="h-4 w-4" />
            New note
          </a>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Visible notes" value={notes.length} detail="Matching current view" />
        <StatCard label="Pinned" value={pinnedCount} detail="High-signal notes" icon={<Pin className="h-4 w-4" />} />
        <StatCard label="Views" value={boardViews.length} detail="Board filters" />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <form action="/notes" className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input name="q" defaultValue={q} placeholder="Search notes, ideas, tags" className="pl-9" />
                </div>
                <Select name="view" defaultValue={view}>
                  {boardViews.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
                <Button type="submit">Filter</Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {notes.length ? (
              notes.map((note) => (
                <Card key={note.id} className={note.pinned ? "border-primary/40" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{note.title}</CardTitle>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {noteCategoryLabels[note.category]} · {ownerLabels[note.owner]} · Updated {formatDateTime(note.updatedAt)}
                        </p>
                      </div>
                      <form action={toggleNotePinnedAction}>
                        <input type="hidden" name="id" value={note.id} />
                        <input type="hidden" name="pinned" value={String(note.pinned)} />
                        <Button type="submit" variant={note.pinned ? "default" : "outline"} size="icon" title={note.pinned ? "Unpin note" : "Pin note"}>
                          <Pin className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{note.body}</p>
                    {note.tags.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {note.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="md:col-span-2">
                <EmptyState title="No notes yet" body="Add the first note for SlimThicc’s shared brain." />
              </div>
            )}
          </div>
        </div>

        <Card id="new-note">
          <CardHeader>
            <CardTitle>Add Note</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createNoteAction} className="grid gap-4">
              <Label>
                Title
                <Input name="title" required placeholder="Idea, supplier note, wholesale angle..." />
              </Label>
              <Label>
                Body
                <Textarea name="body" required placeholder="Write the note here" />
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Label>
                  Category
                  <Select name="category" defaultValue={NoteCategory.RANDOM_IDEAS}>
                    {enumOptions(noteCategoryLabels).map((option) => (
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
                Tags
                <Input name="tags" placeholder="launch, supplier, idea" />
              </Label>
              <label className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                <input name="pinned" type="checkbox" className="h-4 w-4 rounded border-border bg-background" />
                Pin this note
              </label>
              <Button type="submit">Create note</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
