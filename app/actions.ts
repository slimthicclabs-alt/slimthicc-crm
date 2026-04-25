"use server";

import {
  ContactType,
  InteractionType,
  NoteCategory,
  Owner,
  PipelineStatus,
  Prisma,
  TaskCategory,
  TaskPriority,
  TaskRecurring,
  TaskStatus
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { splitTags } from "@/lib/format";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function optionalDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(`${value}T12:00:00`) : null;
}

function numberOrNull(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function enumValue<T extends string>(formData: FormData, key: string, fallback: T) {
  return (text(formData, key) || fallback) as T;
}

function dealFromForm(formData: FormData) {
  const potentialMonthlyOrderSize = numberOrNull(formData, "potentialMonthlyOrderSize");
  const caseQuantity = numberOrNull(formData, "caseQuantity");
  const expectedRevenue = numberOrNull(formData, "expectedRevenue");
  const probability = numberOrNull(formData, "probability");
  const estimatedCloseDate = optionalDate(formData, "estimatedCloseDate");

  const hasDeal =
    potentialMonthlyOrderSize !== null ||
    caseQuantity !== null ||
    expectedRevenue !== null ||
    probability !== null ||
    estimatedCloseDate !== null;

  if (!hasDeal) return null;

  return {
    potentialMonthlyOrderSize,
    caseQuantity,
    expectedRevenue: expectedRevenue === null ? null : new Prisma.Decimal(expectedRevenue),
    probability: probability ?? 25,
    estimatedCloseDate
  };
}

export async function createContactAction(formData: FormData) {
  const deal = dealFromForm(formData);
  const contact = await prisma.contact.create({
    data: {
      name: text(formData, "name"),
      company: optionalText(formData, "company"),
      email: optionalText(formData, "email"),
      phone: optionalText(formData, "phone"),
      socialHandle: optionalText(formData, "socialHandle"),
      location: optionalText(formData, "location"),
      type: enumValue<ContactType>(formData, "type", ContactType.CUSTOMER),
      owner: enumValue<Owner>(formData, "owner", Owner.BOTH),
      status: enumValue<PipelineStatus>(formData, "status", PipelineStatus.NEW_LEAD),
      tags: splitTags(formData.get("tags")),
      notes: optionalText(formData, "notes"),
      lastContactedAt: optionalDate(formData, "lastContactedAt"),
      nextFollowUpAt: optionalDate(formData, "nextFollowUpAt"),
      deal: deal ? { create: deal } : undefined
    }
  });

  revalidatePath("/");
  revalidatePath("/crm");
  redirect(`/crm/${contact.id}`);
}

export async function updateContactAction(contactId: string, formData: FormData) {
  const deal = dealFromForm(formData);

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      name: text(formData, "name"),
      company: optionalText(formData, "company"),
      email: optionalText(formData, "email"),
      phone: optionalText(formData, "phone"),
      socialHandle: optionalText(formData, "socialHandle"),
      location: optionalText(formData, "location"),
      type: enumValue<ContactType>(formData, "type", ContactType.CUSTOMER),
      owner: enumValue<Owner>(formData, "owner", Owner.BOTH),
      status: enumValue<PipelineStatus>(formData, "status", PipelineStatus.NEW_LEAD),
      tags: splitTags(formData.get("tags")),
      notes: optionalText(formData, "notes"),
      lastContactedAt: optionalDate(formData, "lastContactedAt"),
      nextFollowUpAt: optionalDate(formData, "nextFollowUpAt"),
      deal: deal
        ? {
            upsert: {
              create: deal,
              update: deal
            }
          }
        : undefined
    }
  });

  revalidatePath("/");
  revalidatePath("/crm");
  revalidatePath(`/crm/${contactId}`);
}

export async function createInteractionAction(contactId: string, formData: FormData) {
  const occurredAt = optionalDate(formData, "occurredAt") ?? new Date();
  const type = enumValue<InteractionType>(formData, "type", InteractionType.CUSTOM_NOTE);

  await prisma.$transaction([
    prisma.interaction.create({
      data: {
        contactId,
        type,
        summary: text(formData, "summary"),
        owner: enumValue<Owner>(formData, "owner", Owner.BOTH),
        occurredAt
      }
    }),
    prisma.contact.update({
      where: { id: contactId },
      data: {
        lastContactedAt: occurredAt,
        status: type === InteractionType.SENT_SAMPLE ? PipelineStatus.SAMPLE_SENT : undefined
      }
    })
  ]);

  revalidatePath("/");
  revalidatePath("/crm");
  revalidatePath(`/crm/${contactId}`);
}

export async function createObjectiveAction(formData: FormData) {
  const contactId = optionalText(formData, "contactId");

  await prisma.objective.create({
    data: {
      contactId,
      title: text(formData, "title"),
      description: optionalText(formData, "description"),
      owner: enumValue<Owner>(formData, "owner", Owner.BOTH),
      priority: enumValue<TaskPriority>(formData, "priority", TaskPriority.MEDIUM),
      status: enumValue<TaskStatus>(formData, "status", TaskStatus.NOT_STARTED),
      dueDate: optionalDate(formData, "dueDate"),
      recurring: enumValue<TaskRecurring>(formData, "recurring", TaskRecurring.NONE),
      category: enumValue<TaskCategory>(formData, "category", TaskCategory.OPS)
    }
  });

  revalidatePath("/");
  revalidatePath("/objectives");
  if (contactId) revalidatePath(`/crm/${contactId}`);
}

export async function createLinkedObjectiveAction(contactId: string, formData: FormData) {
  formData.set("contactId", contactId);
  await createObjectiveAction(formData);
}

export async function updateObjectiveStatusAction(formData: FormData) {
  const id = text(formData, "id");
  const status = enumValue<TaskStatus>(formData, "status", TaskStatus.NOT_STARTED);

  await prisma.objective.update({
    where: { id },
    data: {
      status,
      completedAt: status === TaskStatus.DONE ? new Date() : null
    }
  });

  revalidatePath("/");
  revalidatePath("/objectives");
  revalidatePath("/crm");
}

export async function createNoteAction(formData: FormData) {
  await prisma.note.create({
    data: {
      title: text(formData, "title"),
      body: text(formData, "body"),
      category: enumValue<NoteCategory>(formData, "category", NoteCategory.RANDOM_IDEAS),
      tags: splitTags(formData.get("tags")),
      owner: enumValue<Owner>(formData, "owner", Owner.BOTH),
      pinned: formData.get("pinned") === "on"
    }
  });

  revalidatePath("/");
  revalidatePath("/notes");
}

export async function toggleNotePinnedAction(formData: FormData) {
  const id = text(formData, "id");
  const pinned = formData.get("pinned") === "true";

  await prisma.note.update({
    where: { id },
    data: { pinned: !pinned }
  });

  revalidatePath("/");
  revalidatePath("/notes");
}
