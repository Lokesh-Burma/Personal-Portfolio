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
        intro="A concise view of my work, grouped around architecture, reliability, AI-assisted engineering, and operating SaaS systems in production."
      >
        <div className="relative space-y-6 before:absolute before:bottom-8 before:left-4 before:top-8 before:w-px before:bg-slate-200 md:before:left-6">
          {experience.map((item) => (
            <article className="relative pl-10 md:pl-14" key={`${item.company}-${item.role}`}>
              <div className="absolute left-0 top-7 flex h-8 w-8 items-center justify-center rounded-full border border-teal-200 bg-white md:h-12 md:w-12">
                <div className="h-2.5 w-2.5 rounded-full bg-teal-600" />
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-300 hover:shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-teal-700">{item.company} - {item.location}</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{item.role}</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{item.summary}</p>
                  </div>
                  <p className="w-fit rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-800">
                    {item.period}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {item.focus.map((focus) => (
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700" key={focus}>
                      {focus}
                    </span>
                  ))}
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {item.bullets.map((bullet) => {
                    const { label, text } = splitBullet(bullet);

                    return (
                      <div className="rounded-md border border-slate-100 bg-slate-50 p-4" key={bullet}>
                        <p className="text-sm font-semibold text-slate-950">{label}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
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
        title="What I want visitors to remember"
        intro="Rather than treating every task equally, these are the themes that best describe the kind of engineering work I do."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {impactAreas.map((area) => (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={area.title}>
              <h3 className="font-semibold text-slate-950">{area.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{area.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Proof points" title="Selected highlights">
        <div className="grid gap-4 md:grid-cols-2">
          {highlights.map((item) => (
            <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-700 shadow-sm" key={item}>
              {item}
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
