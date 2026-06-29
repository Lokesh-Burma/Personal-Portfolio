export const profile = {
  name: "Lokesh Burma",
  title: "Senior Software Engineer",
  location: "Hyderabad, India",
  email: "lokesh.burma@outlook.com",
  linkedin: "https://www.linkedin.com/in/lokeshburma",
  resumeHref: "/Lokesh_Burma_Resume_Latest.pdf",
  summary:
    "Senior Software Engineer focused on cloud-native backend systems, reliability, large-scale data movement, and AI-assisted engineering workflows. I build production backend systems that are easier to scale, observe, debug, and operate.",
};

export const skills = [
  {
    group: "Core Backend",
    items: ["PHP", "TypeScript", "JavaScript", "Node.js", "NestJS", "REST APIs"],
  },
  {
    group: "Architecture",
    items: ["Microservices", "Distributed Systems", "State Machines", "Retry Workflows"],
  },
  {
    group: "Cloud And Data",
    items: ["AWS", "S3", "SQS", "Lambda", "ECS/Fargate", "PostgreSQL", "DynamoDB", "Athena", "Apache Iceberg"],
  },
  {
    group: "Reliability",
    items: ["Grafana", "ELK", "Kibana", "CloudWatch", "Error Taxonomy", "Operational Dashboards"],
  },
  {
    group: "AI Engineering",
    items: ["Claude Code", "MCP", "Langflow", "RCA Workflows", "Prompt Engineering"],
  },
  {
    group: "Delivery",
    items: ["Docker", "Git", "AWS CodeCommit", "CodePipeline", "Production Rollouts"],
  },
];

export const highlights = [
  "Designed phased backend migration patterns for moving high-volume relational data into S3-backed analytical storage.",
  "Built reliability workflows that classify retryable and permanent failures, preserve retry history, and improve support diagnostics.",
  "Created AI-assisted debugging workflows that combine issue context, logs, database signals, and structured RCA techniques.",
  "Improved operational visibility with dashboards, standardized status models, and clearer production diagnostics.",
];

export const impactAreas = [
  {
    title: "Large-Scale Backend Architecture",
    text: "Worked on billion-row data migration patterns using PostgreSQL, S3 Tables, Apache Iceberg, Athena, DynamoDB, and phased state-machine rollouts.",
  },
  {
    title: "Reliability And Observability",
    text: "Improved failure classification, retry-history tracking, error-code coverage, and customer/support visibility across backup workflows.",
  },
  {
    title: "AI-Enabled Backend Engineering",
    text: "Built Claude-powered debugging workflows with MCP integrations, log analysis, database context, and fix-plan generation.",
  },
  {
    title: "Production Ownership",
    text: "Owned backend features from design through canary rollout, documentation, team enablement, and operational follow-through.",
  },
];

export const experience = [
  {
    role: "Senior Software Engineer",
    company: "SysCloud",
    location: "Hyderabad, India",
    period: "May 2023 - Present",
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
    bullets: [
      "Contributed to the transition from a legacy PHP monolith to scalable backend microservices.",
      "Improved maintainability and supported faster deployment cycles through service decomposition.",
      "Worked across SaaS backup workflows, backend APIs, data persistence, and operational diagnostics.",
    ],
  },
];

export const projects = [
  {
    slug: "rds-to-s3-table-migration",
    title: "RDS to S3 Table Migration",
    summary:
      "A large-scale data architecture initiative moving high-volume email metadata from PostgreSQL into S3-backed Apache Iceberg tables with Athena access.",
    stack: ["PostgreSQL", "S3", "Apache Iceberg", "Athena", "DynamoDB", "AWS"],
    outcome: "Reduced RDS storage pressure and enabled a safer phased migration model for billion-row metadata tables.",
  },
  {
    slug: "claude-debugger-agent",
    title: "Claude Debugger Agent",
    summary:
      "An AI-assisted diagnostic agent that connects issue context, logs, database signals, and historical analysis to recommend root causes and fix plans.",
    stack: ["Claude Code", "MCP", "Azure DevOps", "Kibana", "Databases", "Prompt Engineering"],
    outcome: "Reached 85%+ fix-plan accuracy and reduced manual incident-analysis effort across engineering teams.",
  },
  {
    slug: "backup-failure-observability",
    title: "Backup Failure Classification & Observability",
    summary:
      "A reliability initiative that standardized failure models, retry history, error-code coverage, and customer-facing diagnostics across backup workflows.",
    stack: ["Node.js", "PHP", "ELK", "Grafana", "CloudWatch"],
    outcome: "Expanded classification coverage from 350 to 2,957 error codes and improved support visibility.",
  },
];
