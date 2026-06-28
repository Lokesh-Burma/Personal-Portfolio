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
          <a className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-500" href={`mailto:${profile.email}`}>
            <p className="text-sm font-semibold text-slate-500">Email</p>
            <p className="mt-2 font-semibold text-slate-950">{profile.email}</p>
          </a>
          <Link className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-500" href={profile.linkedin}>
            <p className="text-sm font-semibold text-slate-500">LinkedIn</p>
            <p className="mt-2 font-semibold text-slate-950">linkedin.com/in/lokeshburma</p>
          </Link>
          <Link className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-500" href={profile.resumeHref}>
            <p className="text-sm font-semibold text-slate-500">Resume</p>
            <p className="mt-2 font-semibold text-slate-950">Download PDF</p>
          </Link>
        </div>
      </Section>
    </main>
  );
}
