
module.exports =  {
  root: true,
  env: {
    node: true
  },
  extends:  [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',  // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    'prettier/@typescript-eslint',  // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
    // 'plugin:prettier/recommended',  // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  parser:  '@typescript-eslint/parser',  // Specifies the ESLint parser
  plugins: [ '@typescript-eslint' ],
  parserOptions:  {
    ecmaVersion:  2023,  // Allows for the parsing of modern ECMAScript features
    sourceType:  'module',  // Allows for the use of imports
  },
  ignorePatterns: [ 'test/', 'lib/', 'test-lib/', 'node_modules/', '.eslintrc.js' ],
  rules: {
    "camelcase": "off",
    // disable the rule for all files
    "@typescript-eslint/explicit-function-return-type": "off",
  },
  "overrides": [
    {
      // enable the rule specifically for TypeScript files
      "files": ["*.ts", "*.tsx"],
      "rules": {
        "@typescript-eslint/explicit-function-return-type": [ "error" ],
        "@typescript-eslint/no-explicit-any": "off",
        "no-use-before-define": "off",
        "@typescript-eslint/no-use-before-define": [
          "error",
          { ignoreTypeReferences: true, enums: false, typedefs: false, classes: false, functions: false },
        ]
      }
    },
    {
      "files": ["*.js"],
      "rules": {
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-use-before-define": ["error", { "functions": false }]
      }
    }
  ]
};
