import { Section } from "@/components/section";
import { experience, highlights, impactAreas } from "@/lib/profile";

export default function ExperiencePage() {
  return (
    <main>
      <Section
        eyebrow="Experience"
        title="Senior backend engineering with production ownership"
        intro="A concise view of my work, grouped around architecture, reliability, AI-assisted engineering, and operating SaaS systems in production."
      >
        <div className="space-y-6">
          {experience.map((item) => (
            <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" key={`${item.company}-${item.role}`}>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">{item.role}</h2>
                  <p className="mt-1 text-slate-600">
                    {item.company} - {item.location}
                  </p>
                </div>
                <p className="text-sm font-semibold text-teal-700">{item.period}</p>
              </div>
              <ul className="mt-6 space-y-3">
                {item.bullets.map((bullet) => (
                  <li className="text-sm leading-6 text-slate-700" key={bullet}>
                    {bullet}
                  </li>
                ))}
              </ul>
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
