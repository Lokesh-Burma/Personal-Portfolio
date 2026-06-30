export const profile = {
  name: "Lokesh Burma",
  title: "Senior Software Engineer",
  location: "Hyderabad, India",
  email: "lokesh.burma@outlook.com",
  linkedin: "https://www.linkedin.com/in/lokeshburma",
  resumeHref: "/Lokesh_Burma_Resume_Latest.pdf",
  summary:
    "Senior Software Engineer focused on cloud-native backend systems, reliability, scalability, and AI-assisted engineering workflows. I build production backend systems that are easier to scale, observe, debug, and operate.",
};

export const skills = [
  {
    group: "Backend Engineering",
    description:
      "Languages, APIs, and service patterns I use to build maintainable backend features.",
    items: [
      "PHP",
      "TypeScript",
      "JavaScript",
      "Python",
      "Node.js",
      "NestJS",
      "REST APIs",
      "OpenAPI/Swagger",
      "Authentication/Authorization",
      "JWT/OAuth",
      "Webhooks",
    ],
  },
  {
    group: "Architecture And Reliability",
    description:
      "System design practices for dependable distributed services and failure-aware workflows.",
    items: [
      "Microservices",
      "Distributed Systems",
      "Event-Driven Architecture",
      "State Machines",
      "Retry Workflows",
      "Idempotency",
      "Rate Limiting",
      "Background Jobs/Queues",
      "Failure Classification",
      "System Design",
    ],
  },
  {
    group: "Cloud And Data",
    description:
      "AWS services, storage systems, and data patterns used in SaaS backend platforms.",
    items: [
      "AWS",
      "IAM",
      "EC2",
      "S3",
      "SQS",
      "Lambda",
      "ECS/Fargate",
      "RDS",
      "PostgreSQL",
      "DynamoDB",
      "Redis",
      "Athena",
      "Apache Iceberg",
      "S3 Tables",
      "Query Optimization",
    ],
  },
  {
    group: "Observability",
    description:
      "Tools and practices for making production behavior easier to inspect and debug.",
    items: [
      "Grafana",
      "ELK",
      "Kibana",
      "CloudWatch",
      "Structured Logging",
      "Error Taxonomy",
      "Operational Dashboards",
      "RCA Workflows",
    ],
  },
  {
    group: "AI-Enabled Engineering",
    description:
      "AI-assisted workflows for debugging, RCA, documentation, and engineering acceleration.",
    items: [
      "Claude Code",
      "MCP",
      "Langflow",
      "Prompt Engineering",
      "AI-Assisted Debugging",
      "RCA Automation",
      "Log Analysis With AI",
      "Embedding Search",
    ],
  },
  {
    group: "Delivery And Tools",
    description:
      "Version control, delivery pipelines, deployment tooling, and local engineering utilities.",
    items: [
      "Docker",
      "Git",
      "GitHub",
      "AWS CodeCommit",
      "CodePipeline",
      "Azure DevOps",
      "CI/CD",
      "Canary Rollouts",
      "Environment Variables",
      "Vercel",
      "Postman",
      "DBeaver",
      "RedisInsight",
    ],
  },
];

export const techHighlights = [
  {
    name: "PHP",
    icon: "PHP",
    slug: "php",
    color: "777BB4",
    tone: "bg-indigo-50 border-indigo-200",
  },
  {
    name: "TypeScript",
    icon: "TS",
    slug: "typescript",
    color: "3178C6",
    tone: "bg-blue-50 border-blue-200",
  },
  {
    name: "Node.js",
    icon: "N",
    slug: "nodedotjs",
    color: "5FA04E",
    tone: "bg-emerald-50 border-emerald-200",
  },
  {
    name: "NestJS",
    icon: "NS",
    slug: "nestjs",
    color: "E0234E",
    tone: "bg-rose-50 border-rose-200",
  },
  {
    name: "AWS",
    icon: "AWS",
    slug: "amazonwebservices",
    color: "FF9900",
    tone: "bg-amber-50 border-amber-200",
  },
  {
    name: "Docker",
    icon: "D",
    slug: "docker",
    color: "2496ED",
    tone: "bg-sky-50 border-sky-200",
  },
  {
    name: "PostgreSQL",
    icon: "PG",
    slug: "postgresql",
    color: "4169E1",
    tone: "bg-cyan-50 border-cyan-200",
  },
  {
    name: "DynamoDB",
    icon: "DB",
    slug: "amazondynamodb",
    color: "4053D6",
    tone: "bg-violet-50 border-violet-200",
  },
  {
    name: "Grafana",
    icon: "G",
    slug: "grafana",
    color: "F46800",
    tone: "bg-orange-50 border-orange-200",
  },
  {
    name: "Claude",
    icon: "AI",
    slug: "anthropic",
    color: "191919",
    tone: "bg-teal-50 border-teal-200",
  },
];

export const pipelineProjects = [
  {
    status: "Now",
    title: "Portfolio as an engineering knowledge base",
    summary:
      "Turning the portfolio into a living set of case studies, backend notes, and operational cheat sheets.",
    stack: ["Next.js", "MDX", "TypeScript", "Vercel"],
  },
  {
    status: "Next",
    title: "Backend architecture diagrams library",
    summary:
      "Building visual notes that simplify backend concepts and architectures such as state machines, migrations, retry flows, observability, and distributed service patterns.",
    stack: [
      "Mermaid",
      "System Design",
      "Documentation",
      "Backend Architecture",
    ],
  },
];

export const credentials = [
  {
    title: "AWS Certified Solutions Architect - Associate",
    detail: "Amazon Web Services, Dec 2021",
  },
];

export const education = [
  {
    degree: "Master of Technology, Cloud Computing",
    school: "BITS Pilani, Work Integrated Learning Program",
    period: "2025",
  },
  {
    degree: "Bachelor of Technology, Computer Science and Technology",
    school: "Lovely Professional University",
    period: "2021",
  },
];

export const highlights = [
  "Built phased backend write-routing for migrated backup data, using state-machine statuses to safely decide RDS vs S3 writes in a multi-tenant system.",
  "Built reliability workflows that classify temporary, permanent, and customer-action-needed backup failures while preserving retry history for better diagnostics.",
  "Created AI-assisted debugging workflows that combine issue context, logs, database checks, and structured RCA prompts to support root-cause analysis.",
  "Improved production diagnostics by standardizing backup status models, preserving failure history, and making retry/customer-action-needed states easier to inspect.",
];

export const impactAreas = [
  {
    title: "Multi-Tenant Backup Architecture",
    text: "Built backend write-routing for migrated SaaS backup data, using phased state-machine statuses to safely decide RDS vs S3 writes without corrupting tenant data.",
  },
  {
    title: "Reliability And Diagnostics",
    text: "Improved backup failure handling by classifying temporary, permanent, and customer-action-needed errors while preserving retry history for support and debugging.",
  },
  {
    title: "AI-Enabled Backend Engineering",
    text: "Created Claude-assisted debugging workflows that combine issue context, logs, database checks, and structured RCA prompts to support root-cause analysis.",
  },
  {
    title: "Production Ownership",
    text: "Implemented backend changes inside a large production codebase with attention to rollout safety, data correctness, operational visibility, and team handoff.",
  },
];

export const experience = [
  {
    role: "Senior Software Engineer",
    company: "SysCloud",
    location: "Hyderabad, India",
    period: "May 2023 - Present",
    summary:
      "Leading backend reliability, data migration, observability, and AI-assisted engineering work for cloud-native SaaS systems.",
    focus: [
      "Backend Architecture",
      "Reliability",
      "Data Migration",
      "AI Debugging",
      "Observability",
    ],
    bullets: [
      "Architecture: Owned backend implementation for migrating high-volume email metadata from PostgreSQL to S3 Tables while preserving safe read/write behavior.",
      "Migration safety: Designed phased state-machine flows with cache-assisted reads, fallback paths, and tenant-level rollout control.",
      "Reliability: Delivered failure classification across backup, restore, and export workflows, improving visibility into retryable and permanently failed items.",
      "Observability: Expanded structured error-code coverage and standardized retry-history models with attempt-level status, error code, and data-size context.",
      "AI engineering: Built a Claude-powered debugging agent that uses issue context, log signals, database context, and RCA patterns to produce fix plans.",
      "Enablement: Created setup guides and knowledge-transfer sessions so engineers could adopt AI-assisted debugging workflows independently.",
      "Operations: Built monitoring for onboarding and production health signals, and supported reliability work across multiple cloud workloads.",
    ],
  },
  {
    role: "Software Engineer",
    company: "SysCloud",
    location: "Hyderabad, India",
    period: "May 2021 - Apr 2023",
    summary:
      "Built and maintained backend services across SaaS backup workflows while contributing to service decomposition and operational diagnostics.",
    focus: ["PHP", "Node.js", "Microservices", "Backend APIs", "Diagnostics"],
    bullets: [
      "Contributed to the transition from a legacy PHP monolith to scalable backend microservices.",
      "Improved maintainability and supported faster deployment cycles through service decomposition.",
      "Worked across SaaS backup workflows, backend APIs, data persistence, and operational diagnostics.",
    ],
  },
  {
    role: "Software Engineer Intern",
    company: "SysCloud",
    location: "Remote",
    period: "Nov 2020 - Apr 2021",
    summary:
      "Supported monitoring, log analysis, and release coordination while learning production backend operations.",
    focus: [
      "CloudWatch",
      "Grafana",
      "Kibana",
      "Log Analysis",
      "Production Support",
    ],
    bullets: [
      "Supported backend workload monitoring using CloudWatch, Grafana, and Kibana.",
      "Analyzed logs, helped identify recurring production issues, and partnered with engineers on fixes and release coordination.",
    ],
  },
];

export const projects = [
  {
    slug: "rds-to-s3-table-migration",
    title: "RDS to S3 Table Write Routing",
    summary:
      "A backend write-routing initiative for multi-tenant SaaS backup data, safely deciding whether new Gmail and Outlook metadata should be written to RDS or S3-backed analytical storage.",
    stack: ["PostgreSQL", "S3 Tables", "Apache Iceberg", "Athena", "Node.js", "AWS"],
    outcome:
      "Reduced RDS growth pressure while preserving data correctness through phased state-machine routing, Athena lookups, and buffered bulk updates.",
  },
  {
    slug: "claude-debugger-agent",
    title: "Claude Debugger Agent",
    summary:
      "An AI-assisted debugging workflow that connects issue context, logs, database checks, and structured RCA prompts to support root-cause analysis and fix planning.",
    stack: [
      "Claude Code",
      "MCP",
      "Azure DevOps",
      "Kibana",
      "Databases",
      "Prompt Engineering",
    ],
    outcome:
      "Reached 85%+ fix-plan accuracy and reduced manual incident-analysis effort across engineering teams.",
  },
  {
    slug: "backup-failure-observability",
    title: "Backup Failure Classification & Observability",
    summary:
      "A reliability initiative that classified temporary, permanent, and customer-action-needed backup failures while preserving retry history for clearer diagnostics.",
    stack: ["Node.js", "PHP", "ELK", "Grafana", "CloudWatch"],
    outcome:
      "Expanded classification coverage from 350 to 2,957 error codes and improved support visibility.",
  },
];
