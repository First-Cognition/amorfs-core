/**
 * Section 17 References with Full Usage — fixture tests
 *
 * Covers: definition (value block + @ref, expression-only + @ref, metadata before @ref,
 * multiple definitions, same key twice), standalone top-level refs, reference as association
 * target (intrinsic/contextual, multiple, nested, bare value item), reference in custom
 * metadata (key=@ref, source=@ref, multiple, mixed literal/ref, expression/association
 * metadata), AST references map, forward references, multiple uses of same ref, edge cases
 * (implied concept with @ref, expression-only + metadata + @ref, deep nesting, full usage
 * combined, minimal and hyphenated identifiers).
 *
 * Implements plan .cursor/plans/17_references.plan.md
 * Fixtures: tests/fixtures/references_cases/ with prefix 17_
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
const referencesCasesDir = join(__dirname, "fixtures", "references_cases");

function loadFixture(name: string): string {
	return readFileSync(join(referencesCasesDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

function findAssociationByRole(
	concept: ConceptNode,
	role: string,
): AssociationConcept | undefined {
	return concept.children.find(
		(ch): ch is AssociationConcept =>
			ch.kind === "association" &&
			ch.children[0]?.kind === "base" &&
			getFirstExpressionValue(ch.children[0]) === role,
	);
}

describe("Section 17 References with Full Usage (17_)", () => {
	// -------------------------------------------------------------------------
	// 1. Definition of references
	// -------------------------------------------------------------------------
	describe("1. Definition of references", () => {
		it("17_01: concept with value block + @ref (single definition)", () => {
			const input = loadFixture("17_01_definition_value_block.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.kind).toBe("base");
			expect(c.key).toBe("alice");
			expect(ast.references["alice"]).toBeDefined();
			expect(ast.references["alice"]).toBe(c);
		});

		it("17_02: expression-only concept + @ref (definition)", () => {
			const input = loadFixture(
				"17_02_definition_expression_only.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("something_ref");
			expect(ast.references["something_ref"]).toBe(c);
			expect(c.children).toEqual([]);
		});

		it("17_03: definition with value-block metadata before @ref", () => {
			const input = loadFixture(
				"17_03_definition_with_metadata_before_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.metadata).not.toBeNull();
			expect(c.key).toBe("entity_ref");
			expect(ast.references["entity_ref"]).toBe(c);
		});

		it("17_04: multiple definitions (different keys)", () => {
			const input = loadFixture("17_04_multiple_definitions.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["first"]).toBeDefined();
			expect(ast.references["second"]).toBeDefined();
			expect(ast.references["third"]).toBeDefined();
			const firstConcept = ast.concepts.find(
				(c) => c.kind === "base" && (c as BaseConcept).key === "first",
			);
			const secondConcept = ast.concepts.find(
				(c) => c.kind === "base" && (c as BaseConcept).key === "second",
			);
			const thirdConcept = ast.concepts.find(
				(c) => c.kind === "base" && (c as BaseConcept).key === "third",
			);
			expect(ast.references["first"]).toBe(firstConcept);
			expect(ast.references["second"]).toBe(secondConcept);
			expect(ast.references["third"]).toBe(thirdConcept);
		});

		it("17_05: same key defined twice (last wins)", () => {
			const input = loadFixture("17_05_same_key_defined_twice.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["ref"]).toBeDefined();
			// references[key] is overwritten by last definition in document order
			expect(ast.references["ref"]).toBe(ast.concepts[1]);
			expect(
				getFirstExpressionValue(ast.references["ref"] as BaseConcept),
			).toBe("y");
		});
	});

	// -------------------------------------------------------------------------
	// 2. Standalone reference (top-level)
	// -------------------------------------------------------------------------
	describe("2. Standalone reference (top-level)", () => {
		it("17_06: single top-level @ref", () => {
			const input = loadFixture("17_06_standalone_ref_top_level.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as ReferenceConcept;
			expect(c.kind).toBe("reference");
			expect(c.referenceKey).toBe("some_ref");
			expect(c.children).toEqual([]);
			expect(c.metadata).toBeNull();
		});

		it("17_07: multiple top-level @refs", () => {
			const input = loadFixture("17_07_multiple_standalone_refs.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(3);
			expect((ast.concepts[0] as ReferenceConcept).referenceKey).toBe(
				"a",
			);
			expect((ast.concepts[1] as ReferenceConcept).referenceKey).toBe(
				"b",
			);
			expect((ast.concepts[2] as ReferenceConcept).referenceKey).toBe(
				"c",
			);
		});

		it("17_08: mix — one definition and one standalone ref (same key)", () => {
			const input = loadFixture(
				"17_08_definition_and_standalone_same_key.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const defining = ast.concepts[0] as BaseConcept;
			const standalone = ast.concepts[1] as ReferenceConcept;
			expect(ast.references["ref"]).toBe(defining);
			expect(standalone.kind).toBe("reference");
			expect(standalone.referenceKey).toBe("ref");
		});
	});

	// -------------------------------------------------------------------------
	// 3. Reference as association target
	// -------------------------------------------------------------------------
	describe("3. Reference as association target", () => {
		it("17_09: intrinsic association with @ref target", () => {
			const input = loadFixture(
				"17_09_association_target_intrinsic.amorfs",
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
					ch.kind === "association" && ch.children.length === 1,
			);
			expect(authorAssoc).toBeDefined();
			expect(authorAssoc!.isIntrinsic).toBe(true);
			const target = authorAssoc!.children[0] as ReferenceConcept;
			expect(target.kind).toBe("reference");
			expect(target.referenceKey).toBe("sarah");
			expect(ast.references["sarah"]).toBeDefined();
		});

		it("17_10: contextual association with @ref target", () => {
			const input = loadFixture(
				"17_10_association_target_contextual.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const doc = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "doc",
			) as BaseConcept;
			const sourceAssoc = doc.children.find(
				(ch): ch is AssociationConcept =>
					ch.kind === "association" && ch.children.length === 1,
			);
			expect(sourceAssoc).toBeDefined();
			expect(sourceAssoc!.isIntrinsic).toBe(false);
			expect(
				(sourceAssoc!.children[0] as ReferenceConcept).referenceKey,
			).toBe("nasa_db");
			expect(ast.references["nasa_db"]).toBeDefined();
		});

		it("17_11: multiple associations with @ref targets (same or different refs)", () => {
			const input = loadFixture(
				"17_11_multiple_associations_ref_targets.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const paper = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "paper",
			) as BaseConcept;
			expect(paper).toBeDefined();
			const assocs = paper.children.filter(
				(c): c is AssociationConcept => c.kind === "association",
			);
			expect(assocs).toHaveLength(3);
			expect(
				(assocs[0].children[0] as ReferenceConcept).referenceKey,
			).toBe("a");
			expect(
				(assocs[1].children[0] as ReferenceConcept).referenceKey,
			).toBe("b");
			expect(
				(assocs[2].children[0] as ReferenceConcept).referenceKey,
			).toBe("src");
			expect(ast.references["a"]).toBeDefined();
			expect(ast.references["b"]).toBeDefined();
			expect(ast.references["src"]).toBeDefined();
		});

		it("17_12: nested — concept with @ref that has associations with @ref", () => {
			const input = loadFixture(
				"17_12_nested_refs_in_associations.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "root",
			) as BaseConcept;
			expect(root).toBeDefined();
			const childAssoc = root.children[0] as AssociationConcept;
			expect(
				(childAssoc.children[0] as ReferenceConcept).referenceKey,
			).toBe("inner");
			expect(ast.references["inner"]).toBeDefined();
			const innerConcept = ast.references["inner"] as BaseConcept;
			const subAssoc = innerConcept.children[0] as AssociationConcept;
			expect(subAssoc.kind).toBe("association");
			expect(
				(subAssoc.children[0] as ReferenceConcept).referenceKey,
			).toBe("leaf");
			expect(ast.references["leaf"]).toBeDefined();
		});

		it("17_13: reference as which-is (bare concept in value block)", () => {
			const input = loadFixture("17_13_ref_as_bare_value_item.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const container = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c) === "container",
			) as BaseConcept;
			expect(container).toBeDefined();
			const refs = container.children.filter(
				(ch): ch is ReferenceConcept => ch.kind === "reference",
			);
			expect(refs.length).toBe(2);
			expect(refs[0].referenceKey).toBe("ref1");
			expect(refs[1].referenceKey).toBe("ref2");
		});
	});

	// -------------------------------------------------------------------------
	// 4. Reference in custom metadata
	// -------------------------------------------------------------------------
	describe("4. Reference in custom metadata", () => {
		it("17_14: custom attribute key=@ref (generic)", () => {
			const input = loadFixture("17_14_metadata_custom_key_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c) === "concept",
			) as BaseConcept;
			expect(concept).toBeDefined();
			expect(concept.metadata?.custom?.related).toEqual({
				type: "reference",
				key: "other_ref",
			} as ConceptRef);
			expect(ast.references["other_ref"]).toBeDefined();
		});

		it("17_15: first-class source=@ref", () => {
			const input = loadFixture("17_15_metadata_source_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const fact = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "fact",
			) as BaseConcept;
			expect(fact).toBeDefined();
			expect(fact.metadata?.source).toEqual({
				type: "reference",
				key: "nasa_db",
			} as ConceptRef);
			expect(ast.references["nasa_db"]).toBeDefined();
		});

		it("17_16: multiple custom attributes with @ref values", () => {
			const input = loadFixture(
				"17_16_metadata_multiple_custom_refs.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const doc = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "doc",
			) as BaseConcept;
			expect(doc).toBeDefined();
			expect(doc.metadata?.custom?.author).toEqual({
				type: "reference",
				key: "alice",
			} as ConceptRef);
			expect(doc.metadata?.custom?.reviewer).toEqual({
				type: "reference",
				key: "bob",
			} as ConceptRef);
			expect(doc.metadata?.source).toEqual({
				type: "reference",
				key: "db",
			} as ConceptRef);
		});

		it("17_17: metadata with mix of literal and @ref values", () => {
			const input = loadFixture(
				"17_17_metadata_mixed_literal_and_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const item = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "item",
			) as BaseConcept;
			expect(item).toBeDefined();
			expect(item.metadata?.custom?.version).toBe("1");
			expect(item.metadata?.source).toEqual({
				type: "reference",
				key: "repo",
			} as ConceptRef);
		});

		it("17_18: per-expression metadata with @ref", () => {
			const input = loadFixture(
				"17_18_expression_metadata_with_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const term = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "term",
			) as BaseConcept;
			expect(term).toBeDefined();
			const exprWithRef =
				term.expressions[0]?.metadata?.source ?? term.metadata?.source;
			expect(exprWithRef).toEqual({
				type: "reference",
				key: "vocab",
			} as ConceptRef);
		});

		it("17_19: per-association metadata with @ref", () => {
			const input = loadFixture(
				"17_19_association_metadata_with_ref.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const root = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "root",
			) as BaseConcept;
			expect(root).toBeDefined();
			const childAssoc = root.children.find(
				(ch): ch is AssociationConcept => ch.kind === "association",
			);
			expect(childAssoc).toBeDefined();
			expect(childAssoc!.metadata?.source).toEqual({
				type: "reference",
				key: "db",
			} as ConceptRef);
			expect(
				(childAssoc!.children[0] as ReferenceConcept).referenceKey,
			).toBe("ref");
			expect(ast.references["db"]).toBeDefined();
			expect(ast.references["ref"]).toBeDefined();
		});
	});

	// -------------------------------------------------------------------------
	// 5. References map (AST.references)
	// -------------------------------------------------------------------------
	describe("5. References map (AST.references)", () => {
		it("17_20: references map contains all defined keys", () => {
			const input = loadFixture("17_20_references_map_all_keys.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const keys = Object.keys(ast.references);
			expect(keys).toHaveLength(3);
			expect(keys).toContain("a");
			expect(keys).toContain("b");
			expect(keys).toContain("c");
			expect(ast.references["a"]).toBe(
				ast.concepts.find(
					(c) => c.kind === "base" && (c as BaseConcept).key === "a",
				),
			);
			expect(ast.references["b"]).toBe(
				ast.concepts.find(
					(c) => c.kind === "base" && (c as BaseConcept).key === "b",
				),
			);
			expect(ast.references["c"]).toBe(
				ast.concepts.find(
					(c) => c.kind === "base" && (c as BaseConcept).key === "c",
				),
			);
		});

		it("17_21: references map — key points to correct concept node", () => {
			const input = loadFixture(
				"17_21_references_map_correct_node.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const conceptWithKey = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					(c as BaseConcept).key === "unique_key",
			);
			expect(conceptWithKey).toBeDefined();
			expect(ast.references["unique_key"]).toBe(conceptWithKey);
		});

		it("17_22: use-only refs — references map has no entry", () => {
			const input = loadFixture("17_22_use_only_ref_not_in_map.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["undefined_ref"]).toBeUndefined();
			expect(ast.concepts).toHaveLength(1);
			expect((ast.concepts[0] as ReferenceConcept).referenceKey).toBe(
				"undefined_ref",
			);
		});
	});

	// -------------------------------------------------------------------------
	// 6. Forward reference (use before define)
	// -------------------------------------------------------------------------
	describe("6. Forward reference (use before define)", () => {
		it("17_23: association target @ref before definition in document order", () => {
			const input = loadFixture(
				"17_23_forward_ref_association_first.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["later_ref"]).toBeDefined();
			const doc = ast.concepts[0] as BaseConcept;
			const xAssoc = doc.children[0] as AssociationConcept;
			expect((xAssoc.children[0] as ReferenceConcept).referenceKey).toBe(
				"later_ref",
			);
			const defining = ast.concepts.find(
				(c) =>
					c.kind === "base" && (c as BaseConcept).key === "later_ref",
			);
			expect(ast.references["later_ref"]).toBe(defining);
		});

		it("17_24: standalone @ref before definition", () => {
			const input = loadFixture(
				"17_24_forward_ref_standalone_first.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts[0].kind).toBe("reference");
			expect((ast.concepts[0] as ReferenceConcept).referenceKey).toBe(
				"ref",
			);
			expect(ast.concepts[1].kind).toBe("base");
			expect((ast.concepts[1] as BaseConcept).key).toBe("ref");
			expect(ast.references["ref"]).toBe(ast.concepts[1]);
		});

		it("17_25: metadata @ref before definition", () => {
			const input = loadFixture(
				"17_25_forward_ref_in_metadata_first.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const fact = ast.concepts[0] as BaseConcept;
			expect(fact.metadata?.source).toEqual({
				type: "reference",
				key: "defined_later",
			} as ConceptRef);
			expect(ast.references["defined_later"]).toBeDefined();
			expect(ast.references["defined_later"]).toBe(ast.concepts[1]);
		});
	});

	// -------------------------------------------------------------------------
	// 7. Multiple uses of same ref
	// -------------------------------------------------------------------------
	describe("7. Multiple uses of same ref", () => {
		it("17_26: same @ref as association target in multiple places", () => {
			const input = loadFixture(
				"17_26_same_ref_multiple_association_targets.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const doc1 = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "doc1",
			) as BaseConcept;
			const doc2 = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "doc2",
			) as BaseConcept;
			const assoc1 = doc1?.children[0] as AssociationConcept;
			const assoc2 = doc2?.children[0] as AssociationConcept;
			expect((assoc1!.children[0] as ReferenceConcept).referenceKey).toBe(
				"alice",
			);
			expect((assoc2!.children[0] as ReferenceConcept).referenceKey).toBe(
				"alice",
			);
			expect(ast.references["alice"]).toBeDefined();
		});

		it("17_27: same @ref in metadata in multiple places", () => {
			const input = loadFixture(
				"17_27_same_ref_multiple_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const fact1 = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "fact1",
			) as BaseConcept;
			const fact2 = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "fact2",
			) as BaseConcept;
			expect(fact1.metadata?.source).toEqual({
				type: "reference",
				key: "source_db",
			} as ConceptRef);
			expect(fact2.metadata?.source).toEqual({
				type: "reference",
				key: "source_db",
			} as ConceptRef);
			expect(ast.references["source_db"]).toBeDefined();
		});

		it("17_28: same @ref as standalone and as association target", () => {
			const input = loadFixture(
				"17_28_same_ref_standalone_and_association.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["r"]).toBeDefined();
			const defining = ast.concepts.find(
				(c) => c.kind === "base" && (c as BaseConcept).key === "r",
			);
			expect(ast.references["r"]).toBe(defining);
			const standalone = ast.concepts.find(
				(c) =>
					c.kind === "reference" &&
					(c as ReferenceConcept).referenceKey === "r",
			);
			expect(standalone).toBeDefined();
			const wrapper = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c) === "wrapper",
			) as BaseConcept;
			const childAssoc = wrapper.children[0] as AssociationConcept;
			expect(
				(childAssoc.children[0] as ReferenceConcept).referenceKey,
			).toBe("r");
		});
	});

	// -------------------------------------------------------------------------
	// 8. Edge and combined cases
	// -------------------------------------------------------------------------
	describe("8. Edge and combined cases", () => {
		it("17_29: implied concept (no expression) with @ref definition", () => {
			const input = loadFixture("17_29_implied_concept_with_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("implied_ref");
			expect(c.children.length).toBeGreaterThanOrEqual(1);
			expect(ast.references["implied_ref"]).toBe(c);
		});

		it("17_30: expression-only with @ref and metadata", () => {
			const input = loadFixture(
				"17_30_expression_only_ref_and_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const aliasRef = ast.concepts.find(
				(c) =>
					c.kind === "base" && (c as BaseConcept).key === "alias_ref",
			) as BaseConcept;
			expect(aliasRef).toBeDefined();
			expect(aliasRef.expressions.length).toBeGreaterThanOrEqual(1);
			expect(
				aliasRef.metadata?.source ??
					aliasRef.expressions[0]?.metadata?.source,
			).toEqual({ type: "reference", key: "main" } as ConceptRef);
			expect(ast.references["alias_ref"]).toBe(aliasRef);
			expect(aliasRef.children).toEqual([]);
		});

		it("17_31: reference in nested value block (deep use)", () => {
			const input = loadFixture(
				"17_31_ref_in_deeply_nested_value.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const a = ast.concepts.find(
				(c) => c.kind === "base" && getFirstExpressionValue(c) === "a",
			) as BaseConcept;
			let current: ConceptNode = a;
			for (const _ of [1, 2, 3]) {
				const assoc = current.children[0] as AssociationConcept;
				expect(assoc.kind).toBe("association");
				current = assoc.children[0];
			}
			expect(current.kind).toBe("reference");
			expect((current as ReferenceConcept).referenceKey).toBe("ref");
			expect(ast.references["ref"]).toBeDefined();
		});

		it("17_32: full usage — define, standalone, association target, and metadata in one doc", () => {
			const input = loadFixture("17_32_full_usage_combined.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["alice"]).toBeDefined();
			expect(ast.references["db"]).toBeDefined();
			const standaloneRef = ast.concepts.find(
				(c) =>
					c.kind === "reference" &&
					(c as ReferenceConcept).referenceKey === "alice",
			);
			expect(standaloneRef).toBeDefined();
			const doc = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "doc",
			) as BaseConcept;
			const assocs = doc.children.filter(
				(c): c is AssociationConcept => c.kind === "association",
			);
			expect(assocs).toHaveLength(2);
			expect(
				(assocs[0].children[0] as ReferenceConcept).referenceKey,
			).toBe("alice");
			expect(
				(assocs[1].children[0] as ReferenceConcept).referenceKey,
			).toBe("db");
			const fact = ast.concepts.find(
				(c) =>
					c.kind === "base" && getFirstExpressionValue(c) === "fact",
			) as BaseConcept;
			expect(fact.metadata?.source).toEqual({
				type: "reference",
				key: "db",
			} as ConceptRef);
			expect(fact.metadata?.custom?.verified_by).toEqual({
				type: "reference",
				key: "alice",
			} as ConceptRef);
		});

		it("17_33: reference with minimal identifier (single letter)", () => {
			const input = loadFixture("17_33_ref_minimal_identifier.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const defining = ast.concepts.find(
				(c) => c.kind === "base" && (c as BaseConcept).key === "a",
			);
			expect(defining).toBeDefined();
			expect((defining as BaseConcept).key).toBe("a");
			const standalone = ast.concepts.find(
				(c) =>
					c.kind === "reference" &&
					(c as ReferenceConcept).referenceKey === "a",
			);
			expect(standalone).toBeDefined();
			expect(ast.references["a"]).toBe(defining);
		});

		it("17_34: reference with hyphenated identifier", () => {
			const input = loadFixture("17_34_ref_hyphenated_identifier.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const defining = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					(c as BaseConcept).key === "my-concept-ref",
			);
			expect(defining).toBeDefined();
			const standalone = ast.concepts.find(
				(c) =>
					c.kind === "reference" &&
					(c as ReferenceConcept).referenceKey === "my-concept-ref",
			);
			expect(standalone).toBeDefined();
			expect(ast.references["my-concept-ref"]).toBe(defining);
		});
	});
});
