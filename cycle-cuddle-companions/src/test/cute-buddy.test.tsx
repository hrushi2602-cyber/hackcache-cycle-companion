import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CuteBuddy } from "@/components/app/CuteBuddy";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("BunBun interactions", () => {
  it("a hug changes the pet state and returns to its contextual state", () => {
    vi.useFakeTimers();
    const view = render(<CuteBuddy mood="sleepy" interactive controls />);
    fireEvent.click(view.getByRole("button", { name: "Give BunBun a hug" }));
    expect(view.container.querySelector("[data-buddy-mood]")?.getAttribute("data-buddy-mood")).toBe("comforting");
    act(() => { vi.advanceTimersByTime(3200); });
    expect(view.container.querySelector("[data-buddy-mood]")?.getAttribute("data-buddy-mood")).toBe("sleepy");
  });
  it("cheering changes a concerned pet to happy", () => {
    const view = render(<CuteBuddy mood="concerned" interactive controls />);
    fireEvent.click(view.getByRole("button", { name: "Cheer me up" }));
    expect(view.container.querySelector("[data-buddy-mood]")?.getAttribute("data-buddy-mood")).toBe("happy");
  });
  it("petting reacts locally and new listening context overrides the reaction", () => {
    const view = render(<CuteBuddy mood="sleepy" interactive />);
    fireEvent.click(view.getByRole("button", { name: "Pet BunBun" }));
    expect(view.container.querySelector("[data-buddy-mood]")?.getAttribute("data-buddy-mood")).not.toBe("sleepy");
    view.rerender(<CuteBuddy mood="listening" interactive />);
    expect(view.container.querySelector("[data-buddy-mood]")?.getAttribute("data-buddy-mood")).toBe("listening");
  });
});