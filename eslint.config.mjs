import tseslint from 'typescript-eslint';
import prettierEslint from 'eslint-plugin-prettier/recommended';
import vitestPlugin from '@vitest/eslint-plugin';
import { parser, plugin } from 'typescript-eslint';

const base = [
  {
    files: ['**/*.ts', '**/*.tsx'],

    languageOptions: {
      parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      sourceType: 'module',
    },

    ignores: ['.vscode/', 'node_modules/', 'dist/', 'out/'],

    plugins: {
      '@typescript-eslint': plugin,
    },

    rules: {
      // require camel case names
      // http://eslint.org/docs/rules/camelcase
      camelcase: ['error', { properties: 'never' }],

      // Verify calls of super() in constructors
      // http://eslint.org/docs/rules/constructor-super
      'constructor-super': 'off',

      // Require Default Case in Switch Statements
      // https://eslint.org/docs/rules/default-case
      'default-case': 'off',

      // Require === and !==
      // http://eslint.org/docs/rules/eqeqeq
      eqeqeq: ['error', 'allow-null'],

      // enforce consistent linebreak style
      // http://eslint.org/docs/rules/linebreak-style
      'linebreak-style': 'off',

      // require constructor names to begin with a capital letter
      // http://eslint.org/docs/rules/new-cap
      'new-cap': ['error', { capIsNew: false }],

      // disallow `Array` constructors
      // https://eslint.org/docs/rules/no-array-constructor
      //
      // NOTE(bng): Typescript version used below
      'no-array-constructor': 'off',

      // Disallow using an async function as a Promise executor
      // https://eslint.org/docs/latest/rules/no-async-promise-executor
      'no-async-promise-executor': 'error',

      // Disallow bitwise operators
      // https://eslint.org/docs/latest/rules/no-bitwise
      'no-bitwise': [
        'warn',
        {
          allow: [
            '^',
            // "|",
            // "&",
            '<<',
            '>>',
            '>>>',
            '^=',
            // "|=",
            //"&=",
            '<<=',
            '>>=',
            '>>>=',
            '~',
          ],
        },
      ],

      // Disallow modifying variables of class declarations
      // http://eslint.org/docs/rules/no-class-assign
      'no-class-assign': 'error',

      // Disallow comparisons to negative zero
      // http://eslint.org/docs/rules/no-compare-neg-zero
      'no-compare-neg-zero': 'error',

      // disallow assignment operators in conditional statements
      // http://eslint.org/docs/rules/no-cond-assign
      'no-cond-assign': ['error', 'always'],

      // disallow the use of console
      // http://eslint.org/docs/rules/no-console
      'no-console': 'error',

      // Disallow modifying variables that are declared using const
      // http://eslint.org/docs/rules/no-const-assign
      'no-const-assign': 'error',

      // Disallows expressions where the operation doesn't affect the value.
      // https://eslint.org/docs/rules/no-constant-binary-expression
      'no-constant-binary-expression': 'warn',

      // disallow constant expressions in conditions
      // http://eslint.org/docs/rules/no-constant-condition
      'no-constant-condition': 'warn',

      // disallow control characters in regular expressions
      // http://eslint.org/docs/rules/no-control-regex
      'no-control-regex': 'error',

      // disallow the use of debugger
      // http://eslint.org/docs/rules/no-debugger
      'no-debugger': 'error',

      // disallow duplicate arguments in function definitions
      // http://eslint.org/docs/rules/no-dupe-args
      'no-dupe-args': 'error',

      // Disallow duplicate name in class members
      // https://eslint.org/docs/rules/no-dupe-class-members
      'no-dupe-class-members': 'off',

      // disallow duplicate keys in object literals
      // http://eslint.org/docs/rules/no-dupe-keys
      'no-dupe-keys': 'error',

      // Rule to disallow a duplicate case label
      // http://eslint.org/docs/rules/no-duplicate-case
      'no-duplicate-case': 'error',

      // disallow empty block statements
      // http://eslint.org/docs/rules/no-empty
      'no-empty': 'error',

      // disallow empty character classes in regular expressions
      // http://eslint.org/docs/rules/no-empty-character-class
      'no-empty-character-class': 'error',

      // Disallow empty destructuring patterns
      // https://eslint.org/docs/latest/rules/no-empty-pattern
      'no-empty-pattern': 'warn',

      // Disallow Null Comparisons
      // http://eslint.org/docs/rules/no-eq-null
      'no-eq-null': 'off',

      // Disallow eval()
      // http://eslint.org/docs/rules/no-eval
      'no-eval': 'error',

      // disallow reassigning exceptions in catch clauses
      // http://eslint.org/docs/rules/no-ex-assign
      'no-ex-assign': 'error',

      // Disallow unnecessary function binding
      // http://eslint.org/docs/rules/no-extra-bind
      'no-extra-bind': 'error',

      // disallow unnecessary boolean casts
      // http://eslint.org/docs/rules/no-extra-boolean-cast
      'no-extra-boolean-cast': 'off',

      // disallow reassigning function declarations
      // http://eslint.org/docs/rules/no-func-assign
      'no-func-assign': 'error',

      // Disallow Implied eval()
      // http://eslint.org/docs/rules/no-implied-eval
      //
      // NOTE(bng): Typescript version used below
      'no-implied-eval': 'off',

      // disallow variable or function declarations in nested blocks
      // http://eslint.org/docs/rules/no-inner-declarations
      'no-inner-declarations': 'error',

      // disallow invalid regular expression strings in RegExp constructors
      // http://eslint.org/docs/rules/no-invalid-regexp
      'no-invalid-regexp': 'error',

      // Disallow this keywords outside of classes or class-like objects.
      // http://eslint.org/docs/rules/no-invalid-this
      'no-invalid-this': 'off',

      // disallow irregular whitespace
      // http://eslint.org/docs/rules/no-irregular-whitespace
      'no-irregular-whitespace': 'error',

      // Disallow Labels That Are Variables Names
      // http://eslint.org/docs/rules/no-label-var
      'no-label-var': 'off',

      // Disallow Unnecessary Nested Blocks
      // http://eslint.org/docs/rules/no-lone-blocks
      'no-lone-blocks': 'error',

      // Disallow literal numbers that lose precision
      // https://eslint.org/docs/latest/rules/no-loss-of-precision
      //
      // NOTE(bng): Typescript version used below
      'no-loss-of-precision': 'off',

      // Disallow characters which are made with multiple code points in character class syntax
      // https://eslint.org/docs/latest/rules/no-misleading-character-class
      'no-misleading-character-class': 'error',

      // Disallow Reassignment of Native Objects
      // http://eslint.org/docs/rules/no-native-reassign
      'no-native-reassign': 'error',

      // disallow calling global object properties as functions
      // http://eslint.org/docs/rules/no-obj-calls
      'no-obj-calls': 'error',

      // disallow variable redeclaration
      // http://eslint.org/docs/rules/no-redeclare
      //
      // NOTE(bng): Typescript version used below
      'no-redeclare': 'off',

      // disallow multiple spaces in regular expression literals
      // http://eslint.org/docs/rules/no-regex-spaces
      'no-regex-spaces': 'error',

      // disallow certain object properties
      // http://eslint.org/docs/rules/no-restricted-properties
      'no-restricted-properties': [
        'error',
        {
          object: 'require',
          property: 'ensure',
          message:
            'Please use import() instead. More info: https://webpack.js.org/guides/code-splitting-import/#dynamic-import',
        },
        {
          object: 'System',
          property: 'import',
          message:
            'Please use import() instead. More info: https://webpack.js.org/guides/code-splitting-import/#dynamic-import',
        },
      ],

      // Disallows unnecessary return await
      // http://eslint.org/docs/rules/no-return-await
      'no-return-await': 'error',

      // Disallow Self Compare
      // http://eslint.org/docs/rules/no-self-compare
      'no-self-compare': 'error',

      // Disallow Use of the Comma Operator
      //http://eslint.org/docs/rules/no-sequences
      'no-sequences': 'error',

      // Disallow identifiers from shadowing restricted names
      // https://eslint.org/docs/latest/rules/no-shadow-restricted-names
      'no-shadow-restricted-names': 'error',

      // disallow sparse arrays
      // http://eslint.org/docs/rules/no-sparse-arrays
      'no-sparse-arrays': 'error',

      // Disallow template literal placeholder syntax in regular strings
      // http://eslint.org/docs/rules/no-template-curly-in-string
      'no-template-curly-in-string': 'error',

      // disallow ternary operators
      // http://eslint.org/docs/rules/no-ternary
      'no-ternary': 'off',

      // Disallow use of this/super before calling super() in constructors.
      // http://eslint.org/docs/rules/no-this-before-super
      'no-this-before-super': 'off',

      // Restrict what can be thrown as an exception
      // http://eslint.org/docs/rules/no-throw-literal
      'no-throw-literal': 'error',

      // disallow dangling underscores in identifiers
      // http://eslint.org/docs/rules/no-underscore-dangle
      'no-underscore-dangle': 'off',

      // disallow confusing multiline expressions
      // http://eslint.org/docs/rules/no-unexpected-multiline
      'no-unexpected-multiline': 'off',

      // disallow unreachable code after return, throw, continue, and break statements
      // http://eslint.org/docs/rules/no-unreachable
      'no-unreachable': 'error',

      // Disallow control flow statements in finally blocks
      // https://eslint.org/docs/latest/rules/no-unsafe-finally
      'no-unsafe-finally': 'error',

      // disallow negating the left operand of relational operators
      // http://eslint.org/docs/rules/no-unsafe-negation
      'no-unsafe-negation': 'error',

      // Disallow Unused Expressions
      // http://eslint.org/docs/rules/no-unused-expressions
      //
      // NOTE(bng): Typescript version used below
      'no-unused-expressions': 'off',

      // Disallow Unused Variables
      // http://eslint.org/docs/rules/no-unused-vars
      //
      // NOTE(bng): Typescript version used below
      'no-unused-vars': 'off',

      // Disallow Undeclared Variables
      // http://eslint.org/docs/rules/no-undef
      'no-undef': 'off',

      // Disallow Early Use
      // http://eslint.org/docs/rules/no-use-before-define
      //
      // NOTE(bng): Typescript version used below
      'no-use-before-define': 'off',

      // Disallow unnecessary .call() and .apply()
      // http://eslint.org/docs/rules/no-useless-call
      'no-useless-call': 'off',

      // Disallow unnecessary constructor
      // https://eslint.org/docs/rules/no-useless-constructor
      //
      // NOTE(bng): Typescript version used below
      'no-useless-constructor': 'off',

      // disallow `with` statements
      // https://eslint.org/docs/rules/no-with
      'no-with': 'error',

      // Prefer destructuring from arrays and objects
      // http://eslint.org/docs/rules/prefer-destructuring
      'prefer-destructuring': [
        'off',
        {
          array: true,
          object: true,
        },
        {
          enforceForRenamedProperties: false,
        },
      ],

      // require using Error objects as Promise rejection reasons
      // http://eslint.org/docs/rules/prefer-promise-reject-errors
      'prefer-promise-reject-errors': ['error', { allowEmptyReject: true }],

      // enforce the consistent use of either backticks, double, or single quotes
      // http://eslint.org/docs/rules/quotes
      quotes: ['error', 'single', 'avoid-escape'],

      // Require Radix Parameter
      // https://eslint.org/docs/rules/radix
      radix: 'off',

      // require or disallow strict mode directives
      // http://eslint.org/docs/rules/strict
      strict: 'off',

      // require calls to isNaN() when checking for NaN
      // http://eslint.org/docs/rules/use-isnan
      'use-isnan': 'error',

      // enforce comparing typeof expressions against valid strings
      // http://eslint.org/docs/rules/valid-typeof
      'valid-typeof': 'error',

      // ******* TYPESCRIPT *******

      // Disallow awaiting a value that is not a Thenable.
      // https://typescript-eslint.io/rules/await-thenable
      '@typescript-eslint/await-thenable': 'error',

      // Disallow @ts-<directive> comments or require descriptions after directives.
      // https://typescript-eslint.io/rules/ban-ts-comment/
      '@typescript-eslint/ban-ts-comment': 'error',

      // Enforces consistent usage of type assertions
      // https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/consistent-type-assertions.md
      '@typescript-eslint/consistent-type-assertions': 'warn',

      // Enforce consistent usage of type imports.
      // https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/docs/rules/consistent-type-imports.md
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],

      // Disallow generic `Array` constructors
      // https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-array-constructor.md
      '@typescript-eslint/no-array-constructor': 'warn',

      // Require .toString() and .toLocaleString() to only be called on objects which provide useful information when stringified.
      // https://typescript-eslint.io/rules/no-base-to-string/
      '@typescript-eslint/no-base-to-string': 'warn',

      // Disallow using code marked as @deprecated.
      // https://typescript-eslint.io/rules/no-deprecated/
      '@typescript-eslint/no-deprecated': 'error',

      // Disallow duplicate enum member values.
      // https://typescript-eslint.io/rules/no-duplicate-enum-values/
      '@typescript-eslint/no-duplicate-enum-values': 'error',

      // Disallow duplicate constituents of union or intersection types.
      // https://typescript-eslint.io/rules/no-duplicate-type-constituents
      '@typescript-eslint/no-duplicate-type-constituents': 'error',

      // Disallow accidentally using the "empty object" type.
      // https://typescript-eslint.io/rules/no-empty-object-type
      '@typescript-eslint/no-empty-object-type': 'error',

      // Disallow extra non-null assertions.
      // https://typescript-eslint.io/rules/no-extra-non-null-assertion
      '@typescript-eslint/no-extra-non-null-assertion': 'error',

      // Require Promise-like statements to be handled appropriately.
      // https://typescript-eslint.io/rules/no-floating-promises
      '@typescript-eslint/no-floating-promises': 'error',

      // Disallow iterating over an array with a for-in loop.
      // https://typescript-eslint.io/rules/no-for-in-array
      '@typescript-eslint/no-for-in-array': 'error',

      // Disallow the use of eval()-like methods.
      // https://typescript-eslint.io/rules/no-implied-eval
      '@typescript-eslint/no-implied-eval': 'error',

      // Disallow literal numbers that lose precision.
      // https://typescript-eslint.io/rules/no-loss-of-precision
      '@typescript-eslint/no-loss-of-precision': 'error',

      // Enforce valid definition of new and constructor.
      // https://typescript-eslint.io/rules/no-misused-new
      '@typescript-eslint/no-misused-new': 'error',

      // Disallow Promises in places not designed to handle them.
      // https://typescript-eslint.io/rules/no-misused-promises
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false,
        },
      ],

      // Disallow the use of custom TypeScript modules and namespaces
      // https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-namespace.md
      '@typescript-eslint/no-namespace': 'error',

      // Disallow non-null assertions after an optional chain expression.
      // https://typescript-eslint.io/rules/no-non-null-asserted-optional-chain
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',

      // Disallow variable redeclaration
      // https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-redeclare.md
      '@typescript-eslint/no-redeclare': 'error',

      // Disallow members of unions and intersections that do nothing or override type information.
      // https://typescript-eslint.io/rules/no-redundant-type-constituents
      '@typescript-eslint/no-redundant-type-constituents': 'error',

      // Disallow invocation of require().
      // https://typescript-eslint.io/rules/no-require-imports
      '@typescript-eslint/no-require-imports': 'error',

      // Disallow aliasing this.
      // https://typescript-eslint.io/rules/no-this-alias
      '@typescript-eslint/no-this-alias': 'error',

      // Disallow type assertions that do not change the type of an expression.
      // https://typescript-eslint.io/rules/no-unnecessary-type-assertion
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',

      // Disallow unnecessary constraints on generic types.
      // https://typescript-eslint.io/rules/no-unnecessary-type-constraint
      '@typescript-eslint/no-unnecessary-type-constraint': 'error',

      // Disallow calling a value with type any.
      // https://typescript-eslint.io/rules/no-unsafe-call
      '@typescript-eslint/no-unsafe-call': 'error',

      // Disallow unsafe declaration merging.
      // https://typescript-eslint.io/rules/no-unsafe-declaration-merging
      '@typescript-eslint/no-unsafe-declaration-merging': 'error',

      // Disallow using the unsafe built-in Function type.
      // https://typescript-eslint.io/rules/no-unsafe-function-type
      '@typescript-eslint/no-unsafe-function-type': 'error',

      // Disallow returning a value with type any from a function.
      // https://typescript-eslint.io/rules/no-unsafe-return
      '@typescript-eslint/no-unsafe-return': 'error',

      // Disallow unused expressions
      // https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-unused-expressions.md
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTaggedTemplates: true,
          allowTernary: true,
        },
      ],

      // Prevent TypeScript-specific constructs from being erroneously flagged as unused
      // https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-unused-vars.md
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'none',
          ignoreRestSiblings: true,
        },
      ],

      // Disallow the use of variables before they are defined
      // https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-use-before-define.md
      '@typescript-eslint/no-use-before-define': [
        'warn',
        {
          functions: false,
          classes: false,
          variables: false,
          typedefs: false,
        },
      ],

      // Disallow unnecessary constructors
      // https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-useless-constructor.md
      '@typescript-eslint/no-useless-constructor': 'warn',

      // Disallow using confusing built-in primitive class wrappers.
      // https://typescript-eslint.io/rules/no-wrapper-object-types
      '@typescript-eslint/no-wrapper-object-types': 'error',

      // Require or disallow parameter properties in class constructors.
      // https://typescript-eslint.io/rules/parameter-properties
      '@typescript-eslint/parameter-properties': 'warn',

      // Enforce the use of as const over literal type.
      // https://typescript-eslint.io/rules/prefer-as-const
      '@typescript-eslint/prefer-as-const': 'error',

      // Require both operands of addition to be the same type and be bigint, number, or string.
      // https://typescript-eslint.io/rules/restrict-plus-operands
      '@typescript-eslint/restrict-plus-operands': 'error',

      // Disallow certain triple slash directives in favor of ES6-style import declarations.
      // https://typescript-eslint.io/rules/triple-slash-reference
      '@typescript-eslint/triple-slash-reference': 'error',
    },
  },
  {
    ignores: ['.vscode/', 'node_modules/', 'dist/', 'out/'],
  },
];

const node = {
  files: ['**/*.ts', '**/*.mts'],

  ignores: ['.vscode', 'node_modules/', 'dist/', 'out/'],

  rules: {
    'guard-for-in': 'error',
    'no-caller': 'error',
    'no-constant-condition': 'warn',
    'no-delete-var': 'error',
    'no-extend-native': 'error',
    'no-extra-boolean-cast': 'warn',
    'no-extra-label': 'warn',
    'no-fallthrough': 'error',
    'no-label-var': 'error',
    'no-lone-blocks': 'warn',
    'no-multi-str': 'error',
    'no-new': 'warn',
    'no-new-func': 'error',
    'no-new-object': 'error',
    'no-new-wrappers': 'warn',
    'no-octal': 'error',
    'no-octal-escape': 'error',
    'no-regex-spaces': 'error',
    'no-return-assign': 'error',
    'no-script-url': 'warn',
    'no-self-assign': 'error',
    'no-unmodified-loop-condition': 'warn',
    'no-unused-labels': 'warn',
    'no-useless-catch': 'warn',
    'no-useless-concat': 'warn',
    'no-var': 'error',
    'no-void': 'error',
    'prefer-const': 'warn',
    'require-atomic-updates': 'error',
    'require-yield': 'warn',

    // ########## typescript-eslint ##########

    // Require explicit return types on functions and class methods.
    // https://typescript-eslint.io/rules/explicit-function-return-type
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true,
        allowFunctionsWithoutTypeParameters: true,
      },
    ],

    // Disallow the any type.
    // https://typescript-eslint.io/rules/no-explicit-any
    '@typescript-eslint/no-explicit-any': 'error',

    // Disallow comparing an enum value with a non-enum value.
    // https://typescript-eslint.io/rules/no-unsafe-enum-comparison
    '@typescript-eslint/no-unsafe-enum-comparison': 'error',
  },
};

const vitest = {
  files: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.mts'],

  plugins: {
    vitest: vitestPlugin,
  },

  rules: {
    // Enforce having expectation in test body
    // https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/expect-expect.md
    'vitest/expect-expect': 'off',

    // Disallow focused tests
    // https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/no-focused-tests.md
    'vitest/no-focused-tests': 'error',

    // Disallow identical titles
    // https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/no-identical-title.md
    'vitest/no-identical-title': 'error',

    // Disallow importing node:test
    // https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/no-import-node-test.md
    'vitest/no-import-node-test': 'error',

    // Enforce importing Vitest globals
    // https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/prefer-importing-vitest-globals.md
    'vitest/prefer-importing-vitest-globals': 'error',

    // Enforce valid describe callback
    // https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/valid-describe-callback.md
    'vitest/valid-describe-callback': 'error',

    // Enforce valid expect() usage
    // https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/valid-expect.md
    'vitest/valid-expect': 'error',
  },
};

export default [...tseslint.config(...base, prettierEslint, node, vitest)];
