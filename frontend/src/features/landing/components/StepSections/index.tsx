import { Reveal } from "@/components/Reveal";
import { StatusTag } from "@/components/StatusTag";
import { Steps } from "@/components/Steps";
import { SHARE_STATUS_VIEW } from "@/lib/status";
import { Muted, Section, Split } from "../../styled";
import { Line } from "./Line";
import { Chat, ChatHead, Chip, Messages, Stack } from "./styled";

const HOW_IT_WORKS = [
  {
    title: "Paste the group chat",
    body: "The assistant reads the amount, the people and the deadline, and quotes the line it used for each.",
    extra: <Chip>“so $80 each if it&apos;s the four of us”</Chip>,
  },
  {
    title: "Confirm the terms",
    body: "Nothing is active until you confirm. Code checks the math, not the model.",
  },
  {
    title: "Everyone holds their share",
    body: "Each friend opens a link on their phone and approves a PayPal hold. No card form.",
  },
  {
    title: "Kept or released",
    body: "Everyone in by the deadline: captured. Anyone short: every hold is voided and nobody is charged.",
    extra: (
      <>
        <StatusTag view={SHARE_STATUS_VIEW.kept} />
        <StatusTag view={SHARE_STATUS_VIEW.released} />
      </>
    ),
  },
];

const ASSISTANT = [
  {
    title: "Simulates",
    body: "Ask what happens if Maya misses Monday. It runs the real rule and tells you.",
  },
  { title: "Drafts", body: "Reminders with each person's own pay link, ready to copy." },
  {
    title: "Proposes",
    body: "Moves like “advance to the deadline” wait for your approval. It never moves money itself.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how" aria-labelledby="how-title">
      <Split>
        <Reveal>
          <h2 id="how-title">How it works</h2>
          <Muted>
            From a messy group chat to a settled trip, with the organizer approving every step that matters.
          </Muted>
        </Reveal>
        <Reveal>
          <Line>
            <Steps steps={HOW_IT_WORKS} ordered />
          </Line>
        </Reveal>
      </Split>
    </Section>
  );
}

export function AssistantRoles() {
  return (
    <Section aria-labelledby="assistant-title" $layer>
      <Split>
        <Reveal>
          <Stack>
            <h2 id="assistant-title">The assistant suggests. Code decides.</h2>
            <Steps steps={ASSISTANT} />
          </Stack>
        </Reveal>
        <Reveal>
          <Chat role="img" aria-label="Example: asking the assistant what happens if Maya doesn't pay">
            <ChatHead>
              Assistant <span>Cabin weekend</span>
            </ChatHead>
            <Messages>
              <p>What happens if Maya doesn&apos;t pay?</p>
              <p>
                If Maya hasn&apos;t held her share by Mon 9 Nov, 6:00pm PT, the group is short. All 3 holds
                are released and nobody is charged.
                <small>Simulated Mon 9 Nov, 6:00pm PT</small>
              </p>
            </Messages>
          </Chat>
        </Reveal>
      </Split>
    </Section>
  );
}
