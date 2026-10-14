import { TeamBoard, TeamPageChrome } from "@/components/team/TeamBoard";
import { getSession } from "@/lib/session";

export const metadata = { title: "Fixtures, results and table" };

export default async function TeamPage() {
  const session = await getSession();

  return (
    <TeamPageChrome signedIn={Boolean(session)}>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="font-display text-3xl uppercase tracking-wide text-gold">
          Fixtures, results and table
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-fog">
          League and cup records for Black Flag Warriors in the Manchester Amateur Sunday Football
          League, pulled from FA Full-Time. Match fees stay on your private account.
        </p>
        <div className="mt-8">
          <TeamBoard />
        </div>
      </main>
    </TeamPageChrome>
  );
}
