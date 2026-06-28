export const profile = {
  name: "Lokesh Burma",
  title: "Senior Software Engineer",
  location: "Hyderabad, India",
  email: "lokesh.burma@outlook.com",
  phone: "9133283812",
  linkedin: "https://www.linkedin.com/in/lokeshburma",
  resumeHref: "/Lokesh_Burma_Resume_Latest.pdf",
  summary:
    "Backend-focused software engineer with 5 years of experience building and scaling cloud-native SaaS systems. Strong in high-throughput, low-latency backend architecture with a practical focus on reliability, performance, and cost efficiency.",
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
];

export const highlights = [
  "Co-architected a petabyte-scale PostgreSQL to S3 migration using Apache Iceberg and Athena.",
  "Designed a 3-phase state-machine backend architecture for zero-downtime write routing between RDS and S3.",
  "Implemented DynamoDB caching that reduced database load by 40%.",
  "Built an AI-powered debugging agent with Claude, Azure DevOps, Kibana, and database integrations.",
  "Expanded backup failure classification from 350 to 2,957 error codes to improve self-service diagnostics.",
  "Contributed to decomposing a PHP monolith into scalable microservices.",
];

export const experience = [
  {
    role: "Senior Software Engineer",
    company: "SysCloud",
    location: "Hyderabad, India",
    period: "May 2023 - Present",
    bullets: [
      "Co-architected migration of billions of rows from PostgreSQL on RDS to S3 using Apache Iceberg and Athena.",
      "Designed backend state-machine flows to route writes between RDS and S3 without downtime.",
      "Implemented DynamoDB caching patterns that reduced database load by 40%.",
      "Built a Claude-powered debugging agent for automated root-cause analysis across Azure DevOps, Kibana, and database signals.",
      "Led failure classification and observability improvements across backup systems.",
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
      "A petabyte-scale data architecture initiative moving PostgreSQL data into S3-backed Apache Iceberg tables with Athena access.",
    stack: ["PostgreSQL", "S3", "Apache Iceberg", "Athena", "DynamoDB", "AWS"],
    outcome: "Reduced database load and enabled a lower-cost analytical storage path.",
  },
  {
    slug: "claude-debugger-agent",
    title: "Claude Debugger Agent",
    summary:
      "An AI-assisted diagnostic agent that connects operational signals from work items, logs, and databases to recommend fixes.",
    stack: ["Claude", "Azure DevOps", "Kibana", "Databases", "Prompt Engineering"],
    outcome: "Reached 85%+ accuracy in fix recommendations and reduced manual triage effort.",
  },
  {
    slug: "backup-failure-observability",
    title: "Backup Failure Classification & Observability",
    summary:
      "A reliability initiative that standardized failure models, retry history, and user-facing diagnostics across backup workflows.",
    stack: ["Node.js", "PHP", "ELK", "Grafana", "CloudWatch"],
    outcome: "Expanded classification coverage from 350 to 2,957 error codes.",
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
