import guardian from '@guardian/eslint-config';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	guardian.configs.recommended,
	guardian.configs.typescript,
	{
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: {
				project: true,
			},
		},
		rules: {
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/consistent-type-imports': 'off',
			'@typescript-eslint/prefer-optional-chain': 'off',
		},
	},
);
