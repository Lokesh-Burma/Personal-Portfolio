import { Section } from "@/components/section";
import { experience, highlights, impactAreas } from "@/lib/profile";

function splitBullet(bullet: string) {
  const separatorIndex = bullet.indexOf(":");

  if (separatorIndex === -1) {
    return { label: "Contribution", text: bullet };
  }

  return {
    label: bullet.slice(0, separatorIndex),
    text: bullet.slice(separatorIndex + 1).trim(),
  };
}

export default function ExperiencePage() {
  return (
    <main>
      <Section
        eyebrow="Experience"
        title="Senior backend engineering with production ownership"
        intro="A concise view of my work across backend architecture, reliability, debugging, and operating SaaS systems in production."
      >
        <div className="relative space-y-6 before:absolute before:bottom-8 before:left-4 before:top-8 before:w-px before:bg-slate-200 md:before:left-6">
          {experience.map((item) => (
            <article className="relative pl-10 md:pl-14" key={`${item.company}-${item.role}`}>
              <div className="absolute left-0 top-7 flex h-8 w-8 items-center justify-center rounded-full border border-accent/20 bg-panel md:h-12 md:w-12">
                <div className="h-2.5 w-2.5 rounded-full bg-accent" />
              </div>

              <div className="rounded-lg border border-line bg-panel p-6 shadow-sm transition hover:border-accent/60 hover:shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-accent-soft">{item.company} - {item.location}</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{item.role}</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{item.summary}</p>
                  </div>
                  <p className="w-fit rounded-md border border-accent/20 bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent-soft">
                    {item.period}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {item.focus.map((focus) => (
                    <span className="rounded-md bg-panel-raised px-2.5 py-1 text-xs font-medium text-muted" key={focus}>
                      {focus}
                    </span>
                  ))}
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {item.bullets.map((bullet) => {
                    const { label, text } = splitBullet(bullet);

                    return (
                      <div className="rounded-md border border-line bg-canvas p-4" key={bullet}>
                        <p className="text-sm font-semibold text-ink">{label}</p>
                        <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Impact themes"
        title="Core engineering themes"
        intro="The recurring themes behind my work: safe backend changes, reliability, production visibility, and maintainable systems."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {impactAreas.map((area) => (
            <div className="rounded-lg border border-line bg-panel p-5 shadow-sm" key={area.title}>
              <h3 className="font-semibold text-ink">{area.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{area.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Proof points" title="Selected highlights">
        <div className="grid gap-4 md:grid-cols-2">
          {highlights.map((item) => (
            <div className="rounded-lg border border-line bg-panel p-5 text-sm leading-6 text-muted shadow-sm" key={item}>
              {item}
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
