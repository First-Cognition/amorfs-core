import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse, isValid, parseOrThrow, type ConceptNode, type BaseConcept, type AssociationConcept } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

function loadFixture(name: string): string {
	return readFileSync(join(fixturesDir, name), 'utf-8');
}

// Helper to get the first expression value from a base concept
function getFirstExpressionValue(concept: ConceptNode): string | number | null {
	if (concept.kind !== 'base') return null;
	if (concept.expressions.length === 0) return null;
	return concept.expressions[0].value;
}

// Helper to find a has_a association child whose target concept has a matching first expression value
function findAssociationByExpression(concept: ConceptNode, exprValue: string): AssociationConcept | undefined {
	return concept.children.find((child): child is AssociationConcept =>
		child.kind === 'association' &&
		child.associationType === 'has_a' &&
		child.children.length > 0 &&
		child.children[0].kind === 'base' &&
		child.children[0].expressions[0]?.value === exprValue
	);
}

// Helper to get the target base concept from an association concept
function getAssociationTarget(assoc: AssociationConcept): BaseConcept | undefined {
	const target = assoc.children[0];
	return target?.kind === 'base' ? target : undefined;
}

describe('business_card.amorfs', () => {
	const input = loadFixture('business_card.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should have a business card concept', () => {
		const ast = parseOrThrow(input);
		expect(ast.concepts).toHaveLength(1);
		expect(ast.concepts[0].kind).toBe('base');
		expect(getFirstExpressionValue(ast.concepts[0])).toBe('business card');
	});

	it('should have Alan Turing as an expression value', () => {
		const ast = parseOrThrow(input);
		const concept = ast.concepts[0];
    
		// Find Alan Turing in expressions or children
		const hasTuring =
			(concept.kind === 'base' && concept.expressions.some(e => e.value === 'Alan Turing')) ||
			concept.children.some(c =>
				c.kind === 'base' && c.expressions.some(e => e.value === 'Alan Turing')
			);
		expect(hasTuring).toBe(true);
	});

	it('should have nested contact and address associations', () => {
		const ast = parseOrThrow(input);
		const concept = ast.concepts[0];
    
		const contactAssoc = findAssociationByExpression(concept, 'contact');
		const addressAssoc = findAssociationByExpression(concept, 'address');
    
		expect(contactAssoc).toBeDefined();
		expect(addressAssoc).toBeDefined();
    
		// Check contact has email and phone
		const contactTarget = getAssociationTarget(contactAssoc!);
		expect(contactTarget).toBeDefined();
		expect(findAssociationByExpression(contactTarget!, 'email')).toBeDefined();
		expect(findAssociationByExpression(contactTarget!, 'phone')).toBeDefined();
	});
});

describe('multilingual_product.amorfs', () => {
	const input = loadFixture('multilingual_product.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should have a product concept with key and expressions', () => {
		const ast = parseOrThrow(input);
		expect(ast.concepts).toHaveLength(1);
		expect(getFirstExpressionValue(ast.concepts[0])).toBe('product');
    
		// Should have expressions array (may contain multilingual values)
		const concept = ast.concepts[0];
		expect(concept.kind).toBe('base');
		if (concept.kind === 'base') {
			expect(concept.expressions).toBeDefined();
			expect(Array.isArray(concept.expressions)).toBe(true);
		}
	});

	it('should have price with intrinsic associations', () => {
		const ast = parseOrThrow(input);
		const concept = ast.concepts[0];
		const priceAssoc = findAssociationByExpression(concept, 'price');
    
		expect(priceAssoc).toBeDefined();
    
		// Price target should have intrinsic associations (amount, currency)
		const priceTarget = getAssociationTarget(priceAssoc!);
		expect(priceTarget).toBeDefined();
    
		const amountAssoc = findAssociationByExpression(priceTarget!, 'amount');
		const currencyAssoc = findAssociationByExpression(priceTarget!, 'currency');
    
		expect(amountAssoc).toBeDefined();
		expect(amountAssoc?.isIntrinsic).toBe(true);
		expect(currencyAssoc).toBeDefined();
		expect(currencyAssoc?.isIntrinsic).toBe(true);
	});

	it('should have features with contextual associations', () => {
		const ast = parseOrThrow(input);
		const concept = ast.concepts[0];
		const featuresAssoc = findAssociationByExpression(concept, 'features');
    
		expect(featuresAssoc).toBeDefined();
		expect(featuresAssoc?.isIntrinsic).toBe(false);
	});
});

describe('person.amorfs', () => {
	const input = loadFixture('person.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should have a person concept with semantic web vocabulary', () => {
		const ast = parseOrThrow(input);
		expect(ast.concepts).toHaveLength(1);
		expect(getFirstExpressionValue(ast.concepts[0])).toBe('person');
	});

	it('should have associations with job title', () => {
		const ast = parseOrThrow(input);
		const concept = ast.concepts[0];
    
		// Find job title association
		const jobTitleAssoc = findAssociationByExpression(concept, 'job title');
    
		expect(jobTitleAssoc).toBeDefined();
	});

	it('should have intrinsic associations for birth date and nationality', () => {
		const ast = parseOrThrow(input);
		const concept = ast.concepts[0];
    
		const birthDateAssoc = findAssociationByExpression(concept, 'birth date');
		const nationalityAssoc = findAssociationByExpression(concept, 'nationality');
    
		expect(birthDateAssoc).toBeDefined();
		expect(birthDateAssoc?.isIntrinsic).toBe(true);
		expect(nationalityAssoc).toBeDefined();
		expect(nationalityAssoc?.isIntrinsic).toBe(true);
	});
});

describe('comments.amorfs', () => {
	const input = loadFixture('comments.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should parse concepts despite comments', () => {
		const ast = parseOrThrow(input);
		expect(ast.concepts.length).toBeGreaterThan(0);
		// Should have city, country, person concepts
		const expressions = ast.concepts.map(c => getFirstExpressionValue(c));
		expect(expressions).toContain('city');
		expect(expressions).toContain('country');
		expect(expressions).toContain('person');
	});
});

describe('basic_concepts.amorfs', () => {
	const input = loadFixture('basic_concepts.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should handle quoted strings with special characters', () => {
		const ast = parseOrThrow(input);
		const noteConcept = ast.concepts.find(c => getFirstExpressionValue(c) === 'note');
		expect(noteConcept).toBeDefined();
	});
});

describe('expression_types.amorfs', () => {
	const input = loadFixture('expression_types.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should handle numeric expressions', () => {
		const ast = parseOrThrow(input);
		const ageConcept = ast.concepts.find(c => getFirstExpressionValue(c) === 'age');
		expect(ageConcept).toBeDefined();
		// Check the value is numeric - look in children for a base concept with value 42
		const hasAge42 = ageConcept?.children.some(child =>
			child.kind === 'base' && child.expressions[0]?.value === 42
		);
		expect(hasAge42).toBe(true);
	});

	it('should handle IRI expressions', () => {
		const ast = parseOrThrow(input);
		const homepageConcept = ast.concepts.find(c => getFirstExpressionValue(c) === 'homepage');
		expect(homepageConcept).toBeDefined();
	});
});

describe('multiple_expressions.amorfs', () => {
	const input = loadFixture('multiple_expressions.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should handle multiple expressions (synonyms)', () => {
		const ast = parseOrThrow(input);
		const stateConcept = ast.concepts.find(c => getFirstExpressionValue(c) === 'state');
		expect(stateConcept).toBeDefined();
		// Should have a child base concept with multiple expressions
		const baseChild = stateConcept?.children.find(
			(c): c is BaseConcept => c.kind === 'base' && c.expressions.length >= 2
		);
		expect(baseChild).toBeDefined();
		expect(baseChild!.expressions.length).toBeGreaterThanOrEqual(2);
	});
});

describe('language_metadata.amorfs', () => {
	const input = loadFixture('language_metadata.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should handle expressions with language metadata', () => {
		const ast = parseOrThrow(input);
		const greetingConcept = ast.concepts.find(c => getFirstExpressionValue(c) === 'multilingual_greeting');
		expect(greetingConcept).toBeDefined();
	});
});

describe('metadata_attributes.amorfs', () => {
	const input = loadFixture('metadata_attributes.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should have concepts with various metadata types', () => {
		const ast = parseOrThrow(input);
		expect(ast.concepts.length).toBeGreaterThan(5);
	});
});

describe('associations.amorfs', () => {
	const input = loadFixture('associations.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should distinguish intrinsic and contextual associations', () => {
		const ast = parseOrThrow(input);
		const personIntrinsic = ast.concepts.find(c => getFirstExpressionValue(c) === 'person_intrinsic');
		const personContextual = ast.concepts.find(c => getFirstExpressionValue(c) === 'person_contextual');
    
		expect(personIntrinsic).toBeDefined();
		expect(personContextual).toBeDefined();
    
		// Filter to only has_a association children
		const intrinsicHasA = personIntrinsic!.children.filter(
			(a): a is AssociationConcept => a.kind === 'association' && a.associationType === 'has_a'
		);
		const contextualHasA = personContextual!.children.filter(
			(a): a is AssociationConcept => a.kind === 'association' && a.associationType === 'has_a'
		);
    
		// Intrinsic person should have intrinsic associations
		expect(intrinsicHasA.length).toBeGreaterThan(0);
		expect(intrinsicHasA.every(a => a.isIntrinsic)).toBe(true);
		// Contextual person should have contextual associations
		expect(contextualHasA.length).toBeGreaterThan(0);
		expect(contextualHasA.every(a => !a.isIntrinsic)).toBe(true);
	});
});

describe('nested_structures.amorfs', () => {
	const input = loadFixture('nested_structures.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should handle deeply nested structures', () => {
		const ast = parseOrThrow(input);
		const locationConcept = ast.concepts.find(c => getFirstExpressionValue(c) === 'location');
		expect(locationConcept).toBeDefined();
    
		// Verify deep nesting exists - follow association chains at least 3 levels deep
		const hasDeepNesting = locationConcept?.children.some(a => {
			if (a.kind !== 'association') return false;
			const target = a.children[0];
			if (!target) return false;
			return target.children.some(b => {
				if (b.kind !== 'association') return false;
				const target2 = b.children[0];
				if (!target2) return false;
				return target2.children.length > 0;
			});
		});
		expect(hasDeepNesting).toBe(true);
	});
});

describe('concept_references.amorfs', () => {
	const input = loadFixture('concept_references.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should have concepts with references', () => {
		const ast = parseOrThrow(input);
		const sourceDb = ast.concepts.find(c => getFirstExpressionValue(c) === 'source_database');
		expect(sourceDb).toBeDefined();
		expect(sourceDb?.key).toBe('nasa_source');
	});
});

describe('implied_concepts.amorfs', () => {
	const input = loadFixture('implied_concepts.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should handle concepts with no direct expression', () => {
		const ast = parseOrThrow(input);
		// Address concept should have children but the value block has associations only
		const addressConcept = ast.concepts.find(c => getFirstExpressionValue(c) === 'address');
		expect(addressConcept).toBeDefined();
		expect(addressConcept?.children.length).toBeGreaterThan(0);
	});
});

describe('value_blocks.amorfs', () => {
	const input = loadFixture('value_blocks.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should handle comma-separated items', () => {
		const ast = parseOrThrow(input);
		const colorsConcept = ast.concepts.find(c => getFirstExpressionValue(c) === 'colors');
		expect(colorsConcept).toBeDefined();
	});
});

describe('association_metadata.amorfs', () => {
	const input = loadFixture('association_metadata.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});
});

describe('semantic_web.amorfs', () => {
	const input = loadFixture('semantic_web.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should handle vocabulary mappings with multiple expressions', () => {
		const ast = parseOrThrow(input);
		const semanticPerson = ast.concepts.find(c => getFirstExpressionValue(c) === 'semantic_person');
		expect(semanticPerson).toBeDefined();
	});
});

describe('provenance.amorfs', () => {
	const input = loadFixture('provenance.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should have concepts with references for provenance tracking', () => {
		const ast = parseOrThrow(input);
		const sensor = ast.concepts.find(c => getFirstExpressionValue(c) === 'sensor');
		expect(sensor).toBeDefined();
		expect(sensor?.key).toBe('temp_sensor');
	});
});

describe('units_of_measurement.amorfs', () => {
	const input = loadFixture('units_of_measurement.amorfs');

	it('should be valid Amorfs syntax', () => {
		expect(isValid(input)).toBe(true);
	});

	it('should parse successfully', () => {
		const result = parse(input);
		expect(result.success).toBe(true);
	});

	it('should handle measurements with units', () => {
		const ast = parseOrThrow(input);
		const measurement = ast.concepts.find(c => getFirstExpressionValue(c) === 'physical_measurement');
		expect(measurement).toBeDefined();
    
		const valueAssoc = findAssociationByExpression(measurement!, 'value');
		const unitAssoc = findAssociationByExpression(measurement!, 'unit');
		expect(valueAssoc).toBeDefined();
		expect(unitAssoc).toBeDefined();
	});
});
