import React from "react";
import { render, screen } from "@testing-library/react";
import { Cloud9Logo } from "./Cloud9Logo";

describe("Cloud9Logo", () => {
  it("renders official Cloud9 logo SVG with correct viewBox and accessibility role", () => {
    render(<Cloud9Logo size={40} glow={true} showWatermark={true} />);
    const logo = screen.getByRole("img", { name: "Cloud9 Logo" });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("viewBox", "0 0 50 36");
  });

  it("renders watermark layer when showWatermark is true", () => {
    const { container } = render(<Cloud9Logo size={40} showWatermark={true} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
  });

  it("does not render watermark layer when showWatermark is false", () => {
    const { container } = render(<Cloud9Logo size={40} showWatermark={false} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
  });
});
