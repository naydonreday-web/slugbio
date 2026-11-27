import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/slag/AppNav";
import { Ambient } from "@/components/slag/Ambient";

const privacyEmail = import.meta.env.VITE_PRIVACY_CONTACT_EMAIL;
const operatorName = import.meta.env.VITE_OPERATOR_NAME;

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy notice — SlugBio" },
      { name: "description", content: "How SlugBio handles account, campaign, and form data." },
    ],
  }),
  component: PrivacyNotice,
});

function PrivacyNotice() {
  return (
    <div className="relative min-h-dvh">
      <Ambient />
      <AppNav />
      <main className="mx-auto w-full max-w-3xl px-4 pt-32 pb-20 md:pt-40">
        <p className="text-label-caps tracking-[0.18em] text-muted-foreground">SLUGBIO</p>
        <h1 className="mt-3 text-headline-lg">Privacy notice</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: 25 November 2026</p>

        <div className="glass mt-8 space-y-8 rounded-3xl p-6 text-sm leading-relaxed md:p-9">
          <section>
            <h2 className="text-base font-bold">Who handles your information</h2>
            {operatorName ? (
              <p className="mt-2">SlugBio is operated by {operatorName}.</p>
            ) : (
              <p className="mt-2">The operator's legal name will be added before public launch.</p>
            )}
            {privacyEmail ? (
              <p className="mt-2">
                For privacy questions, email <a className="underline" href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.
              </p>
            ) : (
              <p className="mt-2">A privacy contact email will be added before public launch.</p>
            )}
          </section>

          <section>
            <h2 className="text-base font-bold">Information SlugBio stores</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Your sign-in email and the name, Lesotho phone number, and usage choices you add to your profile.</li>
              <li>Campaign titles, poster content, design settings, schedules, and template submissions you create.</li>
              <li>SlugBio does not receive answers visitors enter in a Google Form linked from your campaign. Google handles those answers under its own privacy terms.</li>
              <li>A short-lived keyed hash of the request IP address used to limit automated public campaign metrics. The hash is not displayed to campaign owners, and expired rate-limit rows are cleared during later public activity.</li>
              <li>Basic browser storage used to keep your session, restore your campaign workspace, and avoid counting repeat views in the same browser session.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold">How the information is used</h2>
            <p className="mt-2">
              SlugBio uses this information to sign you in, save and display your campaigns, measure public poster views and button clicks, and provide account support. SlugBio does not collect answers submitted through Google Forms, payment details, or use advertising trackers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold">Public links and Google Forms</h2>
            <p className="mt-2">
              Anyone with a published campaign link can view its poster and open its linked Google Form. Google receives and stores answers submitted there, and the form owner can view them in Google Forms. Review Google's privacy information before sharing sensitive information. SlugBio may still display responses collected through its retired form feature before retirement; campaign owners can review, export, or delete those historical responses from campaign analytics.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold">Service providers and storage</h2>
            <p className="mt-2">
              Supabase provides account authentication and the database where account and campaign information is stored. Cloudflare hosts and delivers the SlugBio application. These providers process information to operate their services under their own terms and privacy notices. Account and campaign information is kept in the configured Supabase project; service-provider backup and log retention may differ from deletion in the live database.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold">Your controls and deletion</h2>
            <p className="mt-2">
              You can edit your profile and campaigns in SlugBio. You can permanently delete your account from <Link className="underline" to="/account">Account settings</Link>; this deletes the account, profile, campaigns, templates, and campaign responses from the live application database. Browser copies on other devices are not remotely cleared, so remove SlugBio's site data from those browsers too.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold">Changes</h2>
            <p className="mt-2">This notice will be updated when SlugBio's data practices change. The latest revision date appears at the top of this page.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
