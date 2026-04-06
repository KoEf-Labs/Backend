import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean
  await prisma.project.deleteMany();

  // Seed
  const project = await prisma.project.create({
    data: {
      userId: "test-user-001",
      theme: "startup-1",
      subdomain: "mysite",
      contentJson: {
        hero: { title: "Welcome", subtitle: "My first website" },
        about: { title: "About Us", description: "We build things" },
        sections: { hero: true, about: true, services: false, references: false, careers: false, contact: true },
      },
    },
  });

  console.log("Seeded project:", project.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
