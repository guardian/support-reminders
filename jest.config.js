module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFiles: [
        'dotenv/config',
    ],
	setupFilesAfterEnv: [
		'./src/test/setup.ts',
	]
}
