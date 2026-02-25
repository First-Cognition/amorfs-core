/**
 * Section 8 Implied Concepts — fixture tests
 *
 * Covers: implied concepts (no expressions before value block), single/multiple
 * intrinsic/contextual associations, metadata and @ref on implied, nested implied
 * and named targets, empty implied, multiple top-level implied, item separation
 * and whitespace, association metadata on implied children, edge cases.
 * Implements plan .cursor/plans/08_implied_concepts.plan.md
 *
 * Fixtures: tests/fixtures/implied_concepts/ with prefix 08_
 *
 * Grammar: Concept = Expressions? ValueBlock Metadata? conceptRef? -- withValue.
 * Implied concept has Expressions? absent → expressions: [].
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
const impliedConceptsDir = join(__dirname, "fixtures", "implied_concepts");

function loadFixture(name: string): string {
	return readFileSync(join(impliedConceptsDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

function getChildAsAssociation(
	concept: ConceptNode,
	index: number,
): AssociationConcept | null {
	const child = concept.children[index];
	return child?.kind === "association" ? child : null;
}

/** Association target's first value: from nested value block or target's first expression. */
function getAssociationTargetFirstValue(
	assoc: AssociationConcept,
): string | number | null {
	const target = assoc.children[0];
	if (!target) return null;
	if (target.kind === "base") {
		if (target.children.length > 0) {
			return getFirstExpressionValue(target.children[0]);
		}
		return getFirstExpressionValue(target);
	}
	return null;
}

describe("Section 8 Implied Concepts (08_)", () => {
	// -------------------------------------------------------------------------
	// 1. Minimal implied — single association
	// -------------------------------------------------------------------------
	describe("1. Minimal implied — single association", () => {
		it("08_01_implied_single_intrinsic: one top-level implied, single intrinsic association, target John", () => {
			const input = loadFixture("08_01_implied_single_intrinsic.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.kind).toBe("base");
			expect((concept as BaseConcept).expressions).toHaveLength(0);
			expect(concept.children).toHaveLength(1);
			const assoc = getChildAsAssociation(concept, 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.kind).toBe("association");
			expect(assoc!.isIntrinsic).toBe(true);
			expect(getAssociationTargetFirstValue(assoc!)).toBe("John");
		});

		it("08_02_implied_single_contextual: one top-level implied, single contextual association, target 555-1234", () => {
			const input = loadFixture("08_02_implied_single_contextual.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.kind).toBe("base");
			expect((concept as BaseConcept).expressions).toHaveLength(0);
			expect(concept.children).toHaveLength(1);
			const assoc = getChildAsAssociation(concept, 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.kind).toBe("association");
			expect(assoc!.isIntrinsic).toBe(false);
			expect(getAssociationTargetFirstValue(assoc!)).toBe("555-1234");
		});
	});

	// -------------------------------------------------------------------------
	// 2. Implied with multiple associations (type and order)
	// -------------------------------------------------------------------------
	describe("2. Implied with multiple associations (type and order)", () => {
		it("08_03_implied_multiple_intrinsic_only: three intrinsic associations, order and values preserved", () => {
			const input = loadFixture(
				"08_03_implied_multiple_intrinsic_only.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect((concept as BaseConcept).expressions).toHaveLength(0);
			expect(concept.children).toHaveLength(3);
			for (let i = 0; i < 3; i++) {
				const a = getChildAsAssociation(concept, i);
				expect(a).not.toBeNull();
				expect(a!.kind).toBe("association");
				expect(a!.isIntrinsic).toBe(true);
			}
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 0)!)).toBe("123 Main St");
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 1)!)).toBe("Melbourne");
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 2)!)).toBe(3000);
		});

		it("08_04_implied_multiple_contextual_only: three contextual associations, order and values preserved", () => {
			const input = loadFixture(
				"08_04_implied_multiple_contextual_only.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect((concept as BaseConcept).expressions).toHaveLength(0);
			expect(concept.children).toHaveLength(3);
			for (let i = 0; i < 3; i++) {
				const a = getChildAsAssociation(concept, i);
				expect(a).not.toBeNull();
				expect(a!.isIntrinsic).toBe(false);
			}
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 0)!)).toBe("a@b.com");
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 1)!)).toBe("+1 555 0000");
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 2)!)).toBe("+1 555 0001");
		});

		it("08_05_implied_mixed_intrinsic_contextual: mixed intrinsic/contextual, order preserved, target values Alice, Engineering, 42", () => {
			const input = loadFixture(
				"08_05_implied_mixed_intrinsic_contextual.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect((concept as BaseConcept).expressions).toHaveLength(0);
			expect(concept.children).toHaveLength(3);
			const a0 = getChildAsAssociation(concept, 0);
			const a1 = getChildAsAssociation(concept, 1);
			const a2 = getChildAsAssociation(concept, 2);
			expect(a0!.isIntrinsic).toBe(true);
			expect(a1!.isIntrinsic).toBe(false);
			expect(a2!.isIntrinsic).toBe(true);
			expect(getAssociationTargetFirstValue(a0!)).toBe("Alice");
			expect(getAssociationTargetFirstValue(a1!)).toBe("Engineering");
			expect(getAssociationTargetFirstValue(a2!)).toBe(42);
		});
	});

	// -------------------------------------------------------------------------
	// 3. Implied with metadata and reference
	// -------------------------------------------------------------------------
	describe("3. Implied with metadata and reference", () => {
		it("08_06_implied_with_metadata: trailing metadata (temporal, confidence) on implied concept", () => {
			const input = loadFixture("08_06_implied_with_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect((concept as BaseConcept).expressions).toHaveLength(0);
			expect(concept.metadata).not.toBeNull();
			expect(concept.metadata!.temporal).toBeDefined();
			expect(concept.metadata!.confidence).toBe(0.8);
		});

		it("08_07_implied_with_ref: trailing @ref, key and references registry", () => {
			const input = loadFixture("08_07_implied_with_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect((concept as BaseConcept).expressions).toHaveLength(0);
			expect(concept.key).toBe("my_implied");
			expect(ast.references["my_implied"]).toBeDefined();
			expect(ast.references["my_implied"]).toBe(concept);
		});

		it("08_08_implied_with_metadata_and_ref: both trailing metadata and @ref", () => {
			const input = loadFixture(
				"08_08_implied_with_metadata_and_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect((concept as BaseConcept).expressions).toHaveLength(0);
			expect(concept.key).toBe("implied_source");
			expect(concept.metadata).not.toBeNull();
			expect(concept.metadata!.custom).toBeDefined();
			expect(concept.metadata!.custom!["confidence"]).toBe("high");
			expect(ast.references["implied_source"]).toBeDefined();
		});
	});

	// -------------------------------------------------------------------------
	// 4. Nested implied and structure preservation
	// -------------------------------------------------------------------------
	describe("4. Nested implied and structure preservation", () => {
		it("08_09_implied_nested_implied: outer implied, inner association target is implied (theme dark, language en)", () => {
			const input = loadFixture("08_09_implied_nested_implied.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const top = ast.concepts[0];
			expect((top as BaseConcept).expressions).toHaveLength(0);
			expect(top.children).toHaveLength(1);
			const settingsAssoc = getChildAsAssociation(top, 0);
			expect(settingsAssoc).not.toBeNull();
			expect(settingsAssoc!.isIntrinsic).toBe(false);
			const innerConcept = settingsAssoc!.children[0];
			expect(innerConcept?.kind).toBe("base");
			expect((innerConcept as BaseConcept).expressions).toHaveLength(0);
			expect(innerConcept!.children).toHaveLength(2);
			const themeAssoc = getChildAsAssociation(innerConcept!, 0);
			const langAssoc = getChildAsAssociation(innerConcept!, 1);
			expect(getAssociationTargetFirstValue(themeAssoc!)).toBe("dark");
			expect(getAssociationTargetFirstValue(langAssoc!)).toBe("en");
		});

		it("08_10_implied_nested_named: implied parent, association targets have expressions (Alice, admin)", () => {
			const input = loadFixture("08_10_implied_nested_named.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const top = ast.concepts[0];
			expect((top as BaseConcept).expressions).toHaveLength(0);
			expect(top.children).toHaveLength(2);
			const a0 = getChildAsAssociation(top, 0);
			const a1 = getChildAsAssociation(top, 1);
			const target0 = a0!.children[0];
			const target1 = a1!.children[0];
			expect(target0?.kind).toBe("base");
			expect((target0 as BaseConcept).expressions.length).toBeGreaterThan(0);
			expect(getAssociationTargetFirstValue(a0!)).toBe("Alice");
			expect(target1?.kind).toBe("base");
			expect((target1 as BaseConcept).expressions.length).toBeGreaterThan(0);
			expect(getAssociationTargetFirstValue(a1!)).toBe("admin");
		});

		it("08_11_implied_deep_nesting: three levels of implied, innermost target has expression 'value'", () => {
			const input = loadFixture("08_11_implied_deep_nesting.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const level0 = ast.concepts[0];
			expect((level0 as BaseConcept).expressions).toHaveLength(0);
			const assoc0 = getChildAsAssociation(level0, 0);
			expect(assoc0).not.toBeNull();
			const level1 = assoc0!.children[0];
			expect(level1?.kind).toBe("base");
			expect((level1 as BaseConcept).expressions).toHaveLength(0);
			const assoc1 = getChildAsAssociation(level1!, 0);
			expect(assoc1).not.toBeNull();
			const level2 = assoc1!.children[0];
			expect(level2?.kind).toBe("base");
			expect((level2 as BaseConcept).expressions).toHaveLength(0);
			const assoc2 = getChildAsAssociation(level2!, 0);
			expect(assoc2).not.toBeNull();
			expect(getAssociationTargetFirstValue(assoc2!)).toBe("value");
		});
	});

	// -------------------------------------------------------------------------
	// 5. Empty implied and multiple top-level implied
	// -------------------------------------------------------------------------
	describe("5. Empty implied and multiple top-level implied", () => {
		it("08_12_implied_empty_block: no expression, empty value block, no children", () => {
			const input = loadFixture("08_12_implied_empty_block.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect((concept as BaseConcept).expressions).toHaveLength(0);
			expect(concept.children).toHaveLength(0);
		});

		it("08_13_implied_empty_with_metadata: empty implied with trailing metadata", () => {
			const input = loadFixture("08_13_implied_empty_with_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect((concept as BaseConcept).expressions).toHaveLength(0);
			expect(concept.children).toHaveLength(0);
			expect(concept.metadata).not.toBeNull();
			expect(concept.metadata!.custom).toBeDefined();
			expect(concept.metadata!.custom!["note"]).toBe("placeholder");
		});

		it("08_14_multiple_top_level_implied: three top-level implied concepts, order preserved", () => {
			const input = loadFixture("08_14_multiple_top_level_implied.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(3);
			for (const c of ast.concepts) {
				expect((c as BaseConcept).expressions).toHaveLength(0);
			}
			expect(getAssociationTargetFirstValue(getChildAsAssociation(ast.concepts[0], 0)!)).toBe(1);
			expect(getChildAsAssociation(ast.concepts[0], 0)!.isIntrinsic).toBe(true);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(ast.concepts[1], 0)!)).toBe(2);
			expect(getChildAsAssociation(ast.concepts[1], 0)!.isIntrinsic).toBe(false);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(ast.concepts[2], 0)!)).toBe(3);
			expect(getChildAsAssociation(ast.concepts[2], 0)!.isIntrinsic).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 6. Item separation and whitespace
	// -------------------------------------------------------------------------
	describe("6. Item separation and whitespace", () => {
		it("08_15_implied_newline_separated: associations separated by newlines only, no comma", () => {
			const input = loadFixture("08_15_implied_newline_separated.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.children).toHaveLength(2);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 0)!)).toBe("Main St");
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 1)!)).toBe("Sydney");
		});

		it("08_16_implied_comma_separated: two associations comma-separated, order 1 and 2", () => {
			const input = loadFixture("08_16_implied_comma_separated.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.children).toHaveLength(2);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 0)!)).toBe(1);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 1)!)).toBe(2);
		});

		it("08_17_implied_mixed_separators: mix of comma and newline, three items a,b,c order 1,2,3", () => {
			const input = loadFixture("08_17_implied_mixed_separators.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.children).toHaveLength(3);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 0)!)).toBe(1);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 1)!)).toBe(2);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 2)!)).toBe(3);
		});

		it("08_18_implied_whitespace_variants: spaces around brackets, one association target 'value'", () => {
			const input = loadFixture("08_18_implied_whitespace_variants.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.children).toHaveLength(1);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 0)!)).toBe("value");
		});
	});

	// -------------------------------------------------------------------------
	// 7. Association metadata on implied concept's children
	// -------------------------------------------------------------------------
	describe("7. Association metadata on implied concept's children", () => {
		it("08_19_implied_association_with_metadata: single association with metadata (confidence) before +", () => {
			const input = loadFixture(
				"08_19_implied_association_with_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect((concept as BaseConcept).expressions).toHaveLength(0);
			expect(concept.children).toHaveLength(1);
			const assoc = getChildAsAssociation(concept, 0);
			expect(assoc!.metadata).not.toBeNull();
			expect(assoc!.metadata!.confidence).toBe(0.9);
			expect(getAssociationTargetFirstValue(assoc!)).toBe("1990-01-15");
		});

		it("08_20_implied_two_associations_each_metadata: two associations each with own metadata (en, fr)", () => {
			const input = loadFixture(
				"08_20_implied_two_associations_each_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.children).toHaveLength(2);
			const a0 = getChildAsAssociation(concept, 0);
			const a1 = getChildAsAssociation(concept, 1);
			expect(a0!.metadata).not.toBeNull();
			expect(a0!.metadata!.language).toBe("en");
			expect(getAssociationTargetFirstValue(a0!)).toBe("John");
			expect(a1!.metadata).not.toBeNull();
			expect(a1!.metadata!.language).toBe("fr");
			expect(getAssociationTargetFirstValue(a1!)).toBe("Jean");
		});
	});

	// -------------------------------------------------------------------------
	// 8. Edge cases and stress
	// -------------------------------------------------------------------------
	describe("8. Edge cases and stress", () => {
		it("08_21_implied_with_comments: comments before and after, sole concept is implied", () => {
			const input = loadFixture("08_21_implied_with_comments.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect((concept as BaseConcept).expressions).toHaveLength(0);
			expect(concept.children).toHaveLength(1);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(concept, 0)!)).toBe(1);
		});

		it("08_22_implied_many_associations: five associations, order and count preserved", () => {
			const input = loadFixture("08_22_implied_many_associations.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.children).toHaveLength(5);
			for (let i = 0; i < 5; i++) {
				const a = getChildAsAssociation(concept, i);
				expect(a).not.toBeNull();
				expect(getAssociationTargetFirstValue(a!)).toBe(i + 1);
			}
		});

		it("08_23_implied_then_named: first top-level implied, second named (has expressions)", () => {
			const input = loadFixture("08_23_implied_then_named.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect((ast.concepts[0] as BaseConcept).expressions).toHaveLength(0);
			expect(ast.concepts[0].children).toHaveLength(1);
			expect(getAssociationTargetFirstValue(getChildAsAssociation(ast.concepts[0], 0)!)).toBe(1);
			expect((ast.concepts[1] as BaseConcept).expressions.length).toBeGreaterThan(0);
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("title");
		});
	});
});
