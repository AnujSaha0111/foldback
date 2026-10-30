import { Reveal } from "@/components/Reveal";
import { SHARE_STATUS_VIEW } from "@/lib/status";
import { SAMPLE } from "../../sample";
import { Muted, Section, Split } from "../../styled";
import { Bar, Marker, Name, Root, Row, Track } from "./styled";

const DEADLINE_AT = "30%";
const GRACE_AT = "70%";

/** A still picture of the real board. The board itself is too heavy for this page. */
export function BoardPeek() {
  return (
    <Section id="board" aria-labelledby="board-title">
      <Split>
        <Reveal>
          <h2 id="board-title">See every hold on one board</h2>
          <Muted>
            One row per person across the deadline. It updates the moment a friend holds their share on their
            phone.
          </Muted>
        </Reveal>
        <Reveal>
          <Root
            role="img"
            aria-label="Board: Alex, Sam and Jordan Held until the Friday deadline, Maya Waiting until Monday"
          >
            <Row>
              <Name>Person</Name>
              <Track>
                <Marker $left={DEADLINE_AT}>Deadline Fri</Marker>
                <Marker $left={GRACE_AT}>Grace Mon</Marker>
              </Track>
            </Row>
            {SAMPLE.people.map((person) => {
              const view = SHARE_STATUS_VIEW[person.holds ? "held" : "waiting"];
              return (
                <Row key={person.name}>
                  <Name>{person.name}</Name>
                  <Track>
                    <Bar $tone={view.tone} $width={person.holds ? DEADLINE_AT : GRACE_AT}>
                      {view.label}
                    </Bar>
                  </Track>
                </Row>
              );
            })}
          </Root>
        </Reveal>
      </Split>
    </Section>
  );
}
