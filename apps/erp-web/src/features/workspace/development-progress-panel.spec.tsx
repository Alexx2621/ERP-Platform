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
    // Scoped to the unique labeled progressbar, not raw text — now that
    // Escala is excluded from the average, overallDevelopmentProgress is
    // 100, the same string every other fully-closed phase's own label
    // shows too ("Plataforma de plugins 100%" among them), so a plain
    // getByText("100%") would resolve to multiple elements.
    expect(
      screen.getByRole("progressbar", { name: "Avance total estimado" }),
    ).toHaveAttribute("aria-valuenow", String(overallDevelopmentProgress));
    expect(screen.getByText("Plataforma de plugins 100%")).toBeInTheDocument();
    expect(screen.getByText(/Promedio simple de las 12 fases/)).toBeInTheDocument();
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
