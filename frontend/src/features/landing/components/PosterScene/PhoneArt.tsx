"use client";

import { styled } from "@mui/material/styles";
import type { CSSObject } from "@mui/material/styles";

const PEOPLE = ["Alex Chen", "Sam Ortiz", "Jordan Lee"];

/** A thin-bezel phone. It starts tilted away (22°, −26°) and turns flat as `--q` goes to 1. */
const Phone = styled("div")({
  position: "relative",
  zIndex: 1,
  width: "18.25rem",
  height: "37.5rem",
  padding: "9px",
  borderRadius: "48px",
  background: "linear-gradient(145deg, #3a3a3c, #0d0d0f 30%, #1c1c1e 70%, #3a3a3c)",
  boxShadow:
    "0 0 0 1px rgba(255, 255, 255, 0.08) inset, 0 50px 100px -30px rgba(0, 0, 0, 0.8), 0 30px 60px -30px rgba(255, 122, 26, 0.25)",
  transform:
    "perspective(1600px) rotateX(calc(22deg - var(--q) * 22deg)) rotateY(calc(-26deg + var(--q) * 26deg)) rotateZ(calc(6deg - var(--q) * 6deg)) scale(calc(0.86 + var(--q) * 0.14))",
  willChange: "transform",
  "@media (max-width: 599px)": { width: "15.75rem", height: "32.5rem" },
});

const Screen = styled("div")({
  position: "relative",
  height: "100%",
  overflow: "hidden",
  borderRadius: "40px",
  background: "#fff",
  color: "#161616",
  fontFamily: "var(--font-sans)",
});

const Island = styled("span")({
  position: "absolute",
  zIndex: 3,
  top: "10px",
  left: "50%",
  width: "92px",
  height: "26px",
  marginLeft: "-46px",
  borderRadius: "20px",
  background: "#000",
});

const Top = styled("div")({
  padding: "54px 20px 34px",
  background: "var(--sky)",
  color: "#000",
  "& p": { fontSize: "12px" },
  "& strong": { display: "block", marginTop: "2px", fontSize: "17px", fontWeight: 600 },
  "& b": {
    display: "block",
    marginTop: "8px",
    font: "500 40px/1 var(--font-mono)",
    letterSpacing: "-0.05em",
  },
});

const Card = styled("div")({
  position: "relative",
  margin: "-18px 10px 0",
  padding: "16px 14px",
  borderRadius: "12px",
  background: "#fff",
  boxShadow: "0 10px 30px -14px rgba(1, 33, 105, 0.35)",
  "& > strong": { fontSize: "15px", fontWeight: 600 },
  "& > p": { marginTop: "4px", fontSize: "11px", lineHeight: 1.45, color: "#525252" },
});

const List = styled("ul")({
  marginTop: "12px",
  fontSize: "11.5px",
  "& li": {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 0",
    borderTop: "1px solid #ebebeb",
  },
});

const tag = (bg: string, fg: string): CSSObject => ({
  display: "inline-flex",
  alignItems: "center",
  height: "18px",
  padding: "0 6px",
  borderRadius: "3px",
  background: bg,
  color: fg,
  fontSize: "10px",
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
  marginBottom: "4px",
  fontSize: "11px",
  fontWeight: 500,
  "& > span:first-of-type": { display: "inline-flex", gap: "3px" },
  "& i": { width: "9px", height: "9px", background: "var(--blue)" },
  "& i:last-of-type": {
    background: "transparent",
    boxShadow: "inset 0 0 0 2px var(--sun)",
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
  left: "10px",
  right: "10px",
  bottom: "30px",
  display: "grid",
  "& > *": { gridArea: "1 / 1" },
});

const Action = styled("span")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: "44px",
  padding: "0 14px",
  backgroundImage: "var(--sun-grad)",
  color: "#000",
  fontSize: "13px",
  fontWeight: 600,
  opacity: "calc(1 - var(--held))",
});

const Receipt = styled("span")({
  padding: "12px 14px",
  background: "var(--blue-50)",
  borderLeft: "3px solid var(--blue)",
  fontSize: "12px",
  lineHeight: 1.4,
  opacity: "var(--held)",
  transform: "translateY(calc((1 - var(--held)) * 8px))",
});

/** The Pay page on a phone, built from the real tokens so it follows the palette. */
export function PhoneArt() {
  return (
    <Phone
      role="img"
      aria-label="Maya's Pay page on a phone: $80.00 for Cabin weekend. This is a hold, not a charge. Her hold lands and all four are held."
    >
      <Screen aria-hidden="true">
        <Island />
        <Top>
          <p>Maya Shah, your share for</p>
          <strong>Cabin weekend</strong>
          <b>$80.00</b>
        </Top>
        <Card>
          <strong>This is a hold, not a charge.</strong>
          <p>
            It&apos;s only taken if all 4 people pay. You have until Mon 9 Nov, 6:00pm PT. Otherwise it&apos;s
            released and you pay nothing.
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
      </Screen>
    </Phone>
  );
}
