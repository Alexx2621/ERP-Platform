import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DevelopmentProgressPanel,
  developmentRoadmap,
  overallDevelopmentProgress,
} from "./development-progress-panel";

describe("DevelopmentProgressPanel", () => {
  it("shows the temporary roadmap estimate and its methodology", () => {
    render(<DevelopmentProgressPanel />);

    expect(screen.getByRole("heading", { name: "Avance del desarrollo" })).toBeInTheDocument();
    expect(screen.getByText(`${overallDevelopmentProgress}%`)).toBeInTheDocument();
    expect(screen.getByText("Foundation 78%")).toBeInTheDocument();
    expect(screen.getByText(/Promedio simple de las 13 fases/)).toBeInTheDocument();
    expect(screen.getByText(/No representa horas, presupuesto ni fecha/)).toBeInTheDocument();
  });

  it("exposes every roadmap phase as an accessible progress indicator", () => {
    render(<DevelopmentProgressPanel />);

    const phases = screen.getByLabelText("Fases del roadmap");
    for (const phase of developmentRoadmap) {
      const meter = within(phases).getByRole("progressbar", {
        name: `Avance de ${phase.name}`,
      });
      expect(meter).toHaveAttribute("aria-valuenow", String(phase.progress));
    }
  });
});
