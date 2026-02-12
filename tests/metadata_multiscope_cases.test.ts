/**
 * Section 16 Metadata at Multiple Scopes — fixture tests
 *
 * Covers: single-scope baseline (expression / association / concept only),
 * two scopes (expression+concept, association+concept, expression+association),
 * all three scopes in one concept, nested metadata at multiple levels with no
 * cross-attachment, metadata kinds at different scopes, and edge cases.
 * Implements plan .cursor/plans/16_metadata_multiscope_20e39414.plan.md
 *
 * Fixtures: tests/fixtures/metadata_multiscope_cases/ with prefix 16_
 *
 * Grammar: Expression = ExpressionValue Metadata?; Association = Metadata? associationOp Concept;
 * Concept = Expressions? ValueBlock Metadata? | Expressions ws* Metadata? (expressionOnly).
 * AST: ExpressionValue.metadata/language, AssociationConcept.metadata, BaseConcept.metadata.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
	parse,
	isValid,
	parseOrThrow,
	type ConceptNode,
	type BaseConcept,
	type AssociationConcept,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const metadataMultiscopeCasesDir = join(
	__dirname,
	"fixtures",
	"metadata_multiscope_cases",
);

function loadFixture(name: string): string {
	return readFileSync(join(metadataMultiscopeCasesDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

function getFirstChildAsBase(concept: ConceptNode): BaseConcept | null {
	const child = concept.children[0];
	return child?.kind === "base" ? child : null;
}

function getFirstChildAsAssociation(
	concept: ConceptNode,
): AssociationConcept | null {
	const child = concept.children[0];
	return child?.kind === "association" ? child : null;
}

function getAllAssociationChildren(concept: ConceptNode): AssociationConcept[] {
	return concept.children.filter(
		(c): c is AssociationConcept => c.kind === "association",
	);
}

describe("Section 16 Metadata at Multiple Scopes (16_)", () => {
	// -------------------------------------------------------------------------
	// 1. Single-scope baseline (one scope per concept)
	// -------------------------------------------------------------------------
	describe("1. Single-scope baseline", () => {
		it("16_01_expression_metadata_only: single expression with expression-level metadata only; concept.metadata null", () => {
			const input = loadFixture("16_01_expression_metadata_only.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.kind).toBe("base");
			expect(concept.expressions).toHaveLength(1);
			const expr = concept.expressions[0];
			expect(expr.metadata).toBeDefined();
			expect(expr.language).toBe("en");
			expect(expr.metadata?.language).toBe("en");
			expect(concept.metadata).toBeNull();
		});

		it("16_02_association_metadata_only: one association with metadata before operator; concept.metadata null", () => {
			const input = loadFixture("16_02_association_metadata_only.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.metadata).toBeNull();
			const assoc = getFirstChildAsAssociation(concept);
			expect(assoc).not.toBeNull();
			expect(assoc!.metadata).toBeDefined();
			expect(assoc!.metadata?.temporal?.start).toBe("2024-01-01");
			expect(assoc!.metadata?.confidence).toBe(0.9);
		});

		it("16_03_concept_metadata_only: metadata only after closing ]; no child expression/association metadata", () => {
			const input = loadFixture("16_03_concept_metadata_only.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.metadata).toBeDefined();
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
			expect(concept.metadata?.confidence).toBe(0.8);
			const assocs = getAllAssociationChildren(concept);
			expect(assocs).toHaveLength(2);
			expect(assocs[0].metadata).toBeNull();
			expect(assocs[1].metadata).toBeNull();
			// Child concepts (a [x], b [y]) have no expression-level metadata on x, y
			const targetA = getFirstChildAsBase(assocs[0]);
			const targetB = getFirstChildAsBase(assocs[1]);
			expect(targetA?.expressions[0]?.metadata).toBeUndefined();
			expect(targetB?.expressions[0]?.metadata).toBeUndefined();
		});
	});

	// -------------------------------------------------------------------------
	// 2. Two scopes: expression + concept (value-block)
	// -------------------------------------------------------------------------
	describe("2. Expression + concept metadata", () => {
		it("16_04_expression_plus_concept_metadata: expression metadata and concept metadata distinct", () => {
			const input = loadFixture(
				"16_04_expression_plus_concept_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].language).toBe("en");
			expect(concept.expressions[0].metadata?.language).toBe("en");
			expect(concept.metadata).toBeDefined();
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
			expect(concept.metadata?.confidence).toBe(0.9);
			// Distinct: expression metadata is not concept metadata
			expect(concept.expressions[0].metadata).not.toBe(concept.metadata);
		});

		it("16_05_multiple_expressions_plus_concept_metadata: per-expression metadata and concept metadata; no cross-attachment", () => {
			const input = loadFixture(
				"16_05_multiple_expressions_plus_concept_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			// Root has one expression "x"; value block contains one child with three expressions (A{en}|B{fr}|C{de})
			const childWithMultipleExprs = getFirstChildAsBase(concept);
			expect(childWithMultipleExprs).not.toBeNull();
			expect(childWithMultipleExprs!.expressions).toHaveLength(3);
			expect(childWithMultipleExprs!.expressions[0].language).toBe("en");
			expect(childWithMultipleExprs!.expressions[1].language).toBe("fr");
			expect(childWithMultipleExprs!.expressions[2].language).toBe("de");
			expect(concept.metadata).toBeDefined();
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
			expect(
				childWithMultipleExprs!.expressions[0].metadata?.language,
			).toBe("en");
			expect(
				childWithMultipleExprs!.expressions[1].metadata?.language,
			).toBe("fr");
			expect(
				childWithMultipleExprs!.expressions[2].metadata?.language,
			).toBe("de");
		});
	});

	// -------------------------------------------------------------------------
	// 3. Two scopes: association + concept (value-block)
	// -------------------------------------------------------------------------
	describe("3. Association + concept metadata", () => {
		it("16_06_association_plus_concept_metadata: association metadata and concept metadata distinct", () => {
			const input = loadFixture(
				"16_06_association_plus_concept_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			const assoc = getFirstChildAsAssociation(concept);
			expect(assoc).not.toBeNull();
			expect(assoc!.metadata?.confidence).toBe(0.9);
			expect(concept.metadata).toBeDefined();
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
			expect(assoc!.metadata).not.toBe(concept.metadata);
		});

		it("16_07_multiple_associations_plus_concept_metadata: per-association metadata and concept metadata", () => {
			const input = loadFixture(
				"16_07_multiple_associations_plus_concept_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			const assocs = getAllAssociationChildren(concept);
			expect(assocs).toHaveLength(2);
			expect(assocs[0].metadata?.confidence).toBe(0.9);
			expect(assocs[0].metadata?.temporal).toBeUndefined();
			expect(assocs[1].metadata?.temporal?.start).toBe("2023-06-01");
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
		});

		it("16_08_mixed_association_metadata_plus_concept: some associations with metadata, some without; concept has metadata", () => {
			const input = loadFixture(
				"16_08_mixed_association_metadata_plus_concept.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			const assocs = getAllAssociationChildren(concept);
			expect(assocs).toHaveLength(3);
			expect(assocs[0].metadata).not.toBeNull();
			expect(assocs[0].metadata?.confidence).toBe(0.8);
			expect(assocs[1].metadata).toBeNull();
			expect(assocs[2].metadata).not.toBeNull();
			expect(assocs[2].metadata?.temporal?.start).toBe("2023-01-01");
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
			expect(
				getFirstExpressionValue(getFirstChildAsBase(assocs[0])!),
			).toBe("a");
			expect(
				getFirstExpressionValue(getFirstChildAsBase(assocs[1])!),
			).toBe("b");
			expect(
				getFirstExpressionValue(getFirstChildAsBase(assocs[2])!),
			).toBe("c");
		});
	});

	// -------------------------------------------------------------------------
	// 4. Two scopes: expression + association (same concept, no concept metadata)
	// -------------------------------------------------------------------------
	describe("4. Expression + association metadata (no concept metadata)", () => {
		it("16_09_expression_plus_association_metadata: expression and association metadata; concept.metadata null", () => {
			const input = loadFixture(
				"16_09_expression_plus_association_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.expressions[0].language).toBe("en");
			expect(concept.metadata).toBeNull();
			const assoc = getFirstChildAsAssociation(concept);
			expect(assoc).not.toBeNull();
			expect(assoc!.metadata?.confidence).toBe(0.8);
		});
	});

	// -------------------------------------------------------------------------
	// 5. All three scopes in one concept
	// -------------------------------------------------------------------------
	describe("5. All three scopes in one concept", () => {
		it("16_10_expression_association_concept_metadata: expression, association, concept metadata all present and scoped correctly", () => {
			const input = loadFixture(
				"16_10_expression_association_concept_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.expressions[0].language).toBe("en");
			const assoc = getFirstChildAsAssociation(concept);
			expect(assoc!.metadata?.confidence).toBe(0.9);
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
			expect(concept.expressions[0].metadata).not.toBe(assoc!.metadata);
			expect(assoc!.metadata).not.toBe(concept.metadata);
		});

		it("16_11_all_three_scopes_multiple_items: multiple expressions and associations with metadata + concept metadata", () => {
			const input = loadFixture(
				"16_11_all_three_scopes_multiple_items.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.expressions.length).toBeGreaterThanOrEqual(2);
			expect(concept.expressions[0].language).toBe("en");
			expect(concept.expressions[1].language).toBe("fr");
			const assocs = getAllAssociationChildren(concept);
			expect(assocs.length).toBeGreaterThanOrEqual(2);
			expect(assocs[0].metadata).not.toBeNull();
			expect(assocs[0].metadata?.confidence).toBe(0.9);
			expect(assocs[1].metadata).not.toBeNull();
			expect(assocs[1].metadata?.temporal?.start).toBe("2023-06-01");
			expect(concept.metadata).not.toBeNull();
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
			expect(concept.metadata?.confidence).toBe(0.95);
		});
	});

	// -------------------------------------------------------------------------
	// 6. Nested structures: metadata at each level (no cross-attachment)
	// -------------------------------------------------------------------------
	describe("6. Nested metadata at multiple levels", () => {
		it("16_12_nested_concept_metadata_two_levels: outer and inner concept-level metadata distinct", () => {
			const input = loadFixture(
				"16_12_nested_concept_metadata_two_levels.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const outer = ast.concepts[0] as BaseConcept;
			expect(outer.metadata?.temporal?.start).toBe("2023-01-01");
			const assoc = getFirstChildAsAssociation(outer);
			const inner = getFirstChildAsBase(assoc!);
			expect(inner).not.toBeNull();
			expect(inner!.metadata?.temporal?.start).toBe("2024-01-01");
			expect(outer.metadata).not.toBe(inner!.metadata);
		});

		it("16_13_nested_association_and_expression_metadata: association metadata on outer, expression metadata on inner", () => {
			const input = loadFixture(
				"16_13_nested_association_and_expression_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const root = ast.concepts[0] as BaseConcept;
			const assoc = getFirstChildAsAssociation(root);
			expect(assoc!.metadata?.confidence).toBe(0.9);
			// Association target is "child"; expression with {en} is on the bare concept "label {en}" inside its value block
			const childConcept = getFirstChildAsBase(assoc!);
			const innerWithLabel = getFirstChildAsBase(childConcept!);
			expect(innerWithLabel).not.toBeNull();
			expect(innerWithLabel!.expressions[0].language).toBe("en");
		});

		it("16_14_nested_metadata_three_levels: metadata at each of three levels; correct attachment", () => {
			const input = loadFixture(
				"16_14_nested_metadata_three_levels.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const level1 = ast.concepts[0] as BaseConcept;
			expect(level1.metadata?.temporal?.start).toBe("2021-01-01");
			const assoc1 = getFirstChildAsAssociation(level1);
			const level2 = getFirstChildAsBase(assoc1!);
			expect(level2!.metadata?.temporal?.start).toBe("2023-01-01");
			const assoc2 = getFirstChildAsAssociation(level2!);
			const level3 = getFirstChildAsBase(assoc2!);
			expect(assoc2!.metadata?.confidence).toBe(0.9);
			expect(level3!.metadata?.temporal?.start).toBe("2024-01-01");
			// Innermost concept is "level3" with value [x]; leaf content "x" is the first child's expression
			const leaf = getFirstChildAsBase(level3!);
			expect(leaf).not.toBeNull();
			expect(getFirstExpressionValue(leaf!)).toBe("x");
		});

		it("16_15_nested_value_block_metadata_distinct: inner and outer concept metadata distinct (verifiable different values)", () => {
			const input = loadFixture(
				"16_15_nested_value_block_metadata_distinct.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const outer = ast.concepts[0] as BaseConcept;
			expect(outer.metadata?.temporal?.start).toBe("2023-01-01");
			expect(outer.metadata?.confidence).toBe(0.9);
			const inner = getFirstChildAsBase(
				getFirstChildAsAssociation(outer)!,
			);
			expect(inner!.metadata?.temporal?.start).toBe("2024-06-15");
			expect(inner!.metadata?.confidence).toBe(0.7);
			expect(outer.metadata).not.toBe(inner!.metadata);
		});
	});

	// -------------------------------------------------------------------------
	// 7. Metadata kinds at different scopes
	// -------------------------------------------------------------------------
	describe("7. Metadata kinds at different scopes", () => {
		it("16_16_language_expression_temporal_concept: language at expression, temporal at concept", () => {
			const input = loadFixture(
				"16_16_language_expression_temporal_concept.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.expressions[0].language).toBe("en");
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
		});

		it("16_17_confidence_association_importance_concept: confidence on association, importance on concept", () => {
			const input = loadFixture(
				"16_17_confidence_association_importance_concept.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			const assoc = getFirstChildAsAssociation(concept);
			expect(assoc!.metadata?.confidence).toBe(0.95);
			expect(concept.metadata?.importance).toBe(2);
		});

		it("16_18_mixed_kinds_three_scopes: custom at expression, confidence at association, temporal at concept", () => {
			const input = loadFixture("16_18_mixed_kinds_three_scopes.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.expressions[0].metadata?.custom?.key).toBe("value");
			const assoc = getFirstChildAsAssociation(concept);
			expect(assoc!.metadata?.confidence).toBe(0.9);
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
		});
	});

	// -------------------------------------------------------------------------
	// 8. Edge and boundary cases
	// -------------------------------------------------------------------------
	describe("8. Edge and boundary cases", () => {
		it("16_19_implied_concept_association_plus_concept_metadata: implied concept with association metadata and concept metadata", () => {
			const input = loadFixture(
				"16_19_implied_concept_association_plus_concept_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.expressions).toHaveLength(0);
			const assoc = getFirstChildAsAssociation(concept);
			expect(assoc!.metadata?.confidence).toBe(0.9);
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
		});

		it("16_20_expression_only_expression_plus_concept_metadata: expression-only concept with per-expression and concept metadata", () => {
			const input = loadFixture(
				"16_20_expression_only_expression_plus_concept_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.expressions).toHaveLength(2);
			expect(concept.expressions[0].language).toBe("en");
			expect(concept.expressions[1].language).toBe("fr");
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
			expect(concept.children).toHaveLength(0);
		});

		it("16_21_empty_block_one_scope_non_empty_other: empty metadata at one scope, non-empty at another", () => {
			const input = loadFixture(
				"16_21_empty_block_one_scope_non_empty_other.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			// Inner concept has one expression (y) with empty {} -> null/undefined metadata
			const inner = getFirstChildAsBase(concept);
			expect(inner).not.toBeNull();
			expect(inner!.expressions[0].value).toBe("y");
			// Concept-level metadata is non-empty
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
		});

		it("16_22_only_associations_all_with_metadata_plus_concept: only associations, each with metadata, plus concept metadata", () => {
			const input = loadFixture(
				"16_22_only_associations_all_with_metadata_plus_concept.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			const assocs = getAllAssociationChildren(concept);
			expect(assocs).toHaveLength(2);
			expect(assocs[0].metadata?.confidence).toBe(0.9);
			expect(assocs[1].metadata?.confidence).toBe(0.8);
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
		});

		it("16_23_three_associations_mixed_plus_concept: three associations mixed with/without metadata + concept metadata; order preserved", () => {
			const input = loadFixture(
				"16_23_three_associations_mixed_plus_concept.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			const assocs = getAllAssociationChildren(concept);
			expect(assocs).toHaveLength(3);
			expect(assocs[0].metadata?.confidence).toBe(0.9);
			expect(assocs[1].metadata).toBeNull();
			expect(assocs[2].metadata?.temporal?.start).toBe("2023-06-01");
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
			expect(
				getFirstExpressionValue(getFirstChildAsBase(assocs[0])!),
			).toBe("a");
			expect(
				getFirstExpressionValue(getFirstChildAsBase(assocs[1])!),
			).toBe("b");
			expect(
				getFirstExpressionValue(getFirstChildAsBase(assocs[2])!),
			).toBe("c");
		});
	});
});
