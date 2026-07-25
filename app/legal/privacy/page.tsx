import Link from "next/link";
import { LegalTitle, Lead, Section, List, Item } from "@/components/legal/legal-doc";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How Stellio Fit collects, uses, stores and protects your personal information.",
};

const UPDATED = "25 July 2026";

export default function PrivacyPage() {
  return (
    <>
      <LegalTitle title="Privacy Policy" updated={UPDATED} />

      <Lead>
        Stellio Fit (&ldquo;Stellio Fit&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;
        or &ldquo;our&rdquo;) is committed to protecting your privacy. This policy
        explains what personal information we collect when you use our app and
        website, how we use and share it, and the choices and rights you have. We
        handle personal information in accordance with the Australian Privacy Act
        1988 (Cth) and the Australian Privacy Principles (APPs).
      </Lead>

      <Section n={1} title="Who we are">
        <p>
          Stellio Fit is a fitness and coaching platform operated from Australia.
          If you have any questions about this policy or how we handle your
          information, contact us at{" "}
          <a
            href="mailto:hello@stellio.com.au"
            className="text-[var(--accent-primary)] hover:underline"
          >
            hello@stellio.com.au
          </a>
          .
        </p>
      </Section>

      <Section n={2} title="Information we collect">
        <p>We collect the following categories of information:</p>
        <List>
          <Item>
            <strong>Account details</strong> — your name, email address and
            authentication data used to create and secure your account.
          </Item>
          <Item>
            <strong>Profile &amp; preferences</strong> — age, unit and timezone
            preferences, training considerations, theme and notification settings.
          </Item>
          <Item>
            <strong>Training data</strong> — workouts, programs, schedules,
            logged sets, goals, achievements and custom splits you create or share.
          </Item>
          <Item>
            <strong>Health &amp; body information</strong> — body metrics such as
            weight and measurements, health trackers, check-ins, progress photos
            and, if you choose to enable it, medication tracking. Some of this is
            &ldquo;sensitive information&rdquo; and health information under
            Australian privacy law, and we treat it accordingly.
          </Item>
          <Item>
            <strong>Nutrition data</strong> — recipes you save and food
            preferences.
          </Item>
          <Item>
            <strong>Social &amp; coaching data</strong> — friend connections,
            shared workouts, and, if you work with a trainer, the coaching
            relationship and any information you agree to share with them.
          </Item>
          <Item>
            <strong>Billing information</strong> — subscription status and plan.
            Card payments are processed by our payment provider; we do not store
            your full card details on our servers.
          </Item>
          <Item>
            <strong>Device &amp; usage data</strong> — push-notification tokens
            (if you enable notifications) and basic technical data needed to
            operate, secure and improve the service.
          </Item>
        </List>
      </Section>

      <Section n={3} title="How we use your information">
        <List>
          <Item>To provide, personalise and maintain the app and its features.</Item>
          <Item>To generate tailored programs, progress insights and coaching.</Item>
          <Item>
            To process subscriptions and, where relevant, connect you with a
            trainer.
          </Item>
          <Item>
            To send you service messages and, with your consent, push
            notifications and reminders.
          </Item>
          <Item>To keep the platform secure and prevent fraud or misuse.</Item>
          <Item>To comply with our legal obligations.</Item>
        </List>
        <p>
          We do not sell your personal information, and we do not use your health
          information or progress photos for advertising.
        </p>
      </Section>

      <Section n={4} title="Progress photos and sensitive data">
        <p>
          Progress photos are stored in a private, access-controlled store and are
          visible only to you. If you are working with a trainer, certain
          information (such as your weight history and progress photos) may be
          shared with that trainer only where the coaching relationship is active
          and access is scoped to that trainer. We apply row-level security so
          that your data is not accessible to other members.
        </p>
      </Section>

      <Section n={5} title="How we share information">
        <p>
          We share information only as needed to run the service, with providers
          who process data on our behalf under contract:
        </p>
        <List>
          <Item>
            <strong>Hosting &amp; database</strong> — our cloud hosting and
            database/storage provider (data hosted in Australia).
          </Item>
          <Item>
            <strong>Payments</strong> — our payment processor handles card
            payments and subscription billing.
          </Item>
          <Item>
            <strong>Notifications</strong> — web-push services deliver
            notifications you have opted into.
          </Item>
          <Item>
            <strong>Trainers</strong> — if you connect with a coach, the
            information you agree to share is made available to them.
          </Item>
          <Item>
            <strong>Embedded content</strong> — exercise videos are embedded from
            third-party platforms and recipe information may be retrieved from
            third-party recipe databases; those providers may receive technical
            request data when content loads.
          </Item>
        </List>
        <p>
          We may also disclose information where required by law, or to protect the
          rights, safety and security of Stellio Fit and its users.
        </p>
      </Section>

      <Section n={6} title="Data retention">
        <p>
          We keep your information for as long as your account is active or as
          needed to provide the service. You can delete your content at any time,
          and you can ask us to delete your account. We may retain limited records
          where required for legal, tax or security reasons.
        </p>
      </Section>

      <Section n={7} title="Your rights and choices">
        <List>
          <Item>
            <strong>Access &amp; correction</strong> — you can view and update most
            information in the app, and request a copy of your data.
          </Item>
          <Item>
            <strong>Export</strong> — you can export your data from within the app.
          </Item>
          <Item>
            <strong>Deletion</strong> — you can delete content or request account
            deletion.
          </Item>
          <Item>
            <strong>Notifications</strong> — you can turn push notifications on or
            off in Settings or your device.
          </Item>
        </List>
        <p>
          To exercise any of these rights, use the in-app controls or email us at{" "}
          <a
            href="mailto:hello@stellio.com.au"
            className="text-[var(--accent-primary)] hover:underline"
          >
            hello@stellio.com.au
          </a>
          .
        </p>
      </Section>

      <Section n={8} title="Security">
        <p>
          We use technical and organisational measures to protect your
          information, including encryption in transit, private storage for
          sensitive files, and row-level access controls. No system is perfectly
          secure, but we work to protect your data and to promptly address any
          issues.
        </p>
      </Section>

      <Section n={9} title="Children">
        <p>
          Stellio Fit is not intended for children under 16. We do not knowingly
          collect information from children under 16. If you believe a child has
          provided us information, contact us and we will delete it.
        </p>
      </Section>

      <Section n={10} title="Not medical advice">
        <p>
          Stellio Fit provides fitness and wellness tools for general information
          only. It is not a medical device and does not provide medical advice,
          diagnosis or treatment. Always consult a qualified professional before
          starting any exercise, nutrition or medication program.
        </p>
      </Section>

      <Section n={11} title="Changes to this policy">
        <p>
          We may update this policy from time to time. We will update the
          &ldquo;last updated&rdquo; date above and, for significant changes, take
          reasonable steps to notify you.
        </p>
      </Section>

      <Section n={12} title="Contact us">
        <p>
          For privacy questions or complaints, email{" "}
          <a
            href="mailto:hello@stellio.com.au"
            className="text-[var(--accent-primary)] hover:underline"
          >
            hello@stellio.com.au
          </a>
          . If you are not satisfied with our response, you may contact the Office
          of the Australian Information Commissioner (OAIC).
        </p>
      </Section>

      <p className="mt-10 text-sm text-[var(--text-muted)]">
        See also our{" "}
        <Link href="/legal/terms" className="text-[var(--accent-primary)] hover:underline">
          Terms of Service
        </Link>
        .
      </p>
    </>
  );
}
