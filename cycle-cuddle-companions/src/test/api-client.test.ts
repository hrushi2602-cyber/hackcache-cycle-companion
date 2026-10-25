import { describe, it, expect } from "vitest";
import { parseErrorBody } from "@/lib/api/client";

describe("parseErrorBody", () => {
  it("uses FastAPI string detail", () => {
    expect(parseErrorBody(400, { detail: "Text too short" }).message).toBe("Text too short");
  });
  it("maps 422 validation errors to fields", () => {
    const e = parseErrorBody(422, { detail: [{ loc: ["body", "text"], msg: "too short" }] });
    expect(e.fieldErrors).toEqual([{ field: "text", message: "too short" }]);
  });
  it("gives a server message for 500 without body", () => {
    expect(parseErrorBody(500, null).status).toBe(500);
  });
});
