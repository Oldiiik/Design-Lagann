import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  bindOrientationImages,
  createOrientationPlan,
  evaluateOrientation
} from "../../../packages/orchestrator/src/orientation.mjs";
import { ORIENTATION_SCORE_DIMENSIONS } from "../../../packages/visual-orienter/src/index.mjs";
import { brief, projectDna, submissions } from "./fixture-input.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dimensions = ORIENTATION_SCORE_DIMENSIONS.map((item) => item.id);

const criticism = {
  "direction-a": {
    verdict: "shortlist",
    scores: {
      originality: [8.1, "The giant croissant bridges headline, pickup information, and the curling paper plane. The luxury-editorial vocabulary is familiar, but the fold makes it brand-specific."],
      productFit: [9.6, "Lamination is the hero, five concrete pastries form today’s selection, seasonal fillings and weekend pickup are explicit, and Reserve a box is consistently emphasized."],
      hierarchy: [9.3, "The sequence is immediate: promise and croissant, pickup window, today’s products, three-step process, then reservation."],
      feasibility: [8.0, "Typography, product information, grids, and controls can be semantic DOM/CSS; the paper curl, matched shadows, and pastry cutouts require art direction."],
      responsiveViability: [9.3, "Mobile changes the hero crop, moves pickup below the promise, redistributes products, retains the process band, and introduces a practical bottom reservation action."],
      implementationDifficulty: [6.2, "The asset workload includes hero pastry, five product cutouts, packaging, paper masks, and carefully matched lighting across two compositions."],
      accessibilityFakeUiRisk: [3.2, "Contrast and reading order are strong; repeated reservation controls, an icon-only bag, small product metadata, and the sticky action still need accessible implementation."],
      assetMediumImplications: [9.0, "Use art-directed transparent raster food and packaging, semantic DOM for commerce, and a bounded CSS or raster mask for the fold."]
    },
    observations: {
      dominantRelationship: "The laminated pastry and curling sheet jointly form the page axis; product, pickup, and action appear to emerge from the fold.",
      hierarchy: "Hero promise → pickup constraint → today’s selection → process → reserved weekend.",
      responsiveTransformation: "The wide fold becomes a tall diagonal reveal; product density is redistributed and the primary action moves into a mobile bottom zone.",
      implementationRisks: [
        "The paper curl and product shadows could become brittle fixed-position collage work.",
        "Seven or more photographic assets need consistent lighting, background removal, crop tolerance, and licensing.",
        "The three-column mobile process copy needs a deliberate readable transformation."
      ],
      fakeUiRisks: [
        "All reservation controls must share one real bag state.",
        "The bag icon requires an accessible name and live quantity state.",
        "Pickup and menu arrows must be real links with adequate touch targets."
      ],
      assetMediumImplications: [
        "Use high-fidelity raster photography or transparent product renders for every pastry.",
        "Do not recreate food or packaging as improvised SVG.",
        "Keep all text and commerce controls in semantic HTML.",
        "Implement the fold with a bounded CSS mask or licensed raster layer and a simpler fallback."
      ]
    },
    findings: [
      {
        id: "a-commerce-state",
        severity: 2,
        category: "fake-ui",
        evidence: "Header, hero, and mobile footer present reservation and bag states in several locations.",
        requiredAdaptation: "Drive every reservation control from one functional bag state."
      },
      {
        id: "a-mobile-process-density",
        severity: 1,
        category: "accessibility",
        evidence: "Three process columns remain side by side in the mobile frame.",
        requiredAdaptation: "Preserve the numbered sweep while increasing text size or changing the narrow-screen sequence."
      }
    ]
  },
  "direction-b": {
    verdict: "consider",
    scores: {
      originality: [9.2, "The whole experience behaves like a numbered order slip with a persistent rail, printed menu, torn layers, and a yellow bag receipt. It is the least interchangeable direction."],
      productFit: [8.7, "Daily scarcity, baked-small language, pickup timing, order-ahead behavior, and receipt metaphors fit the operation, though the hard industrial voice is less aligned with the name Soft Crumb."],
      hierarchy: [8.7, "The condensed headline dominates, the pastry anchors the center, the menu forms the evidence block, and the yellow bag region closes the sequence; some operational copy is small."],
      feasibility: [8.8, "The system is mainly typography, rules, color blocks, one transparent pastry, paper texture, and torn-edge masks."],
      responsiveViability: [8.8, "Mobile retains the numbered rail, enlarges the pastry between thesis and menu, turns process steps vertical, and resolves pickup and bag at the end."],
      implementationDifficulty: [4.7, "The main challenge is precision in typography, paper texture, torn edges, and long-page rhythm; it needs fewer custom photographic assets than A or C."],
      accessibilityFakeUiRisk: [6.7, "The bag is empty while Add to weekend bag has no visibly selected pastry; barcode and registration marks can resemble controls, and several labels are small."],
      assetMediumImplications: [8.6, "Use one transparent raster pastry, lightweight paper texture, CSS typography and rules, a torn-edge mask, and maintained or supplied icons."]
    },
    observations: {
      dominantRelationship: "A numbered order slip becomes the entire information architecture, culminating in a yellow weekend-bag receipt.",
      hierarchy: "Printed thesis → today’s menu → process → pickup window → bag action.",
      responsiveTransformation: "The left registration rail persists while desktop side regions become one numbered mobile sequence.",
      implementationRisks: [
        "The condensed display face must be licensed, locally hosted, and kept out of body copy.",
        "Paper texture and torn edges must remain lightweight and avoid trapping content in raster imagery.",
        "The long mobile receipt needs restrained spacing and reliable anchor navigation."
      ],
      fakeUiRisks: [
        "No visible menu-row selector explains what Add to weekend bag will add.",
        "Empty-bag copy conflicts with the action state.",
        "Barcode and crosshair ornaments must not receive interactive styling or focus.",
        "Tiny uppercase navigation and metadata need larger targets and text."
      ],
      assetMediumImplications: [
        "Use one art-directed transparent raster for the hero pastry.",
        "Use CSS for rules, numbering, yellow state, and layout.",
        "Use a lightweight local raster texture or subtle CSS noise for paper.",
        "Treat barcode and registration marks as hidden decorative graphics, not controls."
      ]
    },
    findings: [
      {
        id: "b-selection-logic",
        severity: 2,
        category: "fake-ui",
        evidence: "Menu lines show names and prices but no selection state; the empty bag still exposes Add to weekend bag.",
        requiredAdaptation: "Add explicit row selection or change the action to an honest menu-entry step."
      },
      {
        id: "b-small-operational-type",
        severity: 1,
        category: "accessibility",
        evidence: "Navigation, process notes, and receipt annotations use compressed small text in both frames.",
        requiredAdaptation: "Preserve the print hierarchy while enforcing readable minimum sizes and touch targets."
      }
    ]
  },
  "direction-c": {
    verdict: "consider",
    scores: {
      originality: [9.2, "The continuous stone-and-metal pastry ledge is the page axis, intersecting the bakery aperture, clipped receipt, process band, and pastry cutouts."],
      productFit: [9.4, "The frames clearly communicate laminated pastries, named products, prices, availability, weekend hours, pickup, production process, and reservation."],
      hierarchy: [9.2, "Desktop moves from headline and bakery window through the ledge to menu, dark process band, and reservation; mobile preserves the sequence but becomes dense."],
      feasibility: [7.2, "The page is possible with semantic HTML/CSS and real form behavior, but requires difficult clipping, overlap, perspective matching, and responsive art direction."],
      responsiveViability: [8.2, "The repaired landscape frame proves an actual desktop composition; mobile changes the ledge angle and preserves all major sections, though process and pickup are tight."],
      implementationDifficulty: [8.3, "Numerous pastry cutouts, staged bakery photography, shared ledge geometry, receipt overlap, cross-section stacking, and breakpoint-specific crops create the largest burden."],
      accessibilityFakeUiRisk: [6.1, "Desktop is now an initial state, but mobile still shows Add to bag and Reserved simultaneously and its claim check implies completion; supporting copy is small."],
      assetMediumImplications: [8.4, "The concept needs staged bakery photography and consistent raster cutouts with verified lighting, perspective, masking, resolution, and rights."]
    },
    observations: {
      dominantRelationship: "A bakery service ledge carries products, production evidence, pickup state, and page transitions.",
      hierarchy: "Bakery window and promise → ledge menu → process band → reservation form and pickup assurances.",
      responsiveTransformation: "The wide ledge becomes a descending mobile crop and reading hinge, but process and reservation need a less dense narrow-screen transformation.",
      implementationRisks: [
        "Matching the window photograph, pastry lighting, ledge perspective, and repeated cutouts requires extensive art direction.",
        "The mobile process and split reservation region risk tiny text or overflow.",
        "Availability, pickup time, quantity, price, and confirmation require a real state model."
      ],
      fakeUiRisks: [
        "The mobile frame still shows Add to bag and Reserved simultaneously.",
        "The mobile claim ticket number and date imply a completed reservation.",
        "The price must be connected to a selected pastry.",
        "Handwritten notes cannot carry essential information."
      ],
      assetMediumImplications: [
        "Use real raster photography for the baker and bakery aperture.",
        "Use separately art-directed transparent raster assets for pastries.",
        "Build receipt, menu, availability, and reservation states as semantic DOM.",
        "Use CSS ledge geometry only where perspective remains robust; otherwise commission a reusable background asset."
      ]
    },
    findings: [
      {
        id: "c-mobile-reservation-conflict",
        severity: 2,
        category: "fake-ui",
        evidence: "The unchanged mobile frame shows an active Add to bag control, Reserved confirmation, and claim-check success cues at once.",
        requiredAdaptation: "Define mutually exclusive empty, configured, submitting, success, and editable states."
      },
      {
        id: "c-mobile-density",
        severity: 2,
        category: "accessibility",
        evidence: "Three process columns and the reservation composition remain horizontally dense on mobile.",
        requiredAdaptation: "Recompose those regions instead of scaling the wide geometry."
      }
    ]
  }
};

function withPromptHashes(plan, sourceSubmissions) {
  const byId = new Map(plan.candidates.map((candidate) => [candidate.id, candidate]));
  return sourceSubmissions.map((submission) => {
    const candidate = byId.get(submission.candidateId);
    return {
      ...submission,
      images: {
        desktop: {
          ...submission.images.desktop,
          promptSha256: candidate.prompts.desktop.sha256
        },
        mobile: {
          ...submission.images.mobile,
          promptSha256: candidate.prompts.mobile.sha256
        }
      }
    };
  });
}

function criticReport(plan, evidence) {
  const byEvidence = new Map(
    evidence.candidates.map((candidate) => [candidate.candidateId, candidate])
  );
  return {
    schemaVersion: plan.schemaVersion,
    planId: plan.id,
    critic: {
      provider: "Codex independent subagent",
      model: "Codex host model id unreported",
      criticId: "soft-crumb-blind-visual-critic",
      generatedAt: "2026-07-23T12:22:00.000Z",
      independentOfGeneration: true
    },
    limitations: {
      generatedImagesAreCreativeReferences: true,
      pixelSimilarityIsNotAcceptance: true,
      implementationRequiresVerification: true
    },
    candidateReports: plan.candidates.map((candidate) => {
      const source = criticism[candidate.id];
      const bound = byEvidence.get(candidate.id);
      return {
        candidateId: candidate.id,
        verdict: source.verdict,
        coverage: {
          fullPage: true,
          viewports: ["desktop", "mobile"],
          dimensions
        },
        evidence: {
          imageHashes: {
            desktop: bound.images.desktop.sha256,
            mobile: bound.images.mobile.sha256
          }
        },
        scorecard: Object.fromEntries(
          dimensions.map((id) => [
            id,
            {
              score: source.scores[id][0],
              evidence: source.scores[id][1],
              blocker: false
            }
          ])
        ),
        observations: source.observations,
        findings: source.findings
      };
    })
  };
}

async function writeJson(name, value) {
  await writeFile(
    path.join(root, name),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );
}

const planned = await createOrientationPlan({
  projectRoot: root,
  brief,
  projectDna
});
const bound = await bindOrientationImages({
  projectRoot: root,
  plan: planned.plan,
  submissions: withPromptHashes(planned.plan, submissions)
});
const report = criticReport(planned.plan, bound.evidence);
const evaluated = await evaluateOrientation({
  projectRoot: root,
  plan: planned.plan,
  evidence: bound.evidence,
  report,
  humanApproval: {
    status: "pending",
    candidateId: null,
    decidedBy: null,
    decidedAt: null,
    note: "Direction A is the deterministic recommendation; explicit human adoption is still pending."
  }
});

const rejectedPortrait = {
  file: "images/direction-c-desktop-rejected-portrait.png",
  sha256: "5551ff1c388ff46d867a4e3fbb707d9c05e37d10ce0cc569c6714472a995d5c0",
  dimensions: { width: 864, height: 1821, aspect: "portrait" },
  rejection: "Submitted as desktop evidence but matched mobile portrait geometry.",
  repair: "Regenerated as a verified 1536×1024 landscape frame and removed the simultaneous desktop success/action state."
};

await Promise.all([
  writeJson("orientation-plan.json", planned.plan),
  writeJson("generation-manifest.json", bound.evidence),
  writeJson("orientation-critic.json", report),
  writeJson("orientation-decision.json", evaluated.selection),
  writeJson("reference-design.json", evaluated.selection.visualReferenceContract),
  writeJson("direction-c-evidence-repair.json", rejectedPortrait)
]);

process.stdout.write(
  `${JSON.stringify({
    planId: planned.plan.id,
    candidateCount: planned.plan.candidates.length,
    bindingId: bound.evidence.bindingId,
    status: evaluated.selection.status,
    recommendedCandidateId: evaluated.selection.recommendedCandidateId,
    selectedCandidateId: evaluated.selection.selectedCandidateId,
    ranking: evaluated.selection.ranking
  }, null, 2)}\n`
);
