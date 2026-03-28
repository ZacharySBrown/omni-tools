import { describe, it, expect } from "vitest";
import { PresentationSpecSchema } from "../../src/types/presentation.js";
import { resolvePresentation } from "../../src/presentation/resolver.js";
import { PRESENTATION_TEMPLATES, listPresentationTemplates } from "../../src/templates/presentations/index.js";

describe("presentation templates — schema validation", () => {
  const templateNames = listPresentationTemplates();

  it("has all 4 templates registered", () => {
    expect(templateNames).toHaveLength(4);
    expect(templateNames).toContain("annotated-data-flow");
    expect(templateNames).toContain("progressive-system-build");
    expect(templateNames).toContain("training-vs-inference");
    expect(templateNames).toContain("architecture-variants");
  });

  for (const name of Object.keys(PRESENTATION_TEMPLATES)) {
    const template = PRESENTATION_TEMPLATES[name as keyof typeof PRESENTATION_TEMPLATES];

    describe(`template: ${name}`, () => {
      it("parses through PresentationSpecSchema without errors", () => {
        const result = PresentationSpecSchema.safeParse(template);
        if (!result.success) {
          // Surface the actual Zod errors for debugging
          throw new Error(
            `Schema validation failed:\n${result.error.issues.map(
              (i) => `  ${i.path.join(".")}: ${i.message}`
            ).join("\n")}`
          );
        }
        expect(result.success).toBe(true);
      });

      it("has at least 1 slide", () => {
        expect(template.slides.length).toBeGreaterThanOrEqual(1);
      });

      it("has a title", () => {
        expect(template.title).toBeTruthy();
      });

      it("has base diagram with nodes and connections", () => {
        expect(template.base_diagram.nodes.length).toBeGreaterThan(0);
        expect(template.base_diagram.connections.length).toBeGreaterThan(0);
      });
    });
  }
});

describe("presentation templates — resolver output", () => {
  for (const name of Object.keys(PRESENTATION_TEMPLATES)) {
    const template = PRESENTATION_TEMPLATES[name as keyof typeof PRESENTATION_TEMPLATES];

    describe(`resolver: ${name}`, () => {
      it("resolves without throwing", () => {
        expect(() => resolvePresentation(template)).not.toThrow();
      });

      it("produces one ResolvedSlide per input slide", () => {
        const slides = resolvePresentation(template);
        expect(slides).toHaveLength(template.slides.length);
      });

      it("each slide has a title and canvas_name", () => {
        const slides = resolvePresentation(template);
        for (const slide of slides) {
          expect(slide.title).toBeTruthy();
          expect(slide.canvas_name).toBeTruthy();
        }
      });

      it("each slide has a preset loaded", () => {
        const slides = resolvePresentation(template);
        for (const slide of slides) {
          expect(slide.preset).toBeDefined();
          expect(slide.preset.colors).toBeDefined();
          expect(slide.preset.typography).toBeDefined();
        }
      });

      it("node states are valid", () => {
        const slides = resolvePresentation(template);
        const validStates = ["normal", "highlighted", "dimmed", "hidden"];
        for (const slide of slides) {
          for (const node of slide.nodes) {
            expect(validStates).toContain(node.state);
          }
        }
      });

      it("connection states are valid", () => {
        const slides = resolvePresentation(template);
        const validStates = ["normal", "highlighted", "dimmed", "hidden"];
        for (const slide of slides) {
          for (const conn of slide.connections) {
            expect(validStates).toContain(conn.state);
          }
        }
      });
    });
  }
});

describe("template-specific resolver behavior", () => {
  it("progressive-system-build: slide 1 has most nodes hidden", () => {
    const template = PRESENTATION_TEMPLATES["progressive-system-build"];
    const slides = resolvePresentation(template);
    const slide1 = slides[0];
    const visibleNodes = slide1.nodes.filter((n) => n.state !== "hidden");
    const hiddenNodes = slide1.nodes.filter((n) => n.state === "hidden");
    expect(visibleNodes.length).toBeLessThan(hiddenNodes.length);
  });

  it("progressive-system-build: last slide has all nodes visible", () => {
    const template = PRESENTATION_TEMPLATES["progressive-system-build"];
    const slides = resolvePresentation(template);
    const lastSlide = slides[slides.length - 1];
    const hiddenNodes = lastSlide.nodes.filter((n) => n.state === "hidden");
    expect(hiddenNodes).toHaveLength(0);
  });

  it("annotated-data-flow: slides 2-5 have highlights and dims", () => {
    const template = PRESENTATION_TEMPLATES["annotated-data-flow"];
    const slides = resolvePresentation(template);
    for (let i = 1; i < slides.length; i++) {
      const highlighted = slides[i].nodes.filter((n) => n.state === "highlighted");
      const dimmed = slides[i].nodes.filter((n) => n.state === "dimmed");
      expect(highlighted.length).toBeGreaterThan(0);
      expect(dimmed.length).toBeGreaterThan(0);
    }
  });

  it("annotated-data-flow: each slide has annotations", () => {
    const template = PRESENTATION_TEMPLATES["annotated-data-flow"];
    const slides = resolvePresentation(template);
    for (const slide of slides) {
      expect(slide.annotations.length).toBeGreaterThan(0);
    }
  });

  it("architecture-variants: later slides have more nodes than slide 1", () => {
    const template = PRESENTATION_TEMPLATES["architecture-variants"];
    const slides = resolvePresentation(template);
    const slide1NodeCount = slides[0].nodes.length;
    for (let i = 1; i < slides.length; i++) {
      expect(slides[i].nodes.length).toBeGreaterThanOrEqual(slide1NodeCount);
    }
  });
});
