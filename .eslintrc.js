module.exports = {
	parser: '@typescript-eslint/parser',
	plugins: [
		'@typescript-eslint',
	],
	extends: "@guardian/eslint-config-typescript",
	overrides: [{
		files: ["*.ts"],
		rules: {
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/consistent-type-imports": "off",
			"@typescript-eslint/prefer-optional-chain": "off"
		}

	}]
}
