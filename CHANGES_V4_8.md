# V4.8 · Reader clarity and cue transparency

- Unified participant-visible name: **Radial Tree Discussion Interface**. The repository has been renamed to `radial-tree-discussion-interface`; deployment documentation and links are updated separately.
- Reworded practice, introduction, activities and feedback to explicitly evaluate **interface features**, not Reddit content or scientific claims.
- Added an always-visible radial-tree legend with hover/focus explanations; ambiguous multi-cue nodes have a mixed-color legend swatch.
- Moved cue filters immediately above search, described search highlighting behavior, and kept both controls available during practice and trials.
- Changed node length encoding to continuous bounded square-root scaling with nonzero base size, plus collision safeguards. The visual area reflects the recorded text amount but is not a precise quantitative chart.
- Kept `[deleted]` and `[removed]` exactly when present in the source JSON; blank fields display `[No comment text captured]` (identified explicitly as a dataset gap). No live Reddit lookup is performed or implied. Missing nodes are displayed with a discernible dashed gray style in both conditions, preserving path continuity.
- Kept both experimental conditions, full tree, case records, task-response capture, timings, and download-only JSON workflow.
- Training video: intentionally deferred until interface approval.

## Documentation correction (V4.8)

- README and participant-link CSV now use the `AbdulQadirAhmedAbbasi/radial-tree-discussion-interface` repository and expected new GitHub Pages paths.
- README is rewritten to describe the current V4.8 study and response filenames rather than outdated V3.x steps.
- Response-combining script now recognizes V4.8 `radial_tree_P##_responses.json` files with schema `4.1-static` and excludes draft backups.
