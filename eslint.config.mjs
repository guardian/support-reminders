// @ts-check
import guardian from '@guardian/eslint-config';

export default [
	...guardian.configs.recommended,
	...guardian.configs.typescript,
	{
		files: ['**/*.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/consistent-type-imports': 'off',
			'@typescript-eslint/prefer-optional-chain': 'off',
		},
	},
];
