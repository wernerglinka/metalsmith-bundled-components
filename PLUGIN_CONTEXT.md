# metalsmith-bundled-components: Validation Feature Context

This document provides context and specifications for implementing validation functionality in the `metalsmith-bundled-components` plugin.

## Problem Statement

The structured content approach relies heavily on frontmatter configuration. Users frequently make mistakes that result in "silent failures" - the site builds successfully but renders incorrectly:

- **Type coercion issues**: `isAnimated: "false"` (string) always evaluates to `true` in templates
- **Invalid enum values**: `buttonStyle: "blue"` when CSS only supports `primary`, `secondary`, `ghost`
- **Misspelled properties**: `titleTag: "header"` instead of valid HTML heading tags

These errors are particularly problematic because they don't cause build failures - they just result in broken styling, invalid HTML, or unexpected behavior in production.

## Solution: Manifest-Based Validation

Component manifests already exist and are read during the bundling process. Adding validation rules to these manifests provides:

1. **Single source of truth**: Validation rules live with the component
2. **Component portability**: External component libraries bring their own validation
3. **Existing infrastructure**: Plugin already processes manifests
4. **Gradual adoption**: Validation is optional and additive

## Enhanced Manifest Structure

```json
{
  "name": "hero",
  "type": "section",
  "styles": ["hero.css"],
  "scripts": [],
  "dependencies": ["ctas", "text", "image", "commons"],
  "validation": {
    "required": ["sectionType"],
    "properties": {
      "sectionType": {
        "type": "string",
        "const": "hero"
      },
      "isReverse": {
        "type": "boolean"
      },
      "containerFields.isAnimated": {
        "type": "boolean"
      },
      "containerFields.background.imageScreen": {
        "type": "string",
        "enum": ["light", "dark", "none"]
      },
      "text.titleTag": {
        "type": "string",
        "enum": ["h1", "h2", "h3", "h4", "h5", "h6"],
        "default": "h2"
      },
      "ctas": {
        "type": "array",
        "items": {
          "properties": {
            "isButton": {
              "type": "boolean"
            },
            "buttonStyle": {
              "type": "string",
              "enum": ["primary", "secondary", "ghost", "none"]
            }
          }
        }
      }
    }
  }
}
```

## Validation Types

### Type Validation
- **boolean**: Ensure fields are actual booleans, not strings
- **string**: Validate string fields
- **number**: Ensure numeric fields are numbers, not strings  
- **array**: Validate array structures

### Enum Validation
- **const**: Single valid value (e.g., `sectionType: "hero"`)
- **enum**: Multiple valid values (e.g., `titleTag: ["h1", "h2", "h3"]`)

### Nested Property Support
Use dot notation for nested properties:
- `containerFields.isAnimated`
- `containerFields.background.imageScreen`
- `text.titleTag`

### Array Item Validation
Validate properties within array items:
```json
"ctas": {
  "type": "array",
  "items": {
    "properties": {
      "buttonStyle": {
        "type": "string",
        "enum": ["primary", "secondary", "ghost", "none"]
      }
    }
  }
}
```

## Implementation Strategy

### 1. Validation Timing
Validate sections during the component scanning phase, before dependency bundling:

```javascript
// Pseudo-code integration point
pages.forEach(page => {
  page.sections?.forEach(section => {
    const manifest = loadComponentManifest(section.sectionType);
    
    if (manifest.validation) {
      validateSection(section, manifest.validation);
    }
    
    // Continue with existing bundling logic...
  });
});
```

### 2. Error Handling
Provide clear, actionable error messages with file context:

```
❌ Validation Error in src/index.md

Section 0 (hero):
  - containerFields.isAnimated: expected boolean, got string "false"
  - text.titleTag: "header" is invalid. Must be one of: h1, h2, h3, h4, h5, h6
  - ctas[0].buttonStyle: "blue" is invalid. Must be one of: primary, secondary, ghost, none

Tip: String "false" evaluates to true in templates. Use boolean false instead.
```

### 3. Backward Compatibility
- Components without `validation` key continue to work unchanged
- Validation is purely additive - no breaking changes
- Plugin should gracefully handle malformed validation rules

## Testing Strategy

### Unit Tests
```javascript
describe('Validation', () => {
  it('should validate boolean types correctly', () => {
    const section = { isAnimated: "false" };
    const validation = { properties: { isAnimated: { type: "boolean" }}};
    
    expect(() => validateSection(section, validation)).toThrow();
  });
  
  it('should validate enum values', () => {
    const section = { text: { titleTag: "header" }};
    const validation = {
      properties: {
        "text.titleTag": {
          type: "string",
          enum: ["h1", "h2", "h3", "h4", "h5", "h6"]
        }
      }
    };
    
    expect(() => validateSection(section, validation)).toThrow();
  });
  
  it('should allow valid configurations', () => {
    const section = { 
      isAnimated: true,
      text: { titleTag: "h2" }
    };
    const validation = {
      properties: {
        isAnimated: { type: "boolean" },
        "text.titleTag": { type: "string", enum: ["h1", "h2", "h3"] }
      }
    };
    
    expect(() => validateSection(section, validation)).not.toThrow();
  });
});
```

### Integration Tests
- Test validation with real component manifests from this starter
- Verify error messages include file names and section indices
- Test that valid configurations continue to work
- Test validation with missing/malformed validation rules

## Validation Utility Functions

Suggested helper functions for implementation:

```javascript
/**
 * Get nested property value using dot notation
 * @param {Object} obj - Object to search
 * @param {string} path - Dot notation path (e.g., "containerFields.isAnimated")
 * @returns {*} Property value or undefined
 */
function getNestedProperty(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Validate a single property against its validation rule
 * @param {*} value - Property value to validate
 * @param {Object} rule - Validation rule
 * @param {string} propertyPath - Property path for error messages
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateProperty(value, rule, propertyPath) {
  if (value === undefined) return { valid: true }; // Optional properties
  
  // Type validation
  if (rule.type && typeof value !== rule.type) {
    return {
      valid: false,
      error: `${propertyPath}: expected ${rule.type}, got ${typeof value} "${value}"`
    };
  }
  
  // Const validation
  if (rule.const && value !== rule.const) {
    return {
      valid: false,
      error: `${propertyPath}: expected "${rule.const}", got "${value}"`
    };
  }
  
  // Enum validation
  if (rule.enum && !rule.enum.includes(value)) {
    return {
      valid: false,
      error: `${propertyPath}: "${value}" is invalid. Must be one of: ${rule.enum.join(', ')}`
    };
  }
  
  return { valid: true };
}
```

## Examples from This Starter

This starter includes validation rules for:
- **hero**: Boolean flags, titleTag enum, CTA button styles, background options
- **banner**: Similar to hero with appropriate defaults
- More components can be added gradually

The validation rules are based on actual usage patterns in the starter content and common user mistakes observed in the field.

## Configuration Options

Consider adding plugin options for validation behavior:

```javascript
.use(componentDependencyBundler({
  // ... existing options
  validation: {
    enabled: true,           // Enable/disable validation
    strict: false,           // Fail on warnings vs errors only
    reportAllErrors: true    // Report all errors vs stop on first
  }
}))
```

This allows users to customize validation behavior based on their development workflow preferences.