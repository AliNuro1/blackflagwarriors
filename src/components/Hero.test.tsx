import { render, screen } from "@testing-library/react";
import { Hero } from "./Hero";

describe("Hero", () => {
  it("renders the main heading", () => {
    render(<Hero />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Ready to Build Something/i);
  });

  it("renders the subheading", () => {
    render(<Hero />);
    expect(screen.getByText(/Get started with this template today/i)).toBeInTheDocument();
  });

  it("has main content landmark", () => {
    render(<Hero />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
