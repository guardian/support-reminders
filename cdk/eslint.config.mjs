// @ts-check
import guardian from '@guardian/eslint-config';

export default [
	...guardian.configs.recommended,
	...guardian.configs.typescript,
	{
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: {
				project: true,
			},
		},
		rules: {
			'@typescript-eslint/no-inferrable-types': 'off',
			'import/no-namespace': 'error',
		},
	},
	{
		ignores: ['**/*.js', 'node_modules', 'cdk.out', 'jest.config.js'],
	},
];
