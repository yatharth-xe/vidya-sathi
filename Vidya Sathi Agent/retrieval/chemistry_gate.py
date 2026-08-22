"""Chemistry keyword gate.

Query text only. Chemistry queries go to BM25; everything else goes to
BM25 + BGE + RRF. Term lists and weights are the validated production set.
"""

from __future__ import annotations

from dataclasses import dataclass

from retrieval.corpus import tokens


@dataclass(frozen=True)
class ChemistryGateDecision:
    is_chemistry: bool
    confidence: float
    score: float
    matched_strong_terms: list[str]
    matched_medium_terms: list[str]
    matched_phrases: list[str]
    ignored_generic_terms: list[str]
    reason: str


class ChemistryKeywordGate:
    """Weighted Chemistry vs non-Chemistry decision over query tokens."""

    GENERIC_IGNORED_TERMS = {
        "answer",
        "calculate",
        "chapter",
        "concept",
        "define",
        "determine",
        "equation",
        "example",
        "explain",
        "find",
        "formula",
        "given",
        "law",
        "problem",
        "relation",
        "result",
        "retrieve",
        "section",
        "show",
        "state",
        "system",
        "table",
        "theory",
        "value",
    }

    STRONG_PHRASES = {
        "acid base",
        "acids bases",
        "alcohols phenols ethers",
        "aldehydes ketones",
        "aldehydes ketones carboxylic",
        "alkyl halides",
        "atom structure",
        "atom and structure",
        "aromatic hydrocarbon",
        "atomic orbitals",
        "benzene ring",
        "boiling point",
        "bond length",
        "bond parameters",
        "buffer solutions",
        "carbon atom",
        "carbon atoms",
        "carboxylic acids",
        "chemical bonding",
        "chemical equilibrium",
        "chemical kinetics",
        "chemical reactions",
        "coordination compounds",
        "covalent bond",
        "d and f block",
        "double bond",
        "electrode potential",
        "electrode processes",
        "electronic configuration",
        "electronic configurations",
        "elements properties",
        "elements and properties",
        "electrophilic substitution",
        "enthalpy change",
        "equilibrium constant",
        "equilibrium constants",
        "haloalkanes haloarenes",
        "hydrogen atom",
        "ionic equilibrium",
        "ionic product",
        "ionization acids",
        "iupac names",
        "molecular orbital",
        "molecular structure",
        "organic compounds",
        "oxidation number",
        "periodic trends",
        "phenols ethers",
        "redox reactions",
        "solubility equilibria",
        "sparingly soluble salts",
        "stoichiometric calculations",
        "structure of atom",
        "thermodynamic terms",
        "van der waals",
    }

    STRONG_TERMS = {
        "acid",
        "acids",
        "aldehyde",
        "aldehydes",
        "alcohol",
        "alcohols",
        "alkanes",
        "alkenes",
        "alkyl",
        "amines",
        "aromatic",
        "aryl",
        "base",
        "bases",
        "biomolecules",
        "bond",
        "bonded",
        "bonding",
        "bonds",
        "c6h5",
        "carboxylic",
        "chemical",
        "chemistry",
        "chloropropane",
        "compound",
        "compounds",
        "covalent",
        "electrochemistry",
        "electrophilic",
        "equilibrium",
        "ethers",
        "haloalkanes",
        "haloarenes",
        "halides",
        "halogen",
        "hydrocarbon",
        "hydrocarbons",
        "isopropylchloride",
        "iupac",
        "ketones",
        "molality",
        "molarity",
        "molecular",
        "oxidation",
        "phenols",
        "reactants",
        "redox",
        "salts",
        "stoichiometry",
    }

    MEDIUM_TERMS = {
        "alkali",
        "ammonia",
        "aqueous",
        "atom",
        "atoms",
        "benzene",
        "boiling",
        "carbon",
        "cation",
        "chemical",
        "chemistry",
        "ch2",
        "ch3",
        "concentration",
        "concentrations",
        "dissociation",
        "electron",
        "electrons",
        "enthalpies",
        "enthalpy",
        "equilibria",
        "equilibrium",
        "ion",
        "ionic",
        "ionization",
        "ions",
        "lewis",
        "molecule",
        "molecules",
        "orbital",
        "orbitals",
        "organic",
        "periodicity",
        "preparation",
        "products",
        "react",
        "reaction",
        "reactions",
        "reactivity",
        "reduction",
        "salt",
        "solubility",
        "soluble",
        "solution",
        "solutions",
        "tertiary",
    }

    def __init__(
        self,
        *,
        threshold: float = 2.0,
        strong_weight: float = 3.0,
        medium_weight: float = 1.0,
        phrase_weight: float = 4.0,
    ) -> None:
        self.threshold = threshold
        self.strong_weight = strong_weight
        self.medium_weight = medium_weight
        self.phrase_weight = phrase_weight

    def decide(self, query_text: str) -> ChemistryGateDecision:
        query_tokens = set(tokens(query_text))
        normalized = " ".join(tokens(query_text))

        ignored = sorted(query_tokens & self.GENERIC_IGNORED_TERMS)
        scored_tokens = query_tokens - self.GENERIC_IGNORED_TERMS

        matched_phrases = sorted(
            phrase for phrase in self.STRONG_PHRASES if phrase in normalized
        )
        matched_strong = sorted(scored_tokens & self.STRONG_TERMS)
        matched_medium = sorted(scored_tokens & self.MEDIUM_TERMS)

        score = (
            len(matched_phrases) * self.phrase_weight
            + len(matched_strong) * self.strong_weight
            + len(matched_medium) * self.medium_weight
        )
        is_chemistry = score >= self.threshold
        denominator = max(self.threshold * 2.0, score, 1.0)
        confidence = round(min(1.0, score / denominator), 4)
        reason = (
            "Chemistry score reached threshold"
            if is_chemistry
            else "Chemistry score below threshold"
        )

        return ChemistryGateDecision(
            is_chemistry=is_chemistry,
            confidence=confidence,
            score=round(score, 4),
            matched_strong_terms=matched_strong,
            matched_medium_terms=matched_medium,
            matched_phrases=matched_phrases,
            ignored_generic_terms=ignored,
            reason=reason,
        )
