# Graphics Core source modules

These classic JavaScript modules are the editable source for the identically named inline blocks in the standalone `index.html`:

| Source | Embedded script ID | Boundary |
|---|---|---|
| `affine.js` | `nsp-graphics-core-affine` | Pivot, transform matrix, inverse-axis inputs, CSS, polygon composition/clipping |
| `scene.js` | `nsp-graphics-core-scene` | Scene keys, default layers, stable stacking, and editor/output visibility |
| `selection-geometry.js` | `nsp-graphics-core-selection-geometry` | Transformed bounds, marquee hit tests, and pivoted uniform scale/rotation |
| `smart-guides.js` | `nsp-graphics-core-smart-guides` | Screen-tolerant snap and common-lane spacing in document units |
| `component-revisions.js` | `nsp-graphics-core-component-revisions` | Bounded edition history, comparison, and Variant grouping |
| `print-sampling.js` | `nsp-graphics-core-print-sampling` | Uniform CSS paper scale and effective physical image sampling |

For an edit, change the source module and copy its entire UTF-8/LF content (including the final newline) into the matching inline script. Do not replace the block with a script URL. Source files are not runtime dependencies and users do not have to build or install anything. Order in the HTML: baseline initializes V13 → affine → scene → selection geometry → smart guides → component revisions → print sampling → existing renderer and wrappers. The modules neither access project state nor write storage or attach listeners. Policy about active scope, frozen revisions, component lookup, and mutation remains in existing adapters.

Review that the contents between each opening script tag's newline and the matching closing tag are byte-identical to the source file. An owner can compare the extracted bytes manually or by SHA-256. Keep the script identifiers stable. This repository does not execute static checkers or build the standalone app automatically.
