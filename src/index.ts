export {
	parse,
	parseOrThrow,
	isValid,
	grammar,
	type ParseResult,
	type ParseError,
	type ParseOutput,
} from './parser/index.js';

// Re-export AST types
export type { 
	AmorfsAST, 
	ConceptNode, 
	ChildAssociation, 
	Metadata, 
	ExpressionValue,
	AssociationType,
	ConceptRef,
} from './ast/types';
