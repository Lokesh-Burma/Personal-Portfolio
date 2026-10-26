import Link from "next/link";
import { Section } from "@/components/section";
import { profile } from "@/lib/profile";

export default function ContactPage() {
  return (
    <main>
      <Section
        eyebrow="Contact"
        title="Let's talk about backend systems"
        intro="For roles, collaborations, or technical conversations around cloud-native SaaS engineering."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <a className="rounded-lg border border-line bg-panel p-6 shadow-sm transition hover:border-accent" href={`mailto:${profile.email}`}>
            <p className="text-sm font-semibold text-subtle">Email</p>
            <p className="mt-2 font-semibold text-ink">{profile.email}</p>
          </a>
          <Link className="rounded-lg border border-line bg-panel p-6 shadow-sm transition hover:border-accent" href={profile.linkedin}>
            <p className="text-sm font-semibold text-subtle">LinkedIn</p>
            <p className="mt-2 font-semibold text-ink">linkedin.com/in/lokeshburma</p>
          </Link>
          <Link className="rounded-lg border border-line bg-panel p-6 shadow-sm transition hover:border-accent" href={profile.resumeHref}>
            <p className="text-sm font-semibold text-subtle">Resume</p>
            <p className="mt-2 font-semibold text-ink">Request by email</p>
          </Link>
        </div>
      </Section>
    </main>
  );
}
