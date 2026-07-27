# Design Lagann benchmark

This benchmark answers a narrower and harder question than “is the page pretty?”:

> Does Design Lagann produce work that blind human raters judge as more art-directed,
> less AI-generated, more memorable, and more worth saving or sharing than the
> same base agent with no design layer, Impeccable alone, or Design DNA alone?

It does not accept an internal critic score as proof of quality.

## Protocol

Each of the five canonical briefs is run three times in a fresh context with:

1. `Base`
2. `Base + Impeccable`
3. `Base + Design DNA`
4. `Design Lagann`

The base agent and model must stay constant. Every run records the exact canonical
prompt, clean commit, hashed desktop/tablet/mobile captures, elapsed time, token
usage, versioned critic reports, and structured regression notes.

Before evaluation, each output receives a randomized opaque artifact ID. The
artifact-to-variant mapping is committed with a salted SHA-256 hash. Evaluator
packets contain artifact IDs, never treatment labels. The salt and mapping are
revealed only after ratings close; the harness verifies the commitment and
chronology.

Every unordered pair receives at least three independent ratings for:

- overall pairwise preference;
- creative thesis, composition, object integration, rhythm, material discipline,
  type/imagery, interaction quality, and memorability;
- perceived likelihood that each artifact is AI-generated;
- unaided recall after a timed five-minute interruption;
- save/share intent.

The corpus therefore requires 60 complete runs and at least 270 blind pairwise
ratings. `protocol.json` contains the exact thresholds and viewport dimensions.

## Results shape

`results.json` is a versioned object:

```json
{
  "protocolVersion": "1.0.0",
  "benchmarkId": "2026-q3-independent-panel",
  "blinding": {
    "method": "opaque-randomized-artifact-ids",
    "evaluatorPacketHash": "<sha256>",
    "variantMappingSalt": "<revealed random salt, at least 32 characters>",
    "variantMappingHash": "<sha256 of salt + canonical mapping>",
    "mappingSealedAt": "<ISO timestamp>",
    "ratingsClosedAt": "<ISO timestamp>",
    "mappingRevealedAt": "<ISO timestamp>"
  },
  "runs": [],
  "pairwiseRatings": []
}
```

The executable schema lives in `lib.mjs`; `run.test.mjs` builds a complete fixture
that shows every required run and rating field without committing fabricated
benchmark results.

## Run

```bash
npm run benchmark
node benchmarks/run.mjs --strict
node --test benchmarks/run.test.mjs
```

Optional `--protocol`, `--briefs`, `--results`, and `--report` paths allow an
independent benchmark corpus to be analyzed without copying it into the plugin.
`--strict` exits with code 2 when evidence is incomplete.

`ready-for-analysis` means the corpus is complete and internally consistent. It
does not itself authorize a quality claim. `claimGate.qualityClaimAllowed` becomes
true only when Design Lagann also clears every reference-relative, recall,
AI-likelihood, save/share, confidence, and regression threshold. Any other state
must retain the explicit no-claim language.
