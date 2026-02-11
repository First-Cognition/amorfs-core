/**
 * Section 10 Concept References — fixture tests
 *
 * Covers: definition with @identifier (after value block and expression-only),
 * standalone @ref as top-level, reference as association target, reference in
 * custom metadata, forward reference, multiple uses of same ref, identifier
 * variants, references map, nested/mixed structures, edge cases, and invalid
 * syntax. Implements plan .cursor/plans/10_concept_references.plan.md
 *
 * Fixtures: tests/fixtures/concept_references/ with prefix 10_
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
	type ReferenceConcept,
	type ConceptRef,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const conceptRefDir = join(__dirname, "fixtures", "concept_references");

function loadFixture(name: string): string {
	return readFileSync(join(conceptRefDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

describe("Section 10 Concept References (10_)", () => {
	// -------------------------------------------------------------------------
	// 1. Definition — concept with @identifier after value block
	// -------------------------------------------------------------------------
	describe("1. Definition — concept with @identifier after value block", () => {
		it("10_01: minimal definition (value block + @ref only)", () => {
			const input = loadFixture(
				"10_01_definition_value_block_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0];
			expect(c.kind).toBe("base");
			expect((c as BaseConcept).key).toBe("alice");
			expect((c as BaseConcept).expressions).toHaveLength(1);
			expect((c as BaseConcept).children.length).toBeGreaterThanOrEqual(
				1,
			);
			expect(ast.references["alice"]).toBeDefined();
			expect(ast.references["alice"]).toBe(c);
		});

		it("10_02: definition with metadata before @ref", () => {
			const input = loadFixture(
				"10_02_definition_value_block_metadata_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("john");
			expect(c.metadata).not.toBeNull();
			expect(c.metadata?.language).toBe("en");
			expect(ast.references["john"]).toBe(c);
		});

		it("10_03: definition with empty value block", () => {
			const input = loadFixture(
				"10_03_definition_empty_value_block_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("placeholder_ref");
			expect(c.children).toHaveLength(0);
			expect(ast.references["placeholder_ref"]).toBe(c);
		});

		it("10_04: definition with multiple children in value block", () => {
			const input = loadFixture(
				"10_04_definition_multiple_children_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("my_list");
			expect(c.children).toHaveLength(3);
			expect(ast.references["my_list"]).toBe(c);
		});
	});

	// -------------------------------------------------------------------------
	// 2. Definition — concept with @identifier after expression-only
	// -------------------------------------------------------------------------
	describe("2. Definition — concept with @identifier after expression-only", () => {
		it("10_05: expression-only with @ref", () => {
			const input = loadFixture(
				"10_05_definition_expression_only_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.kind).toBe("base");
			expect(c.key).toBe("my_tag");
			expect(c.expressions).toHaveLength(1);
			expect(c.children).toHaveLength(0);
			expect(ast.references["my_tag"]).toBe(c);
		});

		it("10_06: expression-only with metadata and @ref", () => {
			const input = loadFixture(
				"10_06_definition_expression_only_metadata_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("en_label");
			// Metadata may be on concept or on first expression (grammar: Expression = ExpressionValue Metadata?)
			expect(
				c.metadata != null || c.expressions[0]?.metadata != null,
			).toBe(true);
			expect(c.children).toHaveLength(0);
			expect(ast.references["en_label"]).toBeDefined();
		});
	});

	// -------------------------------------------------------------------------
	// 3. Standalone reference as top-level
	// -------------------------------------------------------------------------
	describe("3. Standalone reference as top-level", () => {
		it("10_07: single top-level @ref only", () => {
			const input = loadFixture("10_07_standalone_ref_top_level.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0];
			expect(c.kind).toBe("reference");
			expect((c as ReferenceConcept).referenceKey).toBe("some_ref");
			expect((c as ReferenceConcept).children).toHaveLength(0);
			expect((c as ReferenceConcept).key).toBeNull();
		});

		it("10_08: standalone @ref after a definition in same document", () => {
			const input = loadFixture(
				"10_08_standalone_ref_after_definition.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const first = ast.concepts[0] as BaseConcept;
			const second = ast.concepts[1] as ReferenceConcept;
			expect(first.kind).toBe("base");
			expect(first.key).toBe("thing_ref");
			expect(second.kind).toBe("reference");
			expect(second.referenceKey).toBe("thing_ref");
			expect(ast.references["thing_ref"]).toBe(first);
		});
	});

	// -------------------------------------------------------------------------
	// 4. Reference as association target
	// -------------------------------------------------------------------------
	describe("4. Reference as association target", () => {
		it("10_09: association with labeled concept whose value is @ref", () => {
			const input = loadFixture(
				"10_09_association_target_value_is_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const doc = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "doc",
			) as BaseConcept;
			expect(doc).toBeDefined();
			const authorAssoc = doc.children.find(
				(ch): ch is AssociationConcept =>
					ch.kind === "association" &&
					ch.children[0]?.kind === "base" &&
					getFirstExpressionValue(ch.children[0]) === "author",
			);
			expect(authorAssoc).toBeDefined();
			const authorTarget = authorAssoc!.children[0] as BaseConcept;
			const refChild = authorTarget.children[0];
			expect(refChild.kind).toBe("reference");
			expect((refChild as ReferenceConcept).referenceKey).toBe("alice");
			expect(ast.references["alice"]).toBeDefined();
		});

		it("10_10: association whose direct target is @ref (no value block)", () => {
			const input = loadFixture(
				"10_10_association_target_direct_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const container = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c) === "container",
			) as BaseConcept;
			expect(container).toBeDefined();
			expect(container.children).toHaveLength(1);
			const assoc = container.children[0] as AssociationConcept;
			expect(assoc.children[0].kind).toBe("reference");
			expect((assoc.children[0] as ReferenceConcept).referenceKey).toBe(
				"alice",
			);
			expect(ast.references["alice"]).toBeDefined();
		});

		it("10_11: intrinsic and contextual associations with @ref targets", () => {
			const input = loadFixture(
				"10_11_association_intrinsic_contextual_refs.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const wrapper = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c) === "wrapper",
			) as BaseConcept;
			expect(wrapper).toBeDefined();
			const assocs = wrapper.children.filter(
				(c): c is AssociationConcept => c.kind === "association",
			);
			expect(assocs).toHaveLength(2);
			const intrinsic = assocs.find((a) => a.isIntrinsic === true);
			const contextual = assocs.find((a) => a.isIntrinsic === false);
			expect(intrinsic).toBeDefined();
			expect(contextual).toBeDefined();
			expect(
				(intrinsic!.children[0] as ReferenceConcept).referenceKey,
			).toBe("a");
			expect(
				(contextual!.children[0] as ReferenceConcept).referenceKey,
			).toBe("b");
			expect(ast.references["a"]).toBeDefined();
			expect(ast.references["b"]).toBeDefined();
		});
	});

	// -------------------------------------------------------------------------
	// 5. Reference in custom metadata
	// -------------------------------------------------------------------------
	describe("5. Reference in custom metadata", () => {
		it("10_12: custom attribute value as @ref (generic key)", () => {
			const input = loadFixture("10_12_metadata_custom_key_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const item = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "item",
			) as BaseConcept;
			expect(item).toBeDefined();
			expect(item.metadata?.custom?.related).toBeDefined();
			const related = item.metadata!.custom!.related as ConceptRef;
			expect(related).toEqual({
				type: "reference",
				key: "other_ref",
			});
		});

		it("10_13: source=@ref (first-class metadata)", () => {
			const input = loadFixture("10_13_metadata_source_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const data = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "data",
			) as BaseConcept;
			expect(data).toBeDefined();
			expect(data.metadata?.source).toEqual({
				type: "reference",
				key: "nasa_source",
			});
			expect(ast.references["nasa_source"]).toBeDefined();
		});

		it("10_14: multiple custom attributes with @ref and literal", () => {
			const input = loadFixture(
				"10_14_metadata_multiple_custom_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c) === "concept",
			) as BaseConcept;
			expect(concept).toBeDefined();
			expect(concept.metadata?.custom?.author).toEqual({
				type: "reference",
				key: "alice",
			});
			// source=@ref is first-class metadata.source, not in custom
			expect(concept.metadata?.source).toEqual({
				type: "reference",
				key: "db",
			});
			expect(concept.metadata?.custom?.id).toBe("plain");
		});
	});

	// -------------------------------------------------------------------------
	// 6. Forward reference
	// -------------------------------------------------------------------------
	describe("6. Forward reference", () => {
		it("10_15: use @ref before its definition in document order", () => {
			const input = loadFixture("10_15_forward_reference.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const first = ast.concepts[0] as ReferenceConcept;
			const second = ast.concepts[1] as BaseConcept;
			expect(first.kind).toBe("reference");
			expect(first.referenceKey).toBe("forward_ref");
			expect(second.key).toBe("forward_ref");
			expect(ast.references["forward_ref"]).toBe(second);
		});

		it("10_16: association target @ref before definition", () => {
			const input = loadFixture(
				"10_16_forward_ref_association_target.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const doc = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "doc",
			) as BaseConcept;
			const authorAssoc = doc.children.find(
				(ch): ch is AssociationConcept =>
					ch.kind === "association" && ch.children.length > 0,
			);
			const author = authorAssoc!.children[0] as BaseConcept;
			const refInAuthor = author.children[0] as ReferenceConcept;
			expect(refInAuthor.referenceKey).toBe("person_ref");
			expect(ast.references["person_ref"]).toBeDefined();
			const person = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					(c as BaseConcept).key === "person_ref",
			);
			expect(ast.references["person_ref"]).toBe(person);
		});
	});

	// -------------------------------------------------------------------------
	// 7. Multiple uses of same ref
	// -------------------------------------------------------------------------
	describe("7. Multiple uses of same ref", () => {
		it("10_17: same @name in several places (definition once, use multiple)", () => {
			const input = loadFixture("10_17_multiple_uses_same_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const defining = ast.concepts.filter(
				(c): c is BaseConcept =>
					c.kind === "base" && (c as BaseConcept).key === "ent",
			);
			expect(defining).toHaveLength(1);
			const refNodes: ReferenceConcept[] = [];
			function collectRefs(n: ConceptNode) {
				if (n.kind === "reference") refNodes.push(n);
				n.children.forEach(collectRefs);
			}
			ast.concepts.forEach(collectRefs);
			expect(refNodes.length).toBeGreaterThanOrEqual(2);
			expect(refNodes.every((r) => r.referenceKey === "ent")).toBe(true);
			expect(ast.references["ent"]).toBe(defining[0]);
		});

		it("10_18: same ref as multiple association targets under one concept", () => {
			const input = loadFixture(
				"10_18_same_ref_multiple_associations.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const group = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "group",
			) as BaseConcept;
			const assocs = group.children.filter(
				(c): c is AssociationConcept => c.kind === "association",
			);
			expect(assocs).toHaveLength(2);
			// Each association target is a concept (member/lead) whose value block contains @bob
			const memberTarget = assocs[0].children[0] as BaseConcept;
			const leadTarget = assocs[1].children[0] as BaseConcept;
			expect(memberTarget.children[0].kind).toBe("reference");
			expect(leadTarget.children[0].kind).toBe("reference");
			expect(
				(memberTarget.children[0] as ReferenceConcept).referenceKey,
			).toBe("bob");
			expect(
				(leadTarget.children[0] as ReferenceConcept).referenceKey,
			).toBe("bob");
			expect(ast.references["bob"]).toBeDefined();
		});
	});

	// -------------------------------------------------------------------------
	// 8. Identifier variants
	// -------------------------------------------------------------------------
	describe("8. Identifier variants", () => {
		it("10_19: letter and digits", () => {
			const input = loadFixture("10_19_identifier_letter_digits.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("ref123");
			expect(ast.references["ref123"]).toBeDefined();
		});

		it("10_20: underscore in identifier", () => {
			const input = loadFixture("10_20_identifier_underscore.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const first = ast.concepts[0] as BaseConcept;
			const second = ast.concepts[1] as BaseConcept;
			expect(first.key).toBe("my_ref");
			expect(second.key).toBe("_private");
			expect(ast.references["my_ref"]).toBeDefined();
			expect(ast.references["_private"]).toBeDefined();
		});

		it("10_21: hyphen in identifier", () => {
			const input = loadFixture("10_21_identifier_hyphen.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("my-concept-ref");
			expect(ast.references["my-concept-ref"]).toBeDefined();
		});

		it("10_22: mixed identifier (letters, digits, underscore, hyphen)", () => {
			const input = loadFixture("10_22_identifier_mixed.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("Abc_12-ref");
			expect(ast.references["Abc_12-ref"]).toBeDefined();
		});
	});

	// -------------------------------------------------------------------------
	// 9. References map and structure
	// -------------------------------------------------------------------------
	describe("9. References map and structure", () => {
		it("10_23: references map contains all defined keys", () => {
			const input = loadFixture("10_23_references_map_all_keys.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(Object.keys(ast.references).length).toBe(3);
			expect(ast.references["k1"]).toBeDefined();
			expect(ast.references["k2"]).toBeDefined();
			expect(ast.references["k3"]).toBeDefined();
			const k1Concept = ast.concepts.find(
				(c) => c.kind === "base" && (c as BaseConcept).key === "k1",
			);
			expect(ast.references["k1"]).toBe(k1Concept);
			expect(ast.references["k2"]).toBe(
				ast.concepts.find(
					(c) => c.kind === "base" && (c as BaseConcept).key === "k2",
				),
			);
			expect(ast.references["k3"]).toBe(
				ast.concepts.find(
					(c) => c.kind === "base" && (c as BaseConcept).key === "k3",
				),
			);
		});

		it("10_24: reference node has no key, has referenceKey", () => {
			const input = loadFixture("10_24_reference_node_shape.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const first = ast.concepts[0] as BaseConcept;
			const second = ast.concepts[1] as ReferenceConcept;
			expect(first.kind).toBe("base");
			expect(first.key).toBe("r");
			expect(second.kind).toBe("reference");
			expect(second.referenceKey).toBe("r");
			expect(second.key).toBeNull();
			expect(second.children).toEqual([]);
		});
	});

	// -------------------------------------------------------------------------
	// 10. Nested and mixed structures
	// -------------------------------------------------------------------------
	describe("10. Nested and mixed structures", () => {
		it("10_25: reference inside nested value block (deep)", () => {
			const input = loadFixture("10_25_ref_in_nested_value_block.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const outer = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "outer",
			) as BaseConcept;
			const innerAssoc = outer.children[0] as AssociationConcept;
			const inner = innerAssoc.children[0] as BaseConcept;
			const leafAssoc = inner.children[0] as AssociationConcept;
			const leafConcept = leafAssoc.children[0] as BaseConcept;
			// Reference @defined is the only item in leaf's value block
			expect(leafConcept.children[0].kind).toBe("reference");
			expect(
				(leafConcept.children[0] as ReferenceConcept).referenceKey,
			).toBe("defined");
			expect(ast.references["defined"]).toBeDefined();
		});

		it("10_26: document with only definitions (no uses)", () => {
			const input = loadFixture("10_26_only_definitions.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(3);
			expect(ast.references["a"]).toBeDefined();
			expect(ast.references["b"]).toBeDefined();
			expect(ast.references["c"]).toBeDefined();
			const refCount = ast.concepts.filter(
				(c) => c.kind === "reference",
			).length;
			expect(refCount).toBe(0);
		});

		it("10_27: definitions and standalone refs mixed", () => {
			const input = loadFixture(
				"10_27_definitions_and_standalone_mixed.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(4);
			expect(ast.concepts[0].kind).toBe("base");
			expect((ast.concepts[0] as BaseConcept).key).toBe("first");
			expect(ast.concepts[1].kind).toBe("reference");
			expect((ast.concepts[1] as ReferenceConcept).referenceKey).toBe(
				"first",
			);
			expect(ast.concepts[2].kind).toBe("base");
			expect((ast.concepts[2] as BaseConcept).key).toBe("second");
			expect(ast.concepts[3].kind).toBe("reference");
			expect((ast.concepts[3] as ReferenceConcept).referenceKey).toBe(
				"second",
			);
			expect(ast.references["first"]).toBe(ast.concepts[0]);
			expect(ast.references["second"]).toBe(ast.concepts[2]);
		});
	});

	// -------------------------------------------------------------------------
	// 11. Edge cases and comments
	// -------------------------------------------------------------------------
	describe("11. Edge cases and comments", () => {
		it("10_28: concept reference with comments around it", () => {
			const input = loadFixture("10_28_ref_with_comments.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c) === "person",
			) as BaseConcept;
			expect(person).toBeDefined();
			expect(person.key).toBe("alice");
			expect(ast.concepts.filter((c) => c.kind !== "base").length).toBe(
				0,
			);
			expect(ast.references["alice"]).toBeDefined();
		});

		it("10_29: reference as only item in value block", () => {
			const input = loadFixture("10_29_value_block_only_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const label = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "label",
			) as BaseConcept;
			expect(label).toBeDefined();
			expect(label.children).toHaveLength(1);
			expect(label.children[0].kind).toBe("reference");
			expect((label.children[0] as ReferenceConcept).referenceKey).toBe(
				"alice",
			);
			expect(ast.references["alice"]).toBeDefined();
		});

		it("10_30: multiple expressions on defining concept with @ref", () => {
			const input = loadFixture(
				"10_30_definition_multiple_expressions_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.expressions).toHaveLength(2);
			expect(c.key).toBe("nsw");
			expect(ast.references["nsw"]).toBe(c);
		});
	});

	// -------------------------------------------------------------------------
	// 12. Invalid or error cases
	// -------------------------------------------------------------------------
	describe("12. Invalid or error cases", () => {
		it("10_invalid_01: space between @ and identifier", () => {
			const input = loadFixture("10_invalid_01_space_after_at.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
		});

		it("10_invalid_02: invalid identifier (digit at start)", () => {
			const input = loadFixture(
				"10_invalid_02_identifier_digit_start.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(false);
		});
	});
});
