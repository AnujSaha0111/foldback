import { AI_TEXT_NOTE } from "../../copy";
import { Article } from "./styled";

/** What Foldback stores, where pasted text goes, and how long anything is kept. Plain facts, no legal claims. */
export function PrivacyNotice() {
  return (
    <Article>
      <h1>Privacy</h1>
      <p>
        Foldback is a demo that runs on the PayPal sandbox. No real money moves, and no real payment is ever
        taken.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          Your account: an email, a name and a password hash, or a guest workspace with no email at all.
        </li>
        <li>
          Your plans: the text you paste, the terms you confirm, and the names of the people in each plan.
        </li>
        <li>
          For each hold: the PayPal order, authorization and capture ids. PayPal&apos;s replies are stored
          without the buyer&apos;s name, email or address.
        </li>
        <li>
          For each AI request: the provider, the model, token counts and a keyed hash of your IP address, used
          for the demo&apos;s fair-use limits. Never the IP address itself.
        </li>
      </ul>

      <h2>AI providers</h2>
      <p>{AI_TEXT_NOTE}</p>
      <p>
        The assistant on a plan&apos;s board reads that plan&apos;s title, names, status and history. It
        cannot move money or change a plan; you approve every action it proposes.
      </p>

      <h2>Pay links</h2>
      <p>
        A pay link works for whoever holds it, like a link to a shared document. It shows the plan&apos;s
        title, the amount, the deadline and the other people&apos;s names, never their payment details.
      </p>

      <h2>Cookies</h2>
      <p>
        One session cookie keeps you signed in, and your light or dark choice is kept in your browser. There
        is no analytics or advertising tracker.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Guest workspaces and everything in them are deleted 7 days after they start.</li>
        <li>AI request records are deleted after 90 days.</li>
        <li>Plans nobody confirms are deleted after a day.</li>
      </ul>

      <h2>Questions or deletion</h2>
      <p>
        Open an issue on the project&apos;s GitHub repository, and we will delete a member account and its
        plans on request.
      </p>
    </Article>
  );
}
