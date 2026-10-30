import { useRef } from "react";
import { render, screen } from "@testing-library/react";
import { scrollProgress, useScrollProgress } from "./useScrollProgress";

function Scene() {
  const ref = useRef<HTMLDivElement>(null);
  useScrollProgress(ref);
  return <div ref={ref}>scene</div>;
}

function setMotion(reduced: boolean) {
  window.matchMedia = jest.fn().mockReturnValue({ matches: reduced });
}

describe("scrollProgress", () => {
  it("is 0 entering at the bottom and 1 leaving at the top", () => {
    expect(scrollProgress(800, 400, 800)).toBe(0);
    expect(scrollProgress(-400, 400, 800)).toBe(1);
    expect(scrollProgress(200, 400, 800)).toBeCloseTo(0.5);
  });

  it("stays between 0 and 1", () => {
    expect(scrollProgress(5000, 400, 800)).toBe(0);
    expect(scrollProgress(-5000, 400, 800)).toBe(1);
  });
});

describe("useScrollProgress", () => {
  it("writes --p for a scene on screen", () => {
    setMotion(false);
    render(<Scene />);
    expect(screen.getByText("scene").style.getPropertyValue("--p")).not.toBe("");
  });

  it("writes nothing under reduced motion, so the scene rests in its composed state", () => {
    setMotion(true);
    render(<Scene />);
    expect(screen.getByText("scene").style.getPropertyValue("--p")).toBe("");
  });
});
