"use client";

import { styled } from "@mui/material/styles";
import type { CSSObject } from "@mui/material/styles";

const PEOPLE = ["Alex Chen", "Sam Ortiz", "Jordan Lee"];

/**
 * A phone like a real one: a thin titanium band, a thin black bezel, side buttons, and a glass sheen that slides
 * across as you scroll. It starts tilted away (22°, −26°) and turns flat as `--q` goes to 1.
 */
const Phone = styled("div")({
  position: "relative",
  zIndex: 1,
  // One font size sizes the whole phone, and it follows the screen height, so the phone always fits on a laptop.
  fontSize: "min(1rem, 1.8svh)",
  width: "18.25em",
  height: "37.5em",
  padding: "0.125em",
  borderRadius: "3.0625em",
  background: "linear-gradient(135deg, #8d8d93 0%, #3a3a3e 18%, #1d1d20 48%, #47474c 78%, #9a9aa0 100%)",
  boxShadow:
    "0 0 0 1px rgba(255, 255, 255, 0.12), 0 3.125em 5.625em -1.875em rgba(0, 0, 0, 0.8), 0 1.125em 2.5em -1.25em rgba(255, 122, 26, 0.35)",
  transform:
    "perspective(1600px) rotateX(calc(22deg - var(--q) * 22deg)) rotateY(calc(-26deg + var(--q) * 26deg)) rotateZ(calc(6deg - var(--q) * 6deg)) scale(calc(0.86 + var(--q) * 0.14))",
  willChange: "transform",
  "&::before, &::after": {
    content: '""',
    position: "absolute",
    width: "0.1875em",
    borderRadius: "0.125em",
    background: "linear-gradient(90deg, #3a3a3e, #77777d)",
  },
  "&::before": { left: "-0.125em", top: "22%", height: "8%", boxShadow: "0 3.375em 0 #55555a" },
  "&::after": { right: "-0.125em", top: "27%", height: "13%" },
  // Narrow screens stack "hold" above and two lines of text below, so the phone gets less of the height.
  "@media (max-width: 899px)": { fontSize: "min(1rem, 1.5svh)" },
});

const Bezel = styled("div")({
  height: "100%",
  padding: "0.3125em",
  borderRadius: "2.9375em",
  background: "#000",
});

/** The screen glass: a bright streak that moves across with scroll, over everything on the screen. */
const Glass = styled("span")({
  position: "absolute",
  zIndex: 4,
  inset: "0.4375em",
  overflow: "hidden",
  borderRadius: "2.625em",
  pointerEvents: "none",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.1)",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: "-30% -60%",
    background:
      "linear-gradient(112deg, transparent 38%, rgba(255, 255, 255, 0.3) 47%, rgba(255, 255, 255, 0.08) 54%, transparent 62%)",
    transform: "translateX(calc((var(--q) - 0.5) * 70%))",
  },
});

const Screen = styled("div")({
  position: "relative",
  height: "100%",
  overflow: "hidden",
  borderRadius: "2.625em",
  background: "linear-gradient(170deg, #60cdff 0%, #9fe0ff 42%, #ffd3ad 100%)",
  color: "#161616",
  fontFamily: "var(--font-sans)",
});

const Home = styled("span")({
  position: "absolute",
  zIndex: 3,
  left: "50%",
  bottom: "0.375em",
  width: "6.375em",
  height: "0.1875em",
  marginLeft: "-3.1875em",
  borderRadius: "0.125em",
  background: "rgba(0, 0, 0, 0.75)",
});

const Island = styled("span")({
  position: "absolute",
  zIndex: 3,
  top: "0.625em",
  left: "50%",
  width: "5.75em",
  height: "1.625em",
  marginLeft: "-2.875em",
  borderRadius: "1.25em",
  background: "#000",
});

const Top = styled("div")({
  padding: "3.375em 1.25em 2.125em",
  color: "#000",
  "& p": { fontSize: "0.75em" },
  "& strong": { display: "block", marginTop: "0.125em", fontSize: "1.0625em", fontWeight: 600 },
  "& b": {
    display: "block",
    marginTop: "0.5em",
    font: "500 2.5em/1 var(--font-mono)",
    letterSpacing: "-0.05em",
  },
});

const Card = styled("div")({
  position: "relative",
  margin: "-1.125em 0.625em 0",
  padding: "1em 0.875em",
  borderRadius: "0.75em",
  background: "rgba(255, 255, 255, 0.66)",
  border: "1px solid rgba(255, 255, 255, 0.85)",
  backdropFilter: "blur(0.875em) saturate(170%)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 0.625em 1.625em -0.75em rgba(1, 33, 105, 0.35)",
  "& > strong": { fontSize: "0.9375em", fontWeight: 600 },
  "& > p": { marginTop: "0.25em", fontSize: "0.6875em", lineHeight: 1.45, color: "#525252" },
});

const List = styled("ul")({
  marginTop: "0.75em",
  fontSize: "0.7188em",
  "& li": {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.375em 0",
    borderTop: "1px solid #ebebeb",
  },
});

const tag = (bg: string, fg: string): CSSObject => ({
  display: "inline-flex",
  alignItems: "center",
  height: "1.125em",
  padding: "0 0.375em",
  borderRadius: "0.1875em",
  background: bg,
  color: fg,
  fontSize: "0.625em",
  fontWeight: 600,
});

const Held = styled("span")(tag("var(--blue)", "#fff"));

/** Maya's tag: Waiting until the hold lands, then Held, cross-faded by `--held`. */
const Swap = styled("span")({
  position: "relative",
  display: "inline-grid",
  justifyItems: "end",
  "& > span": { gridArea: "1 / 1" },
  "& > span:first-of-type": { ...tag("#e0e0e0", "#161616"), opacity: "calc(1 - var(--held))" },
  "& > span:last-of-type": { ...tag("var(--blue)", "#fff"), opacity: "var(--held)" },
});

const Squares = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "0.25em",
  fontSize: "0.6875em",
  fontWeight: 500,
  "& > span:first-of-type": { display: "inline-flex", gap: "0.1875em" },
  "& i": { width: "0.5625em", height: "0.5625em", background: "var(--blue)" },
  "& i:last-of-type": {
    background: "transparent",
    boxShadow: "inset 0 0 0 0.125em var(--sun)",
    "&::after": {
      content: '""',
      display: "block",
      width: "100%",
      height: "100%",
      background: "var(--blue)",
      opacity: "var(--held)",
    },
  },
});

/** "3 of 4 held" turns into "4 of 4 held" as the hold lands. */
const Count = styled("span")({
  display: "inline-grid",
  justifyItems: "end",
  "& > span": { gridArea: "1 / 1" },
  "& > span:first-of-type": { opacity: "calc(1 - var(--held))" },
  "& > span:last-of-type": { opacity: "var(--held)" },
});

const Bottom = styled("div")({
  position: "absolute",
  left: "0.625em",
  right: "0.625em",
  bottom: "1.875em",
  display: "grid",
  "& > *": { gridArea: "1 / 1" },
});

const Action = styled("span")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: "2.75em",
  padding: "0 0.875em",
  backgroundImage: "var(--sun-grad)",
  color: "#000",
  fontSize: "0.8125em",
  fontWeight: 600,
  opacity: "calc(1 - var(--held))",
});

const Receipt = styled("span")({
  padding: "0.75em 0.875em",
  background: "var(--blue-50)",
  borderLeft: "0.1875em solid var(--blue)",
  fontSize: "0.75em",
  lineHeight: 1.4,
  opacity: "var(--held)",
  transform: "translateY(calc((1 - var(--held)) * 0.5em))",
});

/** The Pay page on a phone, built from the real tokens so it follows the palette. */
export function PhoneArt() {
  return (
    <Phone
      role="img"
      aria-label="Maya's Pay page on a phone: $80.00 for Cabin weekend. This is a hold, not a charge. Her hold lands and all four are held."
    >
      <Bezel aria-hidden="true">
        <Screen>
          <Island />
          <Top>
            <p>Maya Shah, your share for</p>
            <strong>Cabin weekend</strong>
            <b>$80.00</b>
          </Top>
          <Card>
            <strong>This is a hold, not a charge.</strong>
            <p>
              It&apos;s only taken if all 4 people pay. You have until Mon 9 Nov, 6:00pm PT. Otherwise
              it&apos;s released and you pay nothing.
            </p>
            <List>
              <Squares as="li">
                <span>
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <Count>
                  <span>3 of 4 held</span>
                  <span>4 of 4 held</span>
                </Count>
              </Squares>
              {PEOPLE.map((name) => (
                <li key={name}>
                  {name}
                  <Held>Held</Held>
                </li>
              ))}
              <li>
                Maya Shah (you)
                <Swap>
                  <span>Waiting</span>
                  <span>Held</span>
                </Swap>
              </li>
            </List>
          </Card>
          <Bottom>
            <Action>
              Hold my share with PayPal <span>→</span>
            </Action>
            <Receipt>Your $80.00 is held. You&apos;ll only be charged if everyone pays.</Receipt>
          </Bottom>
          <Home />
        </Screen>
      </Bezel>
      <Glass aria-hidden="true" />
    </Phone>
  );
}
