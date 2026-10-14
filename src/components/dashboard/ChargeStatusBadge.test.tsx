import { render, screen } from "@testing-library/react";
import { ChargeStatusBadge, PaymentStatusBadge } from "./ChargeStatusBadge";

describe("status badges", () => {
  it("labels outstanding, part paid and paid charges", () => {
    const { rerender } = render(<ChargeStatusBadge status="outstanding" overdue={false} />);
    expect(screen.getByText("Outstanding")).toBeInTheDocument();
    rerender(<ChargeStatusBadge status="partial" overdue={false} />);
    expect(screen.getByText("Part paid")).toBeInTheDocument();
    rerender(<ChargeStatusBadge status="paid" overdue={false} />);
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("labels confirmed payments", () => {
    render(<PaymentStatusBadge status="succeeded" />);
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });
});
