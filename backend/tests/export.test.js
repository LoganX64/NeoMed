const { tiptapToMarkdown } = require("../src/controllers/documentController");

describe("Markdown Export Logic", () => {
  test("should correctly translate TipTap JSON with Bold and Underline to Markdown", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Main Header" }]
        },
        {
          type: "paragraph",
          content: [
            { type: "text", marks: [{ type: "bold" }], text: "Bold Text" },
            { type: "text", text: " and " },
            { type: "text", marks: [{ type: "underline" }], text: "Underlined Text" }
          ]
        }
      ]
    };

    const expected = "# Main Header\n\n**Bold Text** and <u>Underlined Text</u>\n";
    const result = tiptapToMarkdown(json);
    expect(result).toBe(expected);
  });

  test("should handle bullet lists correctly", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Item 1" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Item 2" }] }] }
          ]
        }
      ]
    };

    const expected = "- Item 1\n- Item 2\n";
    const result = tiptapToMarkdown(json);
    expect(result).toBe(expected);
  });
});
