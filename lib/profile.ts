export const profile = {
  name: "Lokesh Burma",
  title: "Senior Software Engineer",
  location: "Hyderabad, India",
  email: "lokesh.burma@outlook.com",
  linkedin: "https://www.linkedin.com/in/lokeshburma",
  resumeHref: "/Lokesh_Burma_Resume.pdf",
  summary:
    "Backend Software Engineer with 5 years of experience building SaaS backend systems, improving reliability, working with databases, and debugging production issues. I focus on clean APIs, scalable services, observability, and practical AI-assisted engineering.",
};

export const skills = [
  {
    group: "Backend Development",
    description:
      "Languages, APIs, and service patterns I use to build production backend features.",
    items: [
      "PHP",
      "TypeScript",
      "Go",
      "JavaScript",
      "Node.js",
      "NestJS",
      "REST APIs",
      "OpenAPI/Swagger",
      "Webhooks",
      "Clean Code",
    ],
  },
  {
    group: "Databases And Data",
    description:
      "Relational, NoSQL, cache, and query skills used in backend systems.",
    items: [
      "PostgreSQL",
      "DynamoDB",
      "Redis",
      "Athena",
      "SQL",
      "Indexing",
      "Query Optimization",
      "Transactions",
      "Data Modeling",
      "Caching",
    ],
  },
  {
    group: "System Design",
    description:
      "Core backend design concepts expected in SDE-II and senior backend roles.",
    items: [
      "Microservices",
      "Distributed Systems",
      "Event-Driven Architecture",
      "Queues",
      "Rate Limiting",
      "Idempotency",
      "Retry Handling",
      "Load Balancing",
      "High Availability",
      "Failure Handling",
    ],
  },
  {
    group: "Cloud And Delivery",
    description:
      "Cloud, containers, CI/CD, and deployment practices for production services.",
    items: [
      "AWS",
      "IAM",
      "EC2",
      "S3",
      "SQS",
      "Lambda",
      "ECS/Fargate",
      "Docker",
      "Git",
      "CI/CD",
      "Canary Rollouts",
    ],
  },
  {
    group: "Observability And Debugging",
    description:
      "Tools and practices for understanding production behavior and resolving issues.",
    items: [
      "Grafana",
      "ELK",
      "Kibana",
      "CloudWatch",
      "Structured Logging",
      "Metrics",
      "Dashboards",
      "Root Cause Analysis",
      "Incident Debugging",
    ],
  },
  {
    group: "AI-Assisted Engineering",
    description:
      "Practical AI workflows used as support for debugging, documentation, and analysis.",
    items: [
      "Claude Code",
      "MCP",
      "Langflow",
      "Prompt Engineering",
      "AI-Assisted Debugging",
      "Log Analysis With AI",
      "RCA Workflows",
      "Embedding Search",
    ],
  },
];

export const fundamentals = [
  {
    title: "Programming Fundamentals",
    text: "Data structures, algorithms, clean code, modular design, and problem solving.",
  },
  {
    title: "Backend Fundamentals",
    text: "REST APIs, validation, authentication, authorization, pagination, and API contracts.",
  },
  {
    title: "Database Fundamentals",
    text: "SQL, joins, indexes, transactions, query optimization, caching, and SQL vs NoSQL tradeoffs.",
  },
  {
    title: "System Design Fundamentals",
    text: "Scalability, queues, retries, idempotency, rate limiting, load balancing, and fault tolerance.",
  },
  {
    title: "Production Fundamentals",
    text: "Logging, metrics, dashboards, debugging, incident response, rollbacks, and reliability checks.",
  },
  {
    title: "Security Fundamentals",
    text: "Secure coding, secrets management, JWT/OAuth, RBAC, encryption basics, and OWASP awareness.",
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
    name: "Go",
    icon: "Go",
    slug: "go",
    color: "00ADD8",
    tone: "bg-cyan-50 border-cyan-200",
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
    name: "Redis",
    icon: "R",
    slug: "redis",
    color: "FF4438",
    tone: "bg-red-50 border-red-200",
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
  "Built backend routing logic for large-scale SaaS data workflows with phased rollout controls.",
  "Improved reliability by classifying temporary, permanent, and customer-action-needed failures.",
  "Preserved retry history and error context to make production debugging easier.",
  "Built AI-assisted debugging workflows using logs, issue context, database checks, and RCA prompts.",
];

export const impactAreas = [
  {
    title: "SaaS Backend Architecture",
    text: "Built backend features for multi-tenant SaaS systems with attention to data correctness, safe rollout, and maintainable service behavior.",
  },
  {
    title: "Reliability And Debugging",
    text: "Improved failure handling by making errors easier to classify, retry, inspect, and explain during production support.",
  },
  {
    title: "AI-Assisted Engineering",
    text: "Used AI tools to support debugging and RCA by combining logs, issue context, database checks, and structured engineering prompts.",
  },
  {
    title: "Production Ownership",
    text: "Worked inside a large production codebase with focus on safe changes, clear handoff, monitoring, and operational readiness.",
  },
];

export const experience = [
  {
    role: "Senior Software Engineer",
    company: "SysCloud",
    location: "Hyderabad, India",
    period: "May 2023 - Present",
    summary:
      "Building and maintaining backend systems for SaaS product workloads, with focus on reliability, databases, observability, and AI-assisted debugging.",
    focus: [
      "Backend APIs",
      "Reliability",
      "Databases",
      "Production Debugging",
      "Observability",
    ],
    bullets: [
      "Backend systems: Implemented backend changes for large-scale SaaS data workflows while keeping read/write behavior safe.",
      "Rollout safety: Used phased rollout logic, fallback paths, and tenant-level controls to reduce migration risk.",
      "Reliability: Classified temporary, permanent, and customer-action-needed failures so issues were easier to retry, inspect, and resolve.",
      "Debugging: Preserved retry history, error codes, and workflow status details to make production issues easier to investigate.",
      "AI engineering: Built an AI-assisted debugging workflow that uses issue context, logs, database checks, and RCA prompts to suggest fix plans.",
      "Team enablement: Created setup guides and knowledge-transfer sessions so engineers could use AI-assisted debugging workflows independently.",
      "Operations: Built monitoring for production health signals and supported reliability work across cloud workloads.",
    ],
  },
  {
    role: "Software Engineer",
    company: "SysCloud",
    location: "Hyderabad, India",
    period: "May 2021 - Apr 2023",
    summary:
      "Built and maintained backend services across SaaS product workflows while contributing to microservices and production support.",
    focus: ["PHP", "Node.js", "Microservices", "Backend APIs", "Debugging"],
    bullets: [
      "Contributed to the transition from a PHP monolith to backend microservices.",
      "Improved maintainability by helping split backend responsibilities into smaller services.",
      "Worked on backend APIs, data persistence, debugging, and production support for SaaS workflows.",
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
    slug: "saas-data-routing-safety",
    title: "SaaS Data Routing And Migration Safety",
    summary:
      "A backend data-routing initiative for a multi-tenant SaaS product, focused on safe storage decisions during a phased data movement workflow.",
    stack: ["PostgreSQL", "Node.js", "AWS", "Distributed Systems", "State Machines"],
    outcome:
      "Improved data movement safety by making storage decisions explicit through phased state-machine routing and buffered update handling.",
  },
  {
    slug: "claude-debugger-agent",
    title: "AI-Assisted Debugging Workflow",
    summary:
      "A debugging workflow that connects issue context, logs, database checks, and structured RCA prompts to support root-cause analysis and fix planning.",
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
    slug: "failure-classification-observability",
    title: "Failure Classification And Observability",
    summary:
      "A reliability initiative that classified temporary, permanent, and customer-action-needed workflow failures while preserving retry history for clearer diagnostics.",
    stack: ["Node.js", "PHP", "ELK", "Grafana", "CloudWatch"],
    outcome:
      "Improved support visibility by standardizing failure categories, preserving retry history, and expanding structured diagnostic coverage.",
  },
];
