import {
  ContactType,
  InteractionType,
  NoteCategory,
  Owner,
  PipelineStatus,
  PrismaClient,
  TaskCategory,
  TaskPriority,
  TaskRecurring,
  TaskStatus
} from "@prisma/client";

const prisma = new PrismaClient();

function addDays(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

async function main() {
  await prisma.interaction.deleteMany();
  await prisma.objective.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.note.deleteMany();
  await prisma.contact.deleteMany();

  const gymBuyer = await prisma.contact.create({
    data: {
      name: "Maya Torres",
      company: "Glow Market",
      email: "maya@glowmarket.com",
      phone: "(212) 555-0194",
      socialHandle: "@glowmarket",
      location: "New York, NY",
      type: ContactType.GYM_STORE_BUYER,
      owner: Owner.RYAN,
      status: PipelineStatus.NEGOTIATING,
      tags: ["wholesale", "hot", "nyc"],
      notes: "Interested in SlimThicc display set. Wants pricing and margin sheet.",
      lastContactedAt: addDays(-1),
      nextFollowUpAt: addDays(0),
      deal: {
        create: {
          potentialMonthlyOrderSize: 320,
          caseQuantity: 12,
          expectedRevenue: "4200.00",
          probability: 70,
          estimatedCloseDate: addDays(14)
        }
      }
    }
  });

  const creator = await prisma.contact.create({
    data: {
      name: "Jada Flex",
      company: "Creator",
      email: "jada@example.com",
      socialHandle: "@jadaflex",
      location: "Los Angeles, CA",
      type: ContactType.INFLUENCER_CREATOR,
      owner: Owner.PHIL,
      status: PipelineStatus.SAMPLE_SENT,
      tags: ["creator", "fitness", "ugc"],
      notes: "Send sample follow-up and ask for rate card.",
      lastContactedAt: addDays(-3),
      nextFollowUpAt: addDays(1)
    }
  });

  const supplier = await prisma.contact.create({
    data: {
      name: "Leo Chen",
      company: "Pacific Pack Co.",
      email: "leo@pacificpack.com",
      phone: "(323) 555-0162",
      location: "Los Angeles, CA",
      type: ContactType.SUPPLIER_MANUFACTURER,
      owner: Owner.BOTH,
      status: PipelineStatus.CONTACTED,
      tags: ["supplier", "packaging"],
      notes: "Ask about MOQ, lead times, and matte label options.",
      lastContactedAt: addDays(-7),
      nextFollowUpAt: addDays(-1)
    }
  });

  await prisma.interaction.createMany({
    data: [
      {
        contactId: gymBuyer.id,
        type: InteractionType.SENT_PRICING,
        owner: Owner.RYAN,
        summary: "Sent wholesale pricing and starter display breakdown.",
        occurredAt: addDays(-1)
      },
      {
        contactId: creator.id,
        type: InteractionType.SENT_SAMPLE,
        owner: Owner.PHIL,
        summary: "Sample shipped. Follow up for first impression and usage timeline.",
        occurredAt: addDays(-3)
      },
      {
        contactId: supplier.id,
        type: InteractionType.EMAILED,
        owner: Owner.BOTH,
        summary: "Requested MOQ, packaging samples, and current lead time.",
        occurredAt: addDays(-7)
      }
    ]
  });

  await prisma.objective.createMany({
    data: [
      {
        contactId: gymBuyer.id,
        title: "Follow up with Glow Market",
        description: "Ask if pricing works and push for sample counter placement.",
        owner: Owner.RYAN,
        priority: TaskPriority.HIGH,
        status: TaskStatus.NOT_STARTED,
        dueDate: addDays(0),
        recurring: TaskRecurring.NONE,
        category: TaskCategory.WHOLESALE
      },
      {
        title: "Review Amazon listing bullets",
        description: "Tighten claims and make benefits clearer before next content pass.",
        owner: Owner.PHIL,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.IN_PROGRESS,
        dueDate: addDays(0),
        recurring: TaskRecurring.NONE,
        category: TaskCategory.AMAZON
      },
      {
        contactId: supplier.id,
        title: "Get supplier lead time confirmation",
        description: "This rolled over because the supplier has not replied.",
        owner: Owner.BOTH,
        priority: TaskPriority.HIGH,
        status: TaskStatus.NOT_STARTED,
        dueDate: addDays(-1),
        recurring: TaskRecurring.NONE,
        category: TaskCategory.INVENTORY
      }
    ]
  });

  await prisma.note.createMany({
    data: [
      {
        title: "Retail pitch angle",
        body: "Lead with counter-friendly display, strong repeat purchase potential, and creator demand.",
        category: NoteCategory.WHOLESALE,
        tags: ["pitch", "retail"],
        owner: Owner.BOTH,
        pinned: true
      },
      {
        title: "Creator brief idea",
        body: "Ask creators to show before/after gym bag routine, not just a product hold-up.",
        category: NoteCategory.MARKETING,
        tags: ["ugc", "creator"],
        owner: Owner.PHIL,
        pinned: false
      },
      {
        title: "New flavor concept",
        body: "Explore limited drop that feels loud, gym-coded, and fun without looking cheap.",
        category: NoteCategory.PRODUCT_IDEAS,
        tags: ["product", "limited"],
        owner: Owner.RYAN,
        pinned: false
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
