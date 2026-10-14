import type { Workspace } from "./types";
import { today } from "./logic";
function offset(days: number) {
  const [y, m, d] = today().split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function createSeed(): Workspace {
  return {
    clients: [
      {
        id: "client-1",
        name: "Forma Objects",
        contact: "Maya Chen",
        email: "maya@forma.example",
        notes:
          "An independent furniture and objects studio. A quieter approach to everyday living.",
        archived: false,
      },
      {
        id: "client-2",
        name: "Northline Coffee",
        contact: "Alex Rivera",
        email: "alex@northline.example",
        notes:
          "Specialty coffee, thoughtfully sourced. Launching their second neighborhood location.",
        archived: false,
      },
      {
        id: "client-3",
        name: "The Good Journal",
        contact: "Sam Ellis",
        email: "sam@goodjournal.example",
        notes:
          "An independent publication about culture, craft and the spaces between.",
        archived: false,
      },
      {
        id: "client-4",
        name: "Fieldwork Studio",
        contact: "Jamie Park",
        email: "jamie@fieldwork.example",
        notes: "Landscape architecture with a considered, natural perspective.",
        archived: false,
      },
    ],
    projects: [
      {
        id: "project-1",
        clientId: "client-1",
        name: "A new identity for Forma",
        description:
          "A considered visual identity, from the first impression to the smallest detail. Brand strategy, identity system and a practical set of guidelines.",
        status: "In progress",
        budgetCents: 850000,
        deadline: offset(8),
        archived: false,
      },
      {
        id: "project-2",
        clientId: "client-2",
        name: "Northline, online",
        description:
          "A welcoming digital home for a neighborhood coffee brand. Design and development of a responsive website.",
        status: "In progress",
        budgetCents: 620000,
        deadline: offset(16),
        archived: false,
      },
      {
        id: "project-3",
        clientId: "client-3",
        name: "Issue 04 — In good company",
        description:
          "Editorial direction and layout for the next print issue. A collection of stories about the people who make things.",
        status: "On hold",
        budgetCents: 340000,
        deadline: offset(24),
        archived: false,
      },
      {
        id: "project-4",
        clientId: "client-4",
        name: "Field notes",
        description:
          "A compact portfolio and a fresh identity for a landscape architecture practice.",
        status: "Planned",
        budgetCents: 480000,
        deadline: offset(35),
        archived: false,
      },
    ],
    tasks: [
      {
        id: "task-1",
        projectId: "project-1",
        title: "Refine the wordmark",
        description:
          "Explore spacing and the relationship between the letterforms.",
        status: "In progress",
        dueDate: offset(-2),
      },
      {
        id: "task-2",
        projectId: "project-1",
        title: "Build the color system",
        description: "Primary palette and accessible color combinations.",
        status: "To do",
        dueDate: offset(2),
      },
      {
        id: "task-3",
        projectId: "project-1",
        title: "Prepare identity presentation",
        description: "Bring the direction together for review.",
        status: "To do",
        dueDate: offset(5),
      },
      {
        id: "task-4",
        projectId: "project-1",
        title: "Brand discovery workshop",
        description: "Align on audience, positioning and personality.",
        status: "Done",
        dueDate: offset(-7),
      },
      {
        id: "task-5",
        projectId: "project-2",
        title: "Review homepage wireframes",
        description: "Confirm hierarchy before visual design.",
        status: "In progress",
        dueDate: offset(1),
      },
      {
        id: "task-6",
        projectId: "project-2",
        title: "Collect product photography",
        description: "Gather assets for the shop and story pages.",
        status: "To do",
        dueDate: offset(-1),
      },
      {
        id: "task-7",
        projectId: "project-3",
        title: "Confirm the editorial lineup",
        description: "Waiting on final story list.",
        status: "To do",
        dueDate: offset(6),
      },
      {
        id: "task-8",
        projectId: "project-4",
        title: "Plan the kickoff",
        description: "Set the agenda and initial milestones.",
        status: "To do",
        dueDate: offset(10),
      },
    ],
    invoices: [
      {
        id: "invoice-1",
        clientId: "client-1",
        projectId: "project-1",
        number: "DSK-001",
        issuedDate: offset(-10),
        dueDate: offset(4),
        status: "Sent",
        items: [
          {
            id: "line-1",
            description: "Brand identity — first milestone",
            quantity: 1,
            unitPriceCents: 425000,
          },
        ],
        notes: "Illustrative invoice. Thank you for the collaboration.",
      },
      {
        id: "invoice-2",
        clientId: "client-2",
        projectId: "project-2",
        number: "DSK-002",
        issuedDate: offset(-6),
        dueDate: offset(10),
        status: "Sent",
        items: [
          {
            id: "line-2",
            description: "Website design — discovery and structure",
            quantity: 1,
            unitPriceCents: 310000,
          },
        ],
        notes: "",
      },
      {
        id: "invoice-3",
        clientId: "client-3",
        projectId: "project-3",
        number: "DSK-003",
        issuedDate: offset(-2),
        dueDate: offset(12),
        status: "Draft",
        items: [
          {
            id: "line-3",
            description: "Editorial design",
            quantity: 1,
            unitPriceCents: 170000,
          },
        ],
        notes: "",
      },
      {
        id: "invoice-4",
        clientId: "client-1",
        projectId: "project-1",
        number: "DSK-004",
        issuedDate: offset(-30),
        dueDate: offset(-15),
        status: "Paid",
        items: [
          {
            id: "line-4",
            description: "Brand strategy",
            quantity: 1,
            unitPriceCents: 180000,
          },
        ],
        notes: "",
      },
    ],
  };
}
