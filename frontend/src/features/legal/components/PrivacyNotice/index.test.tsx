import { render, screen } from "@testing-library/react";
import { AI_TEXT_NOTE } from "../../copy";
import { PrivacyNotice } from "./index";

describe("PrivacyNotice", () => {
  it("names the AI providers and the retention periods", () => {
    render(<PrivacyNotice />);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByText(AI_TEXT_NOTE)).toBeInTheDocument();
    expect(screen.getByText(/deleted 7 days after they start/)).toBeInTheDocument();
    expect(screen.getByText(/deleted after 90 days/)).toBeInTheDocument();
  });
});
