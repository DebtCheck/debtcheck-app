import { render, screen } from "@testing-library/react";
import { Card, CardContent } from "@/components/ui/card";
import { describe, expect, it } from "vitest";

describe("<Card />", () => {
  it("renders correctly with default classes", () => {
    render(
      <Card>
        <CardContent>Card content</CardContent>
      </Card>
    );
    const card = screen.getByText(/card content/i).closest("div");
    expect(card).toHaveClass("p-6");
  });

  it("applies custom className", () => {
    render(<Card className="border-red-500">Test</Card>);
    const card = screen.getByText(/test/i).closest("div");
    expect(card).toHaveClass("border-red-500");
  });
});