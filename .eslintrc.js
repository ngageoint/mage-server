// {
//     "parser":  "@typescript-eslint/parser",
//     "parserOptions": {
//         "ecmaVersion": 6,
//         "sourceType": "module"
//     },
//     "rules": {
//         "indent": [2, 2],
//         "linebreak-style": [2, "unix"],
//         "semi": [2, "always"],
//         "complexity": [2, 10],
//         "no-console": [0],
//         "camelcase": [1],
//         "eqeqeq": [1]
//     },
//     "env": {
//         "node": true,
//         "es6": true
//     },
//     "extends": [
//         "eslint:recommended"
//     ]
// }

module.exports =  {
    parser:  '@typescript-eslint/parser',  // Specifies the ESLint parser
    extends:  [
      'plugin:@typescript-eslint/recommended',  // Uses the recommended rules from the @typescript-eslint/eslint-plugin
      'prettier/@typescript-eslint',  // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
      // 'plugin:prettier/recommended',  // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  
    ],
    parserOptions:  {
      ecmaVersion:  2018,  // Allows for the parsing of modern ECMAScript features
      sourceType:  'module',  // Allows for the use of imports
    },
    "ignorePatterns": ["test/"],
    rules: {
      "camelcase": "off",
      "@typescript-eslint/camelcase": ["error", { "properties": "never" }],
      // disable the rule for all files
      "@typescript-eslint/explicit-function-return-type": "off",
    },
    "overrides": [
      {
        // enable the rule specifically for TypeScript files
        "files": ["*.ts", "*.tsx"],
        "rules": {
          "@typescript-eslint/explicit-function-return-type": ["error"]
        }
      },
      {
        "files": ["*.js"],
        "rules": {
          "@typescript-eslint/no-var-requires": "off"
        }
      }
    ]
  };
