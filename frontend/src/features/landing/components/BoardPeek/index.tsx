import { Reveal } from "@/components/Reveal";
import { SHARE_STATUS_VIEW } from "@/lib/status";
import { SAMPLE } from "../../sample";
import { Muted, Section, Split } from "../../styled";
import { Bar, Grid, HeadCell, Initials, Marker, Name, Root, Stage, Track } from "./styled";

// Three columns: Fri 6, Sat 7 – Sun 8, Mon 9. The deadline is 6pm Friday, Maya's grace 6pm Monday.
const DEADLINE = 0.25;
const GRACE = 0.91;
const pct = (fraction: number) => `${(fraction * 100).toFixed(2)}%`;

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
          <Stage>
            <Root
              role="img"
              aria-label="Board: Alex, Sam and Jordan Held until the Friday deadline, Maya Waiting until Monday"
            >
              <Grid>
                <HeadCell>Person</HeadCell>
                <HeadCell>Fri 6</HeadCell>
                <HeadCell>Sat 7 – Sun 8</HeadCell>
                <HeadCell>Mon 9</HeadCell>
                {SAMPLE.people.map((person, index) => {
                  const view = SHARE_STATUS_VIEW[person.holds ? "held" : "waiting"];
                  return (
                    <div key={person.name} style={{ display: "contents" }}>
                      <Name>
                        <Initials aria-hidden="true">{person.name[0]}</Initials>
                        {person.name.split(" ")[0]}
                      </Name>
                      <Track>
                        <Bar
                          $tone={view.tone}
                          $left="2%"
                          $width={pct((person.holds ? DEADLINE : GRACE) - 0.02)}
                          style={{ animationDelay: `${index * 70}ms` }}
                        >
                          {view.label}
                        </Bar>
                      </Track>
                    </div>
                  );
                })}
                <Marker $left={String(DEADLINE)} />
                <Marker $left={String(GRACE)} $grace />
              </Grid>
            </Root>
          </Stage>
        </Reveal>
      </Split>
    </Section>
  );
}
