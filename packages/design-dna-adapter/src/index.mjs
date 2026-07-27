import { evidence, frequencies } from "../../shared/src/index.mjs";
import { validateBrief, validateReferenceDna } from "../../schemas/src/index.mjs";

function collect(capture, key) {
  return capture.captures.flatMap((item) => item.evidence.styles.map((style) => style[key])).filter(Boolean);
}

function removeTransparent(colors) {
  return colors.filter((color) => !/rgba?\(\s*0,\s*0,\s*0,\s*0\s*\)|transparent/.test(color));
}

function inferComposition(capture, vision) {
  if (vision?.composition) return evidence(vision.composition, "estimated", "vision model screenshot analysis");
  const desktop = capture.captures.find((item) => item.name === "desktop") || capture.captures[0];
  const sections = desktop.evidence.sections || [];
  const headings = desktop.evidence.headings || [];
  const hero = sections[0];
  const largestHeading = [...headings].sort((a, b) => b.fontSize.localeCompare(a.fontSize, undefined, { numeric: true }))[0];
  const headingAlignment = largestHeading
    ? largestHeading.x < desktop.viewport.width * 0.2 ? "left-aligned" :
      largestHeading.x + largestHeading.width > desktop.viewport.width * 0.8 ? "right-weighted" : "centered"
    : "unresolved";
  const layout =
    hero?.gridColumns && hero.gridColumns !== "none" ? "grid-led" :
    hero?.display === "flex" ? `${hero.flexDirection || "row"} flex` :
    "stacked or positioned";
  return evidence({
    hero: `${headingAlignment} headline inside a ${layout} opening stage`,
    alignmentModel: headingAlignment,
    focalRelationship: (desktop.evidence.images || []).some((image) => image.y < (hero?.height || desktop.viewport.height))
      ? "headline and visual share the opening field"
      : "type-led opening with no measured hero image",
    sectionArchetypes: sections.map((section) => ({
      index: section.index,
      display: section.display,
      columns: section.gridColumns,
      aspectRatio: section.width ? Number((section.height / section.width).toFixed(2)) : null
    }))
  }, "computed", "DOM geometry sampled across captured viewports");
}

function inferRhythm(capture, vision) {
  if (vision?.rhythm) return evidence(vision.rhythm, "estimated", "vision model screenshot analysis");
  const samples = capture.captures.map((item) => {
    const sections = item.evidence.sections || [];
    const heights = sections.map((section) => section.height).filter(Boolean);
    return {
      viewport: item.name,
      sectionCount: sections.length,
      heightVariation: heights.length > 1
        ? Number(((Math.max(...heights) - Math.min(...heights)) / Math.max(...heights)).toFixed(2))
        : 0,
      pageScreens: Number((item.evidence.scroll.height / item.viewport.height).toFixed(1))
    };
  });
  return evidence(samples, "computed", "section geometry and document height");
}

function inferResponsiveTransformation(capture, vision) {
  if (vision?.mobileTransformation) return evidence(vision.mobileTransformation, "estimated", "vision model screenshot analysis");
  const desktop = capture.captures.find((item) => item.name === "desktop");
  const mobile = capture.captures.find((item) => item.name === "mobile");
  if (!desktop || !mobile) return evidence("Capture desktop and mobile to establish recomposition.", "inferred");
  const signatures = (item) => (item.evidence.sections || []).map((section) => ({
    display: section.display,
    columns: section.gridColumns === "none" ? 0 : section.gridColumns.trim().split(/\s+/).length,
    direction: section.flexDirection
  }));
  return evidence({
    desktop: signatures(desktop),
    mobile: signatures(mobile),
    sectionCountStable: (desktop.evidence.sections || []).length === (mobile.evidence.sections || []).length,
    note: "Different grid counts or flex directions indicate recomposition; identical signatures require visual confirmation."
  }, "computed", "cross-viewport DOM geometry");
}

function firstValues(items, count) {
  return (items || []).slice(0, count).map((item) => item.value);
}

function representativeStyle(capture, predicate) {
  const candidates = capture.captures.flatMap((item) =>
    (item.evidence.styles || [])
      .filter((style) => style.visible !== false && style.text && predicate(style))
      .map((style) => ({ viewport: item.name, ...style }))
  );
  return candidates.sort((left, right) =>
    Number.parseFloat(right.fontSize || 0) - Number.parseFloat(left.fontSize || 0)
    || String(left.text).localeCompare(String(right.text))
  )[0] || null;
}

function computedRole(style) {
  if (!style) return null;
  return {
    familyNames: String(style.fontFamily || "")
      .split(",")
      .map((family) => family.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean),
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    fontStretch: style.fontStretch,
    opticalSizing: style.fontOpticalSizing,
    variationSettings: style.fontVariationSettings,
    featureSettings: style.fontFeatureSettings,
    fontSynthesis: style.fontSynthesis,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    textTransform: style.textTransform,
    measurePx: style.width,
    viewport: style.viewport
  };
}

function inferTypography(capture, vision) {
  const families = frequencies(collect(capture, "fontFamily"), 8);
  const sizes = frequencies(collect(capture, "fontSize"), 16);
  const roles = {
    display: computedRole(representativeStyle(capture, (style) =>
      ["h1", "h2", "h3"].includes(style.tag)
    )),
    body: computedRole(representativeStyle(capture, (style) =>
      ["p", "li", "blockquote"].includes(style.tag)
    )),
    utility: computedRole(representativeStyle(capture, (style) =>
      ["nav", "button", "label", "a"].includes(style.tag)
    )),
    data: computedRole(representativeStyle(capture, (style) =>
      ["time", "data", "td", "th"].includes(style.tag)
      || /\b(?:price|date|time|number|stat|data)\b/i.test((style.classes || []).join(" "))
    ))
  };
  const lineCounts = Object.fromEntries(capture.captures.map((item) => [
    item.name,
    (item.evidence.typography?.headingLineCounts || []).map((heading) => ({
      text: heading.text,
      lineCount: heading.lineCount,
      width: heading.width,
      fontFamily: heading.fontFamily,
      fontSize: heading.fontSize,
      lineHeight: heading.lineHeight,
      letterSpacing: heading.letterSpacing
    }))
  ]));
  const visionTypography = vision?.typography?.referenceContract
    ?? vision?.typography
    ?? null;
  return evidence({
    families,
    sizes,
    weights: frequencies(collect(capture, "fontWeight"), 12),
    lineHeights: frequencies(collect(capture, "lineHeight"), 12),
    tracking: frequencies(collect(capture, "letterSpacing"), 12),
    roles,
    headingLineCounts: lineCounts,
    referenceContract: visionTypography
  }, visionTypography ? "estimated" : "computed", visionTypography
    ? "computed browser typography combined with vision-model reference classification"
    : "computed browser typography; family class and visual character still require vision judgment");
}

export class NativeDesignDnaProvider {
  async extract(input) {
    if (!input?.capture?.captures?.length) throw new Error("A Playwright capture manifest is required");
    const capture = input.capture;
    const colors = frequencies(removeTransparent([...collect(capture, "backgroundColor"), ...collect(capture, "color")]), 12);
    const radii = frequencies(collect(capture, "borderRadius").filter((value) => value !== "0px"), 8);
    const shadows = frequencies(collect(capture, "boxShadow").filter((value) => value !== "none"), 8);
    const gaps = frequencies(collect(capture, "gap").filter((value) => value !== "normal" && value !== "0px"), 10);
    const first = capture.captures[0];
    const vision = input.vision || null;
    const composition = inferComposition(capture, vision);
    const rhythm = inferRhythm(capture, vision);
    const responsive = inferResponsiveTransformation(capture, vision);
    const dna = {
      version: "0.4.0",
      reference: { id: capture.id, url: capture.url, role: input.role ?? "visual principle" },
      identity: {
        summary: vision?.summary || `Evidence-backed visual profile for ${first.evidence.title || capture.url}`,
        personality: vision?.personality || input.personality || ["structured", "reference-led"],
        emotionalEffect: vision?.emotionalEffect || input.emotionalEffect || ["Requires vision judgment"],
        industryFit: input.industryFit ?? "Requires project-specific judgment"
      },
      system: {
        colors: evidence(colors, "computed", "getComputedStyle color/backgroundColor frequency"),
        typography: inferTypography(capture, vision),
        spacing: evidence(gaps, "computed", "computed gap frequency"),
        grid: evidence({ viewportWidths: capture.captures.map((item) => item.viewport.width) }, "computed", "capture viewports"),
        radii: evidence(radii, "computed", "computed border-radius frequency"),
        borders: evidence(frequencies(collect(capture, "borderColor"), 8), "computed"),
        shadows: evidence(shadows, "computed"),
        breakpoints: evidence(capture.captures.map((item) => item.viewport.width), "inferred", "capture samples, not authored media queries")
      },
      style: {
        composition,
        hierarchy: `${first.evidence.landmarks.headings} headings and ${first.evidence.landmarks.sections} major sections in the sampled DOM.`,
        density: first.evidence.scroll.height > first.viewport.height * 4 ? "long-form" : "compact-to-moderate",
        sectionRhythm: rhythm,
        shapeLanguage: radii.length ? `Dominant computed radii include ${radii.slice(0, 3).map((item) => item.value).join(", ")}.` : "Predominantly square or unmeasured.",
        surfaceLanguage: shadows.length ? "Layered surfaces are present." : "Primarily flat or border-separated surfaces.",
        imageTreatment: vision?.imageTreatment
          ? evidence(vision.imageTreatment, "estimated", "vision model screenshot analysis")
          : evidence({
              objectFit: frequencies(collect(capture, "objectFit"), 5),
              measuredVisuals: capture.captures.map((item) => ({ viewport: item.name, count: item.evidence.images?.length || 0 }))
            }, "computed", "DOM image geometry; semantics unresolved"),
        iconography: vision?.iconography
          ? evidence(vision.iconography, "estimated", "vision model screenshot analysis")
          : evidence("Source asset semantics require vision or repository inspection.", "inferred"),
        mobileTransformation: responsive,
        visualTension: vision?.visualTension
          ? evidence(vision.visualTension, "estimated", "vision model screenshot analysis")
          : evidence("Infer from measured alignment, visual-center, and overlap evidence.", "inferred"),
        designPersonality: vision?.designPersonality
          ? evidence(vision.designPersonality, "estimated", "vision model screenshot analysis")
          : evidence(input.personality || ["structured", "reference-led"], "inferred")
      },
      effects: {
        motionLanguage: [],
        scrollEffects: [],
        depthEffects: shadows.map((item) => item.value),
        renderingTechniques: [],
        note: "Static captures cannot prove runtime motion or rendering technology."
      },
      application: {
        borrow: input.borrow ?? [],
        adapt: input.adapt ?? [],
        reject: input.reject ?? [],
        similarityRisks: input.similarityRisks ?? ["Do not reuse distinctive copy, brand assets, or section composition."]
      },
      confidence: { tokens: "computed", style: vision ? "estimated" : "computed", effects: "inferred" }
    };
    return validateReferenceDna(dna);
  }

  async synthesize(references, brief) {
    validateBrief(brief);
    if (!Array.isArray(references)) throw new Error("references must be an array");
    references.forEach(validateReferenceDna);
    const colorCandidates = references.flatMap((dna) => firstValues(dna.system.colors.value, 4));
    const fontCandidates = references.flatMap((dna) => firstValues(dna.system.typography.value.families, 2));
    const referenceTypography = brief.typography?.referenceTypography
      ?? brief.typography?.reference
      ?? brief.referenceTypography
      ?? references
        .map((dna) => dna.system.typography.value.referenceContract)
        .find((contract) => contract && typeof contract === "object")
      ?? null;
    const contradictions = [];
    if (new Set(fontCandidates).size > 2) contradictions.push("References use competing type systems; select by project voice, not frequency alone.");
    if (new Set(colorCandidates).size > 8) contradictions.push("References contain divergent palettes; retain relationships and roles instead of merging swatches.");
    const palette = [...new Set(colorCandidates)].slice(0, 4);
    const creativeThesis = brief.creativeThesis || brief.creativeIdea || `A project-specific visual system built around ${brief.goal}`;
    const compositionPrinciples = references
      .map((dna) => dna.style.composition?.value?.hero || dna.style.composition?.hero || null)
      .filter(Boolean);
    const depthPresent = references.some((dna) => dna.system.shadows.value.length);
    const desiredRecall = brief.desiredRecall || `The distinct visual argument behind ${brief.goal}`;
    const brandTruth = brief.brandTruths?.[0] || brief.businessTruths?.[0] || brief.goal;
    const primaryAction = brief.primaryAction || "complete the page’s primary task";
    const antiPatterns = [
      "generic left-copy/right-image hero",
      "repetitive rounded-card grid",
      "effects used to compensate for weak composition",
      "stock-looking imagery placed beside content instead of integrated with it",
      ...(brief.forbiddenPatterns || [])
    ];
    const defaultEffectBudget = {
      principle: "One material logic, one light source, and no effect without a semantic role.",
      maximumFocalEffects: 2,
      prohibited: ["stacked glow + blur + heavy shadow", "uniform elevation on every surface", "decorative motion on all text"]
    };
    const effectBudget = brief.effectBudget && typeof brief.effectBudget === "object"
      ? {
          ...defaultEffectBudget,
          ...brief.effectBudget,
          prohibited: brief.effectBudget.prohibited || defaultEffectBudget.prohibited
        }
      : defaultEffectBudget;
    const creativeDirection = {
      thesis: creativeThesis,
      designArgument: brief.designArgument || `Express “${brandTruth}” through one unmistakable focal relationship and a page rhythm that earns the action to ${primaryAction}.`,
      brandTruth,
      desiredRecall,
      signatureMoment: {
        description: brief.signatureMoment || `A product or brand object physically interrupts the layout at the narrative climax, making “${desiredRecall}” tangible.`,
        mechanism: "Object, type, and negative space form one composition rather than separate content columns.",
        location: "Opening field with a transformed echo at the structural climax.",
        responsiveMutation: "On mobile, preserve the object/type relationship through overlap, crop, and reading-order recomposition—not simple stacking."
      },
      compositionGrammar: {
        gridLogic: "Use one legible base grid, then break it once for the focal climax.",
        focalRelationship: "Headline, primary object, and action must read as one visual sentence.",
        objectLayoutIntegration: "At least one meaningful object crosses or defines the layout geometry.",
        asymmetry: "Use unequal mass deliberately; semantic vision, not aggregate balance, determines success.",
        whitespace: "Whitespace separates narrative beats and frames the focal object; it is not leftover padding.",
        sectionTransitions: "Each chapter changes scale, alignment, or depth for a reason tied to the narrative.",
        climax: "One later beat must exceed the hero in structural surprise without adding more effects."
      },
      narrativeBeats: brief.sections?.length
        ? brief.sections.map((section, index) => ({ order: index + 1, purpose: section }))
        : [
            { order: 1, purpose: "State the thesis and primary action." },
            { order: 2, purpose: "Prove the product or service truth." },
            { order: 3, purpose: "Create the signature structural moment." },
            { order: 4, purpose: "Resolve with practical action and emotional closure." }
          ],
      materialContract: {
        lightSource: brief.lightSource || "One consistent upper-left light source when depth is used.",
        depthRoles: depthPresent
          ? { content: "flat or tonal", controls: "tactile", focalObject: "strongest permitted depth" }
          : { content: "flat", controls: "subtle tonal lift", focalObject: "depth only if required by the thesis" },
        effectBudget,
        bannedCombinations: effectBudget.prohibited
      },
      typographyDirection: brief.typographyDirection || (
        referenceTypography
          ? "Match the adopted reference's family class, contrast, width, role ownership, measures, authored line structure, and responsive transformation before choosing scale."
          : "Use type scale and measure to direct pacing; reserve the largest display treatment for one beat."
      ),
      imageryDirection: brief.imageryDirection || "Art-direct crops and object placement around the composition; reject interchangeable stock treatment.",
      motionPurpose: brief.motionLanguage || "Motion explains state, hierarchy, or spatial continuity and always has a reduced-motion equivalent.",
      responsiveThesis: "Recompose the thesis for each viewport while preserving desired recall and primary action.",
      antiPatterns,
      killCriteria: [
        "The page could be relabeled for an unrelated brand without structural changes.",
        "Removing glow, blur, shadow, and radius destroys the hierarchy.",
        "No specific visual moment can be recalled after five minutes.",
        "Sections feel assembled from interchangeable landing-page modules."
      ],
      referenceTransformations: references.map((dna) => ({
        refId: dna.reference.id,
        borrowedPrinciple: dna.reference.role,
        transformation: `Translate only the declared ${dna.reference.role} principle through this project’s thesis and brand truth.`,
        similarityRisk: dna.application.similarityRisks?.[0] || "Do not reproduce source geometry, assets, copy, or brand codes."
      })),
      feasibility: {
        stackAgnostic: true,
        requiredCapabilities: ["responsive layout", "art-directed media", "accessible interaction states"],
        note: "If the signature moment cannot be implemented reliably, simplify its mechanism without replacing the thesis."
      }
    };
    const directionCandidates = [
      {
        id: "object-led",
        thesis: creativeThesis,
        emphasis: "Object-layout integration",
        score: 9,
        reason: "Best supports a memorable focal relationship and brand-specific proof."
      },
      {
        id: "editorial-sequence",
        thesis: `Turn ${brief.goal} into a paced editorial reveal.`,
        emphasis: "Narrative rhythm and typographic contrast",
        score: 8,
        reason: "Strong for long-form storytelling but less inherently ownable without a signature object."
      },
      {
        id: "material-ritual",
        thesis: `Make the physical ritual behind ${brief.goal} the interface material.`,
        emphasis: "Material consistency and process",
        score: 7.5,
        reason: "Distinctive when the brand truth is tactile, but vulnerable to effect dependency."
      }
    ];
    return {
      version: "0.4.0",
      creativeThesis,
      creativeIdea: creativeThesis,
      creativeDirection,
      directionCandidates,
      selectedDirection: "object-led",
      sourceRoles: references.map((dna) => ({ id: dna.reference.id, role: dna.reference.role })),
      palette: {
        foundation: palette[0] || "#f5f2ea",
        ink: palette[1] || "#171714",
        accent: palette[2] || "#cf5b3e",
        support: palette[3] || "#8a9a78",
        confidence: palette.length ? "computed" : "inferred"
      },
      compositionRules: [
        compositionPrinciples[0] ? `Use the reference principle “${compositionPrinciples[0]}” only in the role declared for that source.` : "Give the hero one explicit focal relationship.",
        "Do not repeat the same split, card grid, or large-heading pattern in adjacent sections.",
        "Make at least one later section break the established grid to create a structural climax."
      ],
      objectIntegrationRules: [
        "Make the focal object define or interrupt the grid; do not park it beside the headline.",
        "Repeat the object’s role only when it advances the narrative.",
        "Recompose crop, overlap, and reading order for mobile instead of removing the relationship."
      ],
      transitionRules: [
        "Change section logic only at narrative boundaries.",
        "Create one quiet beat before the structural climax.",
        "Use geometry, crop, or scale for transitions before adding decorative effects."
      ],
      depthRules: depthPresent
        ? ["Use depth only on tactile controls and focal objects.", "Keep content surfaces flatter than interactive or product surfaces."]
        : ["Use tonal separation before adding shadows.", "Reserve any introduced depth for tactile controls or the focal object."],
      motionRules: [
        "Use motion to explain state, hierarchy, or spatial continuity.",
        "Do not animate text entrances decoratively.",
        "Provide a reduced-motion path with equivalent information."
      ],
      system: {
        colorStrategy: brief.colorStrategy || "Assign each selected color a semantic role; do not merge reference palettes.",
        paletteCandidates: [...new Set(colorCandidates)].slice(0, 8),
        typographyCandidates: [...new Set(fontCandidates)].slice(0, 4),
        spacingRule: "Choose one dominant spacing rhythm and vary section scale deliberately; do not average reference gaps.",
        depthModel: depthPresent ? "Restrained, role-based depth" : "Flat tonal separation",
        motionLanguage: brief.motionLanguage || "Purposeful state and narrative motion with reduced-motion fallbacks"
      },
      referenceTypography,
      applicationRules: references.map((dna) => ({
        referenceId: dna.reference.id,
        role: dna.reference.role,
        apply: dna.application.borrow,
        adapt: dna.application.adapt
      })),
      contradictions,
      resolutions: contradictions.map((item) => ({ conflict: item, decision: "Resolve against the brief and central creative idea during blueprinting." })),
      originalityRules: [
        "Do not copy source copy, logos, illustrations, or section geometry.",
        "Apply each principle only in its declared project role.",
        "Combine at least two independent principles before reproducing a distinctive composition.",
        "Fail the design if an unrelated brand could replace the content without changing the structure.",
        "Effects may never compensate for an unclear thesis or generic composition."
      ],
      antiTemplateRules: antiPatterns,
      memorabilityHook: creativeDirection.signatureMoment.description,
      effectBudget,
      confidence: { system: palette.length ? "computed" : "inferred", direction: "inferred" }
    };
  }

  async validate(projectDna, implementationEvidence) {
    const missing = ["creativeIdea", "system", "originalityRules", "creativeDirection"].filter((key) => !projectDna?.[key]);
    for (const key of ["thesis", "designArgument", "desiredRecall", "signatureMoment", "compositionGrammar", "materialContract", "killCriteria"]) {
      if (!projectDna?.creativeDirection?.[key]) missing.push(`creativeDirection.${key}`);
    }
    const artDirectionPassed = implementationEvidence?.qualityGate?.passed === true ||
      implementationEvidence?.artDirection?.passed === true;
    return {
      passed: missing.length === 0 && artDirectionPassed,
      missing,
      note: !implementationEvidence
        ? "No implementation evidence supplied."
        : artDirectionPassed
          ? "The implementation includes a passing, screenshot-bound art-direction gate."
          : "Implementation evidence exists, but the art-direction gate has not passed."
    };
  }
}
