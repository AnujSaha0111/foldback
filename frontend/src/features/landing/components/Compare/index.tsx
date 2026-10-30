import { Inner } from "@/components/Page/styled";
import { Reveal } from "@/components/Reveal";
import { Section } from "../../styled";
import { DarkPanel, Head, Panel, Panels } from "./styled";

export function Compare() {
  return (
    <Section id="hold" aria-labelledby="hold-title" $layer>
      <Inner>
        <Reveal>
          <Head>
            <h2 id="hold-title">A hold is not a charge</h2>
            <p>
              The usual way to book a trip is one person paying for everyone and chasing the rest. A hold
              reverses that.
            </p>
          </Head>
        </Reveal>
        <Reveal>
          <Panels>
            <Panel>
              <h3>Pay now, sort it out later</h3>
              <ul>
                <li>Money leaves on day one</li>
                <li>One person fronts the whole $320.00</li>
                <li>If the trip falls through, everyone chases refunds</li>
              </ul>
            </Panel>
            <DarkPanel>
              <h3>Hold now, decide at the deadline</h3>
              <ul>
                <li>Nothing is taken while the group is short</li>
                <li>Each person is only ever on the hook for their own share</li>
                <li>Not enough people: every hold is released and nobody pays</li>
              </ul>
            </DarkPanel>
          </Panels>
        </Reveal>
      </Inner>
    </Section>
  );
}
