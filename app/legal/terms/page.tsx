import Link from "next/link";
import { LegalTitle, Lead, Section, List, Item } from "@/components/legal/legal-doc";

export const metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of Stellio Fit, including memberships, billing and coaching.",
};

const UPDATED = "25 July 2026";

export default function TermsPage() {
  return (
    <>
      <LegalTitle title="Terms of Service" updated={UPDATED} />

      <Lead>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use
        of Stellio Fit (the &ldquo;Service&rdquo;). By creating an account or using
        the Service, you agree to these Terms. If you do not agree, please do not
        use the Service.
      </Lead>

      <Section n={1} title="Eligibility and your account">
        <p>
          You must be at least 16 years old to use Stellio Fit. You are
          responsible for the accuracy of your account information, for keeping
          your login credentials secure, and for all activity under your account.
          Notify us promptly of any unauthorised use.
        </p>
      </Section>

      <Section n={2} title="The Service">
        <p>
          Stellio Fit provides workout programs, exercise guidance, progress and
          health tracking, nutrition tools, social features and optional coaching.
          We may add, change or remove features over time to improve the Service.
        </p>
      </Section>

      <Section n={3} title="Memberships and billing">
        <List>
          <Item>
            <strong>Free plan</strong> — core tracking and workouts at no cost.
          </Item>
          <Item>
            <strong>Pro (members)</strong> — unlocks premium features such as the
            AI Coach, custom splits, nutrition, health tracking, advanced stats and
            social leaderboard/sharing, billed monthly.
          </Item>
          <Item>
            <strong>Trainer plan</strong> — for trainers running their coaching
            business on the platform, billed monthly.
          </Item>
        </List>
        <p>
          Paid plans are billed in advance on a recurring basis through our payment
          provider and renew automatically until cancelled. You can cancel at any
          time from the billing area; your plan remains active until the end of the
          current billing period. Except where required by law, payments are
          non-refundable. Prices may change, and we will give reasonable notice of
          any change before it takes effect.
        </p>
      </Section>

      <Section n={4} title="Referral credits">
        <p>
          We may offer referral rewards, such as free membership time for you and a
          friend you invite. Credits have no cash value, cannot be exchanged for
          money, and may be modified or withdrawn if we detect abuse or if the
          program changes.
        </p>
      </Section>

      <Section n={5} title="Coaching and trainer payments">
        <p>
          If you engage a trainer through the Service, your coaching arrangement
          (including any fees, schedules and refunds) is between you and that
          trainer. Trainers may collect payment through their own payment methods
          shown to you, such as a payment link or bank transfer. Stellio Fit is not
          a party to those payments, does not process them, and is not responsible
          for the coaching services a trainer provides. Trainers are responsible
          for their own conduct, tax and legal obligations.
        </p>
      </Section>

      <Section n={6} title="Acceptable use">
        <p>You agree not to:</p>
        <List>
          <Item>Use the Service unlawfully or to harm, harass or impersonate others.</Item>
          <Item>Upload content you do not have the right to share, or that is offensive or infringing.</Item>
          <Item>Attempt to access data that is not yours, or interfere with the Service&rsquo;s security or operation.</Item>
          <Item>Reverse engineer, scrape or resell the Service except as permitted by law.</Item>
        </List>
      </Section>

      <Section n={7} title="Your content">
        <p>
          You retain ownership of the content you create, such as workouts,
          photos and notes. You grant us a limited licence to host, process and
          display that content solely to operate the Service for you and, where
          you choose, to share it with friends or a trainer. You are responsible
          for the content you share.
        </p>
      </Section>

      <Section n={8} title="Health disclaimer and assumption of risk">
        <p>
          Stellio Fit provides general fitness and wellness information and is not
          a substitute for professional medical advice. Exercise carries inherent
          risks. You should consult a qualified healthcare professional before
          beginning any exercise, nutrition or medication program, and you
          participate at your own risk. Stop and seek medical help if you
          experience pain, dizziness or discomfort.
        </p>
      </Section>

      <Section n={9} title="Intellectual property">
        <p>
          The Service, including its software, design, branding and content
          (excluding your content and third-party content), is owned by Stellio
          Fit and protected by intellectual property laws. We grant you a limited,
          non-exclusive, non-transferable licence to use the Service for personal
          use in accordance with these Terms.
        </p>
      </Section>

      <Section n={10} title="Third-party content">
        <p>
          The Service may display third-party content, such as embedded exercise
          videos and recipe information. That content is provided by its
          respective owners, may be subject to their own terms, and we are not
          responsible for it.
        </p>
      </Section>

      <Section n={11} title="Suspension and termination">
        <p>
          You may stop using the Service and delete your account at any time. We
          may suspend or terminate access if you breach these Terms or use the
          Service in a way that could harm others or the platform. On termination,
          your right to use the Service ends; provisions that by their nature
          should survive will continue to apply.
        </p>
      </Section>

      <Section n={12} title="Disclaimers and limitation of liability">
        <p>
          To the maximum extent permitted by law, the Service is provided
          &ldquo;as is&rdquo; without warranties of any kind, and we are not liable
          for indirect, incidental or consequential loss, or loss of data, profits
          or goodwill. Nothing in these Terms excludes rights you have under the
          Australian Consumer Law or other laws that cannot be excluded. Where our
          liability cannot be excluded but can be limited, it is limited to
          re-supplying the Service or the amount you paid us in the previous three
          months.
        </p>
      </Section>

      <Section n={13} title="Changes to these Terms">
        <p>
          We may update these Terms from time to time. We will update the
          &ldquo;last updated&rdquo; date above and, for material changes, take
          reasonable steps to notify you. Continued use after changes take effect
          means you accept the updated Terms.
        </p>
      </Section>

      <Section n={14} title="Governing law">
        <p>
          These Terms are governed by the laws of Queensland, Australia, and you
          submit to the non-exclusive jurisdiction of the courts of that state.
        </p>
      </Section>

      <Section n={15} title="Contact">
        <p>
          Questions about these Terms? Email{" "}
          <a
            href="mailto:hello@stellio.com.au"
            className="text-[var(--accent-primary)] hover:underline"
          >
            hello@stellio.com.au
          </a>
          .
        </p>
      </Section>

      <p className="mt-10 text-sm text-[var(--text-muted)]">
        See also our{" "}
        <Link href="/legal/privacy" className="text-[var(--accent-primary)] hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </>
  );
}
