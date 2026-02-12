/**
 * Section 13 Identifiers and Reference Names — fixture tests
 *
 * Covers: valid identifier formation (single letter, underscore, letter+alnum,
 * letter+underscores/hyphens/digits, underscore start, mixed), reference name
 * in every position (after value block, expression-only, standalone, association
 * target direct/in value block, in metadata value), custom attribute keys,
 * key extraction consistency, case sensitivity, edge cases (long, many special,
 * Unicode), and invalid cases (leading digit/hyphen, empty after @, invalid char,
 * custom key leading digit/hyphen). Implements plan .cursor/plans/13_identifiers_2683beaf.plan.md
 *
 * Fixtures: tests/fixtures/identifiers/ with prefix 13_
 *
 * Grammar: identifier = (letter | "_") (alnum | "_" | "-")*; conceptRef = "@" identifier
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
const identifiersDir = join(__dirname, "fixtures", "identifiers");

function loadFixture(name: string): string {
	return readFileSync(join(identifiersDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

describe("Section 13 Identifiers and Reference Names (13_)", () => {
	// -------------------------------------------------------------------------
	// 1. Valid identifier formation (lexical)
	// -------------------------------------------------------------------------
	describe("1. Valid identifier formation (lexical)", () => {
		it("13_01_single_letter_ref: single letter as concept ref — parse succeeds, key/referenceKey and references", () => {
			const input = loadFixture("13_01_single_letter_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const first = ast.concepts[0] as BaseConcept;
			expect(first.kind).toBe("base");
			expect(first.key).toBe("a");
			expect(ast.references["a"]).toBeDefined();
			expect(ast.references["a"]).toBe(first);
			const second = ast.concepts[1];
			expect(second.kind).toBe("reference");
			expect((second as ReferenceConcept).referenceKey).toBe("X");
		});

		it("13_02_single_underscore_ref: single underscore as identifier — parse succeeds, key '_'", () => {
			const input = loadFixture("13_02_single_underscore_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("_");
			expect(ast.references["_"]).toBe(c);
		});

		it("13_03_letter_alnum_ref: letter and alnum only — keys name, id42 in AST and references", () => {
			const input = loadFixture("13_03_letter_alnum_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const c1 = ast.concepts[0] as BaseConcept;
			const c2 = ast.concepts[1] as BaseConcept;
			expect(c1.key).toBe("name");
			expect(c2.key).toBe("id42");
			expect(ast.references["name"]).toBe(c1);
			expect(ast.references["id42"]).toBe(c2);
		});

		it("13_04_letter_underscores_ref: letter with underscores — exact key strings", () => {
			const input = loadFixture("13_04_letter_underscores_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c1 = ast.concepts[0] as BaseConcept;
			const c2 = ast.concepts[1] as BaseConcept;
			expect(c1.key).toBe("my_ref");
			expect(c2.key).toBe("internal_name");
			expect(ast.references["my_ref"]).toBeDefined();
			expect(ast.references["internal_name"]).toBeDefined();
		});

		it("13_05_letter_hyphens_ref: letter with hyphens — key my-concept-ref", () => {
			const input = loadFixture("13_05_letter_hyphens_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("my-concept-ref");
			expect(ast.references["my-concept-ref"]).toBe(c);
		});

		it("13_06_letter_digits_ref: letter then digits — ref123, v2", () => {
			const input = loadFixture("13_06_letter_digits_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c1 = ast.concepts[0] as BaseConcept;
			const c2 = ast.concepts[1] as BaseConcept;
			expect(c1.key).toBe("ref123");
			expect(c2.key).toBe("v2");
			expect(ast.references["ref123"]).toBeDefined();
			expect(ast.references["v2"]).toBeDefined();
		});

		it("13_07_underscore_start_ref: underscore start then rest — _private, _internal-ref", () => {
			const input = loadFixture("13_07_underscore_start_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c1 = ast.concepts[0] as BaseConcept;
			const c2 = ast.concepts[1] as BaseConcept;
			expect(c1.key).toBe("_private");
			expect(c2.key).toBe("_internal-ref");
			expect(ast.references["_private"]).toBeDefined();
			expect(ast.references["_internal-ref"]).toBeDefined();
		});

		it("13_08_mixed_identifier_ref: mixed letters, digits, underscores, hyphens — exact casing", () => {
			const input = loadFixture("13_08_mixed_identifier_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("Abc_12-ref");
			expect(ast.references["Abc_12-ref"]).toBe(c);
		});
	});

	// -------------------------------------------------------------------------
	// 2. Reference name (@identifier) in every position
	// -------------------------------------------------------------------------
	describe("2. Reference name (@identifier) in every position", () => {
		it("13_09_ref_after_value_block: ref after value block — thing_ref registered", () => {
			const input = loadFixture("13_09_ref_after_value_block.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("thing_ref");
			expect(ast.references["thing_ref"]).toBe(c);
		});

		it("13_10_ref_after_expression_only: expression-only with trailing @id — my_tag, no children", () => {
			const input = loadFixture("13_10_ref_after_expression_only.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("my_tag");
			expect(c.children).toHaveLength(0);
			expect(ast.references["my_tag"]).toBe(c);
		});

		it("13_11_ref_standalone_top_level: standalone @r as second top-level — reference concept", () => {
			const input = loadFixture("13_11_ref_standalone_top_level.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const refConcept = ast.concepts[1];
			expect(refConcept.kind).toBe("reference");
			expect((refConcept as ReferenceConcept).referenceKey).toBe("r");
			expect((refConcept as ReferenceConcept).key).toBe(null);
			expect(ast.references["r"]).toBe(ast.concepts[0]);
		});

		it("13_12_ref_association_target_direct: association target is @alice — child is ReferenceConcept", () => {
			const input = loadFixture(
				"13_12_ref_association_target_direct.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["alice"]).toBeDefined();
			const container = ast.concepts[1] as BaseConcept;
			expect(container.children).toHaveLength(1);
			const assoc = container.children[0] as AssociationConcept;
			expect(assoc.children[0].kind).toBe("reference");
			expect((assoc.children[0] as ReferenceConcept).referenceKey).toBe(
				"alice",
			);
		});

		it("13_13_ref_association_target_in_value_block: ref inside value block of association target", () => {
			const input = loadFixture(
				"13_13_ref_association_target_in_value_block.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["alice"]).toBeDefined();
			const doc = ast.concepts[1] as BaseConcept;
			const authorAssoc = doc.children[0] as AssociationConcept;
			const authorConcept = authorAssoc.children[0] as BaseConcept;
			const refChild = authorConcept.children[0];
			expect(refChild.kind).toBe("reference");
			expect((refChild as ReferenceConcept).referenceKey).toBe("alice");
		});

		it("13_14_ref_in_metadata_value: custom source=@nasa — metadata.source or custom, ConceptRef", () => {
			const input = loadFixture("13_14_ref_in_metadata_value.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["nasa"]).toBeDefined();
			const item = ast.concepts[0] as BaseConcept;
			expect(item.metadata).not.toBeNull();
			const source =
				item.metadata!.source ?? item.metadata!.custom?.["source"];
			expect(source).toBeDefined();
			expect(
				typeof source === "object" &&
					source !== null &&
					"type" in source,
			).toBe(true);
			const ref = source as ConceptRef;
			expect(ref.type).toBe("reference");
			expect(ref.key).toBe("nasa");
		});
	});

	// -------------------------------------------------------------------------
	// 3. Identifier as custom attribute key
	// -------------------------------------------------------------------------
	describe("3. Identifier as custom attribute key", () => {
		it("13_15_custom_key_letters: key letters only — metadata.custom['foo'] === 'bar'", () => {
			const input = loadFixture("13_15_custom_key_letters.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.metadata?.custom?.["foo"]).toBe("bar");
		});

		it("13_16_custom_key_underscore: key with underscore — my_key present", () => {
			const input = loadFixture("13_16_custom_key_underscore.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.metadata?.custom?.["my_key"]).toBe("value");
		});

		it("13_17_custom_key_hyphen: key with hyphen — my-key present", () => {
			const input = loadFixture("13_17_custom_key_hyphen.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.metadata?.custom?.["my-key"]).toBe("value");
		});

		it("13_18_custom_key_digits: key with digits — key2 present", () => {
			const input = loadFixture("13_18_custom_key_digits.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.metadata?.custom?.["key2"]).toBe("value");
		});

		it("13_19_custom_key_mixed: key mixed — Abc_12-ref === 'val'", () => {
			const input = loadFixture("13_19_custom_key_mixed.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.metadata?.custom?.["Abc_12-ref"]).toBe("val");
		});

		it("13_20_custom_key_underscore_start: key starts with _ — _private present", () => {
			const input = loadFixture(
				"13_20_custom_key_underscore_start.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.metadata?.custom?.["_private"]).toBe("val");
		});
	});

	// -------------------------------------------------------------------------
	// 4. Key extraction consistency
	// -------------------------------------------------------------------------
	describe("4. Key extraction consistency", () => {
		it("13_21_key_consistency_definition_use: same identifier in definition and use — exact match", () => {
			const input = loadFixture(
				"13_21_key_consistency_definition_use.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const def = ast.concepts[0] as BaseConcept;
			const use = ast.concepts[1] as ReferenceConcept;
			expect(def.key).toBe("my_ref");
			expect(use.referenceKey).toBe("my_ref");
			expect(ast.references["my_ref"]).toBe(def);
		});

		it("13_22_multiple_distinct_keys: k1, k2, k3 all distinct in references", () => {
			const input = loadFixture("13_22_multiple_distinct_keys.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["k1"]).toBe(ast.concepts[0]);
			expect(ast.references["k2"]).toBe(ast.concepts[1]);
			expect(ast.references["k3"]).toBe(ast.concepts[2]);
			expect(Object.keys(ast.references).sort()).toEqual([
				"k1",
				"k2",
				"k3",
			]);
		});
	});

	// -------------------------------------------------------------------------
	// 5. Case sensitivity
	// -------------------------------------------------------------------------
	describe("5. Case sensitivity", () => {
		it("13_23_case_sensitive_refs: MyRef and myref are different keys — casing preserved", () => {
			const input = loadFixture("13_23_case_sensitive_refs.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["MyRef"]).toBeDefined();
			expect(ast.references["myref"]).toBeDefined();
			expect(ast.references["MyRef"]).toBe(ast.concepts[0]);
			expect(ast.references["myref"]).toBe(ast.concepts[1]);
			expect(ast.references["MyRef"]).not.toBe(ast.references["myref"]);
		});

		it("13_24_custom_key_case_preserved: MyKey stored with exact casing", () => {
			const input = loadFixture("13_24_custom_key_case_preserved.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.metadata?.custom?.["MyKey"]).toBe("val");
		});
	});

	// -------------------------------------------------------------------------
	// 6. Edge cases
	// -------------------------------------------------------------------------
	describe("6. Edge cases", () => {
		it("13_25_long_identifier: long identifier — full string, no truncation", () => {
			const input = loadFixture("13_25_long_identifier.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c = ast.concepts[0] as BaseConcept;
			const expectedKey =
				"abcdefghijklmnopqrstuvwxyz_0123456789-abcdefghijklmnopqrstuvwxyz_0123456789-abcdefghijklmnopqrstuvwxyz_0123456789";
			expect(c.key).toBe(expectedKey);
			expect(ast.references[expectedKey]).toBe(c);
		});

		it("13_26_identifier_many_special: many underscores and hyphens — exact a_b-c_d-e", () => {
			const input = loadFixture("13_26_identifier_many_special.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("a_b-c_d-e");
			expect(ast.references["a_b-c_d-e"]).toBeDefined();
		});

		it("13_27_identifier_unicode: Unicode in identifier — if grammar accepts, key exact; else parse may fail", () => {
			const input = loadFixture("13_27_identifier_unicode.amorfs");
			const result = parse(input);
			if (result.success) {
				const ast = result.ast;
				const c = ast.concepts[0] as BaseConcept;
				expect(c.key).toBe("résumé");
				expect(ast.references["résumé"]).toBe(c);
			}
			// If grammar does not accept Unicode letters, parse fails — acceptable per plan
		});
	});

	// -------------------------------------------------------------------------
	// 7. Invalid identifier / parse failure
	// -------------------------------------------------------------------------
	describe("7. Invalid identifier / parse failure", () => {
		it("13_28_invalid_leading_digit: @123ref — parse fails", () => {
			const input = loadFixture("13_28_invalid_leading_digit.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
			expect(isValid(input)).toBe(false);
		});

		it("13_29_invalid_leading_hyphen: @-ref — parse fails", () => {
			const input = loadFixture("13_29_invalid_leading_hyphen.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
			expect(isValid(input)).toBe(false);
		});

		it("13_30_invalid_empty_after_at: @ with no identifier — parse fails", () => {
			const input = loadFixture("13_30_invalid_empty_after_at.amorfs");
			const result = parse(input);
			expect(result.success).toBe(false);
			expect(isValid(input)).toBe(false);
		});

		it("13_31_invalid_char_in_ref: dot in @ref.name — parse fails or only valid prefix", () => {
			const input = loadFixture("13_31_invalid_char_in_ref.amorfs");
			const result = parse(input);
			// Parser may fail, or parse "ref" and then fail on ".name"
			if (result.success) {
				const ast = result.ast;
				// No node should have key/referenceKey containing "."
				for (const concept of ast.concepts) {
					if (concept.kind === "base" && concept.key) {
						expect(concept.key).not.toContain(".");
					}
					if (concept.kind === "reference") {
						expect(
							(concept as ReferenceConcept).referenceKey,
						).not.toContain(".");
					}
				}
			}
		});

		it("13_32_invalid_custom_key_leading_digit: {2key=value} — parse fails", () => {
			const input = loadFixture(
				"13_32_invalid_custom_key_leading_digit.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(false);
			expect(isValid(input)).toBe(false);
		});

		it("13_33_invalid_custom_key_leading_hyphen: {-key=value} — parse fails", () => {
			const input = loadFixture(
				"13_33_invalid_custom_key_leading_hyphen.amorfs",
			);
			const result = parse(input);
			expect(result.success).toBe(false);
			expect(isValid(input)).toBe(false);
		});
	});
});
