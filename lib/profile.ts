export const profile = {
  name: "Lokesh Burma",
  title: "Senior Software Engineer",
  location: "Hyderabad, India",
  email: "lokesh.burma@outlook.com",
  phone: "9133283812",
  linkedin: "https://www.linkedin.com/in/lokeshburma",
  resumeHref: "/Lokesh_Burma_Resume_Latest.pdf",
  summary:
    "Backend-focused software engineer with 5 years of experience building and scaling cloud-native SaaS systems. Strong in high-throughput, low-latency backend architecture with a practical focus on reliability, performance, cost efficiency, and operational excellence.",
};

export const skills = [
  {
    group: "Languages",
    items: ["PHP", "TypeScript", "JavaScript", "Python"],
  },
  {
    group: "Backend",
    items: ["Node.js", "NestJS", "REST APIs", "Microservices"],
  },
  {
    group: "Cloud",
    items: ["AWS EC2", "AWS SQS", "AWS FSx", "S3", "Lambda", "API Gateway", "Route53"],
  },
  {
    group: "Data",
    items: ["PostgreSQL", "DynamoDB", "Redis", "Athena", "Apache Iceberg"],
  },
  {
    group: "Delivery",
    items: ["Docker", "AWS ECS/Fargate", "Git", "CodeCommit", "CodePipeline"],
  },
  {
    group: "Observability",
    items: ["Grafana", "ELK", "CloudWatch", "Kibana"],
  },
  {
    group: "AI Engineering",
    items: ["Claude Code", "MCP", "Langflow", "RCA Workflows", "Prompt Engineering"],
  },
];

export const highlights = [
  "Owned backend graph-service changes for a billion-row PostgreSQL to S3 Tables migration using Apache Iceberg, Athena, and DynamoDB lookup caching.",
  "Implemented a phased migration state machine covering DynamoDB dual writes, direct S3 writes, and DynamoDB-first reads with RDS fallback.",
  "Delivered production canary rollout for large-scale mail metadata migration with zero impact on unrelated customers.",
  "Expanded backup failure classification from 350 to 2,957 error codes across backup, restore, export, and post-processing workflows.",
  "Built a Claude-powered debugging agent with Azure DevOps, Kibana, and database integrations, reaching 85%+ fix-plan accuracy.",
  "Resolved 196 production work items across Gmail, Outlook, Drive, Slack, Salesforce, Cloud Mover, and related platform areas.",
  "Built Grafana monitoring for onboarding pending users across trial and paid accounts to improve operational visibility.",
  "Delivered 15 user stories and owned 17 production deployments while supporting incident and customer-ticket responsibilities.",
];

export const experience = [
  {
    role: "Senior Software Engineer",
    company: "SysCloud",
    location: "Hyderabad, India",
    period: "May 2023 - Present",
    bullets: [
      "Owned backend implementation for Gmail and Outlook metadata migration from PostgreSQL to S3 Tables, covering billions of rows and reducing RDS storage pressure.",
      "Designed and implemented a phased migration state machine with DynamoDB dual writes, direct S3 writes, and DynamoDB-first reads with RDS fallback.",
      "Delivered eligible and ineligible item classification across backup, restore, and export failures, improving customer visibility into storage discrepancies.",
      "Expanded error-code coverage from 350 to 2,957 codes and standardized retry-history models with attempt-level status, error code, and data-size details.",
      "Built a Claude-powered debugging agent for automated root-cause analysis using Azure DevOps, Kibana, database signals, and issue-based fix-plan generation.",
      "Created setup guides and KT sessions that helped engineering teams adopt AI-assisted debugging workflows independently.",
      "Resolved 196 production work items across multiple cloud workloads and owned Salesforce cloud maintenance during the review period.",
      "Built Grafana monitoring for onboarding pending users and contributed to infrastructure efficiency work such as ARM migration support.",
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
      "A large-scale data architecture initiative moving high-volume mail metadata from PostgreSQL into S3-backed Apache Iceberg tables with Athena access.",
    stack: ["PostgreSQL", "S3", "Apache Iceberg", "Athena", "DynamoDB", "AWS"],
    outcome: "Reduced RDS storage pressure and enabled a safer phased migration model for billion-row metadata tables.",
  },
  {
    slug: "claude-debugger-agent",
    title: "Claude Debugger Agent",
    summary:
      "An AI-assisted diagnostic agent that connects work items, logs, database signals, and historical analysis to recommend root causes and fix plans.",
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

export const posts = [
  {
    slug: "zero-downtime-data-migration-patterns",
    title: "Zero-Downtime Data Migration Patterns for SaaS Backends",
    date: "2026-06-28",
    summary:
      "Notes on phased write routing, state machines, cache strategy, and operational safety during large backend migrations.",
    tags: ["AWS", "PostgreSQL", "S3", "Distributed Systems"],
  },
  {
    slug: "debugging-distributed-backup-systems",
    title: "Debugging Distributed Backup Systems",
    date: "2026-06-28",
    summary:
      "How structured error taxonomies, retry history, and logs turn noisy backup failures into actionable diagnostics.",
    tags: ["Observability", "Distributed Services", "Reliability"],
  },
  {
    slug: "from-php-monolith-to-microservices",
    title: "From PHP Monolith to Microservices",
    date: "2026-06-28",
    summary:
      "A practical reflection on boundaries, deployment cadence, and maintainability when modernizing a SaaS backend.",
    tags: ["PHP", "Microservices", "Architecture"],
  },
];
