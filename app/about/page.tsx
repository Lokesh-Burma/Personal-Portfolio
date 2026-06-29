import { Section } from "@/components/section";
import { SkillMap } from "@/components/skill-map";
import { credentials, education, profile, skills } from "@/lib/profile";

export default function AboutPage() {
  return (
    <main>
      <Section
        eyebrow="About"
        title="Backend engineer focused on reliable SaaS systems"
        intro={profile.summary}
      >
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Engineering profile</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                My work sits at the intersection of backend architecture, cloud infrastructure, data movement,
                observability, and operational reliability. I enjoy turning ambiguous production problems into
                systems that are measurable, maintainable, and easier for teams to reason about.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Credentials</h2>
              <div className="mt-4 space-y-4">
                {credentials.map((item) => (
                  <div key={item.title}>
                    <h3 className="font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Education</h2>
              <div className="mt-4 space-y-4">
                {education.map((item) => (
                  <div key={item.degree}>
                    <h3 className="font-semibold text-slate-950">{item.degree}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.school}</p>
                    <p className="mt-1 text-sm font-medium text-teal-700">{item.period}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <SkillMap items={skills} className="grid gap-4 md:grid-cols-2" />
        </div>
      </Section>
    </main>
  );
}
