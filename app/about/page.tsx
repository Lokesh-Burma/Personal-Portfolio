import { Section } from "@/components/section";
import { profile, skills } from "@/lib/profile";

export default function AboutPage() {
  return (
    <main>
      <Section
        eyebrow="About"
        title="Backend engineer focused on reliable SaaS systems"
        intro={profile.summary}
      >
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Engineering profile</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              My work sits at the intersection of backend architecture, cloud infrastructure, data movement,
              observability, and operational reliability. I enjoy turning ambiguous production problems into
              systems that are measurable, maintainable, and easier for teams to reason about.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {skills.map((skill) => (
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={skill.group}>
                <h3 className="font-semibold text-slate-950">{skill.group}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{skill.items.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </main>
  );
}
