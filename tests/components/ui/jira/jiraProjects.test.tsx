import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import JiraProjects from "@/components/ui/jira/jiraProjects";
import type { Report } from "@/types/report";
import type { JiraProjects as JiraProjectsType } from "@/types/jira";

describe("<JiraProjects />", () => {
  it("shows empty state when no values", () => {
    render(<JiraProjects values={[]} report={null as unknown as Report} />);
    expect(screen.getByText(/no jira projects found/i)).toBeInTheDocument();
  });

  it("renders cards with name, key, meta fields, and avatar when provided", () => {
    const values = [
      {
        id: "100",
        key: "DEBT",
        name: "DebtCheck",
        projectTypeKey: "software",
        style: "classic",
        isPrivate: false,
        simplified: true,
        avatarUrls: { "48x48": "https://example.com/debt.png" },
      },
      {
        id: "200",
        key: "OPS",
        name: "Ops",
        projectTypeKey: "service_desk",
        style: "next-gen",
        isPrivate: true,
        simplified: false,
        // no avatar for this one
      },
    ];

    render(
      <JiraProjects
        values={values as unknown as JiraProjectsType[]}
        report={null as Report | null}
      />
    );

    expect(document.getElementById("100")).toBeInTheDocument();
    expect(document.getElementById("200")).toBeInTheDocument();

    const card1 = document.getElementById("100")!;
    const card2 = document.getElementById("200")!;

    // Card 1 content
    const c1 = within(card1);

    // “Type: software”
    const typeP = c1.getByText(/type:/i).closest("p")!;
    expect(typeP).toHaveTextContent(/type:\s*software/i);

    // “Style: classic”
    const styleP = c1.getByText(/style:/i).closest("p")!;
    expect(styleP).toHaveTextContent(/style:\s*classic/i);

    // “Privacy: Public”
    const privacyP = c1.getByText(/privacy:/i).closest("p")!;
    expect(privacyP).toHaveTextContent(/privacy:\s*public/i);

    // “Simplified: Yes”
    const simplifiedP = c1.getByText(/simplified:/i).closest("p")!;
    expect(simplifiedP).toHaveTextContent(/simplified:\s*yes/i);

    // Avatar present with proper alt (only for first)
    const img = c1.getByAltText(/debtcheck avatar/i) as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain("https://example.com/debt.png");

    // Card 2 content (no avatar)
    const c2 = within(card2);

    // “Key: OPS”
    expect(c2.getByText(/key:\s*OPS/i)).toBeInTheDocument();

    // “Type: service_desk”
    const typeP2 = c2.getByText(/type:/i).closest("p")!;
    expect(typeP2).toHaveTextContent(/type:\s*service_desk/i);

    // “Style: next-gen”
    const styleP2 = c2.getByText(/style:/i).closest("p")!;
    expect(styleP2).toHaveTextContent(/style:\s*next-gen/i);

    // “Privacy: Private”
    const privacyP2 = c2.getByText(/privacy:/i).closest("p")!;
    expect(privacyP2).toHaveTextContent(/privacy:\s*private/i);

    // “Simplified: No”
    const simplifiedP2 = c2.getByText(/simplified:/i).closest("p")!;
    expect(simplifiedP2).toHaveTextContent(/simplified:\s*no/i);

    // No avatar for this project
    expect(c2.queryByRole("img")).not.toBeInTheDocument();
  });
});
