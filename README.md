# Radial Tree Discussion Interface — Reader Study (V4.8)

An interactive, source-faithful radial-tree visualization for exploring conversation structure and observable textual cues in Reddit discussions. This repository includes a browser-based, two-condition **interface evaluation**, a separate practice case, and local JSON response export. Participants evaluate **the interface**, not the validity, importance, or scientific correctness of Reddit comments.

## Repository and study links

- **GitHub repository:** [https://github.com/AbdulQadirAhmedAbbasi/radial-tree-discussion-interface](https://github.com/AbdulQadirAhmedAbbasi/radial-tree-discussion-interface)
- **Viewer/home page (expected GitHub Pages URL):** [https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/](https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/)

**Important:** Do not upload participants' JSON responses, private consent forms, or contact details into this public GitHub repository. GitHub Pages hosts static files only; responses are **not** automatically sent to the researcher.

## What the application shows

The study uses the same original nested Reddit comments in both conditions:

- **Basic radial tree (`structure`)** — uniform comment node size; visible reply relationships, branching and depth, original comment text, scores in tooltips/details, search and navigation, and visibly labeled missing-comment placeholders.
- **Radial tree with visual cues (`cues`)** — the same structure and interactions, with additional comment-size encoding for recorded character length, plus visible colors for question marks, URL presence and Markdown quotations. Mixed-color nodes indicate multiple literal cues.

The enhanced node-size encoding uses **bounded square-root scaling** with a minimum visible size and collision safeguards. Node size communicates **recorded text volume**, not exact proportional value under every crowding condition, factual accuracy, credibility or importance. **Reddit scores do not determine node size.** Hovering shows the recorded score in both conditions.

Hovering over (or keyboard-focusing) a legend item shows one explanation of its color; the filters appear before the search box. Search highlights matching nodes in the **radial tree**; reading-pane text changes only when a comment is selected or a result is navigated to. Selecting a comment brings it into view in the context-preserving right-hand reading panel. The original hierarchy remains stable, and each new activity clears prior selections, searches, cue filters and zoom state.

For unavailable comment content, the interface retains the dataset's literal `[removed]` or `[deleted]` string, or explicitly shows `[No comment text captured]` if no body text was captured. Such nodes preserve reply paths and should **not** be interpreted as unimportant. No live Reddit retrieval, semantic classification, AI summarization or scientific fact-checking is performed.

## Study materials and sequence

This is a **two-condition, within-participant exploratory HCI study** for 12 participants, with six assignment groups (P01–P06 repeated for P07–P12). Each participant uses both views with **different discussions**; condition order and case assignment are counterbalanced.

The study comprises:

1. **Welcome and consent:** participants review the researcher-approved study information and agree to participate.
2. **Guided practice:** a separate, fourth Reddit discussion (`1nyui25`) demonstrates the basic radial tree and the additional visual cues. A training video is **not** included in V4.8.
3. **Study introduction:** explains that the task is to assess interface support, not content truth or scientific knowledge.
4. **Trial 1:** three workflow-focused activities — gain an overview, select two comments/branches worth exploring, and follow a reply chain — with free-text reflections about the **interface**.
5. **Trial 1 feedback:** six common rating items, one search-usefulness rating, confidence and optional feedback. In the enhanced-cue trial, participants also rate text-length sizing, URL, question-mark and quotation cues.
6. **Trial 2:** repeat the three activity types using the opposite condition and a different post, then provide the same feedback.
7. **Final comparison and local export:** participants indicate their preferred interface, explain why, and download one JSON response file; they must send the file to the researcher through an **institution-approved private channel**.

### Research cases

| Use | Reddit post ID | Topic |
|---|---|---|
| Evaluation | `1k1dxwq` | Climate change and arsenic in rice |
| Evaluation | `10hwbau` | Reusable take-out food containers |
| Evaluation | `1bfpjzp` | Python farming and food production |
| Practice only | `1nyui25` | Earth reflecting less light |

## Individual participant links

The expected links for the new repository are:

| Participant | Study URL |
|---|---|
| P01 | [https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P01](https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P01) |
| P02 | [https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P02](https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P02) |
| P03 | [https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P03](https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P03) |
| P04 | [https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P04](https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P04) |
| P05 | [https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P05](https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P05) |
| P06 | [https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P06](https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P06) |
| P07 | [https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P07](https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P07) |
| P08 | [https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P08](https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P08) |
| P09 | [https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P09](https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P09) |
| P10 | [https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P10](https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P10) |
| P11 | [https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P11](https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P11) |
| P12 | [https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P12](https://abdulqadirahmedabbasi.github.io/radial-tree-discussion-interface/study.html?p=P12) |

The links use participant codes, **not passwords**. Anyone possessing a link can open the study. Share one unique code with each eligible participant; do not publish the link-to-person correspondence. Check the domain is actually deployed before distribution.

A machine-readable list is available in [`participant_links_template.csv`](participant_links_template.csv).

## Collected response files and offline analysis

At the end of a completed session the browser downloads a file such as:

```text
radial_tree_P01_responses.json
```

The study is designed to investigate *perceived* overview support, ease of exploration, navigation, contextual support and cue usefulness. Participants' self-reported efficiency does **not**, by itself, establish faster or more accurate comprehension. The two-condition comparison assesses the **combined effect** of added cues, not separate causal effects of individual cues.

## Research ethics and privacy

- The static website cannot receive response files automatically. Participants must send their JSON to a private, approved channel and verify receipt. Their files must never be uploaded to the public GitHub repository.
- `P01`–`P12` are pseudonymous study codes, not access-control secrets. Avoid requesting identifying information in responses; a return channel such as email may nonetheless identify the sender to the researcher.

## Files

| File | Purpose |
|---|---|
| `index.html`, `app.js`, `style.css` | Interactive radial discussion viewer; includes the research and practice cases |
| `study.html`, `study.js`, `study.css` | Participant study screens, controlled trials, tasks, feedback and local response export |
| `participant_links_template.csv` | Individual expected study links for P01–P12 |
| `combine_study_responses.py` | Offline CSV conversion from downloaded response JSON |
| `.nojekyll`, `robots.txt` | Static Pages support and optional indexing guidance; robots.txt is **not** a security control |
