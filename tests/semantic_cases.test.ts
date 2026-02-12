/**
 * Section 19 Semantic Web — fixture tests
 *
 * Covers: vocabulary-style expressions (FOAF, Dublin Core, Schema.org, SKOS, OWL),
 * IRIs in associations, references in a semantic graph (@ref), combined and edge cases.
 *
 * Implements plan .cursor/plans/19_semantic_b0766fba.plan.md
 * Fixtures: tests/fixtures/semantic_cases/ with prefix 19_
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
	type ExpressionValue,
	type ConceptRef,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const semanticCasesDir = join(__dirname, "fixtures", "semantic_cases");

function loadFixture(name: string): string {
	return readFileSync(join(semanticCasesDir, name), "utf-8");
}

function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== "base") return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

/** Get expressions on the label of an association (first child when base). */
function getLabelExpressions(assoc: AssociationConcept): ExpressionValue[] {
	const first = assoc.children[0];
	if (first?.kind === "base") return first.expressions;
	return [];
}

/** Find association whose label's first expression matches. */
function findAssociationByLabel(
	concept: ConceptNode,
	firstLabelValue: string,
): AssociationConcept | undefined {
	return concept.children.find(
		(ch): ch is AssociationConcept =>
			ch.kind === "association" &&
			ch.children[0]?.kind === "base" &&
			(ch.children[0] as BaseConcept).expressions[0]?.value ===
				firstLabelValue,
	) as AssociationConcept | undefined;
}

/** Get the reference key from an association target (handles [@ref] as direct ref or base with one ref child). */
function getAssociationTargetRefKey(assoc: AssociationConcept): string | null {
	const first = assoc.children[0];
	if (!first) return null;
	if (first.kind === "reference") return first.referenceKey;
	if (first.kind === "base" && first.children[0]?.kind === "reference")
		return (first.children[0] as ReferenceConcept).referenceKey;
	return null;
}

/** Recursively find a base concept that has an expression with type 'iri'. */
function findFirstIriConcept(node: ConceptNode): BaseConcept | null {
	if (node.kind === "base") {
		if (node.expressions.some((e) => e.type === "iri")) return node;
		for (const ch of node.children) {
			const found = findFirstIriConcept(ch);
			if (found) return found;
		}
		return null;
	}
	if (node.kind === "association") {
		for (const ch of node.children) {
			const found = findFirstIriConcept(ch);
			if (found) return found;
		}
	}
	return null;
}

/** Collect all base concepts that have an expression with type 'iri'. */
function findAllIriConcepts(node: ConceptNode): BaseConcept[] {
	const out: BaseConcept[] = [];
	if (node.kind === "base") {
		if (node.expressions.some((e) => e.type === "iri")) out.push(node);
		for (const ch of node.children) out.push(...findAllIriConcepts(ch));
	} else if (node.kind === "association") {
		for (const ch of node.children) out.push(...findAllIriConcepts(ch));
	}
	return out;
}

describe("Section 19 Semantic Web (19_)", () => {
	// -------------------------------------------------------------------------
	// 1. Vocabulary-style expressions
	// -------------------------------------------------------------------------
	describe("1. Vocabulary-style expressions", () => {
		it("19_01: minimal — human term and single vocabulary term", () => {
			const input = loadFixture("19_01_vocabulary_minimal.amorfs");
			expect(isValid(input)).toBe(true);
			const result = parse(input);
			expect(result.success).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0] as BaseConcept;
			expect(person.kind).toBe("base");
			const nameAssoc = findAssociationByLabel(person, "name");
			expect(nameAssoc).toBeDefined();
			const labelExprs = getLabelExpressions(nameAssoc!);
			expect(labelExprs).toHaveLength(2);
			expect(labelExprs[0].value).toBe("name");
			expect(labelExprs[1].value).toBe("foaf:name");
			const valueConcept = nameAssoc!.children[0];
			expect(valueConcept.kind).toBe("base");
			const valueChild = (valueConcept as BaseConcept)
				.children[0] as BaseConcept;
			expect(valueChild.expressions[0].value).toBe("Alice");
		});

		it("19_02: multiple vocabularies on one label", () => {
			const input = loadFixture("19_02_vocabulary_multi.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0] as BaseConcept;
			const nameAssoc = findAssociationByLabel(person, "name");
			const titleAssoc = findAssociationByLabel(person, "title");
			expect(nameAssoc).toBeDefined();
			expect(titleAssoc).toBeDefined();
			const nameExprs = getLabelExpressions(nameAssoc!);
			expect(nameExprs.length).toBeGreaterThanOrEqual(3);
			expect(nameExprs[0].value).toBe("name");
			expect(nameExprs[1].value).toBe("foaf:name");
			expect(nameExprs[2].value).toBe("schema:name");
			const titleExprs = getLabelExpressions(titleAssoc!);
			expect(titleExprs.length).toBeGreaterThanOrEqual(3);
			expect(titleExprs[0].value).toBe("title");
			const nameValue = (nameAssoc!.children[0] as BaseConcept)
				.children[0] as BaseConcept;
			expect(nameValue.expressions[0].value).toBe("Jane Doe");
		});

		it("19_03: FOAF-style (name, mbox, homepage, workplaceHomepage)", () => {
			const input = loadFixture("19_03_vocabulary_foaf.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0] as BaseConcept;
			const nameAssoc = findAssociationByLabel(person, "name");
			const emailAssoc = findAssociationByLabel(person, "email");
			const homepageAssoc = findAssociationByLabel(person, "homepage");
			const worksAssoc = findAssociationByLabel(person, "works for");
			expect(nameAssoc).toBeDefined();
			expect(emailAssoc).toBeDefined();
			expect(homepageAssoc).toBeDefined();
			expect(worksAssoc).toBeDefined();
			expect(
				getLabelExpressions(nameAssoc!).length,
			).toBeGreaterThanOrEqual(2);
			expect(
				getLabelExpressions(emailAssoc!).some((e) =>
					String(e.value).includes("foaf:mbox"),
				),
			).toBe(true);
			expect(
				getLabelExpressions(homepageAssoc!).some((e) =>
					String(e.value).includes("foaf:homepage"),
				),
			).toBe(true);
			expect(
				getLabelExpressions(worksAssoc!).some((e) =>
					String(e.value).includes("foaf:workplaceHomepage"),
				),
			).toBe(true);
		});

		it("19_04: Dublin Core (dc:title, dc:creator, dc:date, dc:subject)", () => {
			const input = loadFixture("19_04_vocabulary_dublin_core.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const doc = ast.concepts[0] as BaseConcept;
			const titleAssoc = findAssociationByLabel(doc, "title");
			const creatorAssoc = findAssociationByLabel(doc, "creator");
			const dateAssoc = findAssociationByLabel(doc, "date");
			const subjectAssoc = findAssociationByLabel(doc, "subject");
			expect(titleAssoc).toBeDefined();
			expect(creatorAssoc).toBeDefined();
			expect(dateAssoc).toBeDefined();
			expect(subjectAssoc).toBeDefined();
			expect(
				getLabelExpressions(titleAssoc!).some((e) =>
					String(e.value).includes("dc:title"),
				),
			).toBe(true);
			expect(
				getLabelExpressions(creatorAssoc!).some((e) =>
					String(e.value).includes("dc:creator"),
				),
			).toBe(true);
			expect(
				getLabelExpressions(dateAssoc!).some((e) =>
					String(e.value).includes("dc:date"),
				),
			).toBe(true);
			expect(
				getLabelExpressions(subjectAssoc!).some((e) =>
					String(e.value).includes("dc:subject"),
				),
			).toBe(true);
		});

		it("19_05: Schema.org (schema:name, schema:jobTitle, schema:email, schema:url)", () => {
			const input = loadFixture("19_05_vocabulary_schema.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0] as BaseConcept;
			const assocs = person.children.filter(
				(c): c is AssociationConcept => c.kind === "association",
			);
			expect(assocs.length).toBeGreaterThanOrEqual(3);
			const hasSchemaName = assocs.some((a) =>
				getLabelExpressions(a).some(
					(e) => String(e.value) === "schema:name",
				),
			);
			const hasSchemaJobTitle = assocs.some((a) =>
				getLabelExpressions(a).some(
					(e) => String(e.value) === "schema:jobTitle",
				),
			);
			const hasSchemaEmail = assocs.some((a) =>
				getLabelExpressions(a).some(
					(e) => String(e.value) === "schema:email",
				),
			);
			const hasSchemaUrl = assocs.some((a) =>
				getLabelExpressions(a).some(
					(e) => String(e.value) === "schema:url",
				),
			);
			expect(hasSchemaName).toBe(true);
			expect(hasSchemaJobTitle).toBe(true);
			expect(hasSchemaEmail).toBe(true);
			expect(hasSchemaUrl).toBe(true);
		});

		it("19_06: SKOS (prefLabel, altLabel, broader, narrower, related)", () => {
			const input = loadFixture("19_06_vocabulary_skos.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			expect(
				findAssociationByLabel(concept, "preferred label"),
			).toBeDefined();
			expect(
				findAssociationByLabel(concept, "alternate label"),
			).toBeDefined();
			expect(findAssociationByLabel(concept, "broader")).toBeDefined();
			expect(findAssociationByLabel(concept, "narrower")).toBeDefined();
			expect(findAssociationByLabel(concept, "related")).toBeDefined();
			const prefLabelAssoc = findAssociationByLabel(
				concept,
				"preferred label",
			);
			expect(
				getLabelExpressions(prefLabelAssoc!).some((e) =>
					String(e.value).includes("skos:prefLabel"),
				),
			).toBe(true);
			const prefLabelTarget = prefLabelAssoc!.children[0] as BaseConcept;
			const hasEn =
				prefLabelTarget.expressions.some(
					(e) => e.metadata?.language === "en" || e.language === "en",
				) ||
				prefLabelTarget.children.some(
					(ch) =>
						ch.kind === "base" &&
						(ch as BaseConcept).expressions.some(
							(e) =>
								e.metadata?.language === "en" ||
								e.language === "en",
						),
				);
			expect(hasEn).toBe(true);
		});

		it("19_07: OWL (owl:sameAs) — label and IRI value", () => {
			const input = loadFixture("19_07_vocabulary_owl_same_as.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const entity = ast.concepts[0] as BaseConcept;
			const sameAsAssoc = findAssociationByLabel(entity, "same as");
			expect(sameAsAssoc).toBeDefined();
			const labelExprs = getLabelExpressions(sameAsAssoc!);
			expect(labelExprs).toHaveLength(2);
			expect(labelExprs[1].value).toBe("owl:sameAs");
			const valueConcept = (sameAsAssoc!.children[0] as BaseConcept)
				.children[0] as BaseConcept;
			expect(valueConcept.expressions[0].type).toBe("iri");
			expect(String(valueConcept.expressions[0].value)).toContain(
				"http://example.org/id",
			);
		});

		it("19_08: vocabulary with per-expression language metadata", () => {
			const input = loadFixture("19_08_vocabulary_with_language.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const concept = ast.concepts[0] as BaseConcept;
			const prefAssoc = findAssociationByLabel(
				concept,
				"preferred label",
			);
			expect(prefAssoc).toBeDefined();
			expect(
				getLabelExpressions(prefAssoc!).some((e) =>
					String(e.value).includes("skos:prefLabel"),
				),
			).toBe(true);
			const target = prefAssoc!.children[0] as BaseConcept;
			expect(target.expressions.length).toBeGreaterThanOrEqual(2);
			const hasEn =
				target.expressions.some(
					(e) => e.language === "en" || e.metadata?.language === "en",
				) ||
				target.children.some(
					(ch) =>
						ch.kind === "base" &&
						(ch as BaseConcept).expressions.some(
							(e) =>
								e.language === "en" ||
								e.metadata?.language === "en",
						),
				);
			const hasFr =
				target.expressions.some(
					(e) => e.language === "fr" || e.metadata?.language === "fr",
				) ||
				target.children.some(
					(ch) =>
						ch.kind === "base" &&
						(ch as BaseConcept).expressions.some(
							(e) =>
								e.language === "fr" ||
								e.metadata?.language === "fr",
						),
				);
			expect(hasEn).toBe(true);
			expect(hasFr).toBe(true);
		});

		it("19_09: vocabulary on nested association (two levels)", () => {
			const input = loadFixture("19_09_vocabulary_nested.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0] as BaseConcept;
			const worksAssoc = findAssociationByLabel(person, "works for");
			expect(worksAssoc).toBeDefined();
			expect(
				getLabelExpressions(worksAssoc!).some((e) =>
					String(e.value).includes("foaf:workplaceHomepage"),
				),
			).toBe(true);
			const inner = worksAssoc!.children[0] as BaseConcept;
			const nameAssoc = findAssociationByLabel(inner, "name");
			const urlAssoc = findAssociationByLabel(inner, "url");
			expect(nameAssoc).toBeDefined();
			expect(urlAssoc).toBeDefined();
			expect(
				getLabelExpressions(nameAssoc!).some((e) =>
					String(e.value).includes("schema:name"),
				),
			).toBe(true);
			const urlValue = (urlAssoc!.children[0] as BaseConcept)
				.children[0] as BaseConcept;
			expect(urlValue.expressions[0].type).toBe("iri");
		});

		it("19_10: expression-only concept with vocabulary", () => {
			const input = loadFixture(
				"19_10_vocabulary_expression_only.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.kind).toBe("base");
			expect(c.children).toHaveLength(0);
			expect(c.expressions.length).toBeGreaterThanOrEqual(2);
			expect(
				c.expressions.some((e) => String(e.value) === "something"),
			).toBe(true);
			expect(
				c.expressions.some(
					(e) => String(e.value) === "foaf:primaryTopic",
				),
			).toBe(true);
			expect(c.key).toBe("topic_ref");
			expect(ast.references["topic_ref"]).toBe(c);
		});
	});

	// -------------------------------------------------------------------------
	// 2. IRIs in associations
	// -------------------------------------------------------------------------
	describe("2. IRIs in associations", () => {
		it("19_11: IRI as value in a concept", () => {
			const input = loadFixture("19_11_iri_value_simple.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const link = ast.concepts[0] as BaseConcept;
			const homepageAssoc = findAssociationByLabel(link, "homepage");
			expect(homepageAssoc).toBeDefined();
			const valueConcept = (homepageAssoc!.children[0] as BaseConcept)
				.children[0] as BaseConcept;
			expect(valueConcept.expressions[0].type).toBe("iri");
			expect(String(valueConcept.expressions[0].value)).toContain(
				"https://example.com",
			);
		});

		it("19_12: sameAs-style — label and IRI value", () => {
			const input = loadFixture("19_12_iri_same_as.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0] as BaseConcept;
			const sameAsAssoc = findAssociationByLabel(person, "same as");
			expect(sameAsAssoc).toBeDefined();
			const labelExprs = getLabelExpressions(sameAsAssoc!);
			expect(labelExprs).toHaveLength(2);
			const valueConcept = (sameAsAssoc!.children[0] as BaseConcept)
				.children[0] as BaseConcept;
			expect(valueConcept.expressions).toHaveLength(1);
			expect(valueConcept.expressions[0].type).toBe("iri");
			expect(String(valueConcept.expressions[0].value)).toContain(
				"dbpedia.org",
			);
		});

		it("19_13: multiple IRI values in one concept", () => {
			const input = loadFixture("19_13_iri_multiple_values.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const entity = ast.concepts[0] as BaseConcept;
			const sameAsAssoc = findAssociationByLabel(entity, "same as");
			expect(sameAsAssoc).toBeDefined();
			const container = sameAsAssoc!.children[0] as BaseConcept;
			const iriConcepts = findAllIriConcepts(container);
			expect(iriConcepts.length).toBeGreaterThanOrEqual(2);
			expect(
				iriConcepts.every((c) => c.expressions[0].type === "iri"),
			).toBe(true);
		});

		it("19_14: IRI and non-IRI in same value block", () => {
			const input = loadFixture("19_14_iri_mixed_value_block.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const link = ast.concepts[0] as BaseConcept;
			const linkAssoc = findAssociationByLabel(link, "link");
			expect(linkAssoc).toBeDefined();
			const container = linkAssoc!.children[0] as BaseConcept;
			expect(container.children).toHaveLength(2);
			const types = container.children.map((ch) =>
				ch.kind === "base" ? ch.expressions[0]?.type : null,
			);
			expect(types).toContain("iri");
			expect(types).toContain("text");
		});

		it("19_15: IRI in nested association", () => {
			const input = loadFixture("19_15_iri_nested.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0] as BaseConcept;
			const iriConcept = findFirstIriConcept(person);
			expect(iriConcept).not.toBeNull();
			expect(iriConcept!.expressions[0].type).toBe("iri");
			expect(String(iriConcept!.expressions[0].value)).toContain(
				"acme.example.com",
			);
		});

		it("19_16: vocabulary label with IRI value", () => {
			const input = loadFixture("19_16_iri_vocabulary_label.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0] as BaseConcept;
			const homepageAssoc = findAssociationByLabel(person, "homepage");
			expect(homepageAssoc).toBeDefined();
			expect(
				getLabelExpressions(homepageAssoc!).some((e) =>
					String(e.value).includes("foaf:homepage"),
				),
			).toBe(true);
			const valueConcept = (homepageAssoc!.children[0] as BaseConcept)
				.children[0] as BaseConcept;
			expect(valueConcept.expressions[0].type).toBe("iri");
		});
	});

	// -------------------------------------------------------------------------
	// 3. References to external concepts (@ref in a semantic graph)
	// -------------------------------------------------------------------------
	describe("3. References to external concepts (@ref)", () => {
		it("19_17: single @ref definition", () => {
			const input = loadFixture("19_17_ref_single_definition.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.key).toBe("person_1");
			expect(ast.references["person_1"]).toBeDefined();
			expect(ast.references["person_1"]).toBe(c);
			expect(Object.keys(ast.references)).toHaveLength(1);
		});

		it("19_18: multiple @ref definitions", () => {
			const input = loadFixture("19_18_ref_multiple_definitions.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["alice"]).toBeDefined();
			expect(ast.references["acme"]).toBeDefined();
			expect(Object.keys(ast.references)).toHaveLength(2);
			const aliceConcept = ast.concepts.find(
				(c) => c.kind === "base" && (c as BaseConcept).key === "alice",
			);
			const acmeConcept = ast.concepts.find(
				(c) => c.kind === "base" && (c as BaseConcept).key === "acme",
			);
			expect(ast.references["alice"]).toBe(aliceConcept);
			expect(ast.references["acme"]).toBe(acmeConcept);
		});

		it("19_19: reference as association target (knows [@bob])", () => {
			const input = loadFixture("19_19_ref_association_target.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const alice = ast.concepts.find(
				(c) => c.kind === "base" && findAssociationByLabel(c, "knows"),
			) as BaseConcept;
			expect(alice).toBeDefined();
			const knowsAssoc = findAssociationByLabel(alice, "knows");
			expect(knowsAssoc).toBeDefined();
			const refKey = getAssociationTargetRefKey(knowsAssoc!);
			expect(refKey).toBe("bob");
			expect(ast.references["bob"]).toBeDefined();
		});

		it("19_20: reference in metadata (source=@db)", () => {
			const input = loadFixture("19_20_ref_in_metadata.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const conceptWithMeta = ast.concepts.find(
				(c) => c.kind === "base" && c.metadata?.source != null,
			) as BaseConcept;
			expect(conceptWithMeta).toBeDefined();
			expect(conceptWithMeta.metadata).not.toBeNull();
			const sourceRef = conceptWithMeta.metadata!.source;
			expect(sourceRef).toBeDefined();
			expect((sourceRef as ConceptRef).type).toBe("reference");
			expect((sourceRef as ConceptRef).key).toBe("nasa_db");
			expect(ast.references["nasa_db"]).toBeDefined();
		});

		it("19_21: small graph — two entities with @ref, one references the other", () => {
			const input = loadFixture("19_21_ref_small_graph.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["alice"]).toBeDefined();
			expect(ast.references["acme"]).toBeDefined();
			const employment = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					getFirstExpressionValue(c) === "employment",
			) as BaseConcept;
			expect(employment).toBeDefined();
			const worksAtAssoc = findAssociationByLabel(employment, "works at");
			expect(worksAtAssoc).toBeDefined();
			expect(getAssociationTargetRefKey(worksAtAssoc!)).toBe("acme");
			expect(employment.metadata?.custom?.author).toBeDefined();
			const authorRef = employment.metadata!.custom!.author as ConceptRef;
			expect(authorRef.key).toBe("alice");
		});

		it("19_22: same @ref used in multiple places", () => {
			const input = loadFixture("19_22_ref_used_multiple_places.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["db"]).toBeDefined();
			const conceptWithChildA = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					(c as BaseConcept).children[0] &&
					getFirstExpressionValue(
						(c as BaseConcept).children[0] as BaseConcept,
					) === "A",
			) as BaseConcept;
			const conceptWithChildC = ast.concepts.find(
				(c) =>
					c.kind === "base" &&
					(c as BaseConcept).children[0] &&
					getFirstExpressionValue(
						(c as BaseConcept).children[0] as BaseConcept,
					) === "C",
			) as BaseConcept;
			expect(conceptWithChildA).toBeDefined();
			expect(conceptWithChildC).toBeDefined();
			const sourceA =
				conceptWithChildA.metadata?.source ??
				conceptWithChildA.metadata?.custom?.source;
			const sourceC =
				conceptWithChildC.metadata?.source ??
				conceptWithChildC.metadata?.custom?.source;
			expect(sourceA).toBeDefined();
			expect((sourceA as ConceptRef).key).toBe("db");
			expect((sourceC as ConceptRef).key).toBe("db");
			const conceptB = ast.concepts.find(
				(c) => c.kind === "base" && findAssociationByLabel(c, "from"),
			) as BaseConcept;
			expect(conceptB).toBeDefined();
			const fromAssoc = findAssociationByLabel(conceptB, "from");
			expect(getAssociationTargetRefKey(fromAssoc!)).toBe("db");
		});

		it("19_23: standalone top-level reference (@ref only)", () => {
			const input = loadFixture("19_23_ref_standalone.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(2);
			const standalone = ast.concepts[1];
			expect(standalone.kind).toBe("reference");
			expect((standalone as ReferenceConcept).referenceKey).toBe("alice");
			expect(ast.references["alice"]).toBe(ast.concepts[0]);
		});
	});

	// -------------------------------------------------------------------------
	// 4. Combined (vocabulary + IRI + @ref)
	// -------------------------------------------------------------------------
	describe("4. Combined", () => {
		it("19_24: vocabulary and IRI in one concept (no @ref)", () => {
			const input = loadFixture("19_24_combined_vocabulary_iri.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0] as BaseConcept;
			const nameAssoc = findAssociationByLabel(person, "name");
			const homepageAssoc = findAssociationByLabel(person, "homepage");
			const sameAsAssoc = findAssociationByLabel(person, "same as");
			expect(nameAssoc).toBeDefined();
			expect(homepageAssoc).toBeDefined();
			expect(sameAsAssoc).toBeDefined();
			expect(
				getLabelExpressions(nameAssoc!).some((e) =>
					String(e.value).includes("foaf:name"),
				),
			).toBe(true);
			expect(
				getLabelExpressions(homepageAssoc!).some((e) =>
					String(e.value).includes("foaf:homepage"),
				),
			).toBe(true);
			expect(
				getLabelExpressions(sameAsAssoc!).some((e) =>
					String(e.value).includes("owl:sameAs"),
				),
			).toBe(true);
			const iriConcepts = findAllIriConcepts(person);
			expect(iriConcepts.length).toBeGreaterThanOrEqual(2);
		});

		it("19_25: vocabulary and @ref", () => {
			const input = loadFixture("19_25_combined_vocabulary_ref.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const alice = ast.concepts.find(
				(c) => c.kind === "base" && findAssociationByLabel(c, "knows"),
			) as BaseConcept;
			expect(alice).toBeDefined();
			expect(findAssociationByLabel(alice, "name")).toBeDefined();
			expect(
				getLabelExpressions(
					findAssociationByLabel(alice, "name")!,
				).some((e) => String(e.value).includes("foaf:name")),
			).toBe(true);
			const knowsAssoc = findAssociationByLabel(alice, "knows");
			expect(knowsAssoc).toBeDefined();
			expect(getAssociationTargetRefKey(knowsAssoc!)).toBe("bob");
			const aliceSource =
				alice.metadata?.source ?? alice.metadata?.custom?.source;
			expect(aliceSource).toBeDefined();
			expect((aliceSource as ConceptRef).key).toBe("db");
			expect(ast.references["bob"]).toBeDefined();
			expect(ast.references["db"]).toBeDefined();
		});

		it("19_26: full semantic document (vocabulary + IRI + @ref)", () => {
			const input = loadFixture("19_26_combined_full_semantic.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.references["nasa_db"]).toBeDefined();
			expect(ast.references["tim"]).toBeDefined();
			const tim = ast.concepts.find(
				(c) => c.kind === "base" && (c as BaseConcept).key === "tim",
			) as BaseConcept;
			expect(tim).toBeDefined();
			expect(
				getLabelExpressions(findAssociationByLabel(tim, "name")!).some(
					(e) => String(e.value).includes("foaf:name"),
				),
			).toBe(true);
			const iriConcepts = findAllIriConcepts(tim);
			expect(iriConcepts.length).toBeGreaterThanOrEqual(2);
			const citation = ast.concepts.find(
				(c) => c.kind === "base" && findAssociationByLabel(c, "author"),
			) as BaseConcept;
			expect(citation).toBeDefined();
			const citationSource =
				citation!.metadata?.source ??
				citation!.metadata?.custom?.source;
			expect(citationSource).toBeDefined();
			expect((citationSource as ConceptRef).key).toBe("nasa_db");
			const authorAssoc = findAssociationByLabel(citation, "author");
			expect(getAssociationTargetRefKey(authorAssoc!)).toBe("tim");
		});
	});

	// -------------------------------------------------------------------------
	// 5. Edge and boundary cases
	// -------------------------------------------------------------------------
	describe("5. Edge and boundary cases", () => {
		it("19_27: minimal semantic — prefix:term only (no human term)", () => {
			const input = loadFixture(
				"19_27_edge_vocabulary_prefix_only.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const c = ast.concepts[0] as BaseConcept;
			expect(c.expressions).toHaveLength(1);
			expect(c.expressions[0].value).toBe("foaf:name");
			expect(c.children[0]).toBeDefined();
			expect(getFirstExpressionValue(c.children[0] as BaseConcept)).toBe(
				"Alice",
			);
		});

		it("19_28: many vocabulary alternatives (five+ expressions on one label)", () => {
			const input = loadFixture(
				"19_28_edge_many_vocabulary_expressions.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const person = ast.concepts[0] as BaseConcept;
			const nameAssoc = findAssociationByLabel(person, "name");
			expect(nameAssoc).toBeDefined();
			const exprs = getLabelExpressions(nameAssoc!);
			expect(exprs.length).toBeGreaterThanOrEqual(5);
			expect(exprs.map((e) => String(e.value))).toContain("foaf:name");
			expect(exprs.map((e) => String(e.value))).toContain("schema:name");
			expect(exprs.map((e) => String(e.value))).toContain("dc:creator");
			expect(exprs.map((e) => String(e.value))).toContain("rdfs:label");
		});

		it("19_29: vocabulary with custom metadata on concept", () => {
			const input = loadFixture(
				"19_29_edge_vocabulary_custom_metadata.amorfs",
			);
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			const alice = ast.concepts.find(
				(c) => c.kind === "base" && (c as BaseConcept).key === "alice",
			) as BaseConcept;
			expect(alice).toBeDefined();
			const nameAssoc = findAssociationByLabel(alice, "name");
			expect(nameAssoc).toBeDefined();
			expect(
				getLabelExpressions(nameAssoc!).some((e) =>
					String(e.value).includes("foaf:name"),
				),
			).toBe(true);
			expect(
				String(alice.metadata?.custom?.verified).replace(/,.*$/, ""),
			).toBe("true");
			const aliceSource =
				alice.metadata?.source ?? alice.metadata?.custom?.source;
			expect(aliceSource).toBeDefined();
			expect((aliceSource as ConceptRef).key).toBe("db");
		});

		it("19_30: implied concept with vocabulary on associations", () => {
			const input = loadFixture("19_30_edge_implied_vocabulary.amorfs");
			expect(isValid(input)).toBe(true);
			const ast = parseOrThrow(input);
			expect(ast.concepts).toHaveLength(1);
			const person = ast.concepts[0] as BaseConcept;
			expect(getFirstExpressionValue(person)).toBe("person");
			const implied = person.children[0] as BaseConcept;
			expect(implied.kind).toBe("base");
			expect(implied.expressions.length).toBe(0);
			const nameAssoc = findAssociationByLabel(implied, "name");
			const emailAssoc = findAssociationByLabel(implied, "email");
			expect(nameAssoc).toBeDefined();
			expect(emailAssoc).toBeDefined();
			expect(
				getLabelExpressions(nameAssoc!).some((e) =>
					String(e.value).includes("foaf:name"),
				),
			).toBe(true);
			expect(
				getLabelExpressions(emailAssoc!).some((e) =>
					String(e.value).includes("foaf:mbox"),
				),
			).toBe(true);
		});
	});
});
