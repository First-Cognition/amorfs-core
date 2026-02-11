/**
 * Section 3 Basic Concepts — fixture tests
 *
 * Covers: minimal concept with value block, single value and parent-child linkage,
 * case sensitivity, base vs association concept types, intrinsic vs contextual
 * associations, expression-concept linkage, association structure (which-is implied,
 * has_a), metadata, value block variants, expression-only boundary, nesting, edge cases.
 *
 * Fixtures: tests/fixtures/basic_concepts/ with prefix 03_
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
const basicConceptsDir = join(__dirname, "fixtures", "basic_concepts");

function loadFixture(name: string): string {
	return readFileSync(join(basicConceptsDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

function getChildAsBase(concept: ConceptNode, index: number): BaseConcept | null {
	const child = concept.children[index];
	return child?.kind === "base" ? child : null;
}

function getChildAsAssociation(concept: ConceptNode, index: number): AssociationConcept | null {
	const child = concept.children[index];
	return child?.kind === "association" ? child : null;
}

describe("Section 3 Basic Concepts", () => {
	// -------------------------------------------------------------------------
	// 1. Minimal concept (concept + value block)
	// -------------------------------------------------------------------------
	describe("1. Minimal concept (concept + value block)", () => {
		it("03_01_minimal_concept_single_value: one concept, one child base, expressions name/value", () => {
			const input = loadFixture("03_01_minimal_concept_single_value.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.kind).toBe("base");
			expect(concept.expressions).toHaveLength(1);
			expect(concept.expressions[0].value).toBe("name");
			expect(concept.children).toHaveLength(1);
			const child = getChildAsBase(concept, 0);
			expect(child).not.toBeNull();
			expect(child!.kind).toBe("base");
			expect(getFirstExpressionValue(child!)).toBe("value");
			expect(isValid(input)).toBe(true);
		});

		it("03_02_minimal_concept_empty_value_block: one concept, zero children", () => {
			const input = loadFixture("03_02_minimal_concept_empty_value_block.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.kind).toBe("base");
			expect(concept.expressions.length).toBeGreaterThanOrEqual(1);
			expect(concept.expressions[0].value).toBe("name");
			expect(concept.children).toHaveLength(0);
			expect(isValid(input)).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 2. Concept with single value and expression linkage
	// -------------------------------------------------------------------------
	describe("2. Concept with single value and expression linkage", () => {
		it("03_03_concept_single_value_linkage: parent 'city', child 'Sydney', linkage correct", () => {
			const input = loadFixture("03_03_concept_single_value_linkage.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(getFirstExpressionValue(concept)).toBe("city");
			expect(concept.children).toHaveLength(1);
			const child = getChildAsBase(concept, 0);
			expect(child).not.toBeNull();
			expect(getFirstExpressionValue(child!)).toBe("Sydney");
			expect(isValid(input)).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 3. Case sensitivity (expressions)
	// -------------------------------------------------------------------------
	describe("3. Case sensitivity (expressions)", () => {
		it("03_04_case_sensitivity_expressions: expression 'City' preserved (not 'city')", () => {
			const input = loadFixture("03_04_case_sensitivity_expressions.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("City");
			const child = getChildAsBase(ast.concepts[0], 0);
			expect(child).not.toBeNull();
			expect(getFirstExpressionValue(child!)).toBe("Sydney");
			expect(isValid(input)).toBe(true);
		});

		it("03_05_case_sensitivity_distinct: two concepts 'label' vs 'Label', order preserved", () => {
			const input = loadFixture("03_05_case_sensitivity_distinct.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("label");
			expect(getFirstExpressionValue(ast.concepts[1])).toBe("Label");
			expect(isValid(input)).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 4. Concept types (base vs association) — Spec 3.2.2
	// -------------------------------------------------------------------------
	describe("4. Concept types (base vs association)", () => {
		it("03_06_base_concept_kind: top-level concept has kind === 'base'", () => {
			const input = loadFixture("03_06_base_concept_kind.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].kind).toBe("base");
			expect(isValid(input)).toBe(true);
		});

		it("03_07_association_intrinsic_marked: one child is association, isIntrinsic true, has_a", () => {
			const input = loadFixture("03_07_association_intrinsic_marked.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.children).toHaveLength(1);
			const assoc = getChildAsAssociation(concept, 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.kind).toBe("association");
			expect(assoc!.associationType).toBe("has_a");
			expect(assoc!.isIntrinsic).toBe(true);
			expect(assoc!.children).toHaveLength(1);
			// Object of has_a is the concept "name [Jane]"; its child is the base concept with "Jane"
			const objectConcept = assoc!.children[0];
			expect(objectConcept.kind).toBe("base");
			expect(getFirstExpressionValue(objectConcept)).toBe("name");
			expect(objectConcept.children).toHaveLength(1);
			expect(getFirstExpressionValue(getChildAsBase(objectConcept, 0)!)).toBe("Jane");
			expect(isValid(input)).toBe(true);
		});

		it("03_08_association_contextual_marked: child association isIntrinsic false", () => {
			const input = loadFixture("03_08_association_contextual_marked.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0];
			const assoc = getChildAsAssociation(concept, 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.kind).toBe("association");
			expect(assoc!.associationType).toBe("has_a");
			expect(assoc!.isIntrinsic).toBe(false);
			// Object is "title [CEO]"; value "CEO" is in object's child
			const objectConcept = assoc!.children[0];
			expect(getFirstExpressionValue(objectConcept)).toBe("title");
			expect(getFirstExpressionValue(getChildAsBase(objectConcept, 0)!)).toBe("CEO");
			expect(isValid(input)).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 5. Association structure (subject, verb, object) — Spec 3.4.1
	// -------------------------------------------------------------------------
	describe("5. Association structure (subject, verb, object)", () => {
		it("03_09_which_is_implied_bare_child: one base child, structure consistent with which-is", () => {
			const input = loadFixture("03_09_which_is_implied_bare_child.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.kind).toBe("base");
			expect(concept.children).toHaveLength(1);
			const child = getChildAsBase(concept, 0);
			expect(child).not.toBeNull();
			expect(getFirstExpressionValue(child!)).toBe("John");
			expect(isValid(input)).toBe(true);
		});

		it("03_10_has_a_intrinsic_structure: associationType has_a, isIntrinsic true, has object child", () => {
			const input = loadFixture("03_10_has_a_intrinsic_structure.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0];
			const assoc = getChildAsAssociation(concept, 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.associationType).toBe("has_a");
			expect(assoc!.isIntrinsic).toBe(true);
			expect(assoc!.children).toHaveLength(1);
			// Object is "role [admin]"; value "admin" is in object's child
			expect(getFirstExpressionValue(assoc!.children[0])).toBe("role");
			expect(getFirstExpressionValue(getChildAsBase(assoc!.children[0], 0)!)).toBe("admin");
			expect(isValid(input)).toBe(true);
		});

		it("03_11_has_a_contextual_structure: associationType has_a, isIntrinsic false", () => {
			const input = loadFixture("03_11_has_a_contextual_structure.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			const assoc = getChildAsAssociation(ast.concepts[0], 0);
			expect(assoc).not.toBeNull();
			expect(assoc!.associationType).toBe("has_a");
			expect(assoc!.isIntrinsic).toBe(false);
			expect(isValid(input)).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 6. Concept with metadata — Spec 3.2.1
	// -------------------------------------------------------------------------
	describe("6. Concept with metadata", () => {
		it("03_12_concept_with_metadata: concept has metadata non-null with language", () => {
			const input = loadFixture("03_12_concept_with_metadata.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.metadata).not.toBeNull();
			expect(concept.metadata?.language).toBe("en");
			expect(getFirstExpressionValue(concept)).toBe("name");
			const child = getChildAsBase(concept, 0);
			expect(getFirstExpressionValue(child!)).toBe("John");
			expect(isValid(input)).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 7. Value block content (multiple items and mixed)
	// -------------------------------------------------------------------------
	describe("7. Value block content (multiple items and mixed)", () => {
		it("03_13_value_block_multiple_siblings: three children a, b, c, order preserved", () => {
			const input = loadFixture("03_13_value_block_multiple_siblings.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.children).toHaveLength(3);
			expect(getFirstExpressionValue(getChildAsBase(concept, 0)!)).toBe("a");
			expect(getFirstExpressionValue(getChildAsBase(concept, 1)!)).toBe("b");
			expect(getFirstExpressionValue(getChildAsBase(concept, 2)!)).toBe("c");
			expect(isValid(input)).toBe(true);
		});

		it("03_14_value_block_mixed_bare_and_association: first base (Jane), second association", () => {
			const input = loadFixture("03_14_value_block_mixed_bare_and_association.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0];
			expect(concept.children).toHaveLength(2);
			const first = getChildAsBase(concept, 0);
			expect(first).not.toBeNull();
			expect(getFirstExpressionValue(first!)).toBe("Jane");
			const second = getChildAsAssociation(concept, 1);
			expect(second).not.toBeNull();
			expect(second!.kind).toBe("association");
			expect(second!.isIntrinsic).toBe(false);
			expect(isValid(input)).toBe(true);
		});

		it("03_15_value_block_only_associations: two association children, no bare first item", () => {
			const input = loadFixture("03_15_value_block_only_associations.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0];
			expect(concept.children).toHaveLength(2);
			expect(getChildAsAssociation(concept, 0)).not.toBeNull();
			expect(getChildAsAssociation(concept, 1)).not.toBeNull();
			expect(isValid(input)).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 8. Expression-only vs concept with value block
	// -------------------------------------------------------------------------
	describe("8. Expression-only vs concept with value block", () => {
		it("03_16_expression_only_no_value_block: one concept, children.length === 0", () => {
			const input = loadFixture("03_16_expression_only_no_value_block.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const concept = ast.concepts[0];
			expect(concept.kind).toBe("base");
			expect(concept.children).toHaveLength(0);
			expect(concept.expressions.length).toBeGreaterThanOrEqual(1);
			expect(getFirstExpressionValue(concept)).toBe("standalone");
			expect(isValid(input)).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 9. Association as first-class concept — Spec 3.4.2
	// -------------------------------------------------------------------------
	describe("9. Association as first-class concept", () => {
		it("03_17_association_first_class_children: association has children array with object", () => {
			const input = loadFixture("03_17_association_first_class_children.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0];
			const assoc = getChildAsAssociation(concept, 0);
			expect(assoc).not.toBeNull();
			expect(Array.isArray(assoc!.children)).toBe(true);
			expect(assoc!.children).toHaveLength(1);
			// Object is "name [Alice]"; value "Alice" is in object's child
			expect(getFirstExpressionValue(assoc!.children[0])).toBe("name");
			expect(getFirstExpressionValue(getChildAsBase(assoc!.children[0], 0)!)).toBe("Alice");
			expect(isValid(input)).toBe(true);
		});

		it("03_18_multiple_associations_same_concept: three children, order and isIntrinsic correct", () => {
			const input = loadFixture("03_18_multiple_associations_same_concept.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0];
			expect(concept.children).toHaveLength(3);
			const first = getChildAsAssociation(concept, 0);
			const second = getChildAsAssociation(concept, 1);
			const third = getChildAsAssociation(concept, 2);
			expect(first?.isIntrinsic).toBe(true);
			expect(second?.isIntrinsic).toBe(false);
			expect(third?.isIntrinsic).toBe(true);
			// Each association's object is concept with value block; value is in object's child
			expect(getFirstExpressionValue(getChildAsBase(first!.children[0], 0)!)).toBe("Jane");
			expect(getFirstExpressionValue(getChildAsBase(second!.children[0], 0)!)).toBe("CEO");
			expect(getFirstExpressionValue(getChildAsBase(third!.children[0], 0)!)).toEqual(1);
			expect(isValid(input)).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 10. Recursive / nesting — Spec 3.5
	// -------------------------------------------------------------------------
	describe("10. Recursive / nesting", () => {
		it("03_19_nested_one_level: outer > inner > value, depth and chain correct", () => {
			const input = loadFixture("03_19_nested_one_level.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			const outer = ast.concepts[0];
			expect(getFirstExpressionValue(outer)).toBe("outer");
			expect(outer.children).toHaveLength(1);
			const inner = getChildAsBase(outer, 0);
			expect(inner).not.toBeNull();
			expect(getFirstExpressionValue(inner!)).toBe("inner");
			expect(inner!.children).toHaveLength(1);
			const value = getChildAsBase(inner!, 0);
			expect(value).not.toBeNull();
			expect(getFirstExpressionValue(value!)).toBe("value");
			expect(isValid(input)).toBe(true);
		});

		it("03_20_association_nested_concept: person > +address > +city [Sydney]", () => {
			const input = loadFixture("03_20_association_nested_concept.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0];
			expect(person.children).toHaveLength(1);
			const addressAssoc = getChildAsAssociation(person, 0);
			expect(addressAssoc).not.toBeNull();
			expect(addressAssoc!.children).toHaveLength(1);
			const addressConcept = addressAssoc!.children[0];
			expect(addressConcept.kind).toBe("base");
			const cityAssoc = getChildAsAssociation(addressConcept, 0);
			expect(cityAssoc).not.toBeNull();
			// Object of +city is "city [Sydney]"; value "Sydney" is in object's child
			const cityObjectConcept = cityAssoc!.children[0];
			expect(getFirstExpressionValue(cityObjectConcept)).toBe("city");
			expect(getFirstExpressionValue(getChildAsBase(cityObjectConcept, 0)!)).toBe("Sydney");
			expect(isValid(input)).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// 11. Edge cases
	// -------------------------------------------------------------------------
	describe("11. Edge cases", () => {
		it("03_21_whitespace_around_brackets: parse succeeds, one concept one child, content correct", () => {
			const input = loadFixture("03_21_whitespace_around_brackets.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			expect(ast.concepts[0].children).toHaveLength(1);
			const child = getChildAsBase(ast.concepts[0], 0);
			expect(getFirstExpressionValue(child!)).toBe("value");
			expect(isValid(input)).toBe(true);
		});

		it("03_22_expression_preserved_exact: foo_bar and baz_qux in AST, no normalisation", () => {
			const input = loadFixture("03_22_expression_preserved_exact.amorfs");
			expect(parse(input).success).toBe(true);
			const ast = parseOrThrow(input);
			expect(getFirstExpressionValue(ast.concepts[0])).toBe("foo_bar");
			const child = getChildAsBase(ast.concepts[0], 0);
			expect(getFirstExpressionValue(child!)).toBe("baz_qux");
			expect(isValid(input)).toBe(true);
		});
	});
});
