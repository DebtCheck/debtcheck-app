import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { describe, expect, it, vi } from "vitest";

describe("<Button />", () => {
  it("renders with default styles and text", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: /click me/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass("rounded-xl");
  });

  it("merges custom classes", () => {
    render(<Button className="bg-red-500">Red</Button>);
    const btn = screen.getByRole("button", { name: /red/i });
    expect(btn).toHaveClass("bg-red-500");
  });

  it("passes other props through", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    screen.getByRole("button", { name: /click/i }).click();
    expect(onClick).toHaveBeenCalled();
  });
});