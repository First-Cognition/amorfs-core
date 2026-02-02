/**
 * AST Types for Amorfs
 */

// Association types
export type AssociationType = 'has_a' | 'which_is';

// Expression value with optional language
export interface ExpressionValue {
  value: string | number;
  type: 'text' | 'number' | 'datetime' | 'iri' | 'quoted';
  language?: string;
  metadata?: Metadata;
}

// Metadata object
export interface Metadata {
  language?: string;
  confidence?: number;
  importance?: number;
  temporal?: {
    start?: string;
    end?: string;
  };
  source?: ConceptRef;
  custom?: Record<string, string | ConceptRef>;
}

// Reference to another concept
export interface ConceptRef {
  type: 'reference';
  key: string;
}

// Child association
export interface ChildAssociation {
  associationType: AssociationType;
  isIntrinsic: boolean;
  concept: ConceptNode;
  metadata?: Metadata;
}

// Main concept node
export interface ConceptNode {
  /** 
   * Reference key for this concept, assigned via @identifier syntax.
   * Null unless the concept is explicitly named with @ operator.
   */
  key: string | null;
  
  /**
   * Whether this concept is a reference to another concept (uses @key syntax)
   */
  isReference: boolean;
  
  /**
   * Parameter expressions - the expressions before `[` that define/name this concept.
   * For `state [NSW]`, this would contain the "state" expression.
   */
  parameter: ExpressionValue[];
  
  /**
   * Child concepts/associations (values via which_is, attributes via has_a)
   */
  children: ChildAssociation[];
  
  /**
   * Metadata for this concept
   */
  metadata: Metadata | null;
}

// Root AST node
export interface AmorfsAST {
  concepts: ConceptNode[];
  references: Record<string, ConceptNode>;
}
