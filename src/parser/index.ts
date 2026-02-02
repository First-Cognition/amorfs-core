/**
 * Amorfs Core Parser
 * 
 * A parser for the Amorfs data format - a universal, concept-based
 * data representation system.
 */

import grammar from '../grammar/amorfs.ohm-bundle.js';
import { createSemanticActions } from '../ast/semantics.js';
import type { AmorfsAST } from '../ast/types';

/**
 * Parse result type
 */
export interface ParseResult {
  success: true;
  ast: AmorfsAST;
}

export interface ParseError {
  success: false;
  error: string;
  position?: {
    line: number;
    column: number;
  };
}

export type ParseOutput = ParseResult | ParseError;

/**
 * Parse Amorfs text into an AST
 * 
 * @param input - The Amorfs source text to parse
 * @returns ParseOutput - Either a successful result with AST or an error
 * 
 * @example
 * ```typescript
 * const result = parse(`
 *   person [John Smith
 *     - phone [555-1234]
 *     + birth_date [1985-07-15]
 *   ]
 * `);
 * 
 * if (result.success) {
 *   console.log(result.ast.concepts);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function parse(input: string): ParseOutput {
	const matchResult = grammar.match(input);
  
	if (matchResult.failed()) {
		// Extract position information from the error
		const errorMessage = matchResult.message || 'Parse error';
    
		// Try to extract line/column from the error message
		const posMatch = errorMessage.match(/Line (\d+), col (\d+)/);
		const position = posMatch 
			? { line: parseInt(posMatch[1], 10), column: parseInt(posMatch[2], 10) }
			: undefined;
    
		return {
			success: false,
			error: errorMessage,
			position,
		};
	}
  
	// Create semantic context for collecting references
	const ctx = { references: {} };
  
	// Create semantics and add the toAST operation
	const semantics = grammar.createSemantics();
	semantics.addOperation('eval', createSemanticActions(ctx));
  
	// Evaluate the match to produce the AST
	const ast = semantics(matchResult).eval() as AmorfsAST;
  
	return {
		success: true,
		ast,
	};
}

/**
 * Parse Amorfs text and throw on error
 * 
 * @param input - The Amorfs source text to parse
 * @returns AmorfsAST - The parsed AST
 * @throws Error if parsing fails
 * 
 * @example
 * ```typescript
 * try {
 *   const ast = parseOrThrow(`person [John]`);
 *   console.log(ast.concepts[0].key); // "person"
 * } catch (e) {
 *   console.error('Failed to parse:', e.message);
 * }
 * ```
 */
export function parseOrThrow(input: string): AmorfsAST {
	const result = parse(input);
	if (!result.success) {
		throw new Error(result.error);
	}
	return result.ast;
}

/**
 * Check if a string is valid Amorfs syntax
 * 
 * @param input - The text to validate
 * @returns boolean - True if valid Amorfs syntax
 */
export function isValid(input: string): boolean {
	return grammar.match(input).succeeded();
}

// Export the grammar for advanced usage
export { grammar };
