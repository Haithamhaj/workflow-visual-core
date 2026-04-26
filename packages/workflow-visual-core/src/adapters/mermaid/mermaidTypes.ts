import type { GraphDirection } from "../../core/types.js";

export interface MermaidRenderOptions {
  /** Override graph direction */
  direction?: GraphDirection;
  /** Skip validation before rendering */
  skipValidation?: boolean;
  /** Include class definitions for node status styling */
  includeClassDefs?: boolean;
  /** Include a title comment at the top */
  includeTitle?: boolean;
}
