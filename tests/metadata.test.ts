/**
 * Section 11 Metadata Only — fixture tests
 *
 * Covers: all metadata kinds (language, temporal, temporal range, confidence,
 * importance, custom attributes), all scopes (per-expression, per-association,
 * per-concept with value block, per-concept expression-only), combined and
 * empty metadata, nested metadata with no cross-attachment, and invalid cases.
 * Implements plan .cursor/plans/11_metadata_only_0f1aa8a7.plan.md
 *
 * Fixtures: tests/fixtures/metadata/ with prefix 11_
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
	type ConceptRef,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const metadataDir = join(__dirname, "fixtures", "metadata");

function loadFixture(name: string): string {
	return readFileSync(join(metadataDir, name), "utf-8");
}

function getChildAsAssociation(
	concept: ConceptNode,
	index: number,
): AssociationConcept | null {
	const child = concept.children[index];
	return child?.kind === "association" ? child : null;
}

describe("Section 11 Metadata Only (11_)", () => {
	// -------------------------------------------------------------------------
	// 1. Language code
	// -------------------------------------------------------------------------
	describe("1. Language code", () => {
		it("11_01_language_single_expression: one expression with {en}, stored on expression and sets expression.language", () => {
			const input = loadFixture(
				"11_01_language_single_expression.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			// Inner concept in value block has expression "Hello" with metadata
			const inner = concept.children[0] as BaseConcept;
			expect(inner.expressions[0].metadata?.language).toBe("en");
			expect(inner.expressions[0].language).toBe("en");
			expect(concept.metadata).toBeNull();
		});

		it("11_02_language_multiple_expressions: each alternative has its own language", () => {
			const input = loadFixture(
				"11_02_language_multiple_expressions.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			// Alternatives are in the single child concept's expressions
			const inner = concept.children[0] as BaseConcept;
			expect(inner.expressions).toHaveLength(3);
			expect(inner.expressions[0].language).toBe("en");
			expect(inner.expressions[0].metadata?.language).toBe("en");
			expect(inner.expressions[1].language).toBe("fr");
			expect(inner.expressions[1].metadata?.language).toBe("fr");
			expect(inner.expressions[2].language).toBe("es");
			expect(inner.expressions[2].metadata?.language).toBe("es");
		});

		it("11_03_language_concept_after_value_block: metadata after ] applies to concept", () => {
			const input = loadFixture(
				"11_03_language_concept_after_value_block.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.metadata).not.toBeNull();
			expect(concept.metadata?.language).toBe("en");
		});

		it("11_04_language_expression_only_concept: expression-only concept with metadata attached to concept", () => {
			const input = loadFixture(
				"11_04_language_expression_only_concept.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.children).toHaveLength(0);
			expect(concept.metadata).not.toBeNull();
			expect(concept.metadata?.language).toBe("en");
		});

		it("11_05_language_combined: language with other metadata in same block", () => {
			const input = loadFixture("11_05_language_combined.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.metadata).not.toBeNull();
			expect(concept.metadata?.language).toBe("en");
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
			expect(concept.metadata?.confidence).toBe(0.9);
		});
	});

	// -------------------------------------------------------------------------
	// 2. Temporal (single date or datetime)
	// -------------------------------------------------------------------------
	describe("2. Temporal (single date or datetime)", () => {
		it("11_06_temporal_single_date: single date as temporal.start", () => {
			const input = loadFixture("11_06_temporal_single_date.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.metadata?.temporal?.start).toBe("2024-03-15");
			expect(concept.metadata?.temporal?.end).toBeUndefined();
		});

		it("11_07_temporal_datetime_timezone: full ISO datetime with timezone", () => {
			const input = loadFixture(
				"11_07_temporal_datetime_timezone.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].metadata?.temporal?.start).toBe(
				"2024-03-15T14:30:00Z",
			);
		});

		it("11_08_temporal_expression_scope: temporal on expression only", () => {
			const input = loadFixture("11_08_temporal_expression_scope.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0] as BaseConcept;
			// Temporal is on the inner concept's expression (in value block)
			const inner = concept.children[0] as BaseConcept;
			expect(inner.expressions[0].metadata).not.toBeNull();
			expect(inner.expressions[0].metadata?.temporal?.start).toBe(
				"2024-01-01",
			);
			expect(concept.metadata).toBeNull();
		});

		it("11_09_temporal_association_scope: metadata before - attaches to association", () => {
			const input = loadFixture(
				"11_09_temporal_association_scope.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			// Association with metadata is first in value block: {2024-01-01} - role [Engineer]
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.metadata).not.toBeNull();
			expect(assoc!.metadata?.temporal?.start).toBe("2024-01-01");
		});

		it("11_10_temporal_concept_scope: metadata after ] on concept with value block", () => {
			const input = loadFixture("11_10_temporal_concept_scope.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].metadata?.temporal?.start).toBe(
				"2024-03-15",
			);
		});
	});

	// -------------------------------------------------------------------------
	// 3. Temporal range
	// -------------------------------------------------------------------------
	describe("3. Temporal range", () => {
		it("11_11_temporal_range_start_end: start and end dates", () => {
			const input = loadFixture("11_11_temporal_range_start_end.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].metadata?.temporal?.start).toBe(
				"2019-01-01",
			);
			expect(ast.concepts[0].metadata?.temporal?.end).toBe("2019-03-31");
		});

		it("11_12_temporal_range_start_only: open-ended range, end undefined", () => {
			const input = loadFixture("11_12_temporal_range_start_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].metadata?.temporal?.start).toBe(
				"2010-01-01",
			);
			expect(ast.concepts[0].metadata?.temporal?.end).toBeUndefined();
		});

		it("11_13_temporal_range_end_only: only end date", () => {
			const input = loadFixture("11_13_temporal_range_end_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].metadata?.temporal?.end).toBe("2020-12-31");
			expect(ast.concepts[0].metadata?.temporal?.start).toBeUndefined();
		});

		it("11_14_temporal_range_association_scope: temporal range on association", () => {
			const input = loadFixture(
				"11_14_temporal_range_association_scope.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.metadata?.temporal?.start).toBe("2015-01-01");
			expect(assoc!.metadata?.temporal?.end).toBe("2019-12-31");
		});
	});

	// -------------------------------------------------------------------------
	// 4. Confidence
	// -------------------------------------------------------------------------
	describe("4. Confidence", () => {
		it("11_15_confidence_value: ~0.7 and ~1.0 on two concepts", () => {
			const input = loadFixture("11_15_confidence_value.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const first = ast.concepts[0] as BaseConcept;
			const firstInner = first.children[0] as BaseConcept;
			expect(firstInner.expressions[0].metadata?.confidence).toBe(0.7);
			const second = ast.concepts[1] as BaseConcept;
			const secondInner = second.children[0] as BaseConcept;
			expect(secondInner.expressions[0].metadata?.confidence).toBe(1);
		});

		it("11_16_confidence_expression_scope: confidence on expression only", () => {
			const input = loadFixture(
				"11_16_confidence_expression_scope.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			const inner = concept.children[0] as BaseConcept;
			expect(inner.expressions[0].metadata?.confidence).toBe(0.8);
		});

		it("11_17_confidence_association_scope: confidence before - on association", () => {
			const input = loadFixture(
				"11_17_confidence_association_scope.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc!.metadata?.confidence).toBe(0.95);
		});

		it("11_18_confidence_concept_scope: confidence after value block", () => {
			const input = loadFixture("11_18_confidence_concept_scope.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].metadata?.confidence).toBe(0.9);
		});
	});

	// -------------------------------------------------------------------------
	// 5. Importance
	// -------------------------------------------------------------------------
	describe("5. Importance", () => {
		it("11_19_importance_positive: +5 stored as 5", () => {
			const input = loadFixture("11_19_importance_positive.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			const inner = concept.children[0] as BaseConcept;
			expect(inner.expressions[0].metadata?.importance).toBe(5);
		});

		it("11_20_importance_negative: -2 stored as -2", () => {
			const input = loadFixture("11_20_importance_negative.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			const inner = concept.children[0] as BaseConcept;
			expect(inner.expressions[0].metadata?.importance).toBe(-2);
		});

		it("11_21_importance_scopes: concept has +2, association has -1", () => {
			const input = loadFixture("11_21_importance_scopes.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].metadata?.importance).toBe(2);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.metadata?.importance).toBe(-1);
		});
	});

	// -------------------------------------------------------------------------
	// 6. Custom attributes
	// -------------------------------------------------------------------------
	describe("6. Custom attributes", () => {
		it("11_22_custom_key_value: key=value in metadata.custom", () => {
			const input = loadFixture("11_22_custom_key_value.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].metadata?.custom?.id).toBe("abc123");
			expect(ast.concepts[0].metadata?.custom?.status).toBe("active");
		});

		it("11_23_custom_key_ref: key=@ref stored as ConceptRef in custom", () => {
			const input = loadFixture("11_23_custom_key_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const item = ast.concepts[0];
			expect(item.metadata?.custom?.related).toBeDefined();
			const related = item.metadata!.custom!.related as ConceptRef;
			expect(related.type).toBe("reference");
			expect(related.key).toBe("other");
			expect(ast.references["other"]).toBeDefined();
		});

		it("11_24_custom_source_ref: source=@ref as first-class metadata.source", () => {
			const input = loadFixture("11_24_custom_source_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const data = ast.concepts[0];
			expect(data.metadata?.source).toEqual({
				type: "reference",
				key: "nasa",
			});
			expect(data.metadata?.custom?.source).toBeUndefined();
		});

		it("11_25_custom_multiple: author, source=@db, version in one block", () => {
			const input = loadFixture("11_25_custom_multiple.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0];
			expect(concept.metadata?.custom?.author).toBe("Alice");
			expect(concept.metadata?.source).toEqual({
				type: "reference",
				key: "db",
			});
			expect(concept.metadata?.custom?.version).toBe("2");
		});

		it("11_26_custom_expression_concept_scope: note on expression, version on concept", () => {
			const input = loadFixture(
				"11_26_custom_expression_concept_scope.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			const inner = concept.children[0] as BaseConcept;
			expect(inner.expressions[0].metadata?.custom?.note).toBe("inline");
			expect(concept.metadata?.custom?.version).toBe("1");
		});
	});

	// -------------------------------------------------------------------------
	// 7. Scopes
	// -------------------------------------------------------------------------
	describe("7. Scopes", () => {
		it("11_27_scope_expression_only: per-expression metadata only, concept.metadata null", () => {
			const input = loadFixture("11_27_scope_expression_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			expect(concept.metadata).toBeNull();
			const inner = concept.children[0] as BaseConcept;
			expect(inner.expressions[0].language).toBe("en");
			expect(inner.expressions[0].metadata?.language).toBe("en");
			expect(inner.expressions[1].language).toBe("fr");
			expect(inner.expressions[1].metadata?.language).toBe("fr");
		});

		it("11_28_scope_association: two associations each with own metadata", () => {
			const input = loadFixture("11_28_scope_association.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const first = getChildAsAssociation(ast.concepts[0], 0);
			const second = getChildAsAssociation(ast.concepts[0], 1);
			expect(first!.metadata).not.toBeNull();
			expect(first!.metadata?.temporal?.start).toBe("2024-01-01");
			expect(second!.metadata).not.toBeNull();
			expect(second!.metadata?.confidence).toBe(0.5);
		});

		it("11_29_scope_concept_after_value_block: metadata after ] on concept", () => {
			const input = loadFixture(
				"11_29_scope_concept_after_value_block.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].metadata).not.toBeNull();
			expect(ast.concepts[0].metadata?.language).toBe("en");
		});

		it("11_30_scope_expression_only_concept: no value block, metadata on concept", () => {
			const input = loadFixture(
				"11_30_scope_expression_only_concept.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].metadata).not.toBeNull();
			expect(ast.concepts[0].children).toHaveLength(0);
		});

		it("11_31_scope_value_block_trailing_metadata: trailing metadata on concept, not on inner associations", () => {
			const input = loadFixture(
				"11_31_scope_value_block_trailing_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0];
			expect(concept.metadata).not.toBeNull();
			expect(concept.metadata?.temporal?.start).toBe("2024-06-01");
			expect(concept.metadata?.confidence).toBe(0.8);
			const phoneAssoc = getChildAsAssociation(concept, 0);
			const emailAssoc = getChildAsAssociation(concept, 1);
			expect(phoneAssoc!.metadata).toBeNull();
			expect(emailAssoc!.metadata).toBeNull();
		});
	});

	// -------------------------------------------------------------------------
	// 8. Combined metadata
	// -------------------------------------------------------------------------
	describe("8. Combined metadata", () => {
		it("11_32_combined_all_types: language, temporal, confidence, importance, custom in one block", () => {
			const input = loadFixture("11_32_combined_all_types.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0];
			expect(concept.metadata?.language).toBe("en");
			expect(concept.metadata?.temporal?.start).toBe("2024-01-01");
			expect(concept.metadata?.confidence).toBe(0.95);
			expect(concept.metadata?.importance).toBe(2);
			expect(concept.metadata?.custom?.id).toBe("foo");
		});

		it("11_33_combined_expression_and_association: combined metadata at expression and association", () => {
			const input = loadFixture(
				"11_33_combined_expression_and_association.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			const inner = concept.children[0] as BaseConcept;
			expect(inner.expressions[0].metadata?.language).toBe("en");
			expect(inner.expressions[0].metadata?.confidence).toBe(0.9);
			const assoc = getChildAsAssociation(concept, 1);
			expect(assoc!.metadata?.temporal?.start).toBe("2024-01-01");
			expect(assoc!.metadata?.importance).toBe(1);
		});
	});

	// -------------------------------------------------------------------------
	// 9. Empty and edge cases
	// -------------------------------------------------------------------------
	describe("9. Empty and edge cases", () => {
		it("11_34_empty_metadata_block: empty {} yields concept.metadata null", () => {
			const input = loadFixture("11_34_empty_metadata_block.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].metadata).toBeNull();
		});

		it("11_35_nested_no_cross_attachment: inner and outer metadata do not cross-attach", () => {
			const input = loadFixture(
				"11_35_nested_no_cross_attachment.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const outer = ast.concepts[0];
			expect(outer.metadata?.custom?.note).toBe("outer_meta");
			const inner = outer.children[0];
			if (inner?.kind === "base" && inner.expressions[0]?.metadata) {
				expect(inner.expressions[0].metadata.custom?.note).toBe(
					"inner_meta",
				);
			}
		});

		it("11_36_merge_order: duplicate keys, last value wins (en then fr -> fr)", () => {
			const input = loadFixture("11_36_merge_order.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].metadata?.language).toBe("fr");
		});
	});

	// -------------------------------------------------------------------------
	// 10. Invalid metadata (error cases)
	// -------------------------------------------------------------------------
	describe("10. Invalid metadata", () => {
		it("11_invalid_01_unclosed_brace: missing closing }, parse fails", () => {
			const input = loadFixture("11_invalid_01_unclosed_brace.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.length).toBeGreaterThan(0);
			}
		});

		it("11_invalid_02_malformed_custom: key without = value, parse fails", () => {
			const input = loadFixture("11_invalid_02_malformed_custom.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.length).toBeGreaterThan(0);
			}
		});

		it("11_invalid_03_invalid_confidence: ~ without number, parse fails", () => {
			const input = loadFixture(
				"11_invalid_03_invalid_confidence.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.length).toBeGreaterThan(0);
			}
		});
	});
});
